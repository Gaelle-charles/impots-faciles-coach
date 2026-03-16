
CREATE OR REPLACE FUNCTION public.reorder_contenus_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ordre ASC) AS new_ordre
    FROM public.contenus
    WHERE module_id = OLD.module_id
  )
  UPDATE public.contenus c
  SET ordre = r.new_ordre
  FROM ranked r
  WHERE c.id = r.id AND c.ordre != r.new_ordre;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_contenu_delete_reorder
AFTER DELETE ON public.contenus
FOR EACH ROW
EXECUTE FUNCTION public.reorder_contenus_after_delete();
