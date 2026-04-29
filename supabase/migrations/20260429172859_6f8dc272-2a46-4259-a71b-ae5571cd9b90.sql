-- Table simulateurs
CREATE TABLE public.simulateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nom text NOT NULL,
  description text NOT NULL,
  plan_minimum text NOT NULL CHECK (plan_minimum IN ('starter', 'expert', 'premium')),
  ordre int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  highlight_si_salarie boolean NOT NULL DEFAULT false,
  highlight_si_independant boolean NOT NULL DEFAULT false,
  highlight_si_dirigeant boolean NOT NULL DEFAULT false,
  highlight_si_couple boolean NOT NULL DEFAULT false,
  highlight_si_revenus_fonciers boolean NOT NULL DEFAULT false,
  highlight_si_placements boolean NOT NULL DEFAULT false,
  highlight_si_revenus_eleves boolean NOT NULL DEFAULT false,
  nb_utilisations int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulateurs ENABLE ROW LEVEL SECURITY;

-- Lecture : tout user connecté voit les actifs ; admin voit tout
CREATE POLICY simulateurs_select_active
  ON public.simulateurs FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin());

-- Admin : full CRUD (mais on n'expose pas le delete côté UI)
CREATE POLICY simulateurs_admin_all
  ON public.simulateurs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- updated_at trigger (réutilise la fonction existante du projet)
CREATE TRIGGER simulateurs_set_updated_at
  BEFORE UPDATE ON public.simulateurs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organizations_updated_at();

CREATE INDEX simulateurs_ordre_idx ON public.simulateurs(ordre);
CREATE INDEX simulateurs_active_idx ON public.simulateurs(is_active);

-- RPC d'incrément atomique du compteur (accessible à tout user connecté
-- pour les simulateurs actifs uniquement)
CREATE OR REPLACE FUNCTION public.increment_simulateur_usage(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.simulateurs
  SET nb_utilisations = nb_utilisations + 1
  WHERE slug = p_slug AND is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_simulateur_usage(text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_simulateur_usage(text) TO authenticated;

-- Seed des 12 simulateurs
INSERT INTO public.simulateurs (slug, nom, description, plan_minimum, ordre, is_active, highlight_si_salarie, highlight_si_independant, highlight_si_dirigeant, highlight_si_couple, highlight_si_revenus_fonciers, highlight_si_placements, highlight_si_revenus_eleves) VALUES
('ir-bareme', 'IR au barème', 'Calcule votre impôt net selon le barème progressif.', 'starter', 1, true, true, true, false, true, false, false, false),
('quotient-familial', 'Quotient familial', 'Estime votre nombre de parts fiscales selon votre situation.', 'starter', 2, true, true, true, false, true, false, false, false),
('pas', 'Prélèvement à la source', 'Ajustez votre taux de PAS et anticipez votre solde annuel.', 'starter', 3, true, true, true, false, false, false, false, false),
('credits-reductions', 'Crédits & réductions', '14 dispositifs : dons, emploi à domicile, garde enfants...', 'starter', 4, true, true, true, false, true, false, false, false),
('frais-reels', 'Frais réels', 'Comparez frais réels vs abattement 10%.', 'starter', 5, false, true, false, false, false, false, false, false),
('tmi-taux-effectif', 'TMI vs taux effectif', 'Comprenez la différence entre tranche et taux moyen.', 'starter', 6, false, true, true, false, true, false, false, false),
('per', 'PER / Épargne retraite', 'Optimisez vos versements PER pour réduire votre IR.', 'expert', 7, false, false, false, false, false, false, false, true),
('micro-vs-reel', 'Micro vs Réel (BIC/BNC/LMNP)', 'Régime micro ou réel : que choisir ?', 'expert', 8, false, false, true, false, false, false, false, false),
('revenus-fonciers', 'Revenus fonciers', 'Régime micro-foncier vs réel.', 'expert', 9, false, false, false, false, false, true, false, false),
('plus-values', 'Plus-values mobilières', 'PFU vs barème selon votre TMI.', 'expert', 10, false, false, false, false, false, false, true, false),
('optimisation-couple', 'Optimisation couple', 'Imposition commune ou séparée la 1re année.', 'expert', 11, false, false, false, false, true, false, false, false),
('cdhr', 'CDHR (Contribution différentielle hauts revenus)', 'Nouveauté 2026 : revenus > 250K€.', 'premium', 12, false, false, false, false, false, false, false, true);