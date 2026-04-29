CREATE TABLE public.recommandations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('association', 'partenaire')),
  nom text NOT NULL,
  description text NOT NULL,
  benefice_user text NOT NULL,
  url text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommandations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommandations_select_active"
  ON public.recommandations FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "recommandations_admin_all"
  ON public.recommandations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX idx_recommandations_active_ordre
  ON public.recommandations(is_active, ordre);

CREATE TRIGGER trg_recommandations_updated_at
BEFORE UPDATE ON public.recommandations
FOR EACH ROW
EXECUTE FUNCTION public.update_organizations_updated_at();