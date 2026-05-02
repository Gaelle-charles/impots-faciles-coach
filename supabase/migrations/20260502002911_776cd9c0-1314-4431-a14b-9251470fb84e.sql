-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.coupon_parrain_type AS ENUM ('user', 'external', 'none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_parrain_external_type AS ENUM ('influenceur', 'partenaire', 'ami', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_plan AS ENUM ('starter', 'expert', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_audit_action AS ENUM ('create', 'update', 'deactivate', 'reactivate', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TABLE coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_coupon_id text,
  stripe_promo_code_id text,
  code text NOT NULL UNIQUE,
  percent_off integer NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  plans_applicables jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_redemptions integer,
  times_redeemed integer NOT NULL DEFAULT 0,
  parrain_type public.coupon_parrain_type NOT NULL DEFAULT 'none',
  parrain_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  parrain_external_name text,
  parrain_external_email text,
  parrain_external_type public.coupon_parrain_external_type,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_active ON public.coupons(active);
CREATE INDEX idx_coupons_code ON public.coupons(code);

-- TABLE coupon_redemptions
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  plan_purchased public.coupon_plan NOT NULL,
  amount_paid integer NOT NULL,
  amount_saved integer NOT NULL,
  stripe_session_id text,
  stripe_subscription_id text
);

CREATE INDEX idx_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX idx_redemptions_user ON public.coupon_redemptions(user_id);

-- TABLE coupon_audit_log
CREATE TABLE public.coupon_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type public.coupon_audit_action NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_coupon ON public.coupon_audit_log(coupon_id);

-- TRIGGER updated_at on coupons
CREATE OR REPLACE FUNCTION public.update_coupons_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.update_coupons_updated_at();

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_audit_log ENABLE ROW LEVEL SECURITY;

-- coupons : admin only
CREATE POLICY coupons_admin_all ON public.coupons
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- coupon_redemptions : admin all + user can insert own
CREATE POLICY redemptions_admin_all ON public.coupon_redemptions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY redemptions_user_insert_own ON public.coupon_redemptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY redemptions_user_select_own ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- coupon_audit_log : admin only
CREATE POLICY audit_admin_all ON public.coupon_audit_log
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());