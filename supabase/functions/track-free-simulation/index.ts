import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Salt: réutilise la service role key comme matériau secret (pas exposé client).
const SALT = SERVICE_ROLE;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const fwd = req.headers.get('x-forwarded-for') ?? '';
    const ip = (fwd.split(',')[0] || 'unknown').trim();
    const ip_hash = await sha256(`${SALT}:${ip}`);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from('free_simulations_log')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ip_hash)
      .gte('created_at', since);

    if (countError) throw countError;

    const currentCount = count ?? 0;

    if (currentCount >= 2) {
      return new Response(
        JSON.stringify({ limit_reached: true, count: currentCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const { error: insertError } = await supabase
      .from('free_simulations_log')
      .insert({ ip_hash });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ limit_reached: false, count: currentCount + 1 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e) {
    console.error('track-free-simulation error', e);
    return new Response(
      JSON.stringify({ error: 'internal_error', limit_reached: false, count: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }
});
