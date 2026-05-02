import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

type Plan = "starter" | "expert" | "premium";

interface ValidateBody {
  code?: string;
  plan?: Plan;
  base_price?: number; // en centimes ou en euros — on accepte euros et renvoie tout dans l'unité reçue
}

type ErrorCode =
  | "missing_input"
  | "not_found"
  | "inactive"
  | "expired"
  | "not_started"
  | "limit_reached"
  | "plan_not_eligible";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(error_code: ErrorCode, message: string) {
  return jsonResponse({ valid: false, error_code, error: message });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ valid: false, error_code: "missing_input", error: "Non authentifié" }, 401);

    // Auth — restreint aux utilisateurs connectés
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabaseAuth.auth.getUser();
    if (!userData.user) return jsonResponse({ valid: false, error_code: "missing_input", error: "Utilisateur invalide" }, 401);

    const body = (await req.json().catch(() => ({}))) as ValidateBody;
    const code = (body.code ?? "").toString().trim().toUpperCase();
    const plan = body.plan;
    const basePrice = Number(body.base_price ?? 0);

    if (!code || !plan || !["starter", "expert", "premium"].includes(plan) || !Number.isFinite(basePrice) || basePrice <= 0) {
      return fail("missing_input", "Paramètres manquants");
    }

    // Service role pour bypass RLS (lecture publique des coupons interdite)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: coupon, error: fetchErr } = await supabase
      .from("coupons")
      .select("id, stripe_promo_code_id, code, percent_off, plans_applicables, max_redemptions, times_redeemed, active, valid_from, valid_until")
      .eq("code", code)
      .maybeSingle();

    if (fetchErr) {
      console.error("[validate-coupon]", fetchErr);
      return fail("not_found", "Code introuvable");
    }
    if (!coupon) return fail("not_found", "Ce code promo n'existe pas");

    if (!coupon.active) return fail("inactive", "Ce code promo n'est plus actif");

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return fail("not_started", "Ce code promo n'est pas encore actif");
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return fail("expired", "Ce code promo a expiré");
    }
    if (coupon.max_redemptions != null && coupon.times_redeemed >= coupon.max_redemptions) {
      return fail("limit_reached", "Ce code promo a atteint sa limite d'utilisations");
    }

    const plansArr = Array.isArray(coupon.plans_applicables) ? coupon.plans_applicables : [];
    if (!plansArr.includes(plan)) {
      return fail("plan_not_eligible", `Ce code promo n'est pas applicable au plan ${plan}`);
    }

    const percent = coupon.percent_off;
    const discountAmount = Math.round((basePrice * percent) / 100);
    const newPrice = basePrice - discountAmount;

    return jsonResponse({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      percent_off: percent,
      stripe_promo_code_id: coupon.stripe_promo_code_id,
      base_price: basePrice,
      discount_amount: discountAmount,
      new_price: newPrice,
    });
  } catch (err) {
    console.error("[validate-coupon] error", err);
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return jsonResponse({ valid: false, error_code: "missing_input", error: message }, 500);
  }
});
