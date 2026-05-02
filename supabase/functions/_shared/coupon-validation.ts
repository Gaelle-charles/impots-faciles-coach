/**
 * Logique pure de validation de coupon — partagée entre validate-coupon et tests.
 * Aucune dépendance Deno / Supabase / Stripe : 100% testable en Node/Vitest.
 */

export type Plan = "starter" | "expert" | "premium";
export type ParrainType = "user" | "external" | "none";

export type ValidationErrorCode =
  | "missing_input"
  | "not_found"
  | "inactive"
  | "expired"
  | "not_started"
  | "limit_reached"
  | "plan_not_eligible";

export interface CouponRow {
  id: string;
  code: string;
  percent_off: number;
  plans_applicables: string[];
  max_redemptions: number | null;
  times_redeemed: number;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  stripe_promo_code_id?: string | null;
}

export type ValidationResult =
  | {
      valid: true;
      coupon_id: string;
      code: string;
      percent_off: number;
      stripe_promo_code_id?: string | null;
      base_price: number;
      discount_amount: number;
      new_price: number;
    }
  | { valid: false; error_code: ValidationErrorCode; error: string };

export function validateCouponInput(input: {
  code?: string;
  plan?: string;
  base_price?: number;
}): { ok: true; code: string; plan: Plan; basePrice: number } | { ok: false; error: string } {
  const code = (input.code ?? "").toString().trim().toUpperCase();
  const plan = input.plan;
  const basePrice = Number(input.base_price ?? 0);

  if (!code) return { ok: false, error: "Code requis" };
  if (!plan || !["starter", "expert", "premium"].includes(plan)) {
    return { ok: false, error: "Plan invalide" };
  }
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { ok: false, error: "Prix invalide" };
  }
  return { ok: true, code, plan: plan as Plan, basePrice };
}

export function evaluateCoupon(
  coupon: CouponRow | null,
  ctx: { plan: Plan; basePrice: number; now?: Date },
): ValidationResult {
  if (!coupon) {
    return { valid: false, error_code: "not_found", error: "Ce code promo n'existe pas" };
  }
  if (!coupon.active) {
    return { valid: false, error_code: "inactive", error: "Ce code promo n'est plus actif" };
  }
  const now = ctx.now ?? new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, error_code: "not_started", error: "Ce code promo n'est pas encore actif" };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, error_code: "expired", error: "Ce code promo a expiré" };
  }
  if (coupon.max_redemptions != null && coupon.times_redeemed >= coupon.max_redemptions) {
    return {
      valid: false,
      error_code: "limit_reached",
      error: "Ce code promo a atteint sa limite d'utilisations",
    };
  }
  if (!coupon.plans_applicables.includes(ctx.plan)) {
    return {
      valid: false,
      error_code: "plan_not_eligible",
      error: `Ce code promo n'est pas applicable au plan ${ctx.plan}`,
    };
  }

  const discount = Math.round((ctx.basePrice * coupon.percent_off) / 100);
  return {
    valid: true,
    coupon_id: coupon.id,
    code: coupon.code,
    percent_off: coupon.percent_off,
    stripe_promo_code_id: coupon.stripe_promo_code_id ?? null,
    base_price: ctx.basePrice,
    discount_amount: discount,
    new_price: ctx.basePrice - discount,
  };
}

/** Champs interdits sur update — partagé avec update-coupon */
export const COUPON_IMMUTABLE_FIELDS = [
  "code",
  "percent_off",
  "plans_applicables",
  "valid_from",
  "valid_until",
] as const;

export function rejectImmutableFields(body: Record<string, unknown>): string | null {
  for (const f of COUPON_IMMUTABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      return `Le champ ${f} ne peut pas être modifié`;
    }
  }
  return null;
}

/** Logique pure : extraction des infos de redemption depuis un event webhook */
export function extractRedemptionFromSession(session: {
  total_details?: { amount_discount?: number } | null;
  amount_total?: number | null;
  metadata?: Record<string, string | null | undefined> | null;
  subscription?: string | null | { id: string };
  client_reference_id?: string | null;
  id: string;
}): null | {
  user_id: string;
  plan: string;
  amount_paid: number;
  amount_saved: number;
  coupon_lookup: { coupon_id: string | null; promo_code_id: string | null };
  stripe_session_id: string;
  stripe_subscription_id: string | null;
} {
  const amountDiscount = session.total_details?.amount_discount ?? 0;
  if (amountDiscount <= 0) return null;
  const couponId = session.metadata?.coupon_id ?? null;
  const promoCodeId = session.metadata?.stripe_promo_code_id ?? null;
  if (!couponId && !promoCodeId) return null;

  const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
  const plan = session.metadata?.plan ?? null;
  if (!userId || !plan) return null;

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  return {
    user_id: userId,
    plan,
    amount_paid: session.amount_total ?? 0,
    amount_saved: amountDiscount,
    coupon_lookup: { coupon_id: couponId, promo_code_id: promoCodeId },
    stripe_session_id: session.id,
    stripe_subscription_id: subId,
  };
}
