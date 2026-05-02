CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prenom text;
  v_nom text;
  v_full_name text;
  v_parts text[];
BEGIN
  -- Email/password signup: utilise prenom/nom passés via options.data
  v_prenom := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'prenom', '')), '');
  v_nom := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'nom', '')), '');

  -- OAuth Google: given_name / family_name
  IF v_prenom IS NULL THEN
    v_prenom := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'given_name', '')), '');
  END IF;
  IF v_nom IS NULL THEN
    v_nom := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'family_name', '')), '');
  END IF;

  -- Fallback: parser "name" ou "full_name" (premier mot = prenom, reste = nom)
  IF v_prenom IS NULL AND v_nom IS NULL THEN
    v_full_name := NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    )), '');
    IF v_full_name IS NOT NULL THEN
      v_parts := regexp_split_to_array(v_full_name, '\s+');
      v_prenom := v_parts[1];
      IF array_length(v_parts, 1) > 1 THEN
        v_nom := array_to_string(v_parts[2:array_length(v_parts, 1)], ' ');
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, prenom, nom)
  VALUES (NEW.id, NEW.email, v_prenom, v_nom)
  ON CONFLICT (id) DO UPDATE
    SET prenom = COALESCE(public.profiles.prenom, EXCLUDED.prenom),
        nom = COALESCE(public.profiles.nom, EXCLUDED.nom),
        email = COALESCE(public.profiles.email, EXCLUDED.email);
  RETURN NEW;
END;
$function$;