// Edge function one-shot pour convertir contenu_sections.sections[].content_md → content_html
// Idempotent : ne fait rien sur les sections déjà migrées.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { marked } from 'https://esm.sh/marked@12.0.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Section {
  key?: string;
  title?: string;
  content_md?: string;
  content_html?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Vérifie l'utilisateur (admin)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: passeports, error } = await admin
      .from('passeports_fiscaux')
      .select('id, contenu_sections');
    if (error) throw error;

    let migrated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; message: string }> = [];

    for (const p of passeports ?? []) {
      try {
        const cs = (p.contenu_sections ?? {}) as { sections?: Section[] };
        const sections = Array.isArray(cs.sections) ? cs.sections : [];
        let changed = false;
        const newSections = sections.map((s) => {
          if (s.content_html && s.content_html.trim().length > 0) {
            // Déjà migré : on retire content_md résiduel si présent
            if (s.content_md !== undefined) {
              changed = true;
              const { content_md, ...rest } = s;
              return rest;
            }
            return s;
          }
          if (s.content_md && s.content_md.trim().length > 0) {
            const html = marked.parse(s.content_md, { async: false }) as string;
            changed = true;
            const { content_md, ...rest } = s;
            return { ...rest, content_html: html };
          }
          return s;
        });

        if (!changed) {
          skipped++;
          continue;
        }

        const { error: updErr } = await admin
          .from('passeports_fiscaux')
          .update({ contenu_sections: { ...cs, sections: newSections } })
          .eq('id', p.id);
        if (updErr) throw updErr;
        migrated++;
      } catch (e) {
        errors.push({ id: p.id, message: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ migrated, skipped, errors, total: passeports?.length ?? 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
