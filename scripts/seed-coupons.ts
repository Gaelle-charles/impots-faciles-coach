/**
 * Seeder pour le système de coupons.
 *
 * Crée :
 *  - 5 coupons de types variés (parrain user / external / none, plans variés, expiration)
 *  - 3 utilisateurs de test (via auth admin)
 *  - 5 redemptions
 *
 * Usage :
 *   tsx scripts/seed-coupons.ts        # seed
 *   tsx scripts/seed-coupons.ts --reset # supprime puis re-seed
 *
 * Requiert :
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * ⚠️ Ce seeder écrit directement en DB sans passer par Stripe (stripe_*_id mockés).
 *    À utiliser sur un projet de test ou prêt à être nettoyé via --reset.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[seed] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TAG = "[seed-test]";
const SEED_PREFIX = "TEST_SEED_";

const TEST_USERS = [
  { email: "seed.user1@impotsfacile.test", prenom: "Alice", nom: "Test", plan: "starter" },
  { email: "seed.user2@impotsfacile.test", prenom: "Bob", nom: "Test", plan: "expert" },
  { email: "seed.user3@impotsfacile.test", prenom: "Charlie", nom: "Test", plan: "premium" },
];

async function reset() {
  console.log(`${TAG} reset…`);

  // Redemptions sur coupons de seed
  const { data: seededCoupons } = await supabase
    .from("coupons")
    .select("id")
    .like("code", `${SEED_PREFIX}%`);

  const couponIds = (seededCoupons ?? []).map((c) => c.id);
  if (couponIds.length) {
    await supabase.from("coupon_redemptions").delete().in("coupon_id", couponIds);
    await supabase.from("coupon_audit_log").delete().in("coupon_id", couponIds);
    await supabase.from("coupons").delete().in("id", couponIds);
  }

  // Users de test
  for (const u of TEST_USERS) {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
    const existing = list?.users.find((x) => x.email === u.email);
    if (existing) {
      await supabase.from("profiles").delete().eq("id", existing.id);
      await supabase.auth.admin.deleteUser(existing.id);
    }
  }
  console.log(`${TAG} reset done`);
}

async function ensureUsers(): Promise<{ id: string; email: string; plan: string }[]> {
  const out: { id: string; email: string; plan: string }[] = [];
  for (const u of TEST_USERS) {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
    let user = list?.users.find((x) => x.email === u.email);
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: "Seed_Password_123!",
        email_confirm: true,
        user_metadata: { prenom: u.prenom, nom: u.nom },
      });
      if (error) throw error;
      user = data.user!;
    }
    // Aligne le plan (bypass via service role : trigger prevent_privilege_escalation laisse passer)
    await supabase.from("profiles").upsert({
      id: user.id,
      email: u.email,
      prenom: u.prenom,
      nom: u.nom,
      plan: u.plan,
    }, { onConflict: "id" });
    out.push({ id: user.id, email: u.email, plan: u.plan });
  }
  return out;
}

async function seedCoupons(parrainUserId: string) {
  const now = new Date();
  const inAYear = new Date(now.getTime() + 365 * 86400_000);
  const yesterday = new Date(now.getTime() - 86400_000);

  const rows = [
    {
      code: `${SEED_PREFIX}WELCOME10`,
      stripe_coupon_id: "co_seed_welcome10",
      stripe_promo_code_id: "promo_seed_welcome10",
      percent_off: 10,
      plans_applicables: ["starter", "expert", "premium"],
      max_redemptions: null,
      parrain_type: "none",
      valid_until: inAYear.toISOString(),
      active: true,
      notes: "Coupon public 10% — seed",
    },
    {
      code: `${SEED_PREFIX}INFLU25`,
      stripe_coupon_id: "co_seed_influ25",
      stripe_promo_code_id: "promo_seed_influ25",
      percent_off: 25,
      plans_applicables: ["expert", "premium"],
      max_redemptions: 100,
      parrain_type: "external",
      parrain_external_name: "@influencer_test",
      parrain_external_email: "influ@example.com",
      parrain_external_type: "influenceur",
      valid_until: inAYear.toISOString(),
      active: true,
    },
    {
      code: `${SEED_PREFIX}PARTENAIRE15`,
      stripe_coupon_id: "co_seed_part15",
      stripe_promo_code_id: "promo_seed_part15",
      percent_off: 15,
      plans_applicables: ["starter"],
      max_redemptions: null,
      parrain_type: "user",
      parrain_user_id: parrainUserId,
      valid_until: null,
      active: true,
    },
    {
      code: `${SEED_PREFIX}EXPIRED50`,
      stripe_coupon_id: "co_seed_expired",
      stripe_promo_code_id: "promo_seed_expired",
      percent_off: 50,
      plans_applicables: ["premium"],
      max_redemptions: null,
      parrain_type: "none",
      valid_from: new Date(now.getTime() - 30 * 86400_000).toISOString(),
      valid_until: yesterday.toISOString(),
      active: true,
    },
    {
      code: `${SEED_PREFIX}OFF`,
      stripe_coupon_id: "co_seed_off",
      stripe_promo_code_id: "promo_seed_off",
      percent_off: 20,
      plans_applicables: ["starter", "expert"],
      max_redemptions: 1,
      parrain_type: "none",
      valid_until: inAYear.toISOString(),
      active: false,
    },
  ];

  const { data, error } = await supabase.from("coupons").insert(rows).select();
  if (error) throw error;
  console.log(`${TAG} ${data.length} coupons inserted`);
  return data;
}

async function seedRedemptions(
  coupons: { id: string; code: string; percent_off: number }[],
  users: { id: string; plan: string }[],
) {
  const welcome = coupons.find((c) => c.code === `${SEED_PREFIX}WELCOME10`)!;
  const influ = coupons.find((c) => c.code === `${SEED_PREFIX}INFLU25`)!;
  const partenaire = coupons.find((c) => c.code === `${SEED_PREFIX}PARTENAIRE15`)!;

  const PRICE_CENTS: Record<string, number> = { starter: 5900, expert: 9900, premium: 14900 };

  const redemptions = [
    { coupon: welcome, user: users[0], plan: "starter" },
    { coupon: welcome, user: users[1], plan: "expert" },
    { coupon: influ, user: users[2], plan: "premium" },
    { coupon: influ, user: users[1], plan: "expert" },
    { coupon: partenaire, user: users[0], plan: "starter" },
  ];

  for (const r of redemptions) {
    const normal = PRICE_CENTS[r.plan];
    const saved = Math.round((normal * r.coupon.percent_off) / 100);
    const paid = normal - saved;
    const sessionId = `cs_seed_${r.coupon.code}_${r.user.id.slice(0, 8)}`;

    const { error } = await supabase.rpc("record_coupon_redemption", {
      p_coupon_id: r.coupon.id,
      p_user_id: r.user.id,
      p_plan: r.plan,
      p_amount_paid: paid,
      p_amount_saved: saved,
      p_stripe_session_id: sessionId,
      p_stripe_subscription_id: `sub_seed_${r.user.id.slice(0, 8)}`,
    });
    if (error) console.error(`${TAG} redemption error`, error);
  }
  console.log(`${TAG} ${redemptions.length} redemptions inserted`);
}

async function main() {
  if (process.argv.includes("--reset")) {
    await reset();
    if (process.argv.includes("--only-reset")) return;
  }
  const users = await ensureUsers();
  const coupons = await seedCoupons(users[0].id);
  await seedRedemptions(coupons, users);
  console.log(`${TAG} done.`);
}

main().catch((err) => {
  console.error(`${TAG} fatal`, err);
  process.exit(1);
});
