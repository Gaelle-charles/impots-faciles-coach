import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Impôts Facile <info@impotsfacile.com>";

async function sendInvitationEmail(opts: {
  to: string; orgName: string; inviterName: string; acceptUrl: string; plan: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 16px;font-size:20px">Rappel : invitation à rejoindre <strong>${opts.orgName}</strong></h2>
      <p style="font-size:15px;line-height:1.55">
        ${opts.inviterName} vous a invité·e à rejoindre Impôts Facile (plan <strong>${opts.plan}</strong>).
      </p>
      <p style="margin:28px 0">
        <a href="${opts.acceptUrl}" style="background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Accepter l'invitation
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">Lien valable 7 jours.</p>
    </div>
  `;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [opts.to], subject: `Rappel : invitation ${opts.orgName} sur Impôts Facile`, html }),
  });
  if (!res.ok) throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
}

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

    const { invitation_id } = await req.json().catch(() => ({}));
    if (!invitation_id) return new Response(JSON.stringify({ error: "invitation_id manquant" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: inv } = await admin
      .from("organization_invitations")
      .select("id, organization_id, email, token, status")
      .eq("id", invitation_id)
      .maybeSingle();
    if (!inv) return new Response(JSON.stringify({ error: "Invitation introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (inv.status !== "pending") return new Response(JSON.stringify({ error: "Invitation non renouvelable" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: org } = await admin
      .from("organizations")
      .select("id, raison_sociale, plan, admin_user_id")
      .eq("id", inv.organization_id)
      .maybeSingle();
    if (!org || org.admin_user_id !== u.user.id) return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Reset expires_at à +7 jours
    await admin
      .from("organization_invitations")
      .update({ expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() })
      .eq("id", inv.id);

    const baseUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://impotsfacile.com";
    const acceptUrl = `${baseUrl.replace(/\/$/, "")}/impots-team/invitation/${inv.token}`;

    const { data: inviterProfile } = await admin.from("profiles").select("prenom, nom, email").eq("id", u.user.id).maybeSingle();
    const inviterName = [inviterProfile?.prenom, inviterProfile?.nom].filter(Boolean).join(" ").trim() || inviterProfile?.email || "Votre administrateur";

    await sendInvitationEmail({ to: inv.email, orgName: org.raison_sociale, inviterName, acceptUrl, plan: org.plan });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("team-resend-invitation error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
