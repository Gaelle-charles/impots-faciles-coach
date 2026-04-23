
CREATE OR REPLACE FUNCTION public.is_org_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE admin_user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization(p_user_id UUID)
RETURNS TABLE (
  org_id UUID,
  raison_sociale TEXT,
  plan TEXT,
  logo_url TEXT,
  role TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.raison_sociale,
    o.plan,
    o.logo_url,
    CASE
      WHEN o.admin_user_id = p_user_id THEN 'admin'
      ELSE 'member'
    END AS role
  FROM public.organizations o
  WHERE o.admin_user_id = p_user_id
     OR o.id IN (
       SELECT organization_id FROM public.organization_members
       WHERE user_id = p_user_id
         AND accepted_at IS NOT NULL
         AND removed_at IS NULL
     )
  LIMIT 1;
$$;
