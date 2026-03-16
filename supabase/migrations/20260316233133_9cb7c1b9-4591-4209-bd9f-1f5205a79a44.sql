
CREATE TABLE IF NOT EXISTS public.simulations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nom text DEFAULT 'Ma simulation',
  donnees jsonb NOT NULL,
  impot_net numeric,
  taux_moyen numeric,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own simulations" ON public.simulations
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access simulations" ON public.simulations
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
