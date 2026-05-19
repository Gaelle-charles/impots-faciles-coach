/**
 * Comparaison déclaration commune (mariage/PACS) vs séparée (concubinage).
 * Module pur, réutilise calculerIR de calcul-ir.ts.
 *
 * ⚠️ Outil pédagogique. Non opposable à la DGFIP.
 */
import { calculerIR, type BaremeIR, type ResultatIR } from "./calcul-ir";

export interface ProfilDeclarant {
  prenom?: string;
  revenuNetImposable: number;
}

export interface ProfilCouple {
  declarant1: ProfilDeclarant;
  declarant2: ProfilDeclarant;
  nbEnfants: number;
  nbEnfantsHandicapes?: number;
}

export interface ResultatOptimisationCouple {
  scenarioCommun: {
    nbParts: number;
    revenuNetImposableTotal: number;
    ir: ResultatIR;
  };
  scenarioSepare: {
    declarant1: {
      nbEnfantsRattaches: number;
      caseT: boolean;
      ir: ResultatIR;
    };
    declarant2: {
      nbEnfantsRattaches: number;
      caseT: boolean;
      ir: ResultatIR;
    };
    irTotal: number;
  };
  ecartIR: number;
  declarationFavorable: "commune" | "separee" | "equivalent";
  ecartPourcentage: number;
}

const SEUIL_EQUIVALENT = 50;

export function calculerIRSepare(
  declarant: ProfilDeclarant,
  nbEnfantsRattaches: number,
  nbEnfantsHandicapesRattaches: number,
  bareme: BaremeIR
): ResultatIR {
  return calculerIR(
    {
      revenuNetImposable: Math.max(0, declarant.revenuNetImposable),
      situation: "celibataire",
      nbEnfants: nbEnfantsRattaches,
      nbEnfantsHandicapes: nbEnfantsHandicapesRattaches,
    },
    bareme
  );
}

export function comparerScenarios(
  profil: ProfilCouple,
  bareme: BaremeIR
): ResultatOptimisationCouple {
  const r1 = Math.max(0, profil.declarant1.revenuNetImposable);
  const r2 = Math.max(0, profil.declarant2.revenuNetImposable);
  const nbEnfants = Math.max(0, Math.floor(profil.nbEnfants));
  const nbH = Math.min(nbEnfants, Math.max(0, Math.floor(profil.nbEnfantsHandicapes ?? 0)));

  // Scénario A — déclaration commune
  const irCommun = calculerIR(
    {
      revenuNetImposable: r1 + r2,
      situation: "couple",
      nbEnfants,
      nbEnfantsHandicapes: nbH,
    },
    bareme
  );

  // Scénario B — séparé : on teste toutes les répartitions d'enfants (0..nbEnfants chez D1)
  // et on retient la combinaison minimisant l'IR total.
  let best: {
    n1: number;
    h1: number;
    ir1: ResultatIR;
    ir2: ResultatIR;
    total: number;
  } | null = null;

  for (let n1 = 0; n1 <= nbEnfants; n1++) {
    const n2 = nbEnfants - n1;
    // Répartit les enfants handicapés proportionnellement au mieux : on teste toutes les répartitions
    const hMin = Math.max(0, nbH - n2);
    const hMax = Math.min(n1, nbH);
    for (let h1 = hMin; h1 <= hMax; h1++) {
      const h2 = nbH - h1;
      const ir1 = calculerIRSepare(profil.declarant1, n1, h1, bareme);
      const ir2 = calculerIRSepare(profil.declarant2, n2, h2, bareme);
      const total = ir1.irNet + ir2.irNet;
      if (best === null || total < best.total) {
        best = { n1, h1, ir1, ir2, total };
      }
    }
  }

  // best ne peut être null (au moins n1=0)
  const sep = best!;

  const irCommunNet = irCommun.irNet;
  const irSepareTotal = sep.total;
  const ecartIR = irSepareTotal - irCommunNet;

  let declarationFavorable: "commune" | "separee" | "equivalent";
  if (Math.abs(ecartIR) < SEUIL_EQUIVALENT) {
    declarationFavorable = "equivalent";
  } else if (ecartIR > 0) {
    declarationFavorable = "commune";
  } else {
    declarationFavorable = "separee";
  }

  const denom = Math.max(irCommunNet, irSepareTotal);
  const ecartPourcentage = denom > 0 ? (Math.abs(ecartIR) / denom) * 100 : 0;

  return {
    scenarioCommun: {
      nbParts: irCommun.nbParts,
      revenuNetImposableTotal: r1 + r2,
      ir: irCommun,
    },
    scenarioSepare: {
      declarant1: {
        nbEnfantsRattaches: sep.n1,
        caseT: false,
        ir: sep.ir1,
      },
      declarant2: {
        nbEnfantsRattaches: nbEnfants - sep.n1,
        caseT: false,
        ir: sep.ir2,
      },
      irTotal: sep.total,
    },
    ecartIR,
    declarationFavorable,
    ecartPourcentage,
  };
}
