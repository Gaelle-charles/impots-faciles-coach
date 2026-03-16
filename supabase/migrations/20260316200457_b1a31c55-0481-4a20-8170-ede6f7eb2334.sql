
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS situation_famille text,
  ADD COLUMN IF NOT EXISTS situation_pro text,
  ADD COLUMN IF NOT EXISTS premiere_declaration boolean,
  ADD COLUMN IF NOT EXISTS onboarding_done boolean NOT NULL DEFAULT false;
