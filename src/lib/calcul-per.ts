/**
 * Moteur de calcul PER — fonctions pures, sans side effects.
 * Réutilise calcul-ir.ts pour le calcul de l'économie d'impôt.
 *
 * ⚠️ Outil pédagogique. Non opposable à la DGFIP.
 * Références : art. 163 quatervicies CGI (salarié), art. 154 bis CGI (TNS).
 */
import { supabase } from "@/integrations/supabase/client";
import { calculerIR, calculerTMI, calculerNbParts, type BaremeIR, type FoyerFiscal } from "./calcul-ir";

// ============================================================
// TYPES
// ============================================================

export type StatutPro = "salarie" | "tns" | "sans_revenu";
export type AnneeVersement = 2025 | 2026;

export interface ProfilPER {
  statut: StatutPro;
  anneeVersement: AnneeVersement;
  revenuPro: number;
  versementSouhaite: number;
  foyer: FoyerFiscal;
}

export interface ResultatPER {
  plafondDeduction: number;
  plafondMinimum: number;
  plafondMaximum: number;
  passUtilise: number;
  anneePassUtilise: number;
  formuleAppliquee: string;

  versementSouhaite: number;
  montantDeductible: number;
  surplusNonDeductible: number;

  irSansPER: number;
  irAvecPER: number;
  economieImpot: number;
  tmi: number;
  tauxEconomieReel: number;
}

// ============================================================
// ANNÉE DE PASS À UTILISER
// ============================================================

export function determinerAnneePass(statut: StatutPro, anneeVersement: AnneeVersement): number {
  if (statut === "tns") return anneeVersement;
  // salarie & sans_revenu → PASS N-1
  return anneeVersement - 1;
}

// ============================================================
// PLAFONDS
// ============================================================

export function calculerPlafondSalarie(revenuProN1: number, passN1: number): {
  plafond: number; formule: string; min: number; max: number;
} {
  const min = Math.round(0.10 * passN1);
  const max = Math.round(0.10 * 8 * passN1);
  const dixPctRevenu = 0.10 * Math.max(0, revenuProN1);
  const formule1 = Math.min(dixPctRevenu, 0.10 * 8 * passN1);

  let plafondRaw: number;
  let formule: string;
  if (formule1 >= 0.10 * passN1) {
    plafondRaw = formule1;
    formule = dixPctRevenu >= 0.10 * 8 * passN1
      ? "10 % du revenu pro (plafonné à 8 × PASS)"
      : "10 % du revenu professionnel";
  } else {
    plafondRaw = 0.10 * passN1;
    formule = "10 % du PASS (plancher)";
  }
  return { plafond: Math.round(plafondRaw), formule, min, max };
}

export function calculerPlafondTNS(beneficeImposable: number, passN: number): {
  plafond: number; formule: string; min: number; max: number;
} {
  const min = Math.round(0.10 * passN);
  const max = Math.round(0.10 * 8 * passN + 0.15 * 7 * passN);

  const beneficePlafonne = Math.min(Math.max(0, beneficeImposable), 8 * passN);
  const partSup = Math.max(0, beneficePlafonne - passN);
  const formule1 = 0.10 * beneficePlafonne + 0.15 * partSup;
  const formule2 = 0.10 * passN;

  let plafondRaw: number;
  let formule: string;
  if (formule1 >= formule2) {
    plafondRaw = formule1;
    formule = partSup > 0
      ? "10 % du bénéfice + 15 % de la part > 1 PASS (plafonné à 8 × PASS)"
      : "10 % du bénéfice";
  } else {
    plafondRaw = formule2;
    formule = "10 % du PASS (plancher)";
  }
  return { plafond: Math.round(plafondRaw), formule, min, max };
}

// ============================================================
// SIMULATION COMPLÈTE
// ============================================================

export function simulerPER(profil: ProfilPER, bareme: BaremeIR, pass: number): ResultatPER {
  const anneePassUtilise = determinerAnneePass(profil.statut, profil.anneeVersement);

  const plafondInfos = profil.statut === "tns"
    ? calculerPlafondTNS(profil.revenuPro, pass)
    : calculerPlafondSalarie(profil.statut === "sans_revenu" ? 0 : profil.revenuPro, pass);

  const versement = Math.max(0, profil.versementSouhaite);
  const montantDeductible = Math.min(versement, plafondInfos.plafond);
  const surplusNonDeductible = Math.max(0, versement - plafondInfos.plafond);

  const foyerSans = profil.foyer;
  const foyerAvec: FoyerFiscal = {
    ...profil.foyer,
    revenuNetImposable: Math.max(0, profil.foyer.revenuNetImposable - montantDeductible),
  };

  const irSans = calculerIR(foyerSans, bareme);
  const irAvec = calculerIR(foyerAvec, bareme);
  const economieImpot = Math.max(0, irSans.irNet - irAvec.irNet);

  // TMI calculée sur le foyer avant versement
  const nbParts = calculerNbParts(foyerSans);
  const qf = nbParts > 0 ? Math.max(0, foyerSans.revenuNetImposable) / nbParts : 0;
  const tmi = calculerTMI(qf, bareme);

  const tauxEconomieReel = montantDeductible > 0
    ? (economieImpot / montantDeductible) * 100
    : 0;

  return {
    plafondDeduction: plafondInfos.plafond,
    plafondMinimum: plafondInfos.min,
    plafondMaximum: plafondInfos.max,
    passUtilise: pass,
    anneePassUtilise,
    formuleAppliquee: plafondInfos.formule,
    versementSouhaite: versement,
    montantDeductible,
    surplusNonDeductible,
    irSansPER: irSans.irNet,
    irAvecPER: irAvec.irNet,
    economieImpot,
    tmi,
    tauxEconomieReel,
  };
}

// ============================================================
// CHARGEMENT DU PASS
// ============================================================

export async function chargerPASS(annee: number): Promise<number> {
  const { data, error } = await supabase
    .from("simulator_constants")
    .select("value")
    .eq("simulator_key", "commun")
    .eq("fiscal_year", annee)
    .eq("constant_key", "pass")
    .maybeSingle();

  if (error) throw new Error(`Erreur chargement PASS ${annee} : ${error.message}`);
  if (!data) throw new Error(`PASS introuvable pour l'année ${annee}`);
  return Number((data as { value: number }).value);
}
