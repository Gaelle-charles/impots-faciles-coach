import { describe, it, expect } from "vitest";
import { comparerScenarios, calculerIRSepare } from "./calcul-optimisation-couple";
import type { BaremeIR } from "./calcul-ir";

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

describe("comparerScenarios — cas classiques (commune avantageuse)", () => {
  it("1. 60k + 0, sans enfant → commune nettement plus avantageuse", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 60000 }, declarant2: { revenuNetImposable: 0 }, nbEnfants: 0 },
      BAREME
    );
    expect(r.declarationFavorable).toBe("commune");
    expect(r.ecartIR).toBeGreaterThan(1000);
  });

  it("2. 80k + 20k, sans enfant → commune avantageuse", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 80000 }, declarant2: { revenuNetImposable: 20000 }, nbEnfants: 0 },
      BAREME
    );
    expect(r.declarationFavorable).toBe("commune");
    expect(r.ecartIR).toBeGreaterThan(0);
  });

  it("3. 40k + 40k, sans enfant → équivalent (écart < 50€)", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 40000 }, declarant2: { revenuNetImposable: 40000 }, nbEnfants: 0 },
      BAREME
    );
    expect(r.declarationFavorable).toBe("equivalent");
    expect(Math.abs(r.ecartIR)).toBeLessThan(50);
  });
});

describe("comparerScenarios — cas avec enfants", () => {
  it("4. 100k + 0, 2 enfants → commune reste avantageuse", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 100000 }, declarant2: { revenuNetImposable: 0 }, nbEnfants: 2 },
      BAREME
    );
    expect(r.declarationFavorable).toBe("commune");
  });

  it("5. 50k + 50k, 2 enfants → choisit la meilleure répartition", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 50000 }, declarant2: { revenuNetImposable: 50000 }, nbEnfants: 2 },
      BAREME
    );
    const sum = r.scenarioSepare.declarant1.nbEnfantsRattaches + r.scenarioSepare.declarant2.nbEnfantsRattaches;
    expect(sum).toBe(2);
  });

  it("6. 80k + 30k, 3 enfants → cohérence du rattachement enfants", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 80000 }, declarant2: { revenuNetImposable: 30000 }, nbEnfants: 3 },
      BAREME
    );
    const sum = r.scenarioSepare.declarant1.nbEnfantsRattaches + r.scenarioSepare.declarant2.nbEnfantsRattaches;
    expect(sum).toBe(3);
    expect(r.declarationFavorable).toBe("commune");
  });
});

describe("comparerScenarios — cas séparée potentiellement favorable", () => {
  it("7. 30k + 30k, 0 enfant → équivalent ou très proche", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 30000 }, declarant2: { revenuNetImposable: 30000 }, nbEnfants: 0 },
      BAREME
    );
    expect(["commune", "separee", "equivalent"]).toContain(r.declarationFavorable);
    expect(Math.abs(r.ecartIR)).toBeLessThan(500);
  });

  it("8. 25k + 25k, 1 enfant → commune préférable ou équivalent", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 25000 }, declarant2: { revenuNetImposable: 25000 }, nbEnfants: 1 },
      BAREME
    );
    expect(["commune", "equivalent"]).toContain(r.declarationFavorable);
  });
});

describe("comparerScenarios — cas limites", () => {
  it("9. 0 + 0 → tout à 0", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 0 }, declarant2: { revenuNetImposable: 0 }, nbEnfants: 0 },
      BAREME
    );
    expect(r.scenarioCommun.ir.irNet).toBe(0);
    expect(r.scenarioSepare.irTotal).toBe(0);
    expect(r.declarationFavorable).toBe("equivalent");
  });

  it("10. 200k + 200k → commune avantageuse par effet de seuil", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 200000 }, declarant2: { revenuNetImposable: 200000 }, nbEnfants: 0 },
      BAREME
    );
    expect(["commune", "equivalent"]).toContain(r.declarationFavorable);
  });
});

describe("comparerScenarios — vérifications structurelles", () => {
  it("11. la somme des enfants rattachés égale toujours nbEnfants", () => {
    for (const n of [0, 1, 2, 3, 4]) {
      const r = comparerScenarios(
        { declarant1: { revenuNetImposable: 50000 }, declarant2: { revenuNetImposable: 30000 }, nbEnfants: n },
        BAREME
      );
      expect(r.scenarioSepare.declarant1.nbEnfantsRattaches + r.scenarioSepare.declarant2.nbEnfantsRattaches).toBe(n);
    }
  });

  it("12. declarationFavorable cohérent avec ecartIR", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 90000 }, declarant2: { revenuNetImposable: 10000 }, nbEnfants: 1 },
      BAREME
    );
    if (r.declarationFavorable === "commune") expect(r.ecartIR).toBeGreaterThanOrEqual(50);
    if (r.declarationFavorable === "separee") expect(r.ecartIR).toBeLessThanOrEqual(-50);
    if (r.declarationFavorable === "equivalent") expect(Math.abs(r.ecartIR)).toBeLessThan(50);
  });

  it("13. ecartPourcentage est toujours ≥ 0", () => {
    const r = comparerScenarios(
      { declarant1: { revenuNetImposable: 70000 }, declarant2: { revenuNetImposable: 35000 }, nbEnfants: 2 },
      BAREME
    );
    expect(r.ecartPourcentage).toBeGreaterThanOrEqual(0);
  });

  it("calculerIRSepare retourne un ResultatIR valide", () => {
    const ir = calculerIRSepare({ revenuNetImposable: 30000 }, 0, 0, BAREME);
    expect(ir.irNet).toBeGreaterThanOrEqual(0);
    expect(ir.nbParts).toBe(1);
  });
});
