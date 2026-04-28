-- Ajout d'une contrainte UNIQUE sur metiers.slug pour empêcher les doublons silencieux.
-- Aucune donnée existante n'est modifiée — vérification préalable confirme 0 doublon.
ALTER TABLE public.metiers
  ADD CONSTRAINT metiers_slug_key UNIQUE (slug);