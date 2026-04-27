-- 1) Met à jour le trigger anti-downgrade : il ignore désormais les changements de plan
--    explicitement marqués comme attribution interne via le GUC "app.internal_plan_change".
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
  internal_change text;
BEGIN
  caller_role := auth.role();

  -- Backend de confiance (service_role, postgres, supabase_admin) : passage libre
  IF caller_role IS NULL OR caller_role != 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- Admins applicatifs : passage libre
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Changement de plan marqué comme attribution interne (RPC officielle)
  -- Le GUC est posé par activate_admin_license / deactivate_admin_license.
  internal_change := current_setting('app.internal_plan_change', true);

  -- Champs sensibles toujours verrouillés
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Modification du role interdite' USING ERRCODE = '42501';
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    IF internal_change IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Modification du plan interdite (passage par Stripe requis)' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.date_paiement IS DISTINCT FROM OLD.date_paiement THEN
    RAISE EXCEPTION 'Modification de la date de paiement interdite' USING ERRCODE = '42501';
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Modification du statut actif interdite (réservé aux admins)' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) activate_admin_license : pose le flag avant l'UPDATE profiles
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

  -- Marqueur "attribution interne légitime" pour le trigger anti-downgrade
  PERFORM set_config('app.internal_plan_change', 'true', true);

  UPDATE public.profiles
  SET plan = v_org.plan, organization_id = v_org.id
  WHERE id = v_user_id;

  -- Nettoyage explicite (le `true` rend déjà le GUC local à la transaction, mais on reset pour propreté)
  PERFORM set_config('app.internal_plan_change', '', true);

  RETURN jsonb_build_object('success', true, 'plan', v_org.plan);
END;
$function$;

-- 3) deactivate_admin_license : pose aussi le flag
CREATE OR REPLACE FUNCTION public.deactivate_admin_license()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  PERFORM set_config('app.internal_plan_change', 'true', true);

  UPDATE public.profiles SET plan = 'nouveau' WHERE id = v_user_id;

  PERFORM set_config('app.internal_plan_change', '', true);

  RETURN jsonb_build_object('success', true);
END;
$function$;