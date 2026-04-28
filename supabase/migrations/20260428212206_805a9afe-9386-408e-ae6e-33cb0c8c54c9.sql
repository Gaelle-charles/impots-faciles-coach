-- 1. Drop ancien système (certificats par module)
DROP TRIGGER IF EXISTS trg_create_certificat_on_success ON public.resultat_quiz;
DROP FUNCTION IF EXISTS public.create_certificat_on_success();
DROP TABLE IF EXISTS public.certificats;
DROP SEQUENCE IF EXISTS public.certificats_numero_seq;

-- 2. Nouvelle séquence pour numéros de certificats parcours
CREATE SEQUENCE IF NOT EXISTS public.certificats_parcours_numero_seq START 1;

-- 3. Nouvelle table : 1 certificat par user (parcours complet)
CREATE TABLE public.certificats_parcours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  user_id uuid NOT NULL UNIQUE,
  prenom text,
  nom text,
  email text,
  plan text NOT NULL,
  nb_modules_valides int NOT NULL,
  date_obtention timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificats_parcours_user ON public.certificats_parcours(user_id);
CREATE INDEX idx_certificats_parcours_numero ON public.certificats_parcours(numero);

-- 4. RLS
ALTER TABLE public.certificats_parcours ENABLE ROW LEVEL SECURITY;

CREATE POLICY certificats_parcours_select_own
  ON public.certificats_parcours FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY certificats_parcours_select_public_verify
  ON public.certificats_parcours FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY certificats_parcours_admin_all
  ON public.certificats_parcours FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- 5. Fonction trigger : génère le certificat de parcours si tous les modules accessibles sont validés ≥70%
CREATE OR REPLACE FUNCTION public.create_certificat_parcours_on_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_modules_accessibles int;
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

  -- Déjà un certificat de parcours pour ce user ? on ne refait rien
  SELECT id INTO v_existing_id
  FROM public.certificats_parcours
  WHERE user_id = NEW.user_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Compte les modules publiés accessibles au plan de l'user
  SELECT COUNT(*) INTO v_modules_accessibles
  FROM public.modules m
  WHERE m.is_published = true
    AND (
      v_profile.role = 'admin'
      OR v_profile.plan = ANY(m.accessibilite)
    );

  IF v_modules_accessibles = 0 THEN
    RETURN NEW;
  END IF;

  -- Compte les modules pour lesquels le user a au moins 1 résultat ≥70%
  SELECT COUNT(DISTINCT rq.module_id) INTO v_modules_valides
  FROM public.resultat_quiz rq
  JOIN public.modules m ON m.id = rq.module_id
  WHERE rq.user_id = NEW.user_id
    AND rq.pourcentage >= 70
    AND m.is_published = true
    AND (
      v_profile.role = 'admin'
      OR v_profile.plan = ANY(m.accessibilite)
    );

  -- Tous les modules accessibles validés ?
  IF v_modules_valides < v_modules_accessibles THEN
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

-- 6. Trigger sur resultat_quiz
DROP TRIGGER IF EXISTS trg_create_certificat_parcours ON public.resultat_quiz;
CREATE TRIGGER trg_create_certificat_parcours
AFTER INSERT ON public.resultat_quiz
FOR EACH ROW
EXECUTE FUNCTION public.create_certificat_parcours_on_success();