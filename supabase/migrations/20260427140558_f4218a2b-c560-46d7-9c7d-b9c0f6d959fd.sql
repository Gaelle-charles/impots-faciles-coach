-- Table invitations
CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX idx_org_invitations_org_status ON public.organization_invitations(organization_id, status);
CREATE INDEX idx_org_invitations_email ON public.organization_invitations(lower(email));

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_admin_app_all"
ON public.organization_invitations
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "invitations_org_admin_manage"
ON public.organization_invitations
FOR ALL TO authenticated
USING (organization_id IN (SELECT id FROM public.organizations WHERE admin_user_id = auth.uid()))
WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE admin_user_id = auth.uid()));

-- RPC publique : lecture invitation par token (anon autorisé pour landing page)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  organization_id uuid,
  organization_name text,
  plan text,
  status text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.email, i.organization_id, o.raison_sociale, o.plan, i.status, i.expires_at
  FROM public.organization_invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- RPC : acceptation invitation par utilisateur connecté
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_inv record;
  v_org record;
  v_active_count int;
  v_member_id uuid;
  v_plan_rank jsonb := '{"nouveau":0,"freemium":0,"starter":1,"expert":2,"premium":3}'::jsonb;
  v_current_plan text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Utilisateur introuvable');
  END IF;

  SELECT * INTO v_inv FROM public.organization_invitations WHERE token = p_token LIMIT 1;
  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation introuvable');
  END IF;

  IF v_inv.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation déjà ' || v_inv.status);
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.organization_invitations SET status = 'expired' WHERE id = v_inv.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invitation expirée');
  END IF;

  IF lower(v_inv.email) <> lower(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email du compte différent de l''email invité');
  END IF;

  SELECT * INTO v_org FROM public.organizations WHERE id = v_inv.organization_id;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organisation introuvable');
  END IF;

  -- Vérifier les licences disponibles (membres actifs)
  SELECT COUNT(*) INTO v_active_count
  FROM public.organization_members
  WHERE organization_id = v_org.id AND removed_at IS NULL;

  -- Existe-t-il déjà un member row pour cet email ?
  SELECT id INTO v_member_id
  FROM public.organization_members
  WHERE organization_id = v_org.id AND lower(email) = lower(v_user_email)
  LIMIT 1;

  IF v_member_id IS NULL THEN
    IF v_active_count >= v_org.nb_licences THEN
      RETURN jsonb_build_object('success', false, 'error', 'Toutes les licences de l''organisation sont prises');
    END IF;
    INSERT INTO public.organization_members (organization_id, user_id, email, role, accepted_at)
    VALUES (v_org.id, v_user_id, v_user_email, 'member', now());
  ELSE
    UPDATE public.organization_members
    SET user_id = v_user_id,
        accepted_at = COALESCE(accepted_at, now()),
        removed_at = NULL
    WHERE id = v_member_id;
  END IF;

  -- Mise à jour du plan du profil : jamais de downgrade
  SELECT plan INTO v_current_plan FROM public.profiles WHERE id = v_user_id;
  IF COALESCE((v_plan_rank ->> v_org.plan)::int, 0) > COALESCE((v_plan_rank ->> COALESCE(v_current_plan,'nouveau'))::int, 0) THEN
    UPDATE public.profiles
    SET plan = v_org.plan, organization_id = v_org.id
    WHERE id = v_user_id;
  ELSE
    UPDATE public.profiles
    SET organization_id = v_org.id
    WHERE id = v_user_id;
  END IF;

  -- Marquer l'invitation acceptée
  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org.id,
    'organization_name', v_org.raison_sociale,
    'plan', v_org.plan
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;