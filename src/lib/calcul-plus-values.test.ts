import { describe, it, expect, vi } from "vitest";
import {
  calculerPlusValueNette,
  tauxAbattement,
  simulerPlusValues,
  type ConstantesPlusValues,
  type ProfilPlusValues,
} from "./calcul-plus-values";
import type { BaremeIR, FoyerFiscal } from "./calcul-ir";

vi.mock("@/integrations/supabase/client", () => {
  const rows = [
    { constant_key: "pfu_taux_global", value: 31.4 },
    { constant_key: "pfu_taux_ir", value: 12.8 },
    { constant_key: "prelevements_sociaux_taux", value: 18.6 },
    { constant_key: "csg_deductible_taux", value: 6.8 },
    { constant_key: "abattement_droit_commun_2_8_ans", value: 50 },
    { constant_key: "abattement_droit_commun_8_ans_plus", value: 65 },
    { constant_key: "abattement_renforce_1_4_ans", value: 50 },
    { constant_key: "abattement_renforce_4_8_ans", value: 65 },
    { constant_key: "abattement_renforce_8_ans_plus", value: 85 },
  ];
  const builder = {
    select: () => builder,
    eq: () => builder,
    then: (resolve: (v: { data: typeof rows; error: null }) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return { supabase: { from: () => builder } };
});

const BAREME: BaremeIR = {
  fiscalYear: 2025,
  tranches: [
    { ordre: 1, plafond: 11600, taux: 0 },
    { ordre: 2, plafond: 29579, taux: 11 },
    { ordre: 3, plafond: 84577, taux: 30 },
    { ordre: 4, plafond: 181917, taux: 41 },
    { ordre: 5, plafond: null, taux: 45 },
  ],
  decote: {
    plafondCelib: 1982,
    plafondCouple: 3277,
    forfaitCelib: 897,
    forfaitCouple: 1483,
    tauxAttenuation: 45.25,
  },
  plafondQuotientFamilial: 1807,
};

const C: ConstantesPlusValues = {
  pfuTauxGlobal: 31.4,
  pfuTauxIR: 12.8,
  prelevementsSociauxTaux: 18.6,
  csgDeductibleTaux: 6.8,
  abattements: {
    droitCommun: { "2_8_ans": 50, "8_ans_plus": 65 },
    renforce: { "1_4_ans": 50, "4_8_ans": 65, "8_ans_plus": 85 },
  },
};

const foyer = (over: Partial<FoyerFiscal>): FoyerFiscal => ({
  revenuNetImposable: 0,
  situation: "celibataire",
  nbEnfants: 0,
  ...over,
});

const profil = (over: Partial<ProfilPlusValues>): ProfilPlusValues => ({
  plusValuesAnnee: 0,
  moinsValuesAnnee: 0,
  moinsValuesReportables: 0,
  titresAvant2018: false,
  regimeAbattement: "aucun",
  dureeDetention: "moins_2_ans",
  foyer: foyer({}),
  ...over,
});

describe("A. Plus-value nette / imputation MV", () => {
  it("1. PV 10000 sans MV → 10000", () => {
    const r = calculerPlusValueNette(10000, 0, 0);
    expect(r.plusValueNette).toBe(10000);
    expect(r.moinsValuesNonUtilisees).toBe(0);
  });
  it("2. PV 10000 / MV année 4000 → 6000", () => {
    const r = calculerPlusValueNette(10000, 4000, 0);
    expect(r.plusValueNette).toBe(6000);
    expect(r.moinsValuesNonUtilisees).toBe(0);
  });
  it("3. PV 10000 / MV 4000 / MV report 8000 → 0, reste 2000", () => {
    const r = calculerPlusValueNette(10000, 4000, 8000);
    expect(r.plusValueNette).toBe(0);
    expect(r.moinsValuesNonUtilisees).toBe(2000);
  });
  it("4. PV 5000 / MV année 10000 → 0, reportables 5000", () => {
    const r = calculerPlusValueNette(5000, 10000, 0);
    expect(r.plusValueNette).toBe(0);
    expect(r.moinsValuesNonUtilisees).toBe(5000);
  });
});

describe("B. PFU pur", () => {
  it("5. PV 10000 post-2018 → PFU IR 1280, PS 1860, total 3140", () => {
    const r = simulerPlusValues(profil({ plusValuesAnnee: 10000 }), BAREME, C);
    expect(r.pfu.partIR).toBeCloseTo(1280, 2);
    expect(r.pfu.partPS).toBeCloseTo(1860, 2);
    expect(r.pfu.impotTotal).toBeCloseTo(3140, 2);
  });
  it("6. PV 0 → tout à 0", () => {
    const r = simulerPlusValues(profil({}), BAREME, C);
    expect(r.pfu.impotTotal).toBe(0);
    expect(r.bareme.impotTotal).toBe(0);
    expect(r.regimeFavorable).toBe("equivalent");
  });
});

describe("C. Abattement droit commun", () => {
  it("7. pré-2018 / droit commun / 4-8 ans → 50%", () => {
    expect(tauxAbattement(true, "droit_commun", "4_a_8_ans", C)).toBe(50);
  });
  it("8. pré-2018 / droit commun / 8+ → 65%", () => {
    expect(tauxAbattement(true, "droit_commun", "8_ans_et_plus", C)).toBe(65);
  });
  it("9. pré-2018 / droit commun / <2 ans → 0", () => {
    expect(tauxAbattement(true, "droit_commun", "moins_2_ans", C)).toBe(0);
  });
});

describe("D. Abattement renforcé PME", () => {
  it("10. renforcé / 1-4 → 50%", () => {
    expect(tauxAbattement(true, "renforce_pme", "1_a_4_ans", C)).toBe(50);
  });
  it("11. renforcé / 4-8 → 65%", () => {
    expect(tauxAbattement(true, "renforce_pme", "4_a_8_ans", C)).toBe(65);
  });
  it("12. renforcé / 8+ → 85%", () => {
    expect(tauxAbattement(true, "renforce_pme", "8_ans_et_plus", C)).toBe(85);
  });
  it("12b. post-2018 → 0 quel que soit le régime", () => {
    expect(tauxAbattement(false, "renforce_pme", "8_ans_et_plus", C)).toBe(0);
  });
});

describe("E. Comparaison PFU vs barème", () => {
  it("13. Célib 30k, PV 10k pré-2018 8+ ans droit commun → abattement 65%", () => {
    const r = simulerPlusValues(
      profil({
        plusValuesAnnee: 10000,
        titresAvant2018: true,
        regimeAbattement: "droit_commun",
        dureeDetention: "8_ans_et_plus",
        foyer: foyer({ revenuNetImposable: 30000 }),
      }),
      BAREME,
      C,
    );
    expect(r.bareme.abattementApplique).toBe(65);
    expect(r.bareme.baseIRApresAbattement).toBeCloseTo(3500, 2);
    expect(r.bareme.partPS).toBeCloseTo(1860, 2);
    expect(r.pfu.impotTotal).toBeCloseTo(3140, 2);
    expect(["pfu", "bareme", "equivalent"]).toContain(r.regimeFavorable);
  });

  it("14. Célib 100k (TMI 41), PV 50k post-2018 → PFU favorable", () => {
    const r = simulerPlusValues(
      profil({
        plusValuesAnnee: 50000,
        foyer: foyer({ revenuNetImposable: 100000 }),
      }),
      BAREME,
      C,
    );
    expect(r.pfu.impotTotal).toBeCloseTo(15700, 2);
    expect(r.bareme.impotTotal).toBeGreaterThan(r.pfu.impotTotal);
    expect(r.regimeFavorable).toBe("pfu");
  });
});

describe("F. Cas limites", () => {
  it("15. PV 0 → equivalent", () => {
    const r = simulerPlusValues(profil({}), BAREME, C);
    expect(r.regimeFavorable).toBe("equivalent");
  });
  it("16. PS toujours sur base AVANT abattement", () => {
    const r = simulerPlusValues(
      profil({
        plusValuesAnnee: 10000,
        titresAvant2018: true,
        regimeAbattement: "renforce_pme",
        dureeDetention: "8_ans_et_plus",
        foyer: foyer({ revenuNetImposable: 30000 }),
      }),
      BAREME,
      C,
    );
    // base avant abattement = 10 000 → PS = 1860 même si abattement 85%
    expect(r.bareme.partPS).toBeCloseTo(1860, 2);
    expect(r.bareme.abattementApplique).toBe(85);
  });
  it("17. chargerConstantesPlusValues(2025) renvoie un objet cohérent", async () => {
    const { chargerConstantesPlusValues } = await import("./calcul-plus-values");
    const c = await chargerConstantesPlusValues(2025);
    expect(c.pfuTauxGlobal).toBe(31.4);
    expect(c.abattements.renforce["8_ans_plus"]).toBe(85);
  });
});
