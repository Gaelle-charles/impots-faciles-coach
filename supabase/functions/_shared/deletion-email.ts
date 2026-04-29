// Shared helper to send a GDPR deletion confirmation email via Resend.
// Best-effort: failures are logged but do not throw.

const PLAN_LABELS: Record<string, string> = {
  nouveau: "Gratuit",
  starter: "Starter",
  expert: "Expert",
  premium: "Premium",
  essentiel: "Essentiel",
  pro: "Pro",
};

export interface DeletionEmailInput {
  email: string;
  prenom?: string | null;
  plan?: string | null;
  hasActiveSubscription?: boolean;
  nextRenewalDate?: string | null; // ISO
}

function fmtDateFr(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function sendDeletionConfirmationEmail(input: DeletionEmailInput): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("[deletion-email] RESEND_API_KEY not configured, skipping");
    return { ok: false, error: "RESEND_API_KEY missing" };
  }
  if (!input.email) return { ok: false, error: "email missing" };

  const prenom = input.prenom?.trim() || "";
  const greet = prenom ? `Bonjour ${prenom},` : "Bonjour,";
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const planLabel = input.plan ? (PLAN_LABELS[input.plan] ?? input.plan) : "";

  const subBlockHtml = input.hasActiveSubscription
    ? `<p style="margin:0 0 16px 0;">Votre abonnement Impôts Facile <strong>${planLabel}</strong> a été annulé. Vous ne serez plus prélevé(e) lors du prochain renouvellement${input.nextRenewalDate ? ` prévu le <strong>${fmtDateFr(input.nextRenewalDate)}</strong>` : ""}.</p>`
    : "";

  const subBlockText = input.hasActiveSubscription
    ? `\nVotre abonnement Impôts Facile ${planLabel} a été annulé. Vous ne serez plus prélevé(e) lors du prochain renouvellement${input.nextRenewalDate ? ` prévu le ${fmtDateFr(input.nextRenewalDate)}` : ""}.\n`
    : "";

  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#111827;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    <h1 style="font-size:20px;margin:0 0 16px 0;">Confirmation de suppression de votre compte</h1>
    <p style="margin:0 0 16px 0;">${greet}</p>
    <p style="margin:0 0 16px 0;">Nous confirmons la suppression de votre compte Impôts Facile, effective ce jour, <strong>${today}</strong>.</p>
    <p style="margin:0 0 8px 0;">Conformément à nos obligations légales, certaines de vos données seront conservées :</p>
    <ul style="margin:0 0 16px 18px;padding:0;">
      <li>3 ans pour vos données de relation client (profil, historique)</li>
      <li>10 ans pour vos données de facturation</li>
    </ul>
    <p style="margin:0 0 16px 0;">À l'issue de ces périodes, vos données seront définitivement anonymisées ou supprimées.</p>
    ${subBlockHtml}
    <p style="margin:0 0 16px 0;">Si vous souhaitez demander une suppression définitive accélérée de vos données (droit à l'effacement RGPD), contactez-nous à <a href="mailto:contact@impotsfacile.com">contact@impotsfacile.com</a>.</p>
    <p style="margin:0 0 16px 0;">Vous pouvez à tout moment demander la restauration de votre compte en nous contactant.</p>
    <p style="margin:0 0 4px 0;">Merci pour votre confiance,</p>
    <p style="margin:0 0 24px 0;">L'équipe Impôts Facile</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#6b7280;">ANNUL IMPOTS — SARL au capital de 500€<br/>SIREN 895 319 226 — 340 Route de la Bouaye, 97190 Le Gosier, Guadeloupe<br/><a href="mailto:contact@impotsfacile.com">contact@impotsfacile.com</a></p>
  </div></body></html>`;

  const text = `${greet}

Nous confirmons la suppression de votre compte Impôts Facile, effective ce jour, ${today}.

Conformément à nos obligations légales, certaines de vos données seront conservées :
- 3 ans pour vos données de relation client (profil, historique)
- 10 ans pour vos données de facturation

À l'issue de ces périodes, vos données seront définitivement anonymisées ou supprimées.
${subBlockText}
Si vous souhaitez demander une suppression définitive accélérée de vos données (droit à l'effacement RGPD), contactez-nous à contact@impotsfacile.com.

Vous pouvez à tout moment demander la restauration de votre compte en nous contactant.

Merci pour votre confiance,
L'équipe Impôts Facile

---
ANNUL IMPOTS — SARL au capital de 500€
SIREN 895 319 226 — 340 Route de la Bouaye, 97190 Le Gosier, Guadeloupe
contact@impotsfacile.com`;

  try {
    const fromAddr = Deno.env.get("RESEND_FROM_EMAIL") || "Impôts Facile <info@impotsfacile.com>";
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [input.email],
        subject: "Confirmation de suppression de votre compte Impôts Facile",
        html,
        text,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      console.error("[deletion-email] resend failed:", r.status, body);
      return { ok: false, error: `${r.status}: ${body.slice(0, 300)}` };
    }
    console.log("[deletion-email] sent to", input.email);
    return { ok: true };
  } catch (e) {
    console.error("[deletion-email] error:", e);
    return { ok: false, error: String(e) };
  }
}
