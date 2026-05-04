CREATE TABLE IF NOT EXISTS public.simulator_constants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulator_key text NOT NULL,
  fiscal_year int NOT NULL,
  constant_key text NOT NULL,
  value numeric NOT NULL,
  unit text,
  label text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(simulator_key, fiscal_year, constant_key)
);

ALTER TABLE public.simulator_constants ENABLE ROW LEVEL SECURITY;

CREATE POLICY simulator_constants_select_all ON public.simulator_constants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY simulator_constants_admin_all ON public.simulator_constants
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.simulator_constants (simulator_key, fiscal_year, constant_key, value, unit, label, source) VALUES
  ('frais_reels', 2025, 'repas_valeur_foyer', 5.45, 'EUR', 'Valeur du repas au foyer', 'impots.gouv.fr'),
  ('frais_reels', 2025, 'repas_plafond_jour', 21.10, 'EUR', 'Plafond déductible par repas', 'impots.gouv.fr'),
  ('frais_reels', 2025, 'blanchissage_decote_domicile', 30, 'PERCENT', 'Décote tarif pressing pour lavage à domicile', 'doctrine BOFiP'),
  ('frais_reels', 2025, 'km_voiture_3cv_seuil1', 0.529, 'EUR_PER_KM', 'Barème kilométrique 3 CV (0-5000 km)', 'arrêté barème kilométrique'),
  ('frais_reels', 2025, 'km_voiture_4cv_seuil1', 0.606, 'EUR_PER_KM', 'Barème kilométrique 4 CV (0-5000 km)', 'arrêté barème kilométrique'),
  ('frais_reels', 2025, 'km_voiture_5cv_seuil1', 0.636, 'EUR_PER_KM', 'Barème kilométrique 5 CV (0-5000 km)', 'arrêté barème kilométrique'),
  ('frais_reels', 2025, 'km_voiture_6cv_seuil1', 0.665, 'EUR_PER_KM', 'Barème kilométrique 6 CV (0-5000 km)', 'arrêté barème kilométrique'),
  ('frais_reels', 2025, 'km_voiture_7cv_seuil1', 0.697, 'EUR_PER_KM', 'Barème kilométrique 7 CV et + (0-5000 km)', 'arrêté barème kilométrique'),
  ('frais_reels', 2025, 'km_majoration_electrique', 20, 'PERCENT', 'Majoration véhicule 100% électrique', 'arrêté barème kilométrique')
ON CONFLICT (simulator_key, fiscal_year, constant_key) DO UPDATE
  SET value = EXCLUDED.value, unit = EXCLUDED.unit, label = EXCLUDED.label, source = EXCLUDED.source, updated_at = now();