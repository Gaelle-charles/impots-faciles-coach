ALTER TABLE public.simulations
ADD COLUMN IF NOT EXISTS simulator_id text,
ADD COLUMN IF NOT EXISTS inputs jsonb,
ADD COLUMN IF NOT EXISTS results jsonb;

UPDATE public.simulations
SET simulator_id = COALESCE(simulator_id, 'legacy-income-tax'),
    inputs = COALESCE(inputs, donnees),
    results = COALESCE(
      results,
      jsonb_build_object(
        'impot_net', impot_net,
        'taux_moyen', taux_moyen
      )
    )
WHERE simulator_id IS NULL
   OR inputs IS NULL
   OR results IS NULL;

ALTER TABLE public.simulations
ALTER COLUMN simulator_id SET DEFAULT 'legacy-income-tax';

ALTER TABLE public.simulations
ALTER COLUMN simulator_id SET NOT NULL,
ALTER COLUMN inputs SET NOT NULL,
ALTER COLUMN results SET NOT NULL;