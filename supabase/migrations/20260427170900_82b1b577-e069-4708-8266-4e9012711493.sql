-- FIX: accept_invitation must bypass the anti-downgrade trigger when assigning the org plan to a new member.
-- Same mechanism as activate_admin_license: set GUC app.internal_plan_change='true' around the UPDATE on profiles.
-- Also harden atomicity: if the profile UPDATE fails for any reason, the whole RPC rolls back (PL/pgSQL default behavior)
-- so the invitation never gets marked 'accepted' without the plan being applied.

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF v_org.admin_user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous êtes l''administrateur de cette organisation et ne pouvez pas l''occuper en tant que collaborateur.');
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.organization_members
  WHERE organization_id = v_org.id AND removed_at IS NULL;

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

  SELECT plan INTO v_current_plan FROM public.profiles WHERE id = v_user_id;

  -- Bypass anti-downgrade: c'est une attribution interne via licence orga, pas un downgrade Stripe.
  PERFORM set_config('app.internal_plan_change', 'true', true);

  IF COALESCE((v_plan_rank ->> v_org.plan)::int, 0) > COALESCE((v_plan_rank ->> COALESCE(v_current_plan,'nouveau'))::int, 0) THEN
    UPDATE public.profiles
    SET plan = v_org.plan, organization_id = v_org.id
    WHERE id = v_user_id;
  ELSE
    -- Le user a déjà un plan >= au plan orga : on ne change pas le plan, on lie juste à l'orga.
    -- (organization_id n'est pas verrouillé par le trigger, mais on garde le GUC actif par sécurité.)
    UPDATE public.profiles
    SET organization_id = v_org.id
    WHERE id = v_user_id;
  END IF;

  PERFORM set_config('app.internal_plan_change', '', true);

  -- L'invitation n'est marquée acceptée qu'APRÈS que tous les UPDATE ont réussi.
  -- Si une exception survient au-dessus, la transaction PL/pgSQL rollback automatiquement.
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
$function$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;