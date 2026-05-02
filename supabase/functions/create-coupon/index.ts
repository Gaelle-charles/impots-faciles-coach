import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

type Plan = "starter" | "expert" | "premium";
type ParrainType = "user" | "external" | "none";
type ParrainExternalType = "influenceur" | "partenaire" | "ami" | "autre";

interface CreateCouponBody {
  code: string;
  percent_off: number;
  plans_applicables: Plan[];
  max_redemptions: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  parrain_type: ParrainType;
  parrain_user_id?: string | null;
  parrain_external_name?: string | null;
  parrain_external_email?: string | null;
  parrain_external_type?: ParrainExternalType | null;
  notes?: string | null;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Non authentifié" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Utilisateur invalide" }, 401);
    const user = userData.user;

    // Vérification admin (check côté serveur)
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return jsonResponse({ error: "Accès refusé" }, 403);

    const body = (await req.json().catch(() => ({}))) as Partial<CreateCouponBody>;

    // Validation
    const code = (body.code ?? "").toString().trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return jsonResponse({ error: "Code invalide (3-40 caractères alphanumériques)" }, 400);

    const percent = Number(body.percent_off);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      return jsonResponse({ error: "percent_off doit être un entier 1-100" }, 400);
    }

    const plans = Array.isArray(body.plans_applicables) ? body.plans_applicables : [];
    const validPlans: Plan[] = ["starter", "expert", "premium"];
    if (plans.length === 0 || !plans.every((p) => validPlans.includes(p as Plan))) {
      return jsonResponse({ error: "Au moins un plan valide requis" }, 400);
    }

    const maxRedemptions = body.max_redemptions == null ? null : Number(body.max_redemptions);
    if (maxRedemptions != null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
      return jsonResponse({ error: "max_redemptions invalide" }, 400);
    }

    const parrainType: ParrainType = (body.parrain_type ?? "none") as ParrainType;
    if (!["user", "external", "none"].includes(parrainType)) {
      return jsonResponse({ error: "parrain_type invalide" }, 400);
    }
    if (parrainType === "user" && !body.parrain_user_id) {
      return jsonResponse({ error: "parrain_user_id requis" }, 400);
    }
    if (parrainType === "external" && (!body.parrain_external_name || !body.parrain_external_type)) {
      return jsonResponse({ error: "Nom et type externe requis" }, 400);
    }

    const validUntil = body.valid_until ? new Date(body.valid_until) : null;
    const validFrom = body.valid_from ? new Date(body.valid_from) : new Date();
    if (validUntil && validUntil <= validFrom) {
      return jsonResponse({ error: "valid_until doit être après valid_from" }, 400);
    }

    // Vérifier unicité du code
    const { data: existing } = await supabase
      .from("coupons").select("id").eq("code", code).maybeSingle();
    if (existing) return jsonResponse({ error: "Ce code existe déjà" }, 409);

    // Mapping plan → Stripe Price/Product
    const PRICE_IDS: Record<Plan, string | undefined> = {
      starter: Deno.env.get("STRIPE_PRICE_ID_STARTER"),
      expert: Deno.env.get("STRIPE_PRICE_ID_EXPERT"),
      premium: Deno.env.get("STRIPE_PRICE_ID_PREMIUM"),
    };

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    // Récupère les products pour les plans applicables (pour applies_to)
    const productIds: string[] = [];
    for (const p of plans as Plan[]) {
      const priceId = PRICE_IDS[p];
      if (!priceId) return jsonResponse({ error: `Price ID manquant pour ${p}` }, 500);
      const price = await stripe.prices.retrieve(priceId);
      const productId = typeof price.product === "string" ? price.product : price.product.id;
      if (!productIds.includes(productId)) productIds.push(productId);
    }

    // Crée le coupon Stripe
    const stripeCouponParams: Stripe.CouponCreateParams = {
      percent_off: percent,
      duration: "once",
      name: `${code} - ${percent}%`,
      metadata: { app_code: code, app: "impots-facile" },
    };
    // applies_to seulement si on restreint (sinon coupon valable sur tout)
    if (productIds.length > 0 && plans.length < 3) {
      stripeCouponParams.applies_to = { products: productIds };
    }

    const stripeCoupon = await stripe.coupons.create(stripeCouponParams);

    // Crée le promo code lisible
    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: stripeCoupon.id,
      code,
      active: true,
    };
    if (maxRedemptions != null) promoParams.max_redemptions = maxRedemptions;
    if (validUntil) promoParams.expires_at = Math.floor(validUntil.getTime() / 1000);

    const promoCode = await stripe.promotionCodes.create(promoParams);

    // Insertion en base (admin via RLS is_admin)
    const { data: inserted, error: insertErr } = await supabase
      .from("coupons")
      .insert({
        stripe_coupon_id: stripeCoupon.id,
        stripe_promo_code_id: promoCode.id,
        code,
        percent_off: percent,
        plans_applicables: plans,
        max_redemptions: maxRedemptions,
        parrain_type: parrainType,
        parrain_user_id: parrainType === "user" ? body.parrain_user_id : null,
        parrain_external_name: parrainType === "external" ? body.parrain_external_name : null,
        parrain_external_email: parrainType === "external" ? body.parrain_external_email ?? null : null,
        parrain_external_type: parrainType === "external" ? body.parrain_external_type : null,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil?.toISOString() ?? null,
        active: true,
        notes: body.notes ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) {
      // rollback Stripe
      try { await stripe.promotionCodes.update(promoCode.id, { active: false }); } catch (_) { /* ignore */ }
      return jsonResponse({ error: insertErr.message }, 500);
    }

    // Audit log
    await supabase.from("coupon_audit_log").insert({
      coupon_id: inserted.id,
      admin_user_id: user.id,
      action_type: "create",
      details: { code, percent_off: percent, plans, max_redemptions: maxRedemptions, parrain_type: parrainType },
    });

    return jsonResponse({ success: true, coupon: inserted });
  } catch (err) {
    console.error("[create-coupon]", err);
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return jsonResponse({ error: msg }, 500);
  }
});
