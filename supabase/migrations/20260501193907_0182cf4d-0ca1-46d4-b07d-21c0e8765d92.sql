-- Enable RLS and add read policies for passeports_fiscaux
ALTER TABLE public.passeports_fiscaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passeports_fiscaux_admin_all"
ON public.passeports_fiscaux
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "passeports_fiscaux_select_premium"
ON public.passeports_fiscaux
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND plan = 'premium'
    )
  )
);