-- Idempotence : un session_id ne peut être enregistré qu'une fois
CREATE UNIQUE INDEX IF NOT EXISTS uniq_redemptions_session
  ON public.coupon_redemptions(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_coupon_redemption(
  p_coupon_id uuid,
  p_user_id uuid,
  p_plan public.coupon_plan,
  p_amount_paid integer,
  p_amount_saved integer,
  p_stripe_session_id text,
  p_stripe_subscription_id text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Idempotence : si déjà inséré pour cette session, on retourne l'existant sans rien faire
  IF p_stripe_session_id IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.coupon_redemptions
    WHERE stripe_session_id = p_stripe_session_id
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO public.coupon_redemptions (
    coupon_id, user_id, plan_purchased, amount_paid, amount_saved,
    stripe_session_id, stripe_subscription_id
  ) VALUES (
    p_coupon_id, p_user_id, p_plan, p_amount_paid, p_amount_saved,
    p_stripe_session_id, p_stripe_subscription_id
  ) RETURNING id INTO v_id;

  UPDATE public.coupons
  SET times_redeemed = times_redeemed + 1
  WHERE id = p_coupon_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_coupon_redemption(uuid, uuid, public.coupon_plan, integer, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_coupon_redemption(uuid, uuid, public.coupon_plan, integer, integer, text, text) FROM anon, authenticated;