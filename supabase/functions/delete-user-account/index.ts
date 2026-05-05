import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import Stripe from "npm:stripe@17.5.0";
import { sendDeletionConfirmationEmail } from "../_shared/deletion-email.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user via JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Service-role client for privileged ops
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch profile (including email/name for the confirmation email)
    const { data: profile } = await admin
      .from("profiles")
      .select("email, prenom, nom, plan, stripe_subscription_id, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    // Fetch active subscription details (for email body) BEFORE cancellation
    let nextRenewalIso: string | null = null;
    let hasActiveSub = false;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (profile?.stripe_subscription_id && stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
        const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        hasActiveSub = sub.status === "active" || sub.status === "trialing";
        if (sub.current_period_end) {
          nextRenewalIso = new Date(sub.current_period_end * 1000).toISOString();
        }
      } catch (e) {
        console.error("Stripe retrieve error (non-blocking):", e);
      }
    }

    // Send deletion confirmation email BEFORE destructive ops (best-effort)
    const userEmail = profile?.email ?? userData.user.email ?? null;
    if (userEmail) {
      const emailResult = await sendDeletionConfirmationEmail({
        email: userEmail,
        prenom: profile?.prenom,
        plan: profile?.plan,
        hasActiveSubscription: hasActiveSub,
        nextRenewalDate: nextRenewalIso,
      });
      console.log("[delete-user-account] deletion email:", emailResult);
    }

    // Cancel Stripe subscription at period end (loi Chatel)
    if (profile?.stripe_subscription_id && stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (e) {
        console.error("Stripe cancel error (non-blocking):", e);
      }
    }

    // Anonymise profile
    const { error: updErr } = await admin
      .from("profiles")
      .update({
        email: `deleted_${userId}@deleted.local`,
        nom: null,
        prenom: null,
        situation_principale: null,
        metier_id: null,
        profils_detectes: null,
        metiers_detectes: null,
        pays_concernes: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: 'user',
        deleted_email: profile?.email ?? userData.user.email ?? null,
        deleted_prenom: profile?.prenom ?? null,
        deleted_nom: (profile as any)?.nom ?? null,
      })
      .eq("id", userId);

    if (updErr) {
      console.error("Anonymise error:", updErr);
      return new Response(JSON.stringify({ error: "Échec de l'anonymisation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete from auth.users
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("Auth delete error:", delErr);
      return new Response(JSON.stringify({ error: "Échec de la suppression du compte" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-user-account error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
