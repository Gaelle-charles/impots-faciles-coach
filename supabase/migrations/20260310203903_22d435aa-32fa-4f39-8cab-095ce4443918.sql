
-- Table modules
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  module_slug TEXT NOT NULL UNIQUE,
  "order" INTEGER NOT NULL DEFAULT 0,
  total_step INTEGER NOT NULL DEFAULT 0,
  accessibilite TEXT[] NOT NULL DEFAULT '{}',
  text_resultat_expert TEXT,
  text_resultat_moyen TEXT,
  text_resultat_faible TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table contenus
CREATE TABLE public.contenus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  contenu TEXT,
  texte_2 TEXT,
  image_url TEXT,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 0,
  type_contenu TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table quizz
CREATE TABLE public.quizz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_quizz TEXT,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT '{}',
  bonne_reponse TEXT NOT NULL,
  explication TEXT,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table progressions
CREATE TABLE public.progressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  step INTEGER NOT NULL DEFAULT 0,
  completion_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Table resultat_quiz
CREATE TABLE public.resultat_quiz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  score_max INTEGER NOT NULL DEFAULT 0,
  pourcentage NUMERIC NOT NULL DEFAULT 0,
  date_quiz TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultat_quiz ENABLE ROW LEVEL SECURITY;

-- Modules, contenus, quizz: lecture publique
CREATE POLICY "Public read modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Public read contenus" ON public.contenus FOR SELECT USING (true);
CREATE POLICY "Public read quizz" ON public.quizz FOR SELECT USING (true);

-- Progressions: utilisateur voit/modifie ses propres données
CREATE POLICY "Users read own progressions" ON public.progressions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progressions" ON public.progressions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progressions" ON public.progressions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Resultat_quiz: idem
CREATE POLICY "Users read own results" ON public.resultat_quiz FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own results" ON public.resultat_quiz FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
