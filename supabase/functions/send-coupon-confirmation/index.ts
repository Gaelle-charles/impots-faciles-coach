// Edge function: send-coupon-confirmation
// Triggered by stripe-webhook when a checkout session is completed WITH a discount.
// Sends an enriched confirmation email recapping the coupon savings + renewal notice.
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Impôts Facile <info@impotsfacile.com>";

interface Body {
  to: string;
  user_name?: string | null;
  coupon_code: string;
  percent_off: number;
  plan: string;
  amount_paid_cents: number;     // what user actually paid (after discount)
  amount_saved_cents: number;    // discount amount
  amount_normal_cents: number;   // full price = paid + saved
  next_renewal_iso: string;      // ISO date for renewal
}

function formatEUR(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDateFR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[send-coupon-confirmation] RESEND_API_KEY missing — skipping");
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json() as Body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const required = ["to", "coupon_code", "percent_off", "plan", "amount_paid_cents", "amount_saved_cents", "amount_normal_cents", "next_renewal_iso"];
  for (const k of required) {
    if ((body as Record<string, unknown>)[k] === undefined || (body as Record<string, unknown>)[k] === null) {
      return new Response(JSON.stringify({ error: `Missing field: ${k}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const greeting = body.user_name ? `Bonjour ${body.user_name},` : "Bonjour,";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;padding:24px;color:#0f172a;background:#fff">
      <h2 style="margin:0 0 12px;font-size:22px;color:#2C1338">Merci pour votre abonnement Impôts Facile</h2>
      <p style="font-size:15px;line-height:1.55">${greeting}</p>
      <p style="font-size:15px;line-height:1.55">
        Votre abonnement <strong>${body.plan}</strong> est désormais actif. Vous pouvez accéder à toutes vos formations et outils dans votre espace.
      </p>

      <div style="background:#FFF8C2;border:1px solid #F9E900;border-radius:12px;padding:18px;margin:24px 0">
        <div style="font-size:16px;font-weight:700;color:#2C1338;margin-bottom:6px">
          🎉 Vous avez bénéficié du code <span style="font-family:monospace">${body.coupon_code}</span> — ${body.percent_off}% de réduction
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px">
          <tr><td style="padding:6px 0;color:#475569">Tarif normal</td><td style="padding:6px 0;text-align:right">${formatEUR(body.amount_normal_cents)}</td></tr>
          <tr><td style="padding:6px 0;color:#475569">Réduction</td><td style="padding:6px 0;text-align:right;color:#c2410c">– ${formatEUR(body.amount_saved_cents)}</td></tr>
          <tr><td style="padding:10px 0 0;border-top:1px solid #F9E900;font-weight:700">Montant payé</td><td style="padding:10px 0 0;border-top:1px solid #F9E900;text-align:right;font-weight:700">${formatEUR(body.amount_paid_cents)}</td></tr>
        </table>
      </div>

      <p style="font-size:13px;line-height:1.55;color:#475569;background:#f8fafc;border-left:3px solid #94a3b8;padding:10px 14px;border-radius:4px">
        <strong>Important :</strong> cette réduction s'applique uniquement à cette première année. Le tarif plein de
        <strong>${formatEUR(body.amount_normal_cents)}/an</strong> sera appliqué au renouvellement le <strong>${formatDateFR(body.next_renewal_iso)}</strong>.
        Vous pouvez résilier à tout moment depuis votre espace.
      </p>

      <p style="margin:28px 0">
        <a href="https://www.impotsfacile.com/dashboard" style="background:#2C1338;color:#F9E900;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Accéder à mon espace
        </a>
      </p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="font-size:12px;color:#94a3b8">
        Impôts Facile · contact@impotsfacile.com<br/>
        Impôts Facile est une plateforme éducative et ne constitue pas un conseil fiscal officiel.
      </p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [body.to],
        subject: `🎉 Votre code ${body.coupon_code} a bien été appliqué — Impôts Facile`,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[send-coupon-confirmation] Resend error:", res.status, text);
      return new Response(JSON.stringify({ error: `Email failed: ${res.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ sent: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-coupon-confirmation] Exception:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
