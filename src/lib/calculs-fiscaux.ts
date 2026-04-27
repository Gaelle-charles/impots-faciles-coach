/**
 * Moteur fiscal IR 2026 — Plateforme Annul'Impôts
 * Sources : PLF 2026, BOFIP, service-public.fr.
 * Données validées par Laure (porteuse de projet) — avril 2026.
 *
 * ⚠️ Outil pédagogique. Non opposable à la DGFIP.
 */

// ============================================================
// 1. BARÈME PROGRESSIF IR 2026 (sur revenus 2025)
// ============================================================
export const TRANCHES_IR_2026 = [
  { min: 0, max: 11_600, taux: 0 },
  { min: 11_600, max: 29_579, taux: 0.11 },
  { min: 29_579, max: 84_577, taux: 0.30 },
  { min: 84_577, max: 181_917, taux: 0.41 },
  { min: 181_917, max: Infinity, taux: 0.45 },
] as const;

// ============================================================
// 2. ABATTEMENTS, DÉCOTE, PLAFONDS
// ============================================================
export const ABATTEMENT_SALAIRES = { taux: 0.10, min: 502, max: 14_426 };
export const ABATTEMENT_PENSIONS = { taux: 0.10, min: 422, max: 4_321 };

export const DECOTE_2026 = {
  celibataire: { plafond: 1_929, base: 873, taux: 0.4525 },
  couple: { plafond: 3_191, base: 1_444, taux: 0.4525 },
};

export const PLAFOND_QF_DEMI_PART = 1_759; // Plafond avantage par demi-part supplémentaire
export const PLAFOND_PENSION_ENFANT_MAJEUR = 6_674; // 2026

export const PASS_2026 = 46_596;

// PFU (Flat Tax) plus-values mobilières / dividendes / intérêts
export const PFU = { ir: 0.128, ps: 0.172, total: 0.30 };

// ============================================================
// 3. GRILLE PAS NEUTRE 2026 (mensuelle, métropole)
// Source : doc Laure SIMULATEUR_PAS_HAUTS_REVENUS_2026
// ============================================================
export const GRILLE_PAS_NEUTRE_2026 = [
  { min: 0,       max: 1_496,   taux: 0.000 },
  { min: 1_496,   max: 1_591,   taux: 0.005 },
  { min: 1_591,   max: 1_688,   taux: 0.015 },
  { min: 1_688,   max: 1_791,   taux: 0.025 },
  { min: 1_791,   max: 1_902,   taux: 0.035 },
  { min: 1_902,   max: 2_018,   taux: 0.045 },
  { min: 2_018,   max: 2_141,   taux: 0.060 },
  { min: 2_141,   max: 2_377,   taux: 0.075 },
  { min: 2_377,   max: 2_748,   taux: 0.090 },
  { min: 2_748,   max: 3_291,   taux: 0.105 },
  { min: 3_291,   max: 4_134,   taux: 0.120 },
  { min: 4_134,   max: 5_669,   taux: 0.140 },
  { min: 5_669,   max: 8_060,   taux: 0.160 },
  { min: 8_060,   max: 11_787,  taux: 0.180 },
  { min: 11_787,  max: 15_849,  taux: 0.200 },
  { min: 15_849,  max: 24_082,  taux: 0.240 },
  { min: 24_082,  max: 42_272,  taux: 0.280 },
  { min: 42_272,  max: Infinity,taux: 0.330 },
] as const;

// ============================================================
// 4. CALCULS DE BASE
// ============================================================

export interface DetailTranche {
  taux: number;            // ex 0.11
  borneBas: number;
  borneHaut: number;
  montantImpose: number;   // partie du QF dans la tranche
  impotPart: number;       // impôt par part dans cette tranche
}

export interface DetailIR {
  qf: number;                // Revenu par part
  parts: number;
  impotParPart: number;
  impotBrut: number;         // après × parts
  tranches: DetailTranche[];
  tmi: number;               // taux marginal en %
}

/**
 * Calcule l'IR brut (avant décote, avant plafonnement QF)
 * en appliquant le barème PLF 2026 au QF puis multipliant par le nb de parts.
 */
export function calculerIRBareme(revenuImposable: number, parts: number): DetailIR {
  const qf = parts > 0 ? revenuImposable / parts : 0;
  const tranches: DetailTranche[] = [];
  let impotParPart = 0;
  let tmi = 0;

  for (const t of TRANCHES_IR_2026) {
    if (qf <= t.min) break;
    const haut = Math.min(qf, t.max);
    const montantImpose = haut - t.min;
    const impot = montantImpose * t.taux;
    impotParPart += impot;
    if (t.taux > 0 && montantImpose > 0) tmi = t.taux * 100;
    tranches.push({
      taux: t.taux,
      borneBas: t.min,
      borneHaut: t.max,
      montantImpose,
      impotPart: impot,
    });
  }

  return {
    qf,
    parts,
    impotParPart,
    impotBrut: impotParPart * parts,
    tranches,
    tmi,
  };
}

/**
 * Plafonnement du quotient familial.
 * Compare l'IR avec parts complètes vs IR avec parts de base.
 * Si l'avantage > plafond (1759€ × demi-parts supp), on l'écrête.
 *
 * partsBase : 1 (célibataire/divorcé/veuf) ou 2 (marié/PACS) — sans enfants ni majorations.
 */
export function appliquerPlafonnementQF(
  revenuImposable: number,
  partsTotal: number,
  partsBase: number
): { irApres: number; avantageTheorique: number; plafond: number; plafonne: boolean; irSansEnfants: number } {
  const irAvecQF = calculerIRBareme(revenuImposable, partsTotal).impotBrut;
  const irSansEnfants = calculerIRBareme(revenuImposable, partsBase).impotBrut;
  const avantageTheorique = Math.max(0, irSansEnfants - irAvecQF);
  const demiPartsSupp = Math.max(0, (partsTotal - partsBase) * 2);
  const plafond = demiPartsSupp * PLAFOND_QF_DEMI_PART;

  if (avantageTheorique > plafond) {
    return {
      irApres: irSansEnfants - plafond,
      avantageTheorique,
      plafond,
      plafonne: true,
      irSansEnfants,
    };
  }
  return {
    irApres: irAvecQF,
    avantageTheorique,
    plafond,
    plafonne: false,
    irSansEnfants,
  };
}

/**
 * Décote : applicable si IR brut < seuil.
 * Décote = base − (IR brut × 45.25%).
 */
export function calculerDecote(irBrut: number, couple: boolean): number {
  const params = couple ? DECOTE_2026.couple : DECOTE_2026.celibataire;
  if (irBrut >= params.plafond) return 0;
  const decote = params.base - irBrut * params.taux;
  return Math.max(0, Math.min(decote, irBrut));
}

/**
 * Abattement 10% salaires avec mini/maxi par bénéficiaire.
 */
export function abattementSalaires(salaireBrut: number): number {
  if (salaireBrut <= 0) return 0;
  const ab = salaireBrut * ABATTEMENT_SALAIRES.taux;
  return Math.min(ABATTEMENT_SALAIRES.max, Math.max(ABATTEMENT_SALAIRES.min, ab));
}

export function abattementPensions(pensionBrute: number): number {
  if (pensionBrute <= 0) return 0;
  const ab = pensionBrute * ABATTEMENT_PENSIONS.taux;
  return Math.min(ABATTEMENT_PENSIONS.max, Math.max(ABATTEMENT_PENSIONS.min, ab));
}

// ============================================================
// 5. CALCULATEUR DE PARTS QF (règles officielles 2026)
// ============================================================

export type SituationFamiliale = "celibataire" | "marie_pacs" | "divorce" | "veuf";

export interface ParametresParts {
  situation: SituationFamiliale;
  enfantsChargeComplete: number;   // garde exclusive
  enfantsGardeAlternee: number;    // 0.25 chacun
  parentIsole: boolean;            // case T (cél./div. avec enfant en charge exclusive)
  invaliditeContribuable: boolean; // case P
  invaliditeConjoint: boolean;     // case F
  enfantsInvalides: number;        // +0.5 chacun
}

export interface DetailParts {
  partsBase: number;
  partsEnfants: number;
  partsSpeciales: number;
  total: number;
}

export function calculerParts(p: ParametresParts): DetailParts {
  const partsBase = p.situation === "marie_pacs" ? 2 : 1;
  const couple = p.situation === "marie_pacs";

  // === Enfants en charge complète ===
  // 1er & 2e : +0.5 chacun. À partir du 3e : +1 chacun.
  let partsEnfants = 0;
  const n = Math.max(0, Math.floor(p.enfantsChargeComplete));
  if (n >= 1) partsEnfants += 0.5;
  if (n >= 2) partsEnfants += 0.5;
  if (n >= 3) partsEnfants += (n - 2) * 1;

  // === Garde alternée ===
  // Compte +0.25/enfant pour les 2 premiers, +0.5/enfant à partir du 3e (équivalent ½ avantage).
  const ga = Math.max(0, Math.floor(p.enfantsGardeAlternee));
  // Position des enfants en garde alternée : on les ajoute APRÈS les enfants en charge complète.
  for (let i = 0; i < ga; i++) {
    const rang = n + i + 1;
    partsEnfants += rang <= 2 ? 0.25 : 0.5;
  }

  // === Situations spéciales ===
  let partsSpeciales = 0;
  if (p.parentIsole && (p.situation === "celibataire" || p.situation === "divorce" || p.situation === "veuf") && (n + ga) >= 1) {
    partsSpeciales += 0.5; // case T : +0.5 pour le 1er enfant
  }
  if (p.invaliditeContribuable) partsSpeciales += 0.5;
  if (couple && p.invaliditeConjoint) partsSpeciales += 0.5;
  partsSpeciales += Math.max(0, Math.floor(p.enfantsInvalides)) * 0.5;

  return {
    partsBase,
    partsEnfants,
    partsSpeciales,
    total: partsBase + partsEnfants + partsSpeciales,
  };
}

// ============================================================
// 6. CALCUL IR NET COMPLET (orchestrateur)
// ============================================================

export interface ParametresIR {
  parts: number;
  partsBase: number;             // pour plafonnement QF
  couple: boolean;
  // Revenus (déjà nets imposables — abattement 10% appliqué en amont si besoin)
  revenuImposable: number;
  // Réductions / crédits (saisis directement par l'utilisateur)
  reductionsImpot: number;
  creditsImpot: number;
}

export interface ResultatIR {
  parts: number;
  qf: number;
  irBareme: number;            // IR brut sur N parts
  plafonnementQF: { plafonne: boolean; plafond: number; avantage: number; gainRetenu: number };
  irApresPlafond: number;
  decote: number;
  irApresDecote: number;
  reductions: number;
  credits: number;
  irNet: number;
  tauxMoyen: number;
  tmi: number;
  detailBareme: DetailIR;
}

export function calculerIRNet(p: ParametresIR): ResultatIR {
  const detailBareme = calculerIRBareme(p.revenuImposable, p.parts);
  const irBareme = detailBareme.impotBrut;

  // Plafonnement QF
  const plaf = appliquerPlafonnementQF(p.revenuImposable, p.parts, p.partsBase);
  const irApresPlafond = plaf.irApres;

  // Décote
  const decote = calculerDecote(irApresPlafond, p.couple);
  const irApresDecote = Math.max(0, irApresPlafond - decote);

  // Réductions (limitées à l'IR), crédits (peuvent rendre négatif → remboursement)
  const reductionsAppliquees = Math.min(irApresDecote, Math.max(0, p.reductionsImpot));
  const apresRed = irApresDecote - reductionsAppliquees;
  const irNet = apresRed - Math.max(0, p.creditsImpot);

  return {
    parts: p.parts,
    qf: detailBareme.qf,
    irBareme,
    plafonnementQF: {
      plafonne: plaf.plafonne,
      plafond: plaf.plafond,
      avantage: plaf.avantageTheorique,
      gainRetenu: plaf.plafonne ? plaf.plafond : plaf.avantageTheorique,
    },
    irApresPlafond,
    decote,
    irApresDecote,
    reductions: reductionsAppliquees,
    credits: Math.max(0, p.creditsImpot),
    irNet,
    tauxMoyen: p.revenuImposable > 0 ? (Math.max(0, irNet) / p.revenuImposable) * 100 : 0,
    tmi: detailBareme.tmi,
    detailBareme,
  };
}

// ============================================================
// 7. PAS — Taux neutre (grille mensuelle métropole 2026)
// ============================================================
export function tauxPasNeutre(revenuMensuel: number): number {
  for (const t of GRILLE_PAS_NEUTRE_2026) {
    if (revenuMensuel >= t.min && revenuMensuel < t.max) return t.taux;
  }
  return 0.33;
}

// ============================================================
// 8. UTILS
// ============================================================
export const fmtEur = (n: number): string =>
  Math.round(n).toLocaleString("fr-FR") + " €";

export const fmtPct = (n: number, decimals = 1): string =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + " %";

export const MENTION_LEGALE_SIMULATEUR =
  "Cet outil est pédagogique. Les résultats sont indicatifs et ne constituent pas un conseil fiscal personnalisé. Pour une déclaration officielle, utilisez le simulateur officiel impots.gouv.fr.";

export const MENTION_OPTIMISATION_FISCALE =
  "Optimisation fiscale — Avertissement complémentaire. Les dispositifs d'optimisation présentés (PER, dons, FCPI/FIP, PME, etc.) sont décrits à titre informatif. Leur applicabilité dépend de votre situation personnelle, de votre tranche marginale d'imposition, de votre horizon de placement et de votre tolérance au risque. Avant tout engagement (versement, souscription, investissement), consultez un conseiller en gestion de patrimoine certifié et lisez attentivement les documents contractuels du produit concerné.";
