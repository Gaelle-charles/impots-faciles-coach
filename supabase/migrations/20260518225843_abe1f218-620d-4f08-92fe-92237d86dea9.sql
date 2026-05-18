CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  user_name text,
  accompagnant_name text NOT NULL DEFAULT 'Laure',
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  amount_cents int NOT NULL DEFAULT 10000,
  currency text NOT NULL DEFAULT 'EUR',
  cal_booking_uid text UNIQUE NOT NULL,
  cal_event_type_id int,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'scheduled',
  meeting_url text,
  cancellation_reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  feedback_sent_at timestamptz,
  resources_sent_at timestamptz,
  followup_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX idx_appointments_scheduled_at ON public.appointments(scheduled_at DESC);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_email_status
  ON public.appointments(user_email, status);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "appointments_admin_all"
  ON public.appointments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organizations_updated_at();