-- 1) Vue: modules + nombre réel de contenus
CREATE OR REPLACE VIEW public.modules_with_counts
WITH (security_invoker = true)
AS
SELECT 
  m.*,
  COALESCE(
    (SELECT COUNT(*)::int FROM public.contenus c WHERE c.module_id = m.id),
    0
  ) AS nb_steps_total
FROM public.modules m;

GRANT SELECT ON public.modules_with_counts TO authenticated;
GRANT SELECT ON public.modules_with_counts TO anon;

-- 2) Fonction: progression d'un user sur un module
-- Modèle actuel: 1 row par (user, module) avec un compteur step + completion_date
-- nb_completed = total si completion_date, sinon LEAST(step, total)
CREATE OR REPLACE FUNCTION public.get_module_progress(p_module_id uuid, p_user_id uuid)
RETURNS TABLE (nb_total int, nb_completed int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH t AS (
    SELECT (SELECT COUNT(*)::int FROM public.contenus WHERE module_id = p_module_id) AS total
  ),
  p AS (
    SELECT step, completion_date
    FROM public.progressions
    WHERE module_id = p_module_id AND user_id = p_user_id
    LIMIT 1
  )
  SELECT 
    t.total AS nb_total,
    CASE
      WHEN p.completion_date IS NOT NULL THEN t.total
      WHEN p.step IS NULL THEN 0
      WHEN p.step > t.total THEN t.total
      ELSE p.step
    END AS nb_completed
  FROM t LEFT JOIN p ON true;
$$;

GRANT EXECUTE ON FUNCTION public.get_module_progress(uuid, uuid) TO authenticated;

-- 3) Fonction: progression globale d'un user
-- Note: user_can_access_module(_module_id) lit auth.uid() en interne,
-- donc on inline le check d'accès via profiles.plan = ANY(m.accessibilite)
CREATE OR REPLACE FUNCTION public.get_user_global_progress(p_user_id uuid)
RETURNS TABLE (
  total_steps int,
  completed_steps int,
  modules_accessible int,
  modules_completed int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_plan AS (
    SELECT plan, role FROM public.profiles WHERE id = p_user_id
  ),
  accessible AS (
    SELECT m.id
    FROM public.modules m, user_plan u
    WHERE m.is_published = true
      AND (
        u.role = 'admin'
        OR u.plan = ANY(m.accessibilite)
      )
  ),
  step_counts AS (
    SELECT 
      a.id AS module_id,
      (SELECT COUNT(*)::int FROM public.contenus WHERE module_id = a.id) AS total,
      (SELECT 
         CASE
           WHEN pr.completion_date IS NOT NULL 
             THEN (SELECT COUNT(*)::int FROM public.contenus WHERE module_id = a.id)
           WHEN pr.step IS NULL THEN 0
           WHEN pr.step > (SELECT COUNT(*)::int FROM public.contenus WHERE module_id = a.id)
             THEN (SELECT COUNT(*)::int FROM public.contenus WHERE module_id = a.id)
           ELSE pr.step
         END
       FROM public.progressions pr
       WHERE pr.module_id = a.id AND pr.user_id = p_user_id
       LIMIT 1) AS done
    FROM accessible a
  )
  SELECT 
    COALESCE(SUM(total), 0)::int AS total_steps,
    COALESCE(SUM(COALESCE(done, 0)), 0)::int AS completed_steps,
    (SELECT COUNT(*)::int FROM accessible) AS modules_accessible,
    (SELECT COUNT(*)::int FROM step_counts WHERE total > 0 AND COALESCE(done, 0) >= total) AS modules_completed
  FROM step_counts;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_global_progress(uuid) TO authenticated;