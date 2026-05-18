/**
 * Email J+90 — relance "cela fait 3 mois". Skip si nouveau RDV pris depuis.
 * Cron horaire.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderEmailLayout } from '../_shared/email-templates.ts';

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
  const FROM = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Impôts Facile <noreply@impotsfacile.com>';
  if (!RESEND_KEY) return new Response('missing key', { status: 500 });

  const now = Date.now();
  const since = new Date(now - 91 * 24 * 60 * 60 * 1000).toISOString();
  const until = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, user_id, user_email, user_name, accompagnant_name, scheduled_at')
    .eq('status', 'completed')
    .is('followup_sent_at', null)
    .gte('scheduled_at', since)
    .lte('scheduled_at', until);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: any[] = [];

  for (const apt of appointments ?? []) {
    // Skip si nouveau RDV existe pour ce user depuis
    if (apt.user_id) {
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', apt.user_id)
        .gt('scheduled_at', apt.scheduled_at)
        .neq('id', apt.id);

      if (count && count > 0) {
        await supabase
          .from('appointments')
          .update({ followup_sent_at: new Date().toISOString() })
          .eq('id', apt.id);
        results.push({ id: apt.id, skipped: true });
        continue;
      }
    }

    let prenom = apt.user_name?.split(' ')[0] ?? '';
    if (apt.user_id) {
      const { data: p } = await supabase
        .from('profiles')
        .select('prenom')
        .eq('id', apt.user_id)
        .maybeSingle();
      if (p?.prenom) prenom = p.prenom;
    }

    const bodyHtml = `
      <p>Bonjour ${escapeHtml(prenom || 'à vous')},</p>
      <p>Cela fait trois mois que vous avez échangé avec ${escapeHtml(apt.accompagnant_name)}.
      Votre situation fiscale a peut-être évolué, ou de nouvelles questions sont apparues.</p>
      <p>Si vous le souhaitez, vous pouvez reprendre un rendez-vous d'accompagnement pédagogique
      pour faire le point.</p>
    `;

    const html = renderEmailLayout({
      title: 'Trois mois après votre rendez-vous',
      bodyHtml,
      ctaButton: { label: 'Prendre un nouveau rendez-vous', url: 'https://impotsfacile.com/accompagnement' },
    });

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: apt.user_email,
          subject: 'Trois mois après votre rendez-vous Impôts Facile',
          html,
        }),
      });
      results.push({ id: apt.id, ok: r.ok });
      if (r.ok) {
        await supabase.from('appointments').update({ followup_sent_at: new Date().toISOString() }).eq('id', apt.id);
      }
    } catch (e) {
      console.error('send-followup-email: send error', e);
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
