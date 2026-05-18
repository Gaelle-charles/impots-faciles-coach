/**
 * Email de remerciement post-RDV — déclenché H+1 à H+2 après completed_at.
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

  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ error: 'missing RESEND_API_KEY' }), { status: 500 });
  }

  const now = Date.now();
  const since = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const until = new Date(now - 1 * 60 * 60 * 1000).toISOString();

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, user_id, user_email, user_name, accompagnant_name, completed_at')
    .eq('status', 'completed')
    .is('feedback_sent_at', null)
    .gte('completed_at', since)
    .lte('completed_at', until);

  if (error) {
    console.error('send-thank-you-email: query error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: any[] = [];

  for (const apt of appointments ?? []) {
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
      <p>Merci d'avoir pris le temps de cet échange avec ${escapeHtml(apt.accompagnant_name)}.
      Nous espérons qu'il vous a apporté la clarté souhaitée sur votre situation fiscale.</p>
      <p><strong>Comment s'est passé votre appel ?</strong> Vos retours nous aident à améliorer le service.</p>
      <p>Retrouvez le récap dans <a href="https://impotsfacile.com/mes-rendez-vous" style="color:#2C1338;">Mes rendez-vous</a>.</p>
    `;

    const html = renderEmailLayout({
      title: `Merci d'avoir échangé avec ${apt.accompagnant_name}`,
      bodyHtml,
      ctaButton: { label: 'Voir mes rendez-vous', url: 'https://impotsfacile.com/mes-rendez-vous' },
    });

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: apt.user_email,
          subject: `Merci d'avoir échangé avec ${apt.accompagnant_name}`,
          html,
        }),
      });
      results.push({ id: apt.id, ok: r.ok, status: r.status });
      if (r.ok) {
        await supabase
          .from('appointments')
          .update({ feedback_sent_at: new Date().toISOString() })
          .eq('id', apt.id);
      }
    } catch (e) {
      console.error('send-thank-you-email: send error', e);
      results.push({ id: apt.id, ok: false, error: String(e) });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
