-- 1) Helper: l'utilisateur est-il admin d'une orga (avec ou sans licence) ?
CREATE OR REPLACE FUNCTION public.is_user_org_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE admin_user_id = p_user_id
  );
$$;

-- 2) Helper: l'admin orga a-t-il activé sa licence perso ?
CREATE OR REPLACE FUNCTION public.org_admin_has_license(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE o.admin_user_id = p_user_id
      AND om.user_id = p_user_id
      AND om.role = 'admin_with_license'
      AND om.removed_at IS NULL
  );
$$;

-- 3) Étendre user_can_access_module pour les admins orga (lecture seule via SELECT)
CREATE OR REPLACE FUNCTION public.user_can_access_module(_module_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.modules m
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE m.id = _module_id
      AND p.plan = ANY(m.accessibilite)
  )
  OR public.is_admin()
  -- Modèle B : un admin d'orga peut consulter tous les modules en aperçu
  OR public.is_user_org_admin(auth.uid());
$$;

-- 4) RPC: activer la licence perso de l'admin (atomique)
CREATE OR REPLACE FUNCTION public.activate_admin_license()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org record;
  v_active_count int;
  v_existing_member record;
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT * INTO v_org FROM public.organizations WHERE admin_user_id = v_user_id LIMIT 1;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune organisation trouvée');
  END IF;

  -- LOCK ligne orga pour vérification atomique
  PERFORM 1 FROM public.organizations WHERE id = v_org.id FOR UPDATE;

  -- Membre déjà existant pour cet admin ?
  SELECT * INTO v_existing_member
  FROM public.organization_members
  WHERE organization_id = v_org.id AND user_id = v_user_id
  LIMIT 1;

  -- Si déjà admin_with_license actif, no-op
  IF v_existing_member.id IS NOT NULL
     AND v_existing_member.role = 'admin_with_license'
     AND v_existing_member.removed_at IS NULL THEN
    RETURN jsonb_build_object('success', true, 'already_active', true);
  END IF;

  -- Compter licences occupées (member + admin_with_license, pas 'admin')
  SELECT COUNT(*) INTO v_active_count
  FROM public.organization_members
  WHERE organization_id = v_org.id
    AND removed_at IS NULL
    AND role IN ('member', 'admin_with_license');

  IF v_active_count >= v_org.nb_licences THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacité atteinte. Augmentez vos licences pour activer votre accès complet.');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF v_existing_member.id IS NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, email, role, accepted_at)
    VALUES (v_org.id, v_user_id, COALESCE(v_user_email, ''), 'admin_with_license', now());
  ELSE
    UPDATE public.organization_members
    SET role = 'admin_with_license', removed_at = NULL,
        accepted_at = COALESCE(accepted_at, now())
    WHERE id = v_existing_member.id;
  END IF;

  -- Mettre le plan du profil au plan de l'orga (pour permettre la sauvegarde des progressions)
  UPDATE public.profiles
  SET plan = v_org.plan, organization_id = v_org.id
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'plan', v_org.plan);
END;
$$;

-- 5) RPC: désactiver la licence perso de l'admin (revient en mode aperçu)
CREATE OR REPLACE FUNCTION public.deactivate_admin_license()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT * INTO v_org FROM public.organizations WHERE admin_user_id = v_user_id LIMIT 1;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune organisation trouvée');
  END IF;

  UPDATE public.organization_members
  SET removed_at = now()
  WHERE organization_id = v_org.id
    AND user_id = v_user_id
    AND role = 'admin_with_license';

  -- Repasser plan profil à 'nouveau' (preview mode)
  UPDATE public.profiles SET plan = 'nouveau' WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6) Étendre get_user_organization pour exposer 'admin_with_license'
CREATE OR REPLACE FUNCTION public.get_user_organization(p_user_id uuid)
RETURNS TABLE(org_id uuid, raison_sociale text, plan text, logo_url text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    o.id,
    o.raison_sociale,
    o.plan,
    o.logo_url,
    CASE
      WHEN o.admin_user_id = p_user_id AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = o.id AND user_id = p_user_id
          AND role = 'admin_with_license' AND removed_at IS NULL
      ) THEN 'admin_with_license'
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

-- 7) Permettre profiles.plan='nouveau' pour les admins orga (le trigger anti-downgrade peut bloquer le deactivate)
-- On mute prevent_privilege_escalation pour autoriser les SECURITY DEFINER (déjà OK car appel via SECURITY DEFINER passe en service_role contexte). Aucun changement requis.

-- 8) Nettoyage comptes de test : remettre les profils admin orga à 'nouveau'
UPDATE public.profiles p
SET plan = 'nouveau'
FROM public.organizations o
WHERE p.id = o.admin_user_id
  AND p.plan <> 'nouveau'
  AND p.role = 'client'
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = o.id AND user_id = p.id
      AND role = 'admin_with_license' AND removed_at IS NULL
  );