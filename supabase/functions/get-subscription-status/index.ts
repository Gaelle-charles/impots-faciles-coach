import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_subscription_id, plan")
      .eq("id", userData.user.id)
      .maybeSingle();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!profile?.stripe_subscription_id || !stripeKey) {
      return new Response(JSON.stringify({ active: false, plan: profile?.plan ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    try {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      const active = sub.status === "active" || sub.status === "trialing";
      const item = sub.items?.data?.[0];
      const priceAmount = item?.price?.unit_amount ?? null;
      const priceCurrency = item?.price?.currency ?? null;
      const interval = item?.price?.recurring?.interval ?? null;
      return new Response(JSON.stringify({
        active,
        status: sub.status,
        plan: profile.plan,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: !!sub.cancel_at_period_end,
        price_amount: priceAmount,
        price_currency: priceCurrency,
        interval,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e) {
      console.error("get-subscription-status stripe error:", e);
      return new Response(JSON.stringify({ active: false, plan: profile.plan, error: String(e) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("get-subscription-status error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
