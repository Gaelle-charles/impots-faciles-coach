/**
 * Email J+7 — ressources complémentaires post-RDV.
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
  const since = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
  const until = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, user_id, user_email, user_name, accompagnant_name')
    .eq('status', 'completed')
    .is('resources_sent_at', null)
    .gte('scheduled_at', since)
    .lte('scheduled_at', until);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

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
      <p>Cela fait une semaine que vous avez échangé avec ${escapeHtml(apt.accompagnant_name)}.
      Pour aller plus loin, voici quelques ressources de la plateforme qui peuvent vous aider :</p>
      <ul style="padding-left:20px;line-height:1.8;">
        <li><a href="https://impotsfacile.com/mes-modules" style="color:#2C1338;"><strong>Vos formations</strong></a> — les modules adaptés à votre profil</li>
        <li><a href="https://impotsfacile.com/mes-simulateurs" style="color:#2C1338;"><strong>Vos simulateurs</strong></a> — calculez votre impôt et vos frais</li>
        <li><a href="https://impotsfacile.com/fiches-personnalisees" style="color:#2C1338;"><strong>Votre parcours déclaration</strong></a> — fiches étape par étape</li>
      </ul>
      <p>N'hésitez pas à reprendre un rendez-vous si vous avez de nouvelles questions.</p>
    `;

    const html = renderEmailLayout({
      title: 'Vos ressources Impôts Facile',
      bodyHtml,
      ctaButton: { label: 'Accéder à mon espace', url: 'https://impotsfacile.com/dashboard' },
    });

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: apt.user_email,
          subject: 'Vos ressources Impôts Facile, une semaine après votre RDV',
          html,
        }),
      });
      results.push({ id: apt.id, ok: r.ok });
      if (r.ok) {
        await supabase.from('appointments').update({ resources_sent_at: new Date().toISOString() }).eq('id', apt.id);
      }
    } catch (e) {
      console.error('send-resources-email: send error', e);
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
