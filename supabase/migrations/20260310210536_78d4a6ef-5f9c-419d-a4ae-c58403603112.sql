
-- Security definer function to check admin role (avoids recursion on profiles)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  );
$$;

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ==================== PROGRESSIONS ====================
DROP POLICY IF EXISTS "Users read own progressions" ON public.progressions;
DROP POLICY IF EXISTS "Users update own progressions" ON public.progressions;
DROP POLICY IF EXISTS "Users insert own progressions" ON public.progressions;

CREATE POLICY "Users read own progressions" ON public.progressions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own progressions" ON public.progressions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users insert own progressions" ON public.progressions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access progressions" ON public.progressions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ==================== RESULTAT_QUIZ ====================
DROP POLICY IF EXISTS "Users read own results" ON public.resultat_quiz;
DROP POLICY IF EXISTS "Users insert own results" ON public.resultat_quiz;

CREATE POLICY "Users read own results" ON public.resultat_quiz FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own results" ON public.resultat_quiz FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access resultat_quiz" ON public.resultat_quiz FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ==================== MODULES ====================
DROP POLICY IF EXISTS "Public read modules" ON public.modules;

CREATE POLICY "Authenticated read modules" ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access modules" ON public.modules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ==================== CONTENUS ====================
DROP POLICY IF EXISTS "Public read contenus" ON public.contenus;

CREATE POLICY "Authenticated read contenus" ON public.contenus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access contenus" ON public.contenus FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ==================== QUIZZ ====================
DROP POLICY IF EXISTS "Public read quizz" ON public.quizz;

CREATE POLICY "Authenticated read quizz" ON public.quizz FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access quizz" ON public.quizz FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ==================== METIERS ====================
DROP POLICY IF EXISTS "Public read metiers" ON public.metiers;

CREATE POLICY "Authenticated read metiers" ON public.metiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access metiers" ON public.metiers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
