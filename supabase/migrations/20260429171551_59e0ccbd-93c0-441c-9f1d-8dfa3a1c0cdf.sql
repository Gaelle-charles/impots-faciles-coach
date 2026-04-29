CREATE OR REPLACE FUNCTION public.create_certificat_parcours_on_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_max_order int;
  v_modules_requis int;
  v_modules_valides int;
  v_existing_id uuid;
  v_numero text;
  v_year text;
  v_seq bigint;
BEGIN
  -- Seuil 70%
  IF NEW.pourcentage < 70 THEN
    RETURN NEW;
  END IF;

  -- Profil + plan de l'user
  SELECT id, prenom, nom, email, plan, role
    INTO v_profile
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_profile IS NULL THEN
    RETURN NEW;
  END IF;

  -- Freemium (plan 'nouveau') exclu du certificat global
  IF v_profile.role <> 'admin' AND v_profile.plan = 'nouveau' THEN
    RETURN NEW;
  END IF;

  -- Déjà un certificat de parcours pour ce user ? on ne refait rien
  SELECT id INTO v_existing_id
  FROM public.certificats_parcours
  WHERE user_id = NEW.user_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Order max parmi les modules publiés accessibles au plan : le dernier module
  -- (Module 8 promotionnel) est exclu des prérequis du certificat.
  SELECT MAX(m."order") INTO v_max_order
  FROM public.modules m
  WHERE m.is_published = true
    AND (
      v_profile.role = 'admin'
      OR v_profile.plan = ANY(m.accessibilite)
    );

  IF v_max_order IS NULL THEN
    RETURN NEW;
  END IF;

  -- Modules requis : tous les modules accessibles SAUF le dernier (order < max).
  SELECT COUNT(*) INTO v_modules_requis
  FROM public.modules m
  WHERE m.is_published = true
    AND m."order" < v_max_order
    AND (
      v_profile.role = 'admin'
      OR v_profile.plan = ANY(m.accessibilite)
    );

  IF v_modules_requis = 0 THEN
    RETURN NEW;
  END IF;

  -- Modules requis pour lesquels l'user a au moins 1 résultat ≥70%
  SELECT COUNT(DISTINCT rq.module_id) INTO v_modules_valides
  FROM public.resultat_quiz rq
  JOIN public.modules m ON m.id = rq.module_id
  WHERE rq.user_id = NEW.user_id
    AND rq.pourcentage >= 70
    AND m.is_published = true
    AND m."order" < v_max_order
    AND (
      v_profile.role = 'admin'
      OR v_profile.plan = ANY(m.accessibilite)
    );

  -- Tous les modules requis (sauf le dernier) validés ?
  IF v_modules_valides < v_modules_requis THEN
    RETURN NEW;
  END IF;

  -- Génération numéro : IF-{YYYY}-{NNNNNN}
  v_year := to_char(now(), 'YYYY');
  v_seq := nextval('public.certificats_parcours_numero_seq');
  v_numero := 'IF-' || v_year || '-' || LPAD(v_seq::text, 6, '0');

  INSERT INTO public.certificats_parcours (
    numero, user_id, prenom, nom, email, plan, nb_modules_valides, date_obtention
  ) VALUES (
    v_numero, NEW.user_id,
    COALESCE(v_profile.prenom, ''), COALESCE(v_profile.nom, ''), COALESCE(v_profile.email, ''),
    v_profile.plan, v_modules_valides, NEW.date_quiz
  );

  RETURN NEW;
END;
$$;