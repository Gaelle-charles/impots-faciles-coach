-- Sous-sprint A : Préparation BDD pour import contenu enrichi
-- Ajoute une colonne JSONB contenu_sections aux 3 tables de fiches éditoriales
-- + index GIN pour recherche full-text future

ALTER TABLE public.metiers
  ADD COLUMN IF NOT EXISTS contenu_sections JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.fiches_profils
  ADD COLUMN IF NOT EXISTS contenu_sections JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pays
  ADD COLUMN IF NOT EXISTS contenu_sections JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_metiers_contenu_sections
  ON public.metiers USING GIN (contenu_sections);

CREATE INDEX IF NOT EXISTS idx_fiches_profils_contenu_sections
  ON public.fiches_profils USING GIN (contenu_sections);

CREATE INDEX IF NOT EXISTS idx_pays_contenu_sections
  ON public.pays USING GIN (contenu_sections);