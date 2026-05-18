/**
 * Templates email partagés — charte Impôts Facile.
 *
 * Utilisé par les edge functions Resend (send-thank-you-email,
 * send-resources-email, send-followup-email).
 *
 * Styles inline pour compatibilité Gmail / Outlook / Apple Mail.
 * Charte : violet #2C1338 (fonds & liens), jaune #F9E900 (CTA principal),
 * fallback typo Arial.
 *
 * NE PAS migrer les emails existants sans sprint dédié.
 */

const VIOLET = '#2C1338';
const YELLOW = '#F9E900';
const TEXT_DARK = '#3d2540';
const TEXT_MUTED = '#7a6680';
const BORDER = '#f0e4ee';

export function renderCtaButton(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="background-color:${YELLOW};color:${VIOLET};font-size:15px;font-weight:bold;border-radius:8px;padding:14px 28px;text-decoration:none;display:inline-block;letter-spacing:0.3px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">${escapeHtml(label)}</a>`;
}

export function renderDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0;" />`;
}

export function renderEmailLayout({
  title,
  bodyHtml,
  ctaButton,
  signature = "L'équipe Impôts Facile",
}: {
  title: string;
  bodyHtml: string;
  ctaButton?: { label: string; url: string };
  signature?: string;
}): string {
  const cta = ctaButton
    ? `<div style="text-align:center;margin:28px 0;">${renderCtaButton(ctaButton.label, ctaButton.url)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#ffffff;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <!-- Header violet -->
            <tr>
              <td style="background-color:${VIOLET};padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;">
                <div style="width:64px;height:64px;background-color:${YELLOW};border-radius:50%;margin:0 auto 12px;line-height:64px;">
                  <span style="color:${VIOLET};font-size:32px;font-weight:bold;line-height:64px;">€</span>
                </div>
                <div style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.3px;">Impôts Facile</div>
              </td>
            </tr>
            <!-- Carte contenu -->
            <tr>
              <td style="background-color:#ffffff;padding:32px 28px;border:1px solid ${BORDER};border-top:none;border-radius:0 0 12px 12px;">
                <h1 style="font-size:24px;font-weight:bold;color:${VIOLET};margin:0 0 20px;line-height:1.3;">${escapeHtml(title)}</h1>
                <div style="font-size:15px;color:${TEXT_DARK};line-height:1.6;">
                  ${bodyHtml}
                </div>
                ${cta}
                <p style="font-size:13px;color:${TEXT_MUTED};line-height:1.5;margin:24px 0 0;">${escapeHtml(signature)}</p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:24px 16px;text-align:center;">
                <p style="font-size:13px;font-weight:bold;color:${VIOLET};margin:0 0 8px;">Impôts Facile — par ANNUL IMPOTS</p>
                <p style="font-size:11px;color:#888888;line-height:1.5;margin:0 0 8px;">
                  SARL ANNUL IMPOTS — SIREN 895 319 226<br />
                  340 Route de la Bouaye, 97190 Le Gosier, Guadeloupe
                </p>
                <p style="font-size:11px;color:#888888;margin:0 0 8px;">
                  <a href="mailto:contact@impotsfacile.com" style="color:#E15A97;text-decoration:none;">contact@impotsfacile.com</a>
                </p>
                <hr style="border:none;border-top:1px solid #eee;margin:12px 0;" />
                <p style="font-size:11px;color:#888888;margin:0 0 8px;">
                  <a href="https://impotsfacile.com/mentions-legales" style="color:#E15A97;text-decoration:none;">Mentions légales</a> ·
                  <a href="https://impotsfacile.com/cgv" style="color:#E15A97;text-decoration:none;">CGV</a> ·
                  <a href="https://impotsfacile.com/confidentialite" style="color:#E15A97;text-decoration:none;">Confidentialité</a>
                </p>
                <p style="font-size:10px;color:#aaaaaa;font-style:italic;margin:8px 0 0;">
                  Impôts Facile est une plateforme éducative et ne se substitue pas à un conseil fiscal officiel.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
