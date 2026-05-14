import { describe, it, expect } from 'vitest'
import {
  calculerFraisKilometriques,
  calculerFraisRepas,
  calculerBureauDomicile,
  calculerMateriel,
  calculerTotal,
  type FraisReelsConstants,
  type InputsKm
} from './calculs-frais-reels'

const C: FraisReelsConstants = {
  km_voiture_3cv_seuil1: 0.529,
  km_voiture_4cv_seuil1: 0.606,
  km_voiture_5cv_seuil1: 0.636,
  km_voiture_6cv_seuil1: 0.665,
  km_voiture_7cv_seuil1: 0.697,
  km_voiture_5cv_seuil2_coef: 0.357,
  km_voiture_5cv_seuil2_cst: 1395,
  km_voiture_7cv_seuil2_coef: 0.394,
  km_voiture_7cv_seuil2_cst: 1515,
  km_voiture_5cv_seuil3_coef: 0.427,
  km_voiture_7cv_seuil3_coef: 0.470,
  'km_moto_3-5cv_seuil1_coef': 0.468,
  'km_moto_3-5cv_seuil2_coef': 0.082,
  'km_moto_3-5cv_seuil2_cst': 1158,
  'km_moto_3-5cv_seuil3_coef': 0.275,
  km_cyclo_seuil1_coef: 0.315,
  km_cyclo_seuil2_coef: 0.079,
  km_cyclo_seuil2_cst: 711,
  km_cyclo_seuil3_coef: 0.198,
  km_majoration_electrique: 20,
  km_cv_plafond_voiture: 7,
  km_cv_plafond_deux_roues: 5,
  km_plafond_distance_jour: 40,
  repas_valeur_foyer: 5.45,
  repas_plafond_jour: 21.10,
  abattement_10_min: 495,
  abattement_10_max: 14171,
  blanchissage_decote_domicile: 30,
  materiel_seuil_amortissement: 500,
  materiel_duree_ordinateur: 3,
  materiel_duree_mobilier: 10,
  materiel_duree_autre: 5
}

const inputsKmBase: InputsKm = {
  typeVehicule: 'voiture',
  cv: 5,
  motorisation: 'thermique',
  distanceAllerSimple: 30,
  justificationEloignement: false,
  nbAllerRetourParJour: 1,
  nbJoursTravailles: 218,
  kmMissionPro: 0,
  peagesAnnuel: 0,
  parkingAnnuel: 0,
  indemnitesKmEmployeur: 0
}

describe('calculerFraisKilometriques — voiture', () => {
  it('Profil 1 — 30 km A/S × 218j, 5 CV → tranche 2', () => {
    const r = calculerFraisKilometriques(inputsKmBase, C)
    expect(r.details.distanceAnnuelle).toBe(13080)
    expect(r.details.tranche).toBe(2)
    expect(r.total).toBeCloseTo(6064.56, 1)
  })

  it('Profil 2 — 10 km A/S × 218j, 5 CV → tranche 1', () => {
    const r = calculerFraisKilometriques({ ...inputsKmBase, distanceAllerSimple: 10 }, C)
    expect(r.details.distanceAnnuelle).toBe(4360)
    expect(r.details.tranche).toBe(1)
    expect(r.total).toBeCloseTo(4360 * 0.636, 1)
  })

  it('Profil 3 — gros rouleur 35000 km, 5 CV → tranche 3', () => {
    const r = calculerFraisKilometriques({
      ...inputsKmBase,
      distanceAllerSimple: 0,
      nbAllerRetourParJour: 0,
      kmMissionPro: 35000
    }, C)
    expect(r.details.distanceAnnuelle).toBe(35000)
    expect(r.details.tranche).toBe(3)
    expect(r.total).toBeCloseTo(35000 * 0.427, 1)
  })

  it('Plafond 40 km appliqué si non justifié', () => {
    const r = calculerFraisKilometriques({ ...inputsKmBase, distanceAllerSimple: 60 }, C)
    expect(r.details.distanceAllerRetenue).toBe(40)
    expect(r.details.distanceAnnuelle).toBe(40 * 2 * 218)
  })

  it('Distance complète conservée si justification cochée', () => {
    const r = calculerFraisKilometriques({
      ...inputsKmBase,
      distanceAllerSimple: 60,
      justificationEloignement: true
    }, C)
    expect(r.details.distanceAllerRetenue).toBe(60)
  })

  it('Plafonnement CV à 7 pour voiture', () => {
    const r = calculerFraisKilometriques({ ...inputsKmBase, cv: 12 }, C)
    expect(r.details.cvEffectif).toBe(7)
  })

  it('Majoration électrique +20%', () => {
    const thermique = calculerFraisKilometriques(inputsKmBase, C)
    const electrique = calculerFraisKilometriques({ ...inputsKmBase, motorisation: 'electrique' }, C)
    expect(electrique.total).toBeCloseTo(thermique.total * 1.20, 0)
  })

  it('Indemnités employeur soustraites', () => {
    const r = calculerFraisKilometriques({ ...inputsKmBase, indemnitesKmEmployeur: 2000 }, C)
    const sansIndem = calculerFraisKilometriques(inputsKmBase, C)
    expect(r.total).toBeCloseTo(sansIndem.total - 2000, 1)
  })

  it('Soustrait les indemnités après ajout des péages et du parking', () => {
    const r = calculerFraisKilometriques({
      ...inputsKmBase,
      peagesAnnuel: 200,
      parkingAnnuel: 270,
      indemnitesKmEmployeur: 1200
    }, C)
    const base = calculerFraisKilometriques(inputsKmBase, C)
    expect(r.total).toBeCloseTo(base.total + 200 + 270 - 1200, 1)
  })

  it('Péages et parking ajoutés', () => {
    const r = calculerFraisKilometriques({
      ...inputsKmBase,
      peagesAnnuel: 500,
      parkingAnnuel: 300
    }, C)
    const base = calculerFraisKilometriques(inputsKmBase, C)
    expect(r.total).toBeCloseTo(base.total + 800, 1)
  })

  it('Total non négatif si indemnités > barème', () => {
    const r = calculerFraisKilometriques({ ...inputsKmBase, indemnitesKmEmployeur: 999999 }, C)
    expect(r.total).toBe(0)
  })
})

describe('calculerFraisKilometriques — motocyclette', () => {
  it('Moto 4 CV, 4500 km → tranche 2 (3-5 CV)', () => {
    const r = calculerFraisKilometriques({
      ...inputsKmBase,
      typeVehicule: 'motocyclette',
      cv: 4,
      distanceAllerSimple: 0,
      nbAllerRetourParJour: 0,
      kmMissionPro: 4500
    }, C)
    expect(r.details.tranche).toBe(2)
    expect(r.total).toBeCloseTo(1527, 0)
  })

  it('Plafonnement CV à 5 pour deux-roues', () => {
    const r = calculerFraisKilometriques({
      ...inputsKmBase,
      typeVehicule: 'motocyclette',
      cv: 8
    }, C)
    expect(r.details.cvEffectif).toBe(5)
  })
})

describe('calculerFraisKilometriques — cyclomoteur', () => {
  it('Cyclo 2500 km → tranche 1', () => {
    const r = calculerFraisKilometriques({
      ...inputsKmBase,
      typeVehicule: 'cyclomoteur',
      cv: 1,
      distanceAllerSimple: 0,
      nbAllerRetourParJour: 0,
      kmMissionPro: 2500
    }, C)
    expect(r.details.tranche).toBe(1)
    expect(r.total).toBeCloseTo(2500 * 0.315, 1)
  })
})

describe('calculerFraisRepas', () => {
  it('Forfait gamelle : 1 × 218 × 5,45 €', () => {
    const r = calculerFraisRepas({
      nbRepasSansJustifParJour: 1,
      nbRepasAvecJustifParJour: 0,
      coutMoyenRepasJustifie: 0,
      nbJoursRepas: 218,
      nbTicketsRestoAnnee: 0,
      valeurFacialeTicket: 8,
      partEmployeurPct: 50,
      indemnitesRepasHorsTR: 0
    }, C)
    expect(r.total).toBeCloseTo(218 * 5.45, 1)
  })

  it('Avec justif 15 € × 218 j', () => {
    const r = calculerFraisRepas({
      nbRepasSansJustifParJour: 0,
      nbRepasAvecJustifParJour: 1,
      coutMoyenRepasJustifie: 15,
      nbJoursRepas: 218,
      nbTicketsRestoAnnee: 0,
      valeurFacialeTicket: 8,
      partEmployeurPct: 50,
      indemnitesRepasHorsTR: 0
    }, C)
    expect(r.total).toBeCloseTo(218 * (15 - 5.45), 1)
  })

  it('Repas 30 € plafonné à 21,10 €', () => {
    const r = calculerFraisRepas({
      nbRepasSansJustifParJour: 0,
      nbRepasAvecJustifParJour: 1,
      coutMoyenRepasJustifie: 30,
      nbJoursRepas: 218,
      nbTicketsRestoAnnee: 0,
      valeurFacialeTicket: 8,
      partEmployeurPct: 50,
      indemnitesRepasHorsTR: 0
    }, C)
    expect(r.total).toBeCloseTo(218 * 15.65, 1)
  })

  it('Soustraction part employeur tickets-resto', () => {
    const r = calculerFraisRepas({
      nbRepasSansJustifParJour: 1,
      nbRepasAvecJustifParJour: 0,
      coutMoyenRepasJustifie: 0,
      nbJoursRepas: 218,
      nbTicketsRestoAnnee: 200,
      valeurFacialeTicket: 8,
      partEmployeurPct: 50,
      indemnitesRepasHorsTR: 0
    }, C)
    expect(r.total).toBeCloseTo(388.10, 1)
  })
})

describe('calculerBureauDomicile', () => {
  it('Quote-part 10/100 m² × 12000 €', () => {
    const r = calculerBureauDomicile({
      surfaceBureauM2: 10,
      surfaceLogementM2: 100,
      loyerOuInteretsEmprunt: 10000,
      chargesCoproAnnuelles: 1000,
      electriciteChauffageAnnuel: 1000,
      internetAnnuel: 0,
      internetUsageProPct: 0,
      assuranceHabitationAnnuelle: 0,
      taxeFonciereAnnuelle: 0,
      indemniteTeletravailEmployeur: 0
    })
    expect(r.details.quotePart).toBeCloseTo(0.10, 2)
    expect(r.total).toBeCloseTo(1200, 1)
  })

  it('Alerte si bureau > logement', () => {
    const r = calculerBureauDomicile({
      surfaceBureauM2: 50,
      surfaceLogementM2: 30,
      loyerOuInteretsEmprunt: 10000,
      chargesCoproAnnuelles: 0,
      electriciteChauffageAnnuel: 0,
      internetAnnuel: 0,
      internetUsageProPct: 0,
      assuranceHabitationAnnuelle: 0,
      taxeFonciereAnnuelle: 0,
      indemniteTeletravailEmployeur: 0
    })
    expect(r.details.alerte).toBeDefined()
    expect(r.details.quotePart).toBeLessThanOrEqual(1)
  })

  it('Indemnité télétravail employeur soustraite', () => {
    const r = calculerBureauDomicile({
      surfaceBureauM2: 10,
      surfaceLogementM2: 100,
      loyerOuInteretsEmprunt: 10000,
      chargesCoproAnnuelles: 0,
      electriciteChauffageAnnuel: 0,
      internetAnnuel: 0,
      internetUsageProPct: 0,
      assuranceHabitationAnnuelle: 0,
      taxeFonciereAnnuelle: 0,
      indemniteTeletravailEmployeur: 300
    })
    expect(r.total).toBeCloseTo(700, 1)
  })
})

describe('calculerMateriel', () => {
  it('Article < 500 € déduit intégralement', () => {
    const r = calculerMateriel([{
      type: 'documentation', prixTTC: 200, dateAchat: '2025-03-01', usageProPct: 100
    }], C)
    expect(r.details[0].estAmorti).toBe(false)
    expect(r.total).toBe(200)
  })

  it('Ordinateur 1200 € amorti sur 3 ans', () => {
    const r = calculerMateriel([{
      type: 'ordinateur', prixTTC: 1200, dateAchat: '2025-03-01', usageProPct: 100
    }], C)
    expect(r.details[0].estAmorti).toBe(true)
    expect(r.details[0].dureeAmortissement).toBe(3)
    expect(r.total).toBe(400)
  })

  it('Ordi 1200 € usage 50% → amortissement sur 600', () => {
    const r = calculerMateriel([{
      type: 'ordinateur', prixTTC: 1200, dateAchat: '2025-03-01', usageProPct: 50
    }], C)
    expect(r.details[0].estAmorti).toBe(true)
    expect(r.total).toBe(200)
  })
})

const emptyRepas = {
  nbRepasSansJustifParJour: 0, nbRepasAvecJustifParJour: 0, coutMoyenRepasJustifie: 0,
  nbJoursRepas: 0, nbTicketsRestoAnnee: 0, valeurFacialeTicket: 8, partEmployeurPct: 50,
  indemnitesRepasHorsTR: 0
}
const emptyBureau = {
  surfaceBureauM2: 0, surfaceLogementM2: 100, loyerOuInteretsEmprunt: 0,
  chargesCoproAnnuelles: 0, electriciteChauffageAnnuel: 0, internetAnnuel: 0,
  internetUsageProPct: 0, assuranceHabitationAnnuelle: 0, taxeFonciereAnnuelle: 0,
  indemniteTeletravailEmployeur: 0
}
const emptyAutres = {
  telephoneAnnuel: 0, telephoneUsageProPct: 0, internetAnnuel: 0, internetUsageProPct: 0,
  fraisBancairesProServ: 0, formationPro: 0, cotisationsSyndicales: 0,
  cotisationsProObligatoires: 0, doubleResidence: 0, demenagementPro: 0,
  fraisRechercheEmploi: 0, interetsEmpruntResidence: 0, autresFraisJustifies: 0
}

describe('calculerTotal — verdict abattement 10%', () => {
  it('Salaire 30K : abattement = 3000 €', () => {
    const r = calculerTotal({
      km: inputsKmBase,
      repas: emptyRepas,
      bureau: emptyBureau,
      blanchissage: { modeCalcul: 'factures', totalFactures: 0, lignes: [] },
      materiel: [],
      autresFrais: emptyAutres,
      outreMer: { fraisInterIles: 0, fraisVoyagesDromMetropolePro: 0 },
      salaireNetImposable: 30000
    }, C)
    expect(r.abattement10).toBe(3000)
    expect(r.totalFraisReels).toBeCloseTo(6064.56, 0)
    expect(r.verdict).toBe('frais_reels_avantageux')
  })

  it('Abattement plafonné à 14 171 €', () => {
    const r = calculerTotal({
      km: inputsKmBase,
      repas: emptyRepas,
      bureau: emptyBureau,
      blanchissage: { modeCalcul: 'factures', totalFactures: 0, lignes: [] },
      materiel: [],
      autresFrais: emptyAutres,
      outreMer: { fraisInterIles: 0, fraisVoyagesDromMetropolePro: 0 },
      salaireNetImposable: 200000
    }, C)
    expect(r.abattement10).toBe(14171)
  })
})
