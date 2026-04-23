import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

const TEAM_PRICE_IDS: Record<string, string | undefined> = {
  starter: Deno.env.get("STRIPE_PRICE_ID_TEAM_STARTER"),
  expert: Deno.env.get("STRIPE_PRICE_ID_TEAM_EXPERT"),
  premium: Deno.env.get("STRIPE_PRICE_ID_TEAM_PREMIUM"),
};

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
    const {
      raison_sociale,
      siret,
      adresse,
      tva_intra,
      plan,
      nb_licences,
    } = body ?? {};

    // --- Validations ---
    if (!raison_sociale || typeof raison_sociale !== "string" || raison_sociale.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Raison sociale invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!siret || !/^\d{14}$/.test(String(siret).replace(/\s/g, ""))) {
      return new Response(JSON.stringify({ error: "SIRET invalide (14 chiffres requis)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!plan || !["starter", "expert", "premium"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Plan invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const nbLic = Number(nb_licences);
    if (!Number.isInteger(nbLic) || nbLic < 2 || nbLic > 500) {
      return new Response(JSON.stringify({ error: "Nombre de licences invalide (2-500)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = TEAM_PRICE_IDS[plan];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Price ID Team manquant pour le plan ${plan}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cleanSiret = String(siret).replace(/\s/g, "");

    // SIRET unique check
    const { data: existing } = await admin
      .from("organizations")
      .select("id, statut")
      .eq("siret", cleanSiret)
      .maybeSingle();

    if (existing && existing.statut !== "pending_payment") {
      return new Response(
        JSON.stringify({ error: "Une organisation avec ce SIRET existe déjà." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let orgId = existing?.id ?? null;

    if (!orgId) {
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          raison_sociale: raison_sociale.trim(),
          siret: cleanSiret,
          adresse: adresse?.trim() || null,
          tva_intra: tva_intra?.trim() || null,
          admin_user_id: user.id,
          plan,
          nb_licences: nbLic,
          statut: "pending_payment",
        })
        .select("id")
        .single();

      if (orgErr || !org) {
        console.error("[team-checkout] insert org error:", orgErr);
        return new Response(JSON.stringify({ error: orgErr?.message ?? "Création org échouée" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      orgId = org.id;

      // Insert admin member
      await admin.from("organization_members").insert({
        organization_id: orgId,
        user_id: user.id,
        email: user.email!,
        role: "admin",
        accepted_at: new Date().toISOString(),
      });

      // Lier le profile à l'org
      await admin
        .from("profiles")
        .update({ organization_id: orgId })
        .eq("id", user.id);
    } else {
      // Update existing pending org
      await admin
        .from("organizations")
        .update({
          raison_sociale: raison_sociale.trim(),
          adresse: adresse?.trim() || null,
          tva_intra: tva_intra?.trim() || null,
          plan,
          nb_licences: nbLic,
          admin_user_id: user.id,
        })
        .eq("id", orgId);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    const origin = req.headers.get("origin") ?? req.headers.get("referer")?.replace(/\/$/, "") ?? "";

    const teamCoupon = Deno.env.get("STRIPE_COUPON_TEAM_10");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: nbLic }],
      payment_method_types: ["card", "sepa_debit"],
      customer_email: user.email ?? undefined,
      client_reference_id: orgId!,
      billing_address_collection: "required",
      ...(teamCoupon ? { discounts: [{ coupon: teamCoupon }] } : {}),
      metadata: { organization_id: orgId!, type: "b2b", plan },
      subscription_data: {
        metadata: { organization_id: orgId!, type: "b2b", plan },
      },
      success_url: `${origin}/impots-team/bienvenue?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/impots-team`,
    });

    return new Response(JSON.stringify({ url: session.url, organization_id: orgId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-team-checkout-session error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
