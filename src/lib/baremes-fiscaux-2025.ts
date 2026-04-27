/**
 * Barèmes fiscaux pour les revenus 2025 (déclaration 2026).
 * Sources : service-public.fr, BOFIP, PLF 2026.
 * À mettre à jour si la Loi de Finances 2026 modifie ces valeurs.
 */

// === Barème progressif IR (revenus 2025) ===
// Indexé +1.8% selon PLF 2026 (à vérifier au vote définitif).
export const TRANCHES_IR_2025 = [
  { min: 0, max: 11_497, taux: 0 },
  { min: 11_497, max: 29_315, taux: 0.11 },
  { min: 29_315, max: 83_823, taux: 0.30 },
  { min: 83_823, max: 180_294, taux: 0.41 },
  { min: 180_294, max: Infinity, taux: 0.45 },
];

// === Grille PAS taux neutre (mensuelle, métropole) — barème 2025 ===
// Source : article 204 H du CGI, valeurs indexées 2025.
export const GRILLE_PAS_NEUTRE_METROPOLE_2025 = [
  { min: 0, max: 1620, taux: 0.00 },
  { min: 1620, max: 1683, taux: 0.005 },
  { min: 1683, max: 1791, taux: 0.013 },
  { min: 1791, max: 1911, taux: 0.021 },
  { min: 1911, max: 2042, taux: 0.029 },
  { min: 2042, max: 2151, taux: 0.039 },
  { min: 2151, max: 2294, taux: 0.049 },
  { min: 2294, max: 2714, taux: 0.059 },
  { min: 2714, max: 3107, taux: 0.069 },
  { min: 3107, max: 3528, taux: 0.079 },
  { min: 3528, max: 4117, taux: 0.099 },
  { min: 4117, max: 5067, taux: 0.119 },
  { min: 5067, max: 6342, taux: 0.139 },
  { min: 6342, max: 7926, taux: 0.159 },
  { min: 7926, max: 11_039, taux: 0.179 },
  { min: 11_039, max: 14_950, taux: 0.20 },
  { min: 14_950, max: 22_899, taux: 0.24 },
  { min: 22_899, max: 49_287, taux: 0.28 },
  { min: 49_287, max: Infinity, taux: 0.43 },
];

// === Plus-values immobilières — abattements pour durée de détention ===
// Article 150 VC du CGI. En vigueur depuis 2014, inchangé en 2026.
// IR : exonération totale après 22 ans. Prélèvements sociaux : 30 ans.
export function abattementPVImmoIR(annees: number): number {
  if (annees < 6) return 0;
  if (annees >= 22) return 1;
  // 6% par an de la 6e à la 21e année, puis 4% la 22e.
  const base = Math.min(annees - 5, 16) * 0.06;
  const last = annees >= 22 ? 0.04 : 0;
  return Math.min(1, base + last);
}

export function abattementPVImmoPS(annees: number): number {
  if (annees < 6) return 0;
  if (annees >= 30) return 1;
  // 1.65% de 6 à 21 ans, 1.60% la 22e, 9% de 23 à 30 ans.
  let abat = 0;
  abat += Math.min(annees - 5, 16) * 0.0165;
  if (annees >= 22) abat += 0.016;
  if (annees > 22) abat += Math.min(annees - 22, 8) * 0.09;
  return Math.min(1, abat);
}

// Taxes plus-values immo
export const TAUX_IR_PV_IMMO = 0.19; // forfaitaire
export const TAUX_PS_PV_IMMO = 0.172; // prélèvements sociaux (CSG/CRDS)

// === LMNP micro-BIC ===
// Réforme LF 2025 : abattement meublé classique abaissé à 50% (plafond 77 700 €),
// meublé de tourisme non classé à 30% (plafond 15 000 €), classé à 50% (plafond 77 700 €).
// Source : art. 50-0 du CGI modifié par LF 2025.
export const LMNP_MICRO = {
  classique: { abattement: 0.5, plafond: 77_700, minimum: 305 },
  tourisme_non_classe: { abattement: 0.3, plafond: 15_000, minimum: 305 },
  tourisme_classe: { abattement: 0.5, plafond: 77_700, minimum: 305 },
};

// Prélèvements sociaux sur revenus du patrimoine
export const TAUX_PS_REVENUS = 0.172;

// === Pinel / Pinel+ ===
// ⚠️ ATTENTION : Le dispositif Pinel a pris fin au 31/12/2024.
// Aucun nouvel investissement éligible depuis 2025, mais les engagements
// pris avant fin 2024 continuent de produire leurs effets fiscaux.
// Taux post-réforme 2024 (dernière année) :
// - Pinel classique : 9% / 12% / 14% (6/9/12 ans) - zones tendues uniquement (A, A bis, B1)
// - Pinel+ : 12% / 18% / 21% (6/9/12 ans) sous conditions (qualité, quartiers prioritaires)
// Source : art. 199 novovicies du CGI.
export const TAUX_PINEL_2024 = {
  classique: { 6: 0.09, 9: 0.12, 12: 0.14 },
  plus: { 6: 0.12, 9: 0.18, 12: 0.21 },
};

export const PINEL_PLAFOND_INVEST = 300_000; // par an, max 5500 €/m²

// === Helper barème IR ===
export interface TrancheResult {
  label: string;
  taux: number;
  montantImpose: number;
  impot: number;
}

export function calculerImpotBareme(
  revenuImposable: number,
  nbParts: number = 1
): { impot: number; tranches: TrancheResult[]; tauxMarginal: number } {
  const quotient = revenuImposable / nbParts;
  const tranches: TrancheResult[] = [];
  let impotParPart = 0;
  let tauxMarginal = 0;

  for (const t of TRANCHES_IR_2025) {
    if (quotient <= t.min) break;
    const haut = Math.min(quotient, t.max);
    const montantImpose = haut - t.min;
    const impot = montantImpose * t.taux;
    impotParPart += impot;
    if (t.taux > 0) tauxMarginal = t.taux * 100;
    tranches.push({
      label: `${fmtEur(t.min)} → ${t.max === Infinity ? '∞' : fmtEur(t.max)}`,
      taux: t.taux,
      montantImpose: Math.round(montantImpose * nbParts),
      impot: Math.round(impot * nbParts),
    });
  }

  return {
    impot: Math.max(0, Math.round(impotParPart * nbParts)),
    tranches,
    tauxMarginal,
  };
}

export const fmtEur = (n: number): string =>
  Math.round(n).toLocaleString('fr-FR');
