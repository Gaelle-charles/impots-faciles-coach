import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Seo } from '@/components/Seo';

interface Appointment {
  id: string;
  accompagnant_name: string;
  scheduled_at: string;
  duration_minutes: number;
  amount_cents: number;
  currency: string;
  cal_booking_uid: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'refunded';
  meeting_url: string | null;
}

const STATUS_LABELS: Record<Appointment['status'], { label: string; className: string }> = {
  scheduled: { label: 'Programmé', className: 'bg-primary/10 text-primary border-primary/30' },
  completed: { label: 'Effectué', className: 'bg-green-100 text-green-800 border-green-300' },
  cancelled: { label: 'Annulé', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  no_show: { label: 'Non honoré', className: 'bg-red-100 text-red-800 border-red-300' },
  refunded: { label: 'Remboursé', className: 'bg-orange-100 text-orange-800 border-orange-300' },
};

export default function MesRendezVous() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('appointments')
      .select('id, accompagnant_name, scheduled_at, duration_minutes, amount_cents, currency, cal_booking_uid, status, meeting_url')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: false })
      .then(({ data }) => setAppointments((data as Appointment[]) ?? []));
  }, [user]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <Seo title="Mes rendez-vous d'accompagnement" description="Vos rendez-vous d'accompagnement fiscal pédagogique." path="/mes-rendez-vous" noindex />
      <h1 className="mb-8 font-display text-3xl md:text-4xl">Mes rendez-vous</h1>

      {appointments === null ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 rounded-2xl p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <h2 className="font-display text-xl">Aucun rendez-vous pour le moment</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Réservez un appel avec un accompagnant fiscal pédagogique pour comprendre votre situation.
          </p>
          <Button asChild variant="cta">
            <Link to="/accompagnement">Prendre rendez-vous</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <AppointmentCard key={apt.id} appointment={apt} />
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appointment: apt }: { appointment: Appointment }) {
  const date = new Date(apt.scheduled_at);
  const now = Date.now();
  const ts = date.getTime();
  const minutesUntil = (ts - now) / 60000;

  const canJoin =
    apt.status === 'scheduled' && apt.meeting_url && minutesUntil <= 15 && minutesUntil >= -60;
  const canCancel = apt.status === 'scheduled' && minutesUntil > 24 * 60;
  const tooLateToCancel = apt.status === 'scheduled' && minutesUntil <= 24 * 60 && minutesUntil > -60;

  const status = STATUS_LABELS[apt.status];
  const amountFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: apt.currency }).format(
    apt.amount_cents / 100,
  );
  const dateFmt = format(date, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });

  return (
    <Card className="rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium capitalize">{dateFmt}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Avec {apt.accompagnant_name} · {apt.duration_minutes} min · {amountFmt}
          </p>
        </div>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canJoin && (
          <Button asChild variant="cta" size="sm">
            <a href={apt.meeting_url!} target="_blank" rel="noopener noreferrer">
              <Video className="h-4 w-4" /> Rejoindre l'appel
            </a>
          </Button>
        )}
        {canCancel && (
          <Button asChild variant="outline" size="sm">
            <a
              href={`https://cal.com/booking/${apt.cal_booking_uid}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Annuler / Reprogrammer
            </a>
          </Button>
        )}
      </div>

      {tooLateToCancel && (
        <p className="mt-3 text-xs italic text-muted-foreground">
          Annulation impossible à moins de 24h.
        </p>
      )}
    </Card>
  );
}
