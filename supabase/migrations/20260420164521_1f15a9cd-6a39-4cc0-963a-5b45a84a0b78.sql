-- 1. Nettoyage d'éventuelles anciennes policies UPDATE sur profiles
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;

-- 2. Trigger qui empêche tout non-admin de modifier role / plan
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Les admins peuvent tout modifier
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Pour les autres, on force role et plan à rester inchangés
  NEW.role := OLD.role;
  NEW.plan := OLD.plan;
  NEW.date_paiement := OLD.date_paiement;
  NEW.is_active := OLD.is_active;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Recréer la policy UPDATE simple (le trigger gère la sécurité fine)
CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Vérifier que la policy admin existe toujours (déjà en place mais on s'assure)
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
-- La policy "Admins full access profiles" existe déjà — on ne la touche pas.