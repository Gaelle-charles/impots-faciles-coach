import { describe, it, expect } from "vitest";
import {
  appliquerBareme,
  calculerDecote,
  calculerIR,
  calculerNbParts,
  calculerTMI,
  type BaremeIR,
  type FoyerFiscal,
} from "./calcul-ir";

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

const B = BAREME_2025_FIXTURE;

const foyer = (over: Partial<FoyerFiscal>): FoyerFiscal => ({
  revenuNetImposable: 0,
  situation: "celibataire",
  nbEnfants: 0,
  ...over,
});

describe("A. Barème — cas DGFiP", () => {
  it("1. Célibataire 0 € → IR = 0", () => {
    const r = calculerIR(foyer({ revenuNetImposable: 0 }), B);
    expect(r.irNet).toBe(0);
  });

  it("2. Célibataire 11 600 € → IR brut = 0", () => {
    const r = calculerIR(foyer({ revenuNetImposable: 11_600 }), B);
    expect(r.irBrutAvantPlafondQF).toBeCloseTo(0, 5);
    expect(r.irNet).toBe(0);
  });

  it("3. Célibataire 11 601 € → IR brut ≈ 0,11 €", () => {
    const r = calculerIR(foyer({ revenuNetImposable: 11_601 }), B);
    expect(r.irBrutAvantPlafondQF).toBeCloseTo(0.11, 5);
  });

  it("4. Célibataire 30 000 € → IR net ≈ 2 104 €", () => {
    const r = calculerIR(foyer({ revenuNetImposable: 30_000 }), B);
    expect(Math.abs(r.irNet - 2104)).toBeLessThanOrEqual(1);
  });

  it("5. Célibataire 100 000 € → tranche 4 partielle", () => {
    const r = calculerIR(foyer({ revenuNetImposable: 100_000 }), B);
    // t2: 17979*0.11=1977.69 ; t3: 54998*0.30=16499.40 ; t4: 15423*0.41=6323.43
    // total = 24800.52 → 24801
    expect(Math.abs(r.irNet - 24_801)).toBeLessThanOrEqual(1);
    expect(r.tmi).toBe(41);
  });

  it("6. Célibataire 250 000 € → TMI = 45", () => {
    const r = calculerIR(foyer({ revenuNetImposable: 250_000 }), B);
    expect(r.tmi).toBe(45);
  });
});

describe("B. Quotient familial", () => {
  it("7. Couple 60 000 € sans enfant → IR brut ≈ 4 208 €", () => {
    const r = calculerIR(
      foyer({ revenuNetImposable: 60_000, situation: "couple" }),
      B
    );
    expect(Math.abs(r.irNet - 4208)).toBeLessThanOrEqual(1);
    expect(r.nbParts).toBe(2);
  });

  it("8. Couple 60 000 € + 1 enfant → IR ≈ 3 410 € (2,5 parts)", () => {
    const r = calculerIR(
      foyer({ revenuNetImposable: 60_000, situation: "couple", nbEnfants: 1 }),
      B
    );
    expect(r.nbParts).toBe(2.5);
    expect(Math.abs(r.irNet - 3410)).toBeLessThanOrEqual(1);
  });

  it("9. Parent isolé 30 000 € + 1 enfant → 2 parts (1 + 0,5 enfant + 0,5 case T)", () => {
    const r = calculerIR(
      foyer({ revenuNetImposable: 30_000, situation: "parent_isole", nbEnfants: 1 }),
      B
    );
    expect(r.nbParts).toBe(2);
  });

  it("10. Couple 80 000 € + 3 enfants → 4 parts", () => {
    const r = calculerIR(
      foyer({ revenuNetImposable: 80_000, situation: "couple", nbEnfants: 3 }),
      B
    );
    expect(r.nbParts).toBe(4);
  });
});

describe("C. Plafonnement QF", () => {
  it("11. Couple 60 000 € + 1 enfant → plafond QF NON déclenché", () => {
    const r = calculerIR(
      foyer({ revenuNetImposable: 60_000, situation: "couple", nbEnfants: 1 }),
      B
    );
    expect(r.plafondQFActif).toBe(false);
    expect(r.reductionQF).toBeLessThan(B.plafondQuotientFamilial);
  });

  it("12. Couple 150 000 € + 1 enfant → plafond QF déclenché à 1 807 €", () => {
    const r = calculerIR(
      foyer({ revenuNetImposable: 150_000, situation: "couple", nbEnfants: 1 }),
      B
    );
    expect(r.plafondQFActif).toBe(true);
    expect(r.reductionQFPlafonnee).toBe(1807);
  });
});

describe("D. Décote", () => {
  it("13. Célib IR brut 1 000 € → décote ≈ 444,50 €", () => {
    expect(calculerDecote(1000, "celibataire", B)).toBeCloseTo(444.5, 2);
  });

  it("14. Célib IR brut 1 982 € (seuil) → décote = 0", () => {
    expect(calculerDecote(1982, "celibataire", B)).toBe(0);
  });

  it("15. Célib IR brut 1 983 € (au-delà) → décote = 0", () => {
    expect(calculerDecote(1983, "celibataire", B)).toBe(0);
  });

  it("16. Couple IR brut 2 000 € → décote ≈ 578 €", () => {
    expect(calculerDecote(2000, "couple", B)).toBeCloseTo(578, 2);
  });
});

describe("E. Cas limites", () => {
  it("17. Décote > IR brut → IR net = 0 (jamais négatif)", () => {
    // Célib avec IR brut très faible (ex revenu 11 700 → IR brut = 11)
    const r = calculerIR(foyer({ revenuNetImposable: 11_700 }), B);
    expect(r.irNet).toBe(0);
  });

  it("18. TMI : 29 579 € → 11 ; 29 580 € → 30", () => {
    expect(calculerTMI(29_579, B)).toBe(11);
    expect(calculerTMI(29_580, B)).toBe(30);
  });
});

describe("Sanity — fonctions unitaires", () => {
  it("appliquerBareme(0) = 0", () => {
    expect(appliquerBareme(0, B)).toBe(0);
  });
  it("calculerNbParts célibataire = 1", () => {
    expect(calculerNbParts(foyer({}))).toBe(1);
  });
});
