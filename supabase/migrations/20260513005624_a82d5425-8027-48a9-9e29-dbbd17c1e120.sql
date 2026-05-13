ALTER TABLE public.simulateurs DROP CONSTRAINT IF EXISTS simulateurs_plan_minimum_check;
ALTER TABLE public.simulateurs ADD CONSTRAINT simulateurs_plan_minimum_check
  CHECK (plan_minimum IN ('nouveau', 'starter', 'expert', 'premium'));