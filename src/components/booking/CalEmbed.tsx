import { useEffect } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';
import { CAL_BRAND_COLOR } from '@/lib/cal-config';

interface CalEmbedProps {
  calLink: string;
  prefillEmail?: string;
  prefillName?: string;
}

/**
 * Embed Cal.com pour réserver un RDV d'accompagnement.
 * Le paiement Stripe est géré nativement par Cal.com.
 * Le succès / annulation déclenche un webhook → table appointments.
 */
export function CalEmbed({ calLink, prefillEmail, prefillName }: CalEmbedProps) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal('ui', {
        theme: 'light',
        styles: { branding: { brandColor: CAL_BRAND_COLOR } },
        hideEventTypeDetails: false,
      });
    })();
  }, []);

  const config: Record<string, string> = {};
  if (prefillEmail) config.email = prefillEmail;
  if (prefillName) config.name = prefillName;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
      <Cal
        calLink={calLink}
        calOrigin="https://cal.eu"
        style={{ width: '100%', height: '700px', overflow: 'scroll' }}
        config={config}
      />
    </div>
  );
}
