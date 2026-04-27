import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return new Response(JSON.stringify({ error: "Token invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { member_id } = await req.json().catch(() => ({}));
    if (!member_id) return new Response(JSON.stringify({ error: "member_id manquant" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: m } = await admin
      .from("organization_members")
      .select("id, organization_id, role, user_id, removed_at")
      .eq("id", member_id)
      .maybeSingle();
    if (!m) return new Response(JSON.stringify({ error: "Membre introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: org } = await admin.from("organizations").select("admin_user_id").eq("id", m.organization_id).maybeSingle();
    if (!org || org.admin_user_id !== u.user.id) return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (m.role === "admin") return new Response(JSON.stringify({ error: "Impossible de retirer l'administrateur" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (m.removed_at) return new Response(JSON.stringify({ error: "Membre déjà retiré" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await admin
      .from("organization_members")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", m.id);

    // Le membre conserve ses progressions mais perd l'accès aux modules payants : on revient au plan freemium
    if (m.user_id) {
      await admin
        .from("profiles")
        .update({ plan: "freemium", organization_id: null })
        .eq("id", m.user_id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("team-remove-member error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
