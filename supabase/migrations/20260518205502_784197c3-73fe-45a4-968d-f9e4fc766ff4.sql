CREATE TABLE public.free_simulations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_free_simulations_log_ip_hash_created
  ON public.free_simulations_log(ip_hash, created_at DESC);

ALTER TABLE public.free_simulations_log ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul le service_role (edge function) peut accéder.