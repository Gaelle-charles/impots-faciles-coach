CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, prenom, nom)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'prenom', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'nom', '')), '')
  )
  ON CONFLICT (id) DO UPDATE
    SET prenom = COALESCE(EXCLUDED.prenom, public.profiles.prenom),
        nom = COALESCE(EXCLUDED.nom, public.profiles.nom);
  RETURN NEW;
END;
$function$;