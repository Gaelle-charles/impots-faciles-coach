
CREATE OR REPLACE FUNCTION public.update_module_total_step()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.modules
    SET total_step = (SELECT COUNT(*) FROM public.contenus WHERE module_id = OLD.module_id)
    WHERE id = OLD.module_id;
    RETURN OLD;
  ELSE
    UPDATE public.modules
    SET total_step = (SELECT COUNT(*) FROM public.contenus WHERE module_id = NEW.module_id)
    WHERE id = NEW.module_id;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER on_contenu_change
AFTER INSERT OR DELETE ON public.contenus
FOR EACH ROW
EXECUTE FUNCTION public.update_module_total_step();
