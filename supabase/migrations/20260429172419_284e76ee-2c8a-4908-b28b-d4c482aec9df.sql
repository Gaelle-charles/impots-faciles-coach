CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  categorie text NOT NULL CHECK (categorie IN ('bug', 'idee', 'autre')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 1500),
  page_url text,
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_user_insert"
  ON public.suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "suggestions_admin_select"
  ON public.suggestions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "suggestions_admin_update"
  ON public.suggestions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "suggestions_admin_delete"
  ON public.suggestions FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX idx_suggestions_unread
  ON public.suggestions(is_read, created_at DESC);

CREATE INDEX idx_suggestions_user
  ON public.suggestions(user_id);

-- Realtime
ALTER TABLE public.suggestions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;