import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Impôts Facile <info@impotsfacile.com>";

function generateToken(len = 48) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendInvitationEmail(opts: {
  to: string;
  orgName: string;
  inviterName: string;
  acceptUrl: string;
  plan: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[team-invite-member] RESEND_API_KEY missing — skipping email send");
    return;
  }
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 16px;font-size:20px">Vous êtes invité·e à rejoindre <strong>${opts.orgName}</strong> sur Impôts Facile</h2>
      <p style="font-size:15px;line-height:1.55">
        ${opts.inviterName} vous offre un accès <strong>${opts.plan}</strong> à Impôts Facile,
        la plateforme pour comprendre et optimiser vos impôts personnels.
      </p>
      <p style="margin:28px 0">
        <a href="${opts.acceptUrl}" style="background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Accepter l'invitation
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">
        Ce lien est valable 7 jours. Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
        <span style="word-break:break-all">${opts.acceptUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="font-size:12px;color:#94a3b8">Impôts Facile · contact@impotsfacile.com</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [opts.to],
      subject: `Invitation à rejoindre ${opts.orgName} sur Impôts Facile`,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[team-invite-member] Resend error:", res.status, text);
    throw new Error(`Email send failed: ${res.status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = u.user;

    const { organization_id, email } = await req.json().catch(() => ({}));
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    if (!organization_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: "Email ou organization_id invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: org } = await admin
      .from("organizations")
      .select("id, raison_sociale, plan, nb_licences, admin_user_id")
      .eq("id", organization_id)
      .maybeSingle();

    if (!org) {
      return new Response(JSON.stringify({ error: "Organisation introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (org.admin_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier les licences disponibles (membres actifs + invitations pending)
    const { count: activeMembers } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .is("removed_at", null);

    const { count: pendingInvites } = await admin
      .from("organization_invitations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("status", "pending");

    const used = (activeMembers ?? 0) + (pendingInvites ?? 0);
    if (used >= org.nb_licences) {
      return new Response(
        JSON.stringify({ error: "Toutes les licences sont prises. Augmentez le nombre de licences avant d'inviter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Doublon : invitation pending OU member actif déjà ?
    const { data: existingInv } = await admin
      .from("organization_invitations")
      .select("id, status")
      .eq("organization_id", org.id)
      .ilike("email", cleanEmail)
      .eq("status", "pending")
      .maybeSingle();
    if (existingInv) {
      return new Response(JSON.stringify({ error: "Une invitation en attente existe déjà pour cet email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingMember } = await admin
      .from("organization_members")
      .select("id, removed_at")
      .eq("organization_id", org.id)
      .ilike("email", cleanEmail)
      .is("removed_at", null)
      .maybeSingle();
    if (existingMember) {
      return new Response(JSON.stringify({ error: "Cet email est déjà membre actif de l'organisation" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = generateToken(32);

    const { data: inv, error: invErr } = await admin
      .from("organization_invitations")
      .insert({
        organization_id: org.id,
        email: cleanEmail,
        token,
        invited_by: user.id,
        status: "pending",
      })
      .select("id, token, expires_at")
      .single();

    if (invErr || !inv) {
      console.error("[team-invite-member] insert error:", invErr);
      return new Response(JSON.stringify({ error: invErr?.message ?? "Création invitation échouée" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://impotsfacile.com";
    const acceptUrl = `${baseUrl.replace(/\/$/, "")}/impots-team/invitation/${inv.token}`;

    // Inviter name
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("prenom, nom, email")
      .eq("id", user.id)
      .maybeSingle();
    const inviterName = [inviterProfile?.prenom, inviterProfile?.nom].filter(Boolean).join(" ").trim()
      || inviterProfile?.email || "Votre administrateur";

    try {
      await sendInvitationEmail({
        to: cleanEmail,
        orgName: org.raison_sociale,
        inviterName,
        acceptUrl,
        plan: org.plan,
      });
    } catch (e) {
      console.error("[team-invite-member] email send failed:", e);
      // L'invitation reste créée — l'admin pourra la renvoyer.
      return new Response(JSON.stringify({
        success: true,
        warning: "Invitation créée mais l'envoi de l'email a échoué. Utilisez 'Renvoyer'.",
        invitation_id: inv.id,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, invitation_id: inv.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("team-invite-member error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
