/**
 * Moteur de calcul IR — fonctions pures, sans side effects.
 * Socle commun aux simulateurs TMI, PER et Optimisation couple.
 *
 * ⚠️ Outil pédagogique. Non opposable à la DGFIP.
 */
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export interface TrancheIR {
  ordre: number;          // 1 à 5
  plafond: number | null; // borne supérieure ; null pour tranche 5
  taux: number;           // en %, ex: 11
}

export interface BaremeIR {
  fiscalYear: number;
  tranches: TrancheIR[];
  decote: {
    plafondCelib: number;
    plafondCouple: number;
    forfaitCelib: number;
    forfaitCouple: number;
    tauxAttenuation: number; // en %
  };
  plafondQuotientFamilial: number; // par demi-part supplémentaire
}

export type SituationFamiliale = "celibataire" | "couple" | "parent_isole";

export interface FoyerFiscal {
  revenuNetImposable: number;
  situation: SituationFamiliale;
  nbEnfants: number;
  nbEnfantsHandicapes?: number;
}

export interface ResultatIR {
  nbParts: number;
  irBrutAvantPlafondQF: number;
  irSansQF: number;
  reductionQF: number;
  reductionQFPlafonnee: number;
  plafondQFActif: boolean;
  irBrutApresPlafondQF: number;
  decote: number;
  irNet: number;
  tmi: number;
  tauxMoyen: number;
}

// ============================================================
// PARTS FISCALES
// ============================================================

export function calculerNbParts(foyer: FoyerFiscal): number {
  const base = foyer.situation === "couple" ? 2 : 1;
  const n = Math.max(0, Math.floor(foyer.nbEnfants));

  let partsEnfants = 0;
  if (n >= 1) partsEnfants += 0.5;
  if (n >= 2) partsEnfants += 0.5;
  if (n >= 3) partsEnfants += (n - 2) * 1;

  // Case T : parent isolé avec au moins un enfant à charge → +0,5
  let partsSpeciales = 0;
  if (foyer.situation === "parent_isole" && n >= 1) {
    partsSpeciales += 0.5;
  }

  // Enfants en situation de handicap : +0,5 chacun
  partsSpeciales += Math.max(0, Math.floor(foyer.nbEnfantsHandicapes ?? 0)) * 0.5;

  return base + partsEnfants + partsSpeciales;
}

// ============================================================
// BARÈME
// ============================================================

function sortedTranches(bareme: BaremeIR): TrancheIR[] {
  return [...bareme.tranches].sort((a, b) => a.ordre - b.ordre);
}

export function appliquerBareme(revenuParPart: number, bareme: BaremeIR): number {
  if (revenuParPart <= 0) return 0;
  const tranches = sortedTranches(bareme);
  let impot = 0;
  let borneBas = 0;

  for (const t of tranches) {
    const borneHaut = t.plafond ?? Infinity;
    if (revenuParPart <= borneBas) break;
    const haut = Math.min(revenuParPart, borneHaut);
    const montantImpose = haut - borneBas;
    if (montantImpose > 0) {
      impot += montantImpose * (t.taux / 100);
    }
    borneBas = borneHaut;
    if (revenuParPart <= borneHaut) break;
  }

  return impot;
}

export function calculerTMI(revenuParPart: number, bareme: BaremeIR): number {
  if (revenuParPart <= 0) return 0;
  const tranches = sortedTranches(bareme);
  let tmi = 0;
  let borneBas = 0;
  for (const t of tranches) {
    const borneHaut = t.plafond ?? Infinity;
    if (revenuParPart > borneBas) {
      tmi = t.taux;
    }
    if (revenuParPart <= borneHaut) break;
    borneBas = borneHaut;
  }
  return tmi;
}

// ============================================================
// DÉCOTE
// ============================================================

export function calculerDecote(
  irBrut: number,
  situation: SituationFamiliale,
  bareme: BaremeIR
): number {
  const couple = situation === "couple";
  const plafond = couple ? bareme.decote.plafondCouple : bareme.decote.plafondCelib;
  const forfait = couple ? bareme.decote.forfaitCouple : bareme.decote.forfaitCelib;

  // Au-delà ou égal au seuil : pas de décote
  if (irBrut >= plafond) return 0;
  if (irBrut <= 0) return 0;

  const decote = forfait - (bareme.decote.tauxAttenuation / 100) * irBrut;
  if (decote <= 0) return 0;
  return Math.min(decote, irBrut);
}

// ============================================================
// CALCUL COMPLET
// ============================================================

export function calculerIR(foyer: FoyerFiscal, bareme: BaremeIR): ResultatIR {
  const nbParts = calculerNbParts(foyer);
  const partsBase = foyer.situation === "couple" ? 2 : 1;
  const revenu = Math.max(0, foyer.revenuNetImposable);

  // IR avec QF réel
  const qfReel = revenu / nbParts;
  const irBrutAvantPlafondQF = appliquerBareme(qfReel, bareme) * nbParts;

  // IR sans QF (seulement parts base, sans enfants ni demi-parts spéciales)
  const qfBase = revenu / partsBase;
  const irSansQF = appliquerBareme(qfBase, bareme) * partsBase;

  // Plafonnement QF
  const reductionQF = Math.max(0, irSansQF - irBrutAvantPlafondQF);
  const demiPartsSupp = (nbParts - partsBase) * 2;
  const plafondTotal = demiPartsSupp * bareme.plafondQuotientFamilial;
  const plafonne = demiPartsSupp > 0 && reductionQF > plafondTotal;
  const reductionQFPlafonnee = plafonne ? plafondTotal : reductionQF;
  const irBrutApresPlafondQF = irSansQF - reductionQFPlafonnee;

  // Décote
  const decote = calculerDecote(irBrutApresPlafondQF, foyer.situation, bareme);
  const irApresDecote = Math.max(0, irBrutApresPlafondQF - decote);
  const irNet = Math.round(irApresDecote);

  const tmi = calculerTMI(qfReel, bareme);
  const tauxMoyen = revenu > 0 ? (irNet / revenu) * 100 : 0;

  return {
    nbParts,
    irBrutAvantPlafondQF,
    irSansQF,
    reductionQF,
    reductionQFPlafonnee,
    plafondQFActif: plafonne,
    irBrutApresPlafondQF,
    decote,
    irNet,
    tmi,
    tauxMoyen,
  };
}

// ============================================================
// CHARGEMENT DES CONSTANTES (Supabase)
// ============================================================

const REQUIRED_KEYS = [
  "ir.tranche.1.plafond", "ir.tranche.1.taux",
  "ir.tranche.2.plafond", "ir.tranche.2.taux",
  "ir.tranche.3.plafond", "ir.tranche.3.taux",
  "ir.tranche.4.plafond", "ir.tranche.4.taux",
  "ir.tranche.5.taux",
  "ir.decote.plafond_celib",
  "ir.decote.plafond_couple",
  "ir.decote.forfait_celib",
  "ir.decote.forfait_couple",
  "ir.decote.taux_attenuation",
  "ir.qf.plafond_demi_part",
] as const;

export async function chargerBaremeIR(fiscalYear: number): Promise<BaremeIR> {
  const { data, error } = await supabase
    .from("simulator_constants")
    .select("constant_key, value")
    .eq("simulator_key", "commun")
    .eq("fiscal_year", fiscalYear);

  if (error) {
    throw new Error(`Erreur chargement barème IR ${fiscalYear} : ${error.message}`);
  }

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.constant_key as string, Number((row as { value: number }).value));
  }

  for (const k of REQUIRED_KEYS) {
    if (!map.has(k)) {
      throw new Error(`Constante manquante : ${k} (simulator_key='commun', fiscal_year=${fiscalYear})`);
    }
  }

  const tranches: TrancheIR[] = [
    { ordre: 1, plafond: map.get("ir.tranche.1.plafond")!, taux: map.get("ir.tranche.1.taux")! },
    { ordre: 2, plafond: map.get("ir.tranche.2.plafond")!, taux: map.get("ir.tranche.2.taux")! },
    { ordre: 3, plafond: map.get("ir.tranche.3.plafond")!, taux: map.get("ir.tranche.3.taux")! },
    { ordre: 4, plafond: map.get("ir.tranche.4.plafond")!, taux: map.get("ir.tranche.4.taux")! },
    { ordre: 5, plafond: null, taux: map.get("ir.tranche.5.taux")! },
  ];

  return {
    fiscalYear,
    tranches,
    decote: {
      plafondCelib: map.get("ir.decote.plafond_celib")!,
      plafondCouple: map.get("ir.decote.plafond_couple")!,
      forfaitCelib: map.get("ir.decote.forfait_celib")!,
      forfaitCouple: map.get("ir.decote.forfait_couple")!,
      tauxAttenuation: map.get("ir.decote.taux_attenuation")!,
    },
    plafondQuotientFamilial: map.get("ir.qf.plafond_demi_part")!,
  };
}
