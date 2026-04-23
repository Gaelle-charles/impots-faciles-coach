import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

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
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { organization_id, nb_licences } = body ?? {};
    const newQty = Number(nb_licences);

    if (!organization_id || typeof organization_id !== "string") {
      return new Response(JSON.stringify({ error: "organization_id manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isInteger(newQty) || newQty < 2 || newQty > 500) {
      return new Response(JSON.stringify({ error: "Nombre de licences invalide (2-500)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .select("id, admin_user_id, stripe_subscription_id, statut, nb_licences")
      .eq("id", organization_id)
      .maybeSingle();

    if (orgErr || !org) {
      return new Response(JSON.stringify({ error: "Organisation introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (org.admin_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!org.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "Aucun abonnement Stripe actif." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compter les membres actifs pour empêcher de descendre en dessous
    const { count: activeCount } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .is("removed_at", null);

    if (typeof activeCount === "number" && newQty < activeCount) {
      return new Response(
        JSON.stringify({
          error: `Vous avez ${activeCount} membres actifs. Retirez d'abord des accès avant de descendre en dessous.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) {
      return new Response(JSON.stringify({ error: "Subscription item introuvable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updated = await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: itemId, quantity: newQty }],
      proration_behavior: "create_prorations",
    });

    // Le webhook customer.subscription.updated finalisera la mise à jour DB,
    // mais on met aussi à jour tout de suite pour réactivité UI.
    await admin
      .from("organizations")
      .update({ nb_licences: newQty })
      .eq("id", organization_id);

    return new Response(
      JSON.stringify({ success: true, nb_licences: newQty, status: updated.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("update-team-licences error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
