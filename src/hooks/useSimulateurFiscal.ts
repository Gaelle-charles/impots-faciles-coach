import { useMemo } from "react";

export interface SimulateurFormData {
  situation: "celibataire" | "marie" | "marie_enfants";
  nbEnfants: number;
  gardeAlternee: boolean;
  nbEnfantsGardeAlternee: number;
  parentIsole: boolean;
  salaires: number;
  bic: number;
  bnc: number;
  fonciers: number;
  capitaux: number;
  optionBareme2OP: boolean;
  autresRevenus: number;
  fraisReels: boolean;
  montantFraisReels: number;
  pensionsAlimentaires: number;
  per: number;
  gardeEnfant: number;
  emploiDomicile: number;
  dons: number;
  nbCollege: number;
  nbLycee: number;
  nbSuperieur: number;
  pinel: number;
}

export const defaultFormData: SimulateurFormData = {
  situation: "celibataire",
  nbEnfants: 0,
  gardeAlternee: false,
  nbEnfantsGardeAlternee: 0,
  parentIsole: false,
  salaires: 0,
  bic: 0,
  bnc: 0,
  fonciers: 0,
  capitaux: 0,
  optionBareme2OP: false,
  autresRevenus: 0,
  fraisReels: false,
  montantFraisReels: 0,
  pensionsAlimentaires: 0,
  per: 0,
  gardeEnfant: 0,
  emploiDomicile: 0,
  dons: 0,
  nbCollege: 0,
  nbLycee: 0,
  nbSuperieur: 0,
  pinel: 0,
};

const TRANCHES_2025 = [
  { min: 0, max: 11497, taux: 0 },
  { min: 11497, max: 29315, taux: 0.11 },
  { min: 29315, max: 83823, taux: 0.30 },
  { min: 83823, max: 177106, taux: 0.41 },
  { min: 177106, max: Infinity, taux: 0.45 },
];

export interface TrancheResult {
  min: number;
  max: number;
  taux: number;
  montantImpose: number;
  impot: number;
}

export interface SimulateurResult {
  revenuBrut: number;
  abattements: number;
  deductions: number;
  revenuNetImposable: number;
  nbParts: number;
  quotientFamilial: number;
  tranches: TrancheResult[];
  impotBrut: number;
  reductions: number;
  credits: number;
  impotNet: number;
  tauxMoyen: number;
  tauxMarginal: number;
  tauxPrelevement: number;
  remboursement: number;
  pfuMontant: number;
}

function calcParts(data: SimulateurFormData): number {
  let parts = data.situation === "celibataire" ? 1 : 2;

  const enfantsNormaux = data.gardeAlternee
    ? Math.max(0, data.nbEnfants - data.nbEnfantsGardeAlternee)
    : data.nbEnfants;
  const enfantsGA = data.gardeAlternee ? Math.min(data.nbEnfantsGardeAlternee, data.nbEnfants) : 0;

  // Normal children
  for (let i = 0; i < enfantsNormaux; i++) {
    const totalSoFar = i; // only counting normal so far
    if (totalSoFar < 2) parts += 0.5;
    else parts += 1;
  }

  // Garde alternée children
  for (let i = 0; i < enfantsGA; i++) {
    const totalSoFar = enfantsNormaux + i;
    if (totalSoFar < 2) parts += 0.25;
    else parts += 0.5;
  }

  if (data.parentIsole && data.nbEnfants > 0) parts += 0.5;

  return parts;
}

export function useSimulateurFiscal(data: SimulateurFormData): SimulateurResult {
  return useMemo(() => {
    const nbParts = calcParts(data);

    // Revenu brut
    const revenuBrut = data.salaires + data.bic + data.bnc + data.fonciers +
      (data.optionBareme2OP ? data.capitaux : 0) + data.autresRevenus;

    // Abattement 10% sur salaires
    let abattementSalaires = 0;
    if (!data.fraisReels) {
      abattementSalaires = Math.min(Math.max(data.salaires * 0.1, 495), 14171);
      if (data.salaires === 0) abattementSalaires = 0;
    }
    const fraisReelsMontant = data.fraisReels ? data.montantFraisReels : 0;
    const abattements = data.fraisReels ? fraisReelsMontant : abattementSalaires;

    // Déductions
    const deductions = data.pensionsAlimentaires + Math.min(data.per, 35194);

    // Revenu net imposable
    const revenuNetImposable = Math.max(0, revenuBrut - abattements - deductions);

    // Quotient familial
    const quotientFamilial = nbParts > 0 ? Math.floor(revenuNetImposable / nbParts) : 0;

    // Calcul par tranche
    const tranches: TrancheResult[] = TRANCHES_2025.map((tr) => {
      const maxTranche = tr.max === Infinity ? quotientFamilial : Math.min(quotientFamilial, tr.max);
      const montantImpose = Math.max(0, maxTranche - tr.min);
      return {
        min: tr.min,
        max: tr.max,
        taux: tr.taux,
        montantImpose,
        impot: Math.round(montantImpose * tr.taux),
      };
    });

    const impotParPart = tranches.reduce((sum, t) => sum + t.impot, 0);
    const impotBrut = Math.round(impotParPart * nbParts);

    // Taux marginal
    let tauxMarginal = 0;
    for (let i = TRANCHES_2025.length - 1; i >= 0; i--) {
      if (quotientFamilial > TRANCHES_2025[i].min) {
        tauxMarginal = TRANCHES_2025[i].taux * 100;
        break;
      }
    }

    // Réductions d'impôt
    let reductions = 0;
    // Dons: 66% (simplified)
    reductions += Math.round(data.dons * 0.66);
    // Scolarité
    reductions += data.nbCollege * 61 + data.nbLycee * 153 + data.nbSuperieur * 183;
    // Pinel
    reductions += data.pinel;

    // Crédits d'impôt
    let credits = 0;
    // Garde enfant: 50%, plafond 3500€/enfant -> crédit max 1750€/enfant
    credits += Math.round(Math.min(data.gardeEnfant, 3500 * Math.max(data.nbEnfants, 1)) * 0.5);
    // Emploi à domicile: 50%, plafond 12000 + 1500/enfant
    const plafondEmploi = 12000 + 1500 * data.nbEnfants;
    credits += Math.round(Math.min(data.emploiDomicile, plafondEmploi) * 0.5);

    const impotApresReductions = Math.max(0, impotBrut - reductions);
    const impotNet = Math.max(0, impotApresReductions - credits);
    const remboursement = credits > impotApresReductions ? credits - impotApresReductions : 0;

    // PFU si pas option barème
    const pfuMontant = !data.optionBareme2OP ? Math.round(data.capitaux * 0.3) : 0;

    const tauxMoyen = revenuNetImposable > 0
      ? Math.round((impotNet / revenuNetImposable) * 1000) / 10
      : 0;

    const tauxPrelevement = revenuNetImposable > 0
      ? Math.round((impotNet / revenuNetImposable) * 1000) / 10
      : 0;

    return {
      revenuBrut,
      abattements,
      deductions,
      revenuNetImposable,
      nbParts,
      quotientFamilial,
      tranches,
      impotBrut,
      reductions,
      credits,
      impotNet,
      tauxMoyen,
      tauxMarginal,
      tauxPrelevement,
      remboursement,
      pfuMontant,
    };
  }, [data]);
}
