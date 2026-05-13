// ============================================================================
// MODULE DE CALCUL DES FRAIS RÉELS - Millésime 2025 (déclaration 2026)
// Sources : Arrêté du 27 mars 2023, BOI-BNC-BASE-40-60-60, Brochure pratique 2026 DGFiP
// ============================================================================

export type TypeVehicule = 'voiture' | 'motocyclette' | 'cyclomoteur'
export type Motorisation = 'thermique' | 'electrique'
export type TypeMateriel = 'ordinateur' | 'smartphone' | 'mobilier' | 'logiciel' | 'documentation' | 'outillage' | 'autre'

export type FraisReelsConstants = Record<string, number>

// ----------------------------------------------------------------------------
// 1. FRAIS KILOMÉTRIQUES
// ----------------------------------------------------------------------------

export interface InputsKm {
  typeVehicule: TypeVehicule
  cv: number
  motorisation: Motorisation
  distanceAllerSimple: number
  justificationEloignement: boolean
  nbAllerRetourParJour: number
  nbJoursTravailles: number
  kmMissionPro: number
  peagesAnnuel: number
  parkingAnnuel: number
  indemnitesKmEmployeur: number
}

export interface ResultKm {
  total: number
  details: {
    distanceAllerRetenue: number
    distanceDomicileTravail: number
    distanceAnnuelle: number
    cvEffectif: number
    bareme: number
    majorationElectrique: number
    peages: number
    parking: number
    remboursements: number
    tranche: 1 | 2 | 3
  }
}

export function calculerFraisKilometriques(
  inputs: InputsKm,
  constants: FraisReelsConstants
): ResultKm {
  if (inputs.cv < 1) throw new Error('CV doit être >= 1')
  if (inputs.nbJoursTravailles < 0) throw new Error('Jours travaillés invalide')

  const plafondDistance = constants['km_plafond_distance_jour'] ?? 40
  const distanceAllerRetenue = (inputs.distanceAllerSimple > plafondDistance && !inputs.justificationEloignement)
    ? plafondDistance
    : inputs.distanceAllerSimple

  const cvMax = inputs.typeVehicule === 'voiture'
    ? (constants['km_cv_plafond_voiture'] ?? 7)
    : (constants['km_cv_plafond_deux_roues'] ?? 5)
  const cvEffectif = Math.min(inputs.cv, cvMax)

  const distanceDomicileTravail = distanceAllerRetenue * 2 * inputs.nbAllerRetourParJour * inputs.nbJoursTravailles
  const distanceAnnuelle = distanceDomicileTravail + inputs.kmMissionPro

  let bareme = 0
  let tranche: 1 | 2 | 3 = 1

  if (inputs.typeVehicule === 'voiture') {
    const cvKey = Math.max(3, cvEffectif)
    if (distanceAnnuelle <= 5000) {
      bareme = distanceAnnuelle * (constants[`km_voiture_${cvKey}cv_seuil1`] ?? 0)
      tranche = 1
    } else if (distanceAnnuelle <= 20000) {
      const coef = constants[`km_voiture_${cvKey}cv_seuil2_coef`] ?? 0
      const cst = constants[`km_voiture_${cvKey}cv_seuil2_cst`] ?? 0
      bareme = (distanceAnnuelle * coef) + cst
      tranche = 2
    } else {
      bareme = distanceAnnuelle * (constants[`km_voiture_${cvKey}cv_seuil3_coef`] ?? 0)
      tranche = 3
    }
  } else if (inputs.typeVehicule === 'motocyclette') {
    const cvCat = cvEffectif <= 2 ? '1-2' : cvEffectif <= 5 ? '3-5' : '5+'
    if (distanceAnnuelle <= 3000) {
      bareme = distanceAnnuelle * (constants[`km_moto_${cvCat}cv_seuil1_coef`] ?? 0)
      tranche = 1
    } else if (distanceAnnuelle <= 6000) {
      const coef = constants[`km_moto_${cvCat}cv_seuil2_coef`] ?? 0
      const cst = constants[`km_moto_${cvCat}cv_seuil2_cst`] ?? 0
      bareme = (distanceAnnuelle * coef) + cst
      tranche = 2
    } else {
      bareme = distanceAnnuelle * (constants[`km_moto_${cvCat}cv_seuil3_coef`] ?? 0)
      tranche = 3
    }
  } else {
    if (distanceAnnuelle <= 3000) {
      bareme = distanceAnnuelle * (constants['km_cyclo_seuil1_coef'] ?? 0)
      tranche = 1
    } else if (distanceAnnuelle <= 6000) {
      bareme = (distanceAnnuelle * (constants['km_cyclo_seuil2_coef'] ?? 0))
             + (constants['km_cyclo_seuil2_cst'] ?? 0)
      tranche = 2
    } else {
      bareme = distanceAnnuelle * (constants['km_cyclo_seuil3_coef'] ?? 0)
      tranche = 3
    }
  }

  const baremeBrut = bareme
  const tauxMajoration = (constants['km_majoration_electrique'] ?? 20) / 100
  if (inputs.motorisation === 'electrique') {
    bareme = bareme * (1 + tauxMajoration)
  }
  const majorationElectrique = bareme - baremeBrut

  const total = Math.max(0, bareme + inputs.peagesAnnuel + inputs.parkingAnnuel - inputs.indemnitesKmEmployeur)

  return {
    total,
    details: {
      distanceAllerRetenue,
      distanceDomicileTravail,
      distanceAnnuelle,
      cvEffectif,
      bareme,
      majorationElectrique,
      peages: inputs.peagesAnnuel,
      parking: inputs.parkingAnnuel,
      remboursements: inputs.indemnitesKmEmployeur,
      tranche
    }
  }
}

// ----------------------------------------------------------------------------
// 2. FRAIS DE REPAS HORS DOMICILE
// ----------------------------------------------------------------------------

export interface InputsRepas {
  nbRepasSansJustifParJour: number
  nbRepasAvecJustifParJour: number
  coutMoyenRepasJustifie: number
  nbJoursRepas: number
  nbTicketsRestoAnnee: number
  valeurFacialeTicket: number
  partEmployeurPct: number
  indemnitesRepasHorsTR: number
}

export interface ResultRepas {
  total: number
  details: {
    deductionSansJustif: number
    deductionAvecJustif: number
    partEmployeurTR: number
    indemnitesRepas: number
  }
}

export function calculerFraisRepas(
  inputs: InputsRepas,
  constants: FraisReelsConstants
): ResultRepas {
  const valeurFoyer = constants['repas_valeur_foyer'] ?? 5.45
  const plafondJour = constants['repas_plafond_jour'] ?? 21.10

  const deductionSansJustif = inputs.nbRepasSansJustifParJour * inputs.nbJoursRepas * valeurFoyer

  const deductionParRepasJustif = Math.max(0,
    Math.min(inputs.coutMoyenRepasJustifie, plafondJour) - valeurFoyer
  )
  const deductionAvecJustif = deductionParRepasJustif * inputs.nbRepasAvecJustifParJour * inputs.nbJoursRepas

  const partEmployeurTR = (inputs.valeurFacialeTicket * inputs.partEmployeurPct / 100) * inputs.nbTicketsRestoAnnee

  const total = Math.max(0,
    deductionSansJustif + deductionAvecJustif - partEmployeurTR - inputs.indemnitesRepasHorsTR
  )

  return {
    total,
    details: {
      deductionSansJustif,
      deductionAvecJustif,
      partEmployeurTR,
      indemnitesRepas: inputs.indemnitesRepasHorsTR
    }
  }
}

// ----------------------------------------------------------------------------
// 3. BUREAU À DOMICILE / TÉLÉTRAVAIL
// ----------------------------------------------------------------------------

export interface InputsBureau {
  surfaceBureauM2: number
  surfaceLogementM2: number
  loyerOuInteretsEmprunt: number
  chargesCoproAnnuelles: number
  electriciteChauffageAnnuel: number
  internetAnnuel: number
  internetUsageProPct: number
  assuranceHabitationAnnuelle: number
  taxeFonciereAnnuelle: number
  indemniteTeletravailEmployeur: number
}

export interface ResultBureau {
  total: number
  details: {
    quotePart: number
    chargesAnnuelles: number
    deductionBrute: number
    indemniteSoustraite: number
    alerte?: string
  }
}

export function calculerBureauDomicile(inputs: InputsBureau): ResultBureau {
  let alerte: string | undefined

  if (inputs.surfaceBureauM2 > inputs.surfaceLogementM2) {
    alerte = 'La surface du bureau ne peut pas excéder la surface du logement'
  }

  const quotePart = inputs.surfaceLogementM2 > 0
    ? Math.min(1, inputs.surfaceBureauM2 / inputs.surfaceLogementM2)
    : 0

  const chargesAnnuelles = inputs.loyerOuInteretsEmprunt
                         + inputs.chargesCoproAnnuelles
                         + inputs.electriciteChauffageAnnuel
                         + inputs.assuranceHabitationAnnuelle
                         + inputs.taxeFonciereAnnuelle

  const internetDeduit = inputs.internetAnnuel * (inputs.internetUsageProPct / 100)

  const deductionBrute = (quotePart * chargesAnnuelles) + internetDeduit
  const total = Math.max(0, deductionBrute - inputs.indemniteTeletravailEmployeur)

  return {
    total,
    details: {
      quotePart,
      chargesAnnuelles,
      deductionBrute,
      indemniteSoustraite: inputs.indemniteTeletravailEmployeur,
      alerte
    }
  }
}

// ----------------------------------------------------------------------------
// 4. VÊTEMENTS PROFESSIONNELS & BLANCHISSAGE
// ----------------------------------------------------------------------------

export interface LignePressing {
  nbPieces: number
  tarifPressing: number
  nbLavagesAnnuel: number
}

export interface InputsBlanchissage {
  modeCalcul: 'factures' | 'domicile'
  totalFactures: number
  lignes: LignePressing[]
}

export function calculerBlanchissage(
  inputs: InputsBlanchissage,
  constants: FraisReelsConstants
): { total: number } {
  if (inputs.modeCalcul === 'factures') {
    return { total: inputs.totalFactures }
  }

  const decote = (constants['blanchissage_decote_domicile'] ?? 30) / 100
  const total = inputs.lignes.reduce((sum, ligne) =>
    sum + (ligne.nbPieces * ligne.tarifPressing * ligne.nbLavagesAnnuel * (1 - decote))
  , 0)

  return { total }
}

// ----------------------------------------------------------------------------
// 5. MATÉRIEL, DOCUMENTATION & LOGICIELS
// ----------------------------------------------------------------------------

export interface ArticleMateriel {
  type: TypeMateriel
  prixTTC: number
  dateAchat: string
  usageProPct: number
}

export interface ResultMateriel {
  total: number
  details: Array<{
    type: TypeMateriel
    prixTTC: number
    deductionAnneeEnCours: number
    estAmorti: boolean
    dureeAmortissement?: number
  }>
}

export function calculerMateriel(
  articles: ArticleMateriel[],
  constants: FraisReelsConstants
): ResultMateriel {
  const seuil = constants['materiel_seuil_amortissement'] ?? 500
  const dureeOrdi = constants['materiel_duree_ordinateur'] ?? 3
  const dureeMobilier = constants['materiel_duree_mobilier'] ?? 10
  const dureeAutre = constants['materiel_duree_autre'] ?? 5

  const details = articles.map(article => {
    const usage = article.usageProPct / 100
    const prixAjuste = article.prixTTC * usage

    if (prixAjuste < seuil) {
      return {
        type: article.type,
        prixTTC: article.prixTTC,
        deductionAnneeEnCours: prixAjuste,
        estAmorti: false
      }
    }

    const duree = (article.type === 'ordinateur' || article.type === 'smartphone')
      ? dureeOrdi
      : article.type === 'mobilier' ? dureeMobilier
      : dureeAutre

    return {
      type: article.type,
      prixTTC: article.prixTTC,
      deductionAnneeEnCours: prixAjuste / duree,
      estAmorti: true,
      dureeAmortissement: duree
    }
  })

  const total = details.reduce((sum, d) => sum + d.deductionAnneeEnCours, 0)
  return { total, details }
}

// ----------------------------------------------------------------------------
// 6. AUTRES FRAIS PROFESSIONNELS
// ----------------------------------------------------------------------------

export interface InputsAutresFrais {
  telephoneAnnuel: number
  telephoneUsageProPct: number
  internetAnnuel: number
  internetUsageProPct: number
  fraisBancairesProServ: number
  formationPro: number
  cotisationsSyndicales: number
  cotisationsProObligatoires: number
  doubleResidence: number
  demenagementPro: number
  fraisRechercheEmploi: number
  interetsEmpruntResidence: number
  autresFraisJustifies: number
}

export function calculerAutresFrais(inputs: InputsAutresFrais): { total: number } {
  const telephone = inputs.telephoneAnnuel * (inputs.telephoneUsageProPct / 100)
  const internet = inputs.internetAnnuel * (inputs.internetUsageProPct / 100)

  const total = telephone
              + internet
              + inputs.fraisBancairesProServ
              + inputs.formationPro
              + inputs.cotisationsSyndicales
              + inputs.cotisationsProObligatoires
              + inputs.doubleResidence
              + inputs.demenagementPro
              + inputs.fraisRechercheEmploi
              + inputs.interetsEmpruntResidence
              + inputs.autresFraisJustifies

  return { total }
}

// ----------------------------------------------------------------------------
// 7. SPÉCIFICITÉS OUTRE-MER
// ----------------------------------------------------------------------------

export interface InputsOutreMer {
  fraisInterIles: number
  fraisVoyagesDromMetropolePro: number
}

export function calculerOutreMer(inputs: InputsOutreMer): { total: number } {
  return { total: inputs.fraisInterIles + inputs.fraisVoyagesDromMetropolePro }
}

// ----------------------------------------------------------------------------
// TOTAL + ABATTEMENT 10%
// ----------------------------------------------------------------------------

export interface InputsTotal {
  km: InputsKm
  repas: InputsRepas
  bureau: InputsBureau
  blanchissage: InputsBlanchissage
  materiel: ArticleMateriel[]
  autresFrais: InputsAutresFrais
  outreMer: InputsOutreMer
  salaireNetImposable: number
}

export interface ResultTotal {
  totalFraisReels: number
  abattement10: number
  difference: number
  verdict: 'frais_reels_avantageux' | 'abattement_10_avantageux'
  breakdown: {
    km: number
    repas: number
    bureau: number
    blanchissage: number
    materiel: number
    autresFrais: number
    outreMer: number
  }
}

export function calculerTotal(
  inputs: InputsTotal,
  constants: FraisReelsConstants
): ResultTotal {
  const km = calculerFraisKilometriques(inputs.km, constants)
  const repas = calculerFraisRepas(inputs.repas, constants)
  const bureau = calculerBureauDomicile(inputs.bureau)
  const blanchissage = calculerBlanchissage(inputs.blanchissage, constants)
  const materiel = calculerMateriel(inputs.materiel, constants)
  const autresFrais = calculerAutresFrais(inputs.autresFrais)
  const outreMer = calculerOutreMer(inputs.outreMer)

  const totalFraisReels = km.total + repas.total + bureau.total + blanchissage.total
                        + materiel.total + autresFrais.total + outreMer.total

  const min10 = constants['abattement_10_min'] ?? 495
  const max10 = constants['abattement_10_max'] ?? 14171
  const abattement10 = Math.min(Math.max(inputs.salaireNetImposable * 0.10, min10), max10)

  const difference = totalFraisReels - abattement10
  const verdict = difference > 0 ? 'frais_reels_avantageux' : 'abattement_10_avantageux'

  return {
    totalFraisReels,
    abattement10,
    difference,
    verdict,
    breakdown: {
      km: km.total,
      repas: repas.total,
      bureau: bureau.total,
      blanchissage: blanchissage.total,
      materiel: materiel.total,
      autresFrais: autresFrais.total,
      outreMer: outreMer.total
    }
  }
}
