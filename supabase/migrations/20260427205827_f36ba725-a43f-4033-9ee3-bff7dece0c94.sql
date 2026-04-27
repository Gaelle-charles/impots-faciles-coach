-- Table d'audit pour les acceptations légales (preuve juridique)
CREATE TABLE public.legal_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  context TEXT NOT NULL, -- 'b2c_checkout' | 'b2b_checkout' | 'signup' | etc.
  plan TEXT,
  document_type TEXT NOT NULL, -- 'cgv' | 'cgu' | 'waiver_retraction' | 'b2b_guarantee_notice'
  document_version TEXT NOT NULL DEFAULT '1.0-2026-04',
  accepted_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_acceptances_user ON public.legal_acceptances(user_id);
CREATE INDEX idx_legal_acceptances_context ON public.legal_acceptances(context);
CREATE INDEX idx_legal_acceptances_doc ON public.legal_acceptances(document_type);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent lire leurs propres acceptations (transparence RGPD)
CREATE POLICY "users_read_own_acceptances"
  ON public.legal_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Les admins peuvent tout consulter (audit légal)
CREATE POLICY "admin_all_acceptances"
  ON public.legal_acceptances FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Aucune policy INSERT pour les utilisateurs : insertion uniquement via edge functions (service_role)
-- Aucune policy UPDATE/DELETE : registre immuable (preuve légale)
