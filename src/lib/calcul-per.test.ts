import { describe, expect, it } from "vitest";
import {
  calculerPlafondSalarie,
  calculerPlafondTNS,
  determinerAnneePass,
  simulerPER,
  type ProfilPER,
} from "./calcul-per";
import type { BaremeIR, FoyerFiscal } from "./calcul-ir";

const PASS_2024 = 46368;
const PASS_2025 = 47100;
const PASS_2026 = 48060;

const BAREME_2025_FIXTURE: BaremeIR = {
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

describe("calculerPlafondSalarie (PASS 2024)", () => {
  it("revenu 10 000 € → plancher 10 % PASS", () => {
    expect(calculerPlafondSalarie(10_000, PASS_2024).plafond).toBe(4637);
  });
  it("revenu 50 000 € → 10 % revenu", () => {
    expect(calculerPlafondSalarie(50_000, PASS_2024).plafond).toBe(5000);
  });
  it("revenu 500 000 € → plafonné à 8 × 10 % PASS", () => {
    expect(calculerPlafondSalarie(500_000, PASS_2024).plafond).toBe(37094);
  });
  it("sans revenu → plancher PASS", () => {
    expect(calculerPlafondSalarie(0, PASS_2024).plafond).toBe(4637);
  });
});

describe("calculerPlafondSalarie (PASS 2025)", () => {
  it("revenu 60 000 € → 10 % revenu", () => {
    expect(calculerPlafondSalarie(60_000, PASS_2025).plafond).toBe(6000);
  });
  it("revenu 500 000 € → max = 37 680", () => {
    expect(calculerPlafondSalarie(500_000, PASS_2025).plafond).toBe(37680);
  });
});

describe("calculerPlafondTNS (PASS 2025)", () => {
  it("bénéfice 30 000 → plancher 4 710", () => {
    expect(calculerPlafondTNS(30_000, PASS_2025).plafond).toBe(4710);
  });
  it("bénéfice 60 000 → 7 935", () => {
    expect(calculerPlafondTNS(60_000, PASS_2025).plafond).toBe(7935);
  });
  it("bénéfice 80 000 → 12 935", () => {
    expect(calculerPlafondTNS(80_000, PASS_2025).plafond).toBe(12935);
  });
  it("bénéfice 500 000 → 87 135 (plafonné 8×PASS)", () => {
    expect(calculerPlafondTNS(500_000, PASS_2025).plafond).toBe(87135);
  });
});

describe("calculerPlafondTNS (PASS 2026)", () => {
  it("bénéfice 60 000 → 7 791", () => {
    expect(calculerPlafondTNS(60_000, PASS_2026).plafond).toBe(7791);
  });
  it("bénéfice max → 88 911", () => {
    expect(calculerPlafondTNS(1_000_000, PASS_2026).plafond).toBe(88911);
  });
});

describe("determinerAnneePass", () => {
  it("salarié 2025 → 2024", () => expect(determinerAnneePass("salarie", 2025)).toBe(2024));
  it("salarié 2026 → 2025", () => expect(determinerAnneePass("salarie", 2026)).toBe(2025));
  it("TNS 2025 → 2025", () => expect(determinerAnneePass("tns", 2025)).toBe(2025));
  it("TNS 2026 → 2026", () => expect(determinerAnneePass("tns", 2026)).toBe(2026));
  it("sans_revenu 2025 → 2024", () => expect(determinerAnneePass("sans_revenu", 2025)).toBe(2024));
});

const foyer = (revenuNet: number, situation: FoyerFiscal["situation"] = "celibataire", nbEnfants = 0): FoyerFiscal => ({
  revenuNetImposable: revenuNet,
  situation,
  nbEnfants,
});

describe("simulerPER — économie d'impôt", () => {
  it("célibataire 50 000 €, salarié, versement 5 000 € → ~30 % d'économie", () => {
    const profil: ProfilPER = {
      statut: "salarie",
      anneeVersement: 2025,
      revenuPro: 50_000,
      versementSouhaite: 5_000,
      foyer: foyer(50_000),
    };
    const r = simulerPER(profil, BAREME_2025_FIXTURE, PASS_2024);
    expect(r.plafondDeduction).toBe(5000);
    expect(r.montantDeductible).toBe(5000);
    expect(r.surplusNonDeductible).toBe(0);
    expect(r.tmi).toBe(30);
    // Économie ≈ 5000 × 30 % = 1500
    expect(r.economieImpot).toBeGreaterThan(1400);
    expect(r.economieImpot).toBeLessThan(1600);
    expect(r.tauxEconomieReel).toBeGreaterThan(28);
    expect(r.tauxEconomieReel).toBeLessThan(32);
  });

  it("célibataire 15 000 €, versement 1 000 € → économie faible (TMI 11 %)", () => {
    const profil: ProfilPER = {
      statut: "salarie",
      anneeVersement: 2025,
      revenuPro: 15_000,
      versementSouhaite: 1_000,
      foyer: foyer(15_000),
    };
    const r = simulerPER(profil, BAREME_2025_FIXTURE, PASS_2024);
    expect(r.tmi).toBe(11);
    expect(r.economieImpot).toBeGreaterThanOrEqual(0);
    expect(r.economieImpot).toBeLessThan(600);
  });

  it("couple 100 000 €, versement 10 000 € → économie significative", () => {
    const profil: ProfilPER = {
      statut: "salarie",
      anneeVersement: 2025,
      revenuPro: 100_000,
      versementSouhaite: 10_000,
      foyer: foyer(100_000, "couple"),
    };
    const r = simulerPER(profil, BAREME_2025_FIXTURE, PASS_2024);
    expect(r.montantDeductible).toBe(10_000);
    expect(r.economieImpot).toBeGreaterThan(1000);
  });

  it("surplus non déductible : salarié 30 000, versement 5 000, plafond 3 000", () => {
    const profil: ProfilPER = {
      statut: "salarie",
      anneeVersement: 2025,
      revenuPro: 30_000,
      versementSouhaite: 5_000,
      foyer: foyer(27_000),
    };
    const r = simulerPER(profil, BAREME_2025_FIXTURE, PASS_2024);
    // plafond = max(min(3000, 37094), 4637) = 4637 (plancher PASS plus avantageux)
    expect(r.plafondDeduction).toBe(4637);
    expect(r.montantDeductible).toBe(4637);
    expect(r.surplusNonDeductible).toBe(363);
  });

  it("versement = 0 → pas d'erreur, tout à 0", () => {
    const profil: ProfilPER = {
      statut: "salarie",
      anneeVersement: 2025,
      revenuPro: 50_000,
      versementSouhaite: 0,
      foyer: foyer(50_000),
    };
    const r = simulerPER(profil, BAREME_2025_FIXTURE, PASS_2024);
    expect(r.montantDeductible).toBe(0);
    expect(r.surplusNonDeductible).toBe(0);
    expect(r.economieImpot).toBe(0);
    expect(r.tauxEconomieReel).toBe(0);
  });
});
