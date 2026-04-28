-- Séquence pour numéros de certificats
CREATE SEQUENCE IF NOT EXISTS public.certificats_numero_seq START 1;

-- Table certificats
CREATE TABLE public.certificats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  module_id uuid NOT NULL,
  module_titre text NOT NULL,
  module_slug text NOT NULL,
  prenom text,
  nom text,
  email text,
  pourcentage numeric NOT NULL,
  score integer NOT NULL,
  score_max integer NOT NULL,
  tentative_numero integer NOT NULL,
  date_obtention timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

CREATE INDEX idx_certificats_user ON public.certificats(user_id);
CREATE INDEX idx_certificats_numero ON public.certificats(numero);

-- RLS
ALTER TABLE public.certificats ENABLE ROW LEVEL SECURITY;

-- Le propriétaire lit ses certificats
CREATE POLICY certificats_select_own
  ON public.certificats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Vérification publique : tout le monde (anon + authenticated) peut SELECT par numéro
-- (la lookup se fait par numero unique côté front, pas d'énumération facile)
CREATE POLICY certificats_select_public_verify
  ON public.certificats FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin all
CREATE POLICY certificats_admin_all
  ON public.certificats FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Génération auto du certificat après réussite (pourcentage >= 70)
CREATE OR REPLACE FUNCTION public.create_certificat_on_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module record;
  v_profile record;
  v_existing record;
  v_numero text;
  v_year text;
  v_seq bigint;
BEGIN
  -- Seuil 70%
  IF NEW.pourcentage < 70 THEN
    RETURN NEW;
  END IF;

  SELECT id, titre, module_slug INTO v_module FROM public.modules WHERE id = NEW.module_id;
  IF v_module IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT prenom, nom, email INTO v_profile FROM public.profiles WHERE id = NEW.user_id;

  -- Existe-t-il déjà un certificat pour ce user/module ?
  SELECT id, pourcentage INTO v_existing
  FROM public.certificats
  WHERE user_id = NEW.user_id AND module_id = NEW.module_id;

  IF v_existing.id IS NOT NULL THEN
    -- Mise à jour seulement si meilleur score
    IF NEW.pourcentage > v_existing.pourcentage THEN
      UPDATE public.certificats
      SET pourcentage = NEW.pourcentage,
          score = NEW.score,
          score_max = NEW.score_max,
          tentative_numero = NEW.tentative_numero,
          date_obtention = NEW.date_quiz
      WHERE id = v_existing.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Génération numéro : IF-{YYYY}-{000001}
  v_year := to_char(now(), 'YYYY');
  v_seq := nextval('public.certificats_numero_seq');
  v_numero := 'IF-' || v_year || '-' || LPAD(v_seq::text, 6, '0');

  INSERT INTO public.certificats (
    numero, user_id, module_id, module_titre, module_slug,
    prenom, nom, email,
    pourcentage, score, score_max, tentative_numero, date_obtention
  ) VALUES (
    v_numero, NEW.user_id, v_module.id, v_module.titre, v_module.module_slug,
    COALESCE(v_profile.prenom, ''), COALESCE(v_profile.nom, ''), COALESCE(v_profile.email, ''),
    NEW.pourcentage, NEW.score, NEW.score_max, NEW.tentative_numero, NEW.date_quiz
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_certificat_on_success
AFTER INSERT ON public.resultat_quiz
FOR EACH ROW
EXECUTE FUNCTION public.create_certificat_on_success();

-- Backfill : créer les certificats pour les réussites existantes (>= 70%)
INSERT INTO public.certificats (
  numero, user_id, module_id, module_titre, module_slug,
  prenom, nom, email,
  pourcentage, score, score_max, tentative_numero, date_obtention
)
SELECT
  'IF-' || to_char(rq.date_quiz, 'YYYY') || '-' || LPAD(nextval('public.certificats_numero_seq')::text, 6, '0'),
  rq.user_id, rq.module_id, m.titre, m.module_slug,
  COALESCE(p.prenom, ''), COALESCE(p.nom, ''), COALESCE(p.email, ''),
  rq.pourcentage, rq.score, rq.score_max, rq.tentative_numero, rq.date_quiz
FROM (
  SELECT DISTINCT ON (user_id, module_id) *
  FROM public.resultat_quiz
  WHERE pourcentage >= 70
  ORDER BY user_id, module_id, pourcentage DESC, date_quiz ASC
) rq
JOIN public.modules m ON m.id = rq.module_id
LEFT JOIN public.profiles p ON p.id = rq.user_id
ON CONFLICT (user_id, module_id) DO NOTHING;