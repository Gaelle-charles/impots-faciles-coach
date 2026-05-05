
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_email text,
  ADD COLUMN IF NOT EXISTS deleted_prenom text,
  ADD COLUMN IF NOT EXISTS deleted_nom text;
