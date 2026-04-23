-- Table organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raison_sociale TEXT NOT NULL,
  siret TEXT UNIQUE NOT NULL,
  adresse TEXT,
  tva_intra TEXT,
  admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan TEXT NOT NULL CHECK (plan IN ('starter','expert','premium')),
  nb_licences INT NOT NULL CHECK (nb_licences >= 2),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  logo_url TEXT,
  statut TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (statut IN ('pending_payment','active','suspended','cancelled')),
  date_paiement TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table organization_members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  invitation_token TEXT UNIQUE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_members_email ON public.organization_members(email);
CREATE INDEX IF NOT EXISTS idx_org_members_token ON public.organization_members(invitation_token);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- Colonne organization_id sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Trigger updated_at sur organizations
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_organizations_updated_at();

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- organizations policies
DROP POLICY IF EXISTS orgs_admin_can_all ON public.organizations;
CREATE POLICY orgs_admin_can_all ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS orgs_admin_org_can_read ON public.organizations;
CREATE POLICY orgs_admin_org_can_read ON public.organizations
  FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());

DROP POLICY IF EXISTS orgs_admin_org_can_update ON public.organizations;
CREATE POLICY orgs_admin_org_can_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

-- INSERT policy: un user authentifié peut créer une org où il est admin
DROP POLICY IF EXISTS orgs_authenticated_can_insert ON public.organizations;
CREATE POLICY orgs_authenticated_can_insert ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- organization_members policies
DROP POLICY IF EXISTS members_admin_can_all ON public.organization_members;
CREATE POLICY members_admin_can_all ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS members_admin_org_can_manage ON public.organization_members;
CREATE POLICY members_admin_org_can_manage ON public.organization_members
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE admin_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS members_can_read_own ON public.organization_members;
CREATE POLICY members_can_read_own ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());