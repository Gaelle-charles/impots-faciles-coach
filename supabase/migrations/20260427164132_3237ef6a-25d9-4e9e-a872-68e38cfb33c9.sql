
-- Garde anti-overcommit : inclure les invitations pending dans le calcul de capacité
CREATE OR REPLACE FUNCTION public.activate_admin_license()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org record;
  v_active_count int;
  v_pending_count int;
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

  PERFORM 1 FROM public.organizations WHERE id = v_org.id FOR UPDATE;

  SELECT * INTO v_existing_member
  FROM public.organization_members
  WHERE organization_id = v_org.id AND user_id = v_user_id
  LIMIT 1;

  IF v_existing_member.id IS NOT NULL
     AND v_existing_member.role = 'admin_with_license'
     AND v_existing_member.removed_at IS NULL THEN
    RETURN jsonb_build_object('success', true, 'already_active', true);
  END IF;

  -- Compte les membres actifs (member + admin_with_license)
  SELECT COUNT(*) INTO v_active_count
  FROM public.organization_members
  WHERE organization_id = v_org.id
    AND removed_at IS NULL
    AND role IN ('member', 'admin_with_license');

  -- Compte aussi les invitations en attente (elles réservent une licence)
  SELECT COUNT(*) INTO v_pending_count
  FROM public.organization_invitations
  WHERE organization_id = v_org.id AND status = 'pending';

  IF (v_active_count + v_pending_count) >= v_org.nb_licences THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacité atteinte (membres + invitations en attente). Augmentez vos licences pour activer votre accès complet.');
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

  PERFORM set_config('app.internal_plan_change', 'true', true);
  UPDATE public.profiles
  SET plan = v_org.plan, organization_id = v_org.id
  WHERE id = v_user_id;
  PERFORM set_config('app.internal_plan_change', '', true);

  RETURN jsonb_build_object('success', true, 'plan', v_org.plan);
END;
$function$;
