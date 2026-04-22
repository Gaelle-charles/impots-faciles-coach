// Stripe revenue aggregator for admin dashboard.
// Returns net revenue (paid invoices minus refunds), MRR from active subscriptions,
// counts, and currency breakdown. Admin-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RevenueResponse {
  currency: string;
  gross_revenue: number;       // cents — sum of paid invoices (amount_paid)
  refunded: number;            // cents — sum of refunds
  net_revenue: number;         // cents — gross - refunded
  paid_invoices_count: number;
  refunds_count: number;
  active_subscriptions: number;
  mrr: number;                 // cents — sum of active recurring subs normalized monthly
  arr: number;                 // cents — mrr * 12
  by_month: { month: string; gross: number; refunded: number; net: number }[];
  generated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Auth: must be admin ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return json({ error: "Admin access required" }, 403);
    }

    // ─── Stripe ───
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // ─── Fetch ALL paid invoices (auto-paginate) ───
    let gross = 0;
    let paidCount = 0;
    let currency = "eur";
    const grossByMonth: Record<string, number> = {};

    for await (const inv of stripe.invoices.list({
      status: "paid",
      limit: 100,
    })) {
      gross += inv.amount_paid ?? 0;
      paidCount++;
      currency = inv.currency || currency;
      const ts = inv.status_transitions?.paid_at ?? inv.created;
      if (ts) {
        const month = new Date(ts * 1000).toISOString().slice(0, 7); // YYYY-MM
        grossByMonth[month] = (grossByMonth[month] || 0) + (inv.amount_paid ?? 0);
      }
    }

    // ─── Fetch ALL refunds ───
    let refunded = 0;
    let refundsCount = 0;
    const refundedByMonth: Record<string, number> = {};

    for await (const refund of stripe.refunds.list({ limit: 100 })) {
      if (refund.status !== "succeeded") continue;
      refunded += refund.amount ?? 0;
      refundsCount++;
      const month = new Date(refund.created * 1000).toISOString().slice(0, 7);
      refundedByMonth[month] = (refundedByMonth[month] || 0) + (refund.amount ?? 0);
    }

    // ─── Active subscriptions → MRR ───
    let mrr = 0;
    let activeSubs = 0;

    for await (const sub of stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
    })) {
      activeSubs++;
      for (const item of sub.items.data) {
        const price = item.price;
        const qty = item.quantity ?? 1;
        const unitAmount = price.unit_amount ?? 0;
        const interval = price.recurring?.interval;
        const intervalCount = price.recurring?.interval_count ?? 1;
        if (!interval) continue;

        // Normalize to monthly
        let monthly = 0;
        switch (interval) {
          case "day":   monthly = (unitAmount * 30) / intervalCount; break;
          case "week":  monthly = (unitAmount * 52) / 12 / intervalCount; break;
          case "month": monthly = unitAmount / intervalCount; break;
          case "year":  monthly = unitAmount / 12 / intervalCount; break;
        }
        mrr += monthly * qty;
      }
    }

    // ─── Build by_month series (last 12 months, chronological) ───
    const months = new Set([
      ...Object.keys(grossByMonth),
      ...Object.keys(refundedByMonth),
    ]);
    const byMonth = Array.from(months)
      .sort()
      .slice(-12)
      .map((month) => {
        const g = grossByMonth[month] || 0;
        const r = refundedByMonth[month] || 0;
        return { month, gross: g, refunded: r, net: g - r };
      });

    const response: RevenueResponse = {
      currency,
      gross_revenue: gross,
      refunded,
      net_revenue: gross - refunded,
      paid_invoices_count: paidCount,
      refunds_count: refundsCount,
      active_subscriptions: activeSubs,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      by_month: byMonth,
      generated_at: new Date().toISOString(),
    };

    return json(response, 200);
  } catch (err) {
    console.error("stripe-revenue error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
