/**
 * Tests unitaires de la logique pure de validation de coupon.
 * Ne touche ni à Stripe ni à Supabase — couvre tous les cas d'erreur.
 */
import { describe, it, expect } from "vitest";
import {
  evaluateCoupon,
  validateCouponInput,
  rejectImmutableFields,
  extractRedemptionFromSession,
  type CouponRow,
} from "../../supabase/functions/_shared/coupon-validation";

const baseCoupon: CouponRow = {
  id: "c1",
  code: "TEST10",
  percent_off: 10,
  plans_applicables: ["starter", "expert", "premium"],
  max_redemptions: null,
  times_redeemed: 0,
  active: true,
  valid_from: null,
  valid_until: null,
  stripe_promo_code_id: "promo_x",
};

describe("validateCouponInput", () => {
  it("accepte un input correct et normalise le code", () => {
    const r = validateCouponInput({ code: " welcome10 ", plan: "starter", base_price: 5900 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.code).toBe("WELCOME10");
      expect(r.plan).toBe("starter");
      expect(r.basePrice).toBe(5900);
    }
  });
  it("rejette un code vide", () => {
    expect(validateCouponInput({ plan: "starter", base_price: 100 }).ok).toBe(false);
  });
  it("rejette un plan invalide", () => {
    expect(validateCouponInput({ code: "X", plan: "team", base_price: 100 }).ok).toBe(false);
  });
  it("rejette un prix non positif", () => {
    expect(validateCouponInput({ code: "X", plan: "starter", base_price: 0 }).ok).toBe(false);
    expect(validateCouponInput({ code: "X", plan: "starter", base_price: -1 }).ok).toBe(false);
  });
});

describe("evaluateCoupon", () => {
  const ctx = { plan: "starter" as const, basePrice: 5900 };

  it("renvoie not_found si coupon manquant", () => {
    const r = evaluateCoupon(null, ctx);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error_code).toBe("not_found");
  });

  it("renvoie inactive", () => {
    const r = evaluateCoupon({ ...baseCoupon, active: false }, ctx);
    if (!r.valid) expect(r.error_code).toBe("inactive");
  });

  it("renvoie expired", () => {
    const r = evaluateCoupon(
      { ...baseCoupon, valid_until: new Date(Date.now() - 1000).toISOString() },
      ctx,
    );
    if (!r.valid) expect(r.error_code).toBe("expired");
  });

  it("renvoie not_started", () => {
    const r = evaluateCoupon(
      { ...baseCoupon, valid_from: new Date(Date.now() + 86_400_000).toISOString() },
      ctx,
    );
    if (!r.valid) expect(r.error_code).toBe("not_started");
  });

  it("renvoie limit_reached quand max atteint", () => {
    const r = evaluateCoupon({ ...baseCoupon, max_redemptions: 5, times_redeemed: 5 }, ctx);
    if (!r.valid) expect(r.error_code).toBe("limit_reached");
  });

  it("renvoie plan_not_eligible", () => {
    const r = evaluateCoupon({ ...baseCoupon, plans_applicables: ["premium"] }, ctx);
    if (!r.valid) expect(r.error_code).toBe("plan_not_eligible");
  });

  it("calcule la réduction correctement (10% sur 5900)", () => {
    const r = evaluateCoupon(baseCoupon, ctx);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.discount_amount).toBe(590);
      expect(r.new_price).toBe(5310);
      expect(r.percent_off).toBe(10);
    }
  });

  it("arrondit correctement (33% sur 100 → 33)", () => {
    const r = evaluateCoupon({ ...baseCoupon, percent_off: 33 }, { plan: "starter", basePrice: 100 });
    if (r.valid) {
      expect(r.discount_amount).toBe(33);
      expect(r.new_price).toBe(67);
    }
  });
});

describe("rejectImmutableFields (update-coupon)", () => {
  it("refuse la modification du code", () => {
    expect(rejectImmutableFields({ code: "NEW" })).toContain("code");
  });
  it("refuse percent_off, plans_applicables, valid_from, valid_until", () => {
    expect(rejectImmutableFields({ percent_off: 50 })).toBeTruthy();
    expect(rejectImmutableFields({ plans_applicables: ["starter"] })).toBeTruthy();
    expect(rejectImmutableFields({ valid_from: "2025-01-01" })).toBeTruthy();
    expect(rejectImmutableFields({ valid_until: "2025-01-01" })).toBeTruthy();
  });
  it("autorise les champs mutables", () => {
    expect(rejectImmutableFields({ active: false, notes: "x", max_redemptions: 5 })).toBeNull();
  });
});

describe("extractRedemptionFromSession (webhook)", () => {
  it("retourne null si pas de discount", () => {
    const r = extractRedemptionFromSession({
      id: "cs_1",
      total_details: { amount_discount: 0 },
      metadata: { user_id: "u1", plan: "starter", coupon_id: "c1" },
      amount_total: 5900,
    });
    expect(r).toBeNull();
  });

  it("retourne null si pas de coupon dans metadata", () => {
    const r = extractRedemptionFromSession({
      id: "cs_1",
      total_details: { amount_discount: 590 },
      metadata: { user_id: "u1", plan: "starter" },
      amount_total: 5310,
    });
    expect(r).toBeNull();
  });

  it("extrait correctement quand discount > 0 et coupon présent", () => {
    const r = extractRedemptionFromSession({
      id: "cs_1",
      total_details: { amount_discount: 590 },
      metadata: { user_id: "u1", plan: "starter", coupon_id: "c1" },
      amount_total: 5310,
      subscription: "sub_1",
    });
    expect(r).not.toBeNull();
    expect(r!.amount_paid).toBe(5310);
    expect(r!.amount_saved).toBe(590);
    expect(r!.user_id).toBe("u1");
    expect(r!.plan).toBe("starter");
    expect(r!.stripe_subscription_id).toBe("sub_1");
    expect(r!.coupon_lookup.coupon_id).toBe("c1");
  });

  it("fallback sur stripe_promo_code_id si pas de coupon_id", () => {
    const r = extractRedemptionFromSession({
      id: "cs_2",
      total_details: { amount_discount: 100 },
      metadata: { user_id: "u1", plan: "expert", stripe_promo_code_id: "promo_x" },
      amount_total: 9800,
    });
    expect(r!.coupon_lookup.coupon_id).toBeNull();
    expect(r!.coupon_lookup.promo_code_id).toBe("promo_x");
  });

  it("retourne null si user_id manquant", () => {
    const r = extractRedemptionFromSession({
      id: "cs_3",
      total_details: { amount_discount: 100 },
      metadata: { plan: "starter", coupon_id: "c1" },
      amount_total: 100,
    });
    expect(r).toBeNull();
  });
});
