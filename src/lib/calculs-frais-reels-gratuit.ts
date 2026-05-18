// Wrapper simplifié autour de calculerFraisKilometriques pour le simulateur gratuit home.
import {
  calculerFraisKilometriques,
  type FraisReelsConstants,
  type Motorisation,
} from './calculs-frais-reels';

export interface InputsGratuit {
  distanceAllerSimple: number;
  nbAllerRetourParJour: number;
  nbJoursTravailles: number;
  cv: number;
  motorisation: Motorisation;
  indemnitesKmEmployeur: number;
  salaireNetImposable?: number;
}

export interface ResultGratuit {
  baremeKm: number;
  indemnites: number;
  netDeductible: number;
  abattement10?: number;
  verdict?: 'frais_reels_avantageux' | 'abattement_10_avantageux';
  difference?: number;
}

export function calculerFraisReelsGratuit(
  inputs: InputsGratuit,
  constants: FraisReelsConstants,
): ResultGratuit {
  const res = calculerFraisKilometriques(
    {
      typeVehicule: 'voiture',
      cv: inputs.cv,
      motorisation: inputs.motorisation,
      distanceAllerSimple: inputs.distanceAllerSimple,
      justificationEloignement: false,
      nbAllerRetourParJour: inputs.nbAllerRetourParJour,
      nbJoursTravailles: inputs.nbJoursTravailles,
      kmMissionPro: 0,
      peagesAnnuel: 0,
      parkingAnnuel: 0,
      indemnitesKmEmployeur: inputs.indemnitesKmEmployeur,
    },
    constants,
  );

  const result: ResultGratuit = {
    baremeKm: res.details.bareme,
    indemnites: inputs.indemnitesKmEmployeur,
    netDeductible: res.total,
  };

  if (inputs.salaireNetImposable && inputs.salaireNetImposable > 0) {
    const min10 = constants['abattement_10_min'] ?? 495;
    const max10 = constants['abattement_10_max'] ?? 14171;
    const abattement10 = Math.min(
      Math.max(inputs.salaireNetImposable * 0.1, min10),
      max10,
    );
    const difference = res.total - abattement10;
    result.abattement10 = abattement10;
    result.difference = difference;
    result.verdict =
      difference > 0 ? 'frais_reels_avantageux' : 'abattement_10_avantageux';
  }

  return result;
}
