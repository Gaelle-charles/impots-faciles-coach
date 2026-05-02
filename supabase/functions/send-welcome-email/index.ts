// Edge function: send-welcome-email
// Envoie un email de bienvenue à un user qui vient de confirmer son email
// (signup classique) ou de se connecter pour la 1ère fois (Google OAuth).
// Idempotent : marque profiles.welcome_email_sent_at pour ne jamais doublonner.
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Impôts Facile <info@impotsfacile.com>";
const APP_URL = (Deno.env.get("PUBLIC_APP_URL") ?? "https://www.impotsfacile.com").replace(/\/$/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Récupère profile + check anti-doublon
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, email, prenom, plan, welcome_email_sent_at, code_postal, situation_familiale")
      .eq("id", u.user.id)
      .maybeSingle();

    if (profErr || !profile) {
      // Profil pas encore créé (trigger handle_new_user en cours) — on skip silencieusement.
      // Le prochain SIGNED_IN déclenchera à nouveau l'envoi.
      console.warn("[send-welcome-email] profile not found yet for", u.user.id);
      return new Response(JSON.stringify({ skipped: true, reason: "profile_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.welcome_email_sent_at) {
      return new Response(JSON.stringify({ already_sent: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.warn("[send-welcome-email] RESEND_API_KEY manquant — skip");
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Onboarding considéré "fait" si code_postal + situation_familiale renseignés
    const onboardingDone = !!(profile.code_postal && profile.situation_familiale);
    const ctaUrl = onboardingDone ? `${APP_URL}/dashboard` : `${APP_URL}/onboarding`;
    const ctaLabel = onboardingDone ? "Accéder à mon espace" : "Compléter mon profil";

    const greeting = profile.prenom ? `Bonjour ${profile.prenom},` : "Bonjour,";
    const recipient = profile.email || u.user.email!;

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;background:#ffffff">
        <div style="text-align:center;padding:24px 0;background:#2C1338;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:26px;color:#F9E900;font-weight:700">
            Bienvenue chez Impôts Facile 🎉
          </h1>
        </div>

        <div style="padding:28px 8px 8px">
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px">${greeting}</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px">
            Merci d'avoir rejoint <strong>Impôts Facile</strong> ! Nous sommes ravis de vous compter parmi nous.
            Notre mission : vous rendre la fiscalité <strong>simple, claire et accessible</strong>.
          </p>

          <h2 style="font-size:18px;color:#2C1338;margin:32px 0 12px">Voici ce qui vous attend :</h2>
          
          <div style="background:#FFF8C2;border-left:4px solid #F9E900;border-radius:6px;padding:16px 18px;margin:0 0 14px">
            <div style="font-weight:700;color:#2C1338;margin-bottom:4px">📚 Des modules de formation</div>
            <div style="font-size:14px;color:#475569;line-height:1.5">
              Apprenez à votre rythme la fiscalité française avec nos modules pédagogiques (impôt sur le revenu, déclarations, optimisation…).
            </div>
          </div>

          <div style="background:#FFF8C2;border-left:4px solid #F9E900;border-radius:6px;padding:16px 18px;margin:0 0 14px">
            <div style="font-weight:700;color:#2C1338;margin-bottom:4px">🧮 Des simulateurs</div>
            <div style="font-size:14px;color:#475569;line-height:1.5">
              Calculez votre impôt, votre quotient familial, vos crédits et réductions, votre PAS… en quelques clics.
            </div>
          </div>

          <div style="background:#FFF8C2;border-left:4px solid #F9E900;border-radius:6px;padding:16px 18px;margin:0 0 14px">
            <div style="font-weight:700;color:#2C1338;margin-bottom:4px">📂 Des fiches pratiques personnalisées</div>
            <div style="font-size:14px;color:#475569;line-height:1.5">
              Recevez des recommandations adaptées à votre situation (métier, famille, projets) grâce à votre passeport fiscal.
            </div>
          </div>

          <div style="background:#FFF8C2;border-left:4px solid #F9E900;border-radius:6px;padding:16px 18px;margin:0 0 24px">
            <div style="font-weight:700;color:#2C1338;margin-bottom:4px">🎓 Un certificat de parcours</div>
            <div style="font-size:14px;color:#475569;line-height:1.5">
              Validez vos modules et obtenez votre certificat officiel Impôts Facile.
            </div>
          </div>

          <p style="text-align:center;margin:32px 0">
            <a href="${ctaUrl}" style="background:#2C1338;color:#F9E900;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:16px">
              ${ctaLabel}
            </a>
          </p>

          ${!onboardingDone ? `
          <p style="font-size:13px;color:#64748b;text-align:center;margin:16px 0 0;line-height:1.5">
            💡 <em>Astuce : complétez votre profil en 2 minutes pour débloquer des recommandations personnalisées.</em>
          </p>
          ` : ""}

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 20px"/>

          <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 8px">
            Une question ? Une suggestion ? Répondez simplement à cet email ou écrivez-nous à
            <a href="mailto:contact@impotsfacile.com" style="color:#2C1338;text-decoration:underline">contact@impotsfacile.com</a>.
          </p>
          <p style="font-size:13px;color:#64748b;margin:16px 0 0">
            À très vite,<br/>
            <strong>L'équipe Impôts Facile</strong>
          </p>
        </div>

        <p style="font-size:11px;color:#94a3b8;text-align:center;margin:24px 0 0">
          Impôts Facile est une plateforme éducative et ne constitue pas un conseil fiscal officiel.<br/>
          ANNUL IMPOTS — SIREN 895 319 226
        </p>
      </div>
    `;

    const text = `${greeting}

Merci d'avoir rejoint Impôts Facile ! Nous sommes ravis de vous compter parmi nous.

Voici ce qui vous attend :
- 📚 Des modules de formation pour apprendre la fiscalité à votre rythme
- 🧮 Des simulateurs (impôt, quotient familial, crédits/réductions, PAS…)
- 📂 Des fiches pratiques personnalisées selon votre profil
- 🎓 Un certificat de parcours

${ctaLabel} : ${ctaUrl}

Une question ? Écrivez-nous à contact@impotsfacile.com

À très vite,
L'équipe Impôts Facile`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipient],
        subject: "Bienvenue chez Impôts Facile 🎉",
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[send-welcome-email] Resend error:", res.status, errText);
      return new Response(JSON.stringify({ error: `Email failed: ${res.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marque comme envoyé (idempotence pour les prochains appels)
    await admin
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", u.user.id);

    console.log("[send-welcome-email] sent to", recipient);
    return new Response(JSON.stringify({ sent: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-welcome-email] Exception:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
