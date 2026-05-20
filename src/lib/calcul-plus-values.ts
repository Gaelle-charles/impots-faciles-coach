/**
 * Moteur de calcul Plus-values mobilières — fonctions pures.
 * Compare PFU (flat tax) vs option barème IR avec abattement.
 *
 * ⚠️ Outil pédagogique. Non opposable à la DGFIP.
 */
import { supabase } from "@/integrations/supabase/client";
import { calculerIR, type BaremeIR, type FoyerFiscal } from "./calcul-ir";

// ============================================================
// TYPES
// ============================================================

export type DureeDetention =
  | "moins_2_ans"
  | "2_a_4_ans"
  | "4_a_8_ans"
  | "8_ans_et_plus";

export type DureeDetentionRenforce =
  | "moins_1_an"
  | "1_a_4_ans"
  | "4_a_8_ans"
  | "8_ans_et_plus";

export type RegimeAbattement = "aucun" | "droit_commun" | "renforce_pme";

export interface ProfilPlusValues {
  plusValuesAnnee: number;
  moinsValuesAnnee: number;
  moinsValuesReportables: number;
  titresAvant2018: boolean;
  regimeAbattement: RegimeAbattement;
  dureeDetention: DureeDetention | DureeDetentionRenforce;
  foyer: FoyerFiscal;
}

export interface ConstantesPlusValues {
  pfuTauxGlobal: number;
  pfuTauxIR: number;
  prelevementsSociauxTaux: number;
  csgDeductibleTaux: number;
  abattements: {
    droitCommun: { "2_8_ans": number; "8_ans_plus": number };
    renforce: { "1_4_ans": number; "4_8_ans": number; "8_ans_plus": number };
  };
}

export interface ResultatPlusValues {
  plusValueNette: number;
  moinsValuesNonUtilisees: number;
  pfu: {
    baseImposable: number;
    partIR: number;
    partPS: number;
    impotTotal: number;
  };
  bareme: {
    baseImposable: number;
    abattementApplique: number;
    montantAbattement: number;
    baseIRApresAbattement: number;
    irSansPlusValue: number;
    irAvecPlusValue: number;
    impactIR: number;
    partPS: number;
    csgDeductibleAnneSuivante: number;
    impotTotal: number;
  };
  ecart: number;
  regimeFavorable: "pfu" | "bareme" | "equivalent";
  ecartPourcentage: number;
}

// ============================================================
// IMPUTATION MOINS-VALUES
// ============================================================

export function calculerPlusValueNette(
  plusValues: number,
  moinsValuesAnnee: number,
  moinsValuesReportables: number,
): { plusValueNette: number; moinsValuesNonUtilisees: number } {
  const pv = Math.max(0, plusValues);
  const mvA = Math.max(0, moinsValuesAnnee);
  const mvR = Math.max(0, moinsValuesReportables);

  // 1) MV année
  const apresMvA = pv - mvA;
  if (apresMvA <= 0) {
    // Le surplus de MV année devient reportable, additionné aux MV reportables existantes
    return {
      plusValueNette: 0,
      moinsValuesNonUtilisees: mvR + Math.abs(apresMvA),
    };
  }
  // 2) MV reportables
  const apresMvR = apresMvA - mvR;
  if (apresMvR <= 0) {
    return {
      plusValueNette: 0,
      moinsValuesNonUtilisees: Math.abs(apresMvR),
    };
  }
  return {
    plusValueNette: apresMvR,
    moinsValuesNonUtilisees: 0,
  };
}

// ============================================================
// ABATTEMENT
// ============================================================

export function tauxAbattement(
  titresAvant2018: boolean,
  regime: RegimeAbattement,
  duree: DureeDetention | DureeDetentionRenforce,
  constantes: ConstantesPlusValues,
): number {
  if (!titresAvant2018) return 0;
  if (regime === "aucun") return 0;

  if (regime === "droit_commun") {
    switch (duree) {
      case "2_a_4_ans":
      case "4_a_8_ans":
        return constantes.abattements.droitCommun["2_8_ans"];
      case "8_ans_et_plus":
        return constantes.abattements.droitCommun["8_ans_plus"];
      default:
        return 0;
    }
  }
  // renforce_pme
  switch (duree) {
    case "1_a_4_ans":
      return constantes.abattements.renforce["1_4_ans"];
    case "4_a_8_ans":
      return constantes.abattements.renforce["4_8_ans"];
    case "8_ans_et_plus":
      return constantes.abattements.renforce["8_ans_plus"];
    default:
      return 0;
  }
}

// ============================================================
// SIMULATION COMPLÈTE
// ============================================================

export function simulerPlusValues(
  profil: ProfilPlusValues,
  bareme: BaremeIR,
  constantes: ConstantesPlusValues,
): ResultatPlusValues {
  const { plusValueNette, moinsValuesNonUtilisees } = calculerPlusValueNette(
    profil.plusValuesAnnee,
    profil.moinsValuesAnnee,
    profil.moinsValuesReportables,
  );

  // === PFU ===
  const pfuPartIR = plusValueNette * (constantes.pfuTauxIR / 100);
  const pfuPartPS = plusValueNette * (constantes.prelevementsSociauxTaux / 100);
  const pfuTotal = pfuPartIR + pfuPartPS;

  // === Barème ===
  const tauxAbat = tauxAbattement(
    profil.titresAvant2018,
    profil.regimeAbattement,
    profil.dureeDetention,
    constantes,
  );
  const montantAbattement = plusValueNette * (tauxAbat / 100);
  const baseIRApresAbattement = plusValueNette - montantAbattement;

  const irSansPv = calculerIR(profil.foyer, bareme).irNet;
  const foyerAvecPv: FoyerFiscal = {
    ...profil.foyer,
    revenuNetImposable: profil.foyer.revenuNetImposable + baseIRApresAbattement,
  };
  const irAvecPv = calculerIR(foyerAvecPv, bareme).irNet;
  const impactIR = Math.max(0, irAvecPv - irSansPv);

  // PS sur base AVANT abattement
  const baremePartPS = plusValueNette * (constantes.prelevementsSociauxTaux / 100);
  const csgDeductible = plusValueNette * (constantes.csgDeductibleTaux / 100);
  const baremeTotal = impactIR + baremePartPS;

  const ecart = baremeTotal - pfuTotal;
  const maxTotal = Math.max(pfuTotal, baremeTotal);
  let regimeFavorable: "pfu" | "bareme" | "equivalent";
  if (Math.abs(ecart) < 50) {
    regimeFavorable = "equivalent";
  } else if (ecart > 0) {
    regimeFavorable = "pfu";
  } else {
    regimeFavorable = "bareme";
  }
  const ecartPourcentage = maxTotal > 0 ? (Math.abs(ecart) / maxTotal) * 100 : 0;

  return {
    plusValueNette,
    moinsValuesNonUtilisees,
    pfu: {
      baseImposable: plusValueNette,
      partIR: pfuPartIR,
      partPS: pfuPartPS,
      impotTotal: pfuTotal,
    },
    bareme: {
      baseImposable: plusValueNette,
      abattementApplique: tauxAbat,
      montantAbattement,
      baseIRApresAbattement,
      irSansPlusValue: irSansPv,
      irAvecPlusValue: irAvecPv,
      impactIR,
      partPS: baremePartPS,
      csgDeductibleAnneSuivante: csgDeductible,
      impotTotal: baremeTotal,
    },
    ecart,
    regimeFavorable,
    ecartPourcentage,
  };
}

// ============================================================
// LOADER
// ============================================================

const PV_REQUIRED_KEYS = [
  "pfu_taux_global",
  "pfu_taux_ir",
  "prelevements_sociaux_taux",
  "csg_deductible_taux",
  "abattement_droit_commun_2_8_ans",
  "abattement_droit_commun_8_ans_plus",
  "abattement_renforce_1_4_ans",
  "abattement_renforce_4_8_ans",
  "abattement_renforce_8_ans_plus",
] as const;

export async function chargerConstantesPlusValues(
  fiscalYear: number,
): Promise<ConstantesPlusValues> {
  const { data, error } = await supabase
    .from("simulator_constants")
    .select("constant_key, value")
    .eq("simulator_key", "plus_values")
    .eq("fiscal_year", fiscalYear);

  if (error) {
    throw new Error(
      `Erreur chargement constantes plus-values ${fiscalYear} : ${error.message}`,
    );
  }

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.constant_key as string, Number((row as { value: number }).value));
  }

  for (const k of PV_REQUIRED_KEYS) {
    if (!map.has(k)) {
      throw new Error(
        `Constante manquante : ${k} (simulator_key='plus_values', fiscal_year=${fiscalYear})`,
      );
    }
  }

  return {
    pfuTauxGlobal: map.get("pfu_taux_global")!,
    pfuTauxIR: map.get("pfu_taux_ir")!,
    prelevementsSociauxTaux: map.get("prelevements_sociaux_taux")!,
    csgDeductibleTaux: map.get("csg_deductible_taux")!,
    abattements: {
      droitCommun: {
        "2_8_ans": map.get("abattement_droit_commun_2_8_ans")!,
        "8_ans_plus": map.get("abattement_droit_commun_8_ans_plus")!,
      },
      renforce: {
        "1_4_ans": map.get("abattement_renforce_1_4_ans")!,
        "4_8_ans": map.get("abattement_renforce_4_8_ans")!,
        "8_ans_plus": map.get("abattement_renforce_8_ans_plus")!,
      },
    },
  };
}
