-- Ajout colonne tentative_numero
ALTER TABLE public.resultat_quiz
  ADD COLUMN IF NOT EXISTS tentative_numero integer NOT NULL DEFAULT 1;

-- Index unique pour empêcher les doublons sur (user, module, tentative)
CREATE UNIQUE INDEX IF NOT EXISTS resultat_quiz_user_module_tentative_unique
  ON public.resultat_quiz (user_id, module_id, tentative_numero);

-- Refonte du trigger de validation pour gérer le max 3 tentatives
CREATE OR REPLACE FUNCTION public.validate_resultat_quiz()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
  progression_exists boolean;
  current_attempts int;
BEGIN
  caller_role := auth.role();

  -- Backend de confiance : on laisse passer (webhooks, admin SQL editor)
  IF caller_role IS NULL OR caller_role != 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- Admins applicatifs : passage libre
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- === Validations arithmétiques ===
  IF NEW.score_max IS NULL OR NEW.score_max <= 0 THEN
    RAISE EXCEPTION 'score_max invalide (doit être > 0)' USING ERRCODE = '22023';
  END IF;

  IF NEW.score IS NULL OR NEW.score < 0 THEN
    RAISE EXCEPTION 'score invalide (doit être ≥ 0)' USING ERRCODE = '22023';
  END IF;

  IF NEW.score > NEW.score_max THEN
    RAISE EXCEPTION 'score ne peut pas dépasser score_max' USING ERRCODE = '22023';
  END IF;

  -- === Recalcul serveur du pourcentage ===
  NEW.pourcentage := ROUND((NEW.score::numeric * 100) / NEW.score_max);

  -- === Anti-triche : module complété ===
  SELECT EXISTS (
    SELECT 1 FROM public.progressions p
    WHERE p.user_id = NEW.user_id
      AND p.module_id = NEW.module_id
      AND p.completion_date IS NOT NULL
  ) INTO progression_exists;

  IF NOT progression_exists THEN
    RAISE EXCEPTION 'Module non complété : quiz non autorisé' USING ERRCODE = '42501';
  END IF;

  -- === Limite 3 tentatives sur INSERT ===
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO current_attempts
    FROM public.resultat_quiz
    WHERE user_id = NEW.user_id AND module_id = NEW.module_id;

    IF current_attempts >= 3 THEN
      RAISE EXCEPTION 'Nombre maximum de tentatives atteint (3)' USING ERRCODE = '42501';
    END IF;

    -- Auto-attribution du numéro de tentative (1, 2 ou 3)
    NEW.tentative_numero := current_attempts + 1;

    IF NEW.tentative_numero > 3 THEN
      RAISE EXCEPTION 'Tentative invalide (max 3)' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- (Re)attache le trigger en BEFORE INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_validate_resultat_quiz ON public.resultat_quiz;
CREATE TRIGGER trg_validate_resultat_quiz
  BEFORE INSERT OR UPDATE ON public.resultat_quiz
  FOR EACH ROW EXECUTE FUNCTION public.validate_resultat_quiz();

-- Backfill : numéroter les éventuels résultats existants par ordre chronologique
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, module_id ORDER BY date_quiz ASC) AS rn
  FROM public.resultat_quiz
)
UPDATE public.resultat_quiz r
SET tentative_numero = LEAST(ranked.rn, 3)
FROM ranked
WHERE r.id = ranked.id;