
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_email text,
  ADD COLUMN IF NOT EXISTS deleted_prenom text,
  ADD COLUMN IF NOT EXISTS deleted_nom text,
  ADD COLUMN IF NOT EXISTS deleted_by_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
