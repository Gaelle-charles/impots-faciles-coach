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

const BAREME = [
  { min: 0, max: 11497, taux: 0.00 },
  { min: 11497, max: 29315, taux: 0.11 },
  { min: 29315, max: 83823, taux: 0.30 },
  { min: 83823, max: 177106, taux: 0.41 },
  { min: 177106, max: Infinity, taux: 0.45 },
];

export interface TrancheResult {
  label: string;
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

function calculerParts(data: SimulateurFormData): number {
  const isMarie = data.situation === "marie" || data.situation === "marie_enfants";
  let parts = isMarie ? 2 : 1;

  const nbAlterne = data.gardeAlternee ? Math.min(data.nbEnfantsGardeAlternee, data.nbEnfants) : 0;
  const enfantsEntiers = data.nbEnfants - nbAlterne;

  // Enfants à charge entière
  if (enfantsEntiers >= 1) parts += 0.5;
  if (enfantsEntiers >= 2) parts += 0.5;
  for (let i = 3; i <= enfantsEntiers; i++) parts += 1;

  // Enfants en garde alternée (0.25 part chacun)
  parts += nbAlterne * 0.25;

  // Parent isolé
  if (data.parentIsole && data.nbEnfants > 0) parts += 0.5;

  return parts;
}

function calculerRevenuNetImposable(data: SimulateurFormData) {
  // Salaires : abattement 10% (min 495€, max 14 171€) ou frais réels
  let abattementSalaire = 0;
  if (data.fraisReels && data.montantFraisReels > 0) {
    abattementSalaire = data.montantFraisReels;
  } else if (data.salaires > 0) {
    abattementSalaire = Math.min(Math.max(data.salaires * 0.10, 495), 14171);
  }
  const revenuSalairesNet = Math.max(0, data.salaires - abattementSalaire);

  // Micro-BIC : abattement 50%
  const revenuBICNet = data.bic * 0.50;

  // Micro-BNC : abattement 34% (on garde 66%)
  const revenuBNCNet = data.bnc * 0.66;

  // Capitaux mobiliers si option barème
  const capitauxBareme = data.optionBareme2OP ? data.capitaux : 0;

  // Total brut (pour affichage)
  const revenuBrut = data.salaires + data.bic + data.bnc + data.fonciers + capitauxBareme + data.autresRevenus;

  // Total net avant déductions
  let totalNet = revenuSalairesNet + revenuBICNet + revenuBNCNet + data.fonciers + capitauxBareme + data.autresRevenus;

  // Déductions
  const totalDeductions = data.pensionsAlimentaires + Math.min(data.per, 35194);

  const revenuNetImposable = Math.max(0, totalNet - totalDeductions);

  return {
    revenuBrut,
    abattements: abattementSalaire + (data.bic * 0.50) + (data.bnc * 0.34),
    deductions: totalDeductions,
    revenuNetImposable,
  };
}

function calculerImpotBrut(revenuNetImposable: number, nbParts: number) {
  const quotientFamilial = nbParts > 0 ? Math.floor(revenuNetImposable / nbParts) : 0;
  let impotParPart = 0;
  const detailTranches: TrancheResult[] = [];

  for (const tranche of BAREME) {
    if (quotientFamilial <= tranche.min) {
      detailTranches.push({
        label: tranche.max === Infinity
          ? `> ${tranche.min.toLocaleString("fr-FR")} €`
          : `${tranche.min.toLocaleString("fr-FR")} → ${tranche.max.toLocaleString("fr-FR")} €`,
        taux: tranche.taux,
        montantImpose: 0,
        impot: 0,
      });
      continue;
    }

    const montantImpose = Math.min(quotientFamilial, tranche.max) - tranche.min;
    const impotTranche = montantImpose * tranche.taux;
    impotParPart += impotTranche;

    detailTranches.push({
      label: tranche.max === Infinity
        ? `> ${tranche.min.toLocaleString("fr-FR")} €`
        : `${tranche.min.toLocaleString("fr-FR")} → ${tranche.max.toLocaleString("fr-FR")} €`,
      taux: tranche.taux,
      montantImpose: Math.round(montantImpose * nbParts),
      impot: Math.round(impotTranche * nbParts),
    });
  }

  const tauxMarginal = BAREME.find((t) => quotientFamilial <= t.max)?.taux ?? 0.45;

  return {
    impotBrut: Math.round(impotParPart * nbParts),
    detailTranches,
    quotientFamilial,
    tauxMarginal: tauxMarginal * 100,
  };
}

function calculerReductionsCredits(data: SimulateurFormData, impotBrut: number, revenuNetImposable: number) {
  // Crédits d'impôt (remboursables)
  const creditGardeEnfant = Math.min(
    data.gardeEnfant * 0.50,
    3500 * Math.max(data.nbEnfants, 1)
  );
  const plafondEmploi = 12000 + data.nbEnfants * 1500;
  const creditEmploiDomicile = Math.min(data.emploiDomicile * 0.50, plafondEmploi);

  // Réductions d'impôt (non remboursables)
  const reductionDons = Math.min(data.dons * 0.66, revenuNetImposable * 0.20);
  const reductionScolarite = data.nbCollege * 61 + data.nbLycee * 153 + data.nbSuperieur * 183;
  const reductionPinel = data.pinel;

  const totalCredits = Math.round(creditGardeEnfant + creditEmploiDomicile);
  const totalReductions = Math.round(
    Math.min(reductionDons + reductionScolarite + reductionPinel, impotBrut)
  );

  return { totalCredits, totalReductions };
}

export function useSimulateurFiscal(data: SimulateurFormData): SimulateurResult {
  return useMemo(() => {
    const nbParts = calculerParts(data);
    const { revenuBrut, abattements, deductions, revenuNetImposable } = calculerRevenuNetImposable(data);
    const { impotBrut, detailTranches, quotientFamilial, tauxMarginal } = calculerImpotBrut(revenuNetImposable, nbParts);
    const { totalCredits, totalReductions } = calculerReductionsCredits(data, impotBrut, revenuNetImposable);

    // Résultat final
    const impotApresReductions = Math.max(0, impotBrut - totalReductions);
    const impotNet = Math.max(0, impotApresReductions - totalCredits);
    const remboursement = Math.max(0, totalCredits - impotApresReductions);

    // PFU si pas option barème
    const pfuMontant = !data.optionBareme2OP ? Math.round(data.capitaux * 0.30) : 0;

    // Taux
    const tauxMoyen = revenuNetImposable > 0
      ? Math.round((impotNet / revenuNetImposable) * 1000) / 10
      : 0;

    const basePrelevement = data.salaires + data.bic + data.bnc;
    const tauxPrelevement = basePrelevement > 0
      ? Math.round((impotNet / basePrelevement) * 1000) / 10
      : 0;

    return {
      revenuBrut,
      abattements,
      deductions,
      revenuNetImposable,
      nbParts,
      quotientFamilial,
      tranches: detailTranches,
      impotBrut,
      reductions: totalReductions,
      credits: totalCredits,
      impotNet,
      tauxMoyen,
      tauxMarginal,
      tauxPrelevement,
      remboursement,
      pfuMontant,
    };
  }, [data]);
}
