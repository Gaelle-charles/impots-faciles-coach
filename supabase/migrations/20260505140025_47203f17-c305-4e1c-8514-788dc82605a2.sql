
-- Permettre de conserver la ligne profile après suppression auth (tombstone)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Ajouter la traçabilité de l'origine de la suppression
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_by text CHECK (deleted_by IN ('admin','user'));

-- Backfill : les profils supprimés existants sont marqués 'admin' (cas historique)
UPDATE public.profiles SET deleted_by = 'admin' WHERE deleted_at IS NOT NULL AND deleted_by IS NULL;
