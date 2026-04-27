import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

const PRICE_IDS: Record<string, string | undefined> = {
  starter: Deno.env.get("STRIPE_PRICE_ID_STARTER"),
  expert: Deno.env.get("STRIPE_PRICE_ID_EXPERT"),
  premium: Deno.env.get("STRIPE_PRICE_ID_PREMIUM"),
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Utilisateur invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan as string | undefined;
    if (!plan || !["starter", "expert", "premium"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Plan invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Acceptations légales obligatoires (CGV + CGU + renonciation rétractation)
    const cgvAt = body?.cgv_accepted_at as string | undefined;
    const cguAt = body?.cgu_accepted_at as string | undefined;
    const waiverAt = body?.waiver_accepted_at as string | undefined;
    if (!cgvAt || !cguAt || !waiverAt) {
      return new Response(
        JSON.stringify({ error: "Acceptation des CGV, CGU et renonciation au droit de rétractation requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Price ID manquant pour le plan ${plan}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const email = profile?.email ?? user.email ?? undefined;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    const origin = req.headers.get("origin") ?? req.headers.get("referer")?.replace(/\/$/, "") ?? "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: profile?.stripe_customer_id ? undefined : email,
      customer: profile?.stripe_customer_id ?? undefined,
      client_reference_id: user.id,
      success_url: `${origin}/paiement-succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tarifs`,
      metadata: { plan, user_id: user.id },
      subscription_data: {
        metadata: { plan, user_id: user.id },
      },
    });

    // Journalisation des acceptations légales (preuve juridique immuable)
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("x-real-ip") ??
        null;
      const userAgent = req.headers.get("user-agent") ?? null;
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      await serviceClient.from("legal_acceptances").insert([
        {
          user_id: user.id,
          user_email: email ?? null,
          context: "b2c_checkout",
          plan,
          document_type: "cgv",
          document_version: "1.0-2026-04",
          accepted_at: cgvAt,
          ip_address: ip,
          user_agent: userAgent,
          metadata: { stripe_session_id: session.id },
        },
        {
          user_id: user.id,
          user_email: email ?? null,
          context: "b2c_checkout",
          plan,
          document_type: "cgu",
          document_version: "1.0-2026-04",
          accepted_at: cguAt,
          ip_address: ip,
          user_agent: userAgent,
          metadata: { stripe_session_id: session.id },
        },
        {
          user_id: user.id,
          user_email: email ?? null,
          context: "b2c_checkout",
          plan,
          document_type: "waiver_retraction",
          document_version: "1.0-2026-04",
          accepted_at: waiverAt,
          ip_address: ip,
          user_agent: userAgent,
          metadata: {
            stripe_session_id: session.id,
            legal_basis: "Article L221-28 13° Code de la consommation",
          },
        },
      ]);
    } catch (logErr) {
      // On ne bloque pas le checkout sur un échec de log, mais on trace.
      console.error("[create-checkout-session] legal_acceptances insert failed:", logErr);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error", err);
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
