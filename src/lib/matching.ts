import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;

/**
 * Détecte les slugs de fiches_profils qui matchent les réponses utilisateur.
 * Toutes les règles sont évaluées indépendamment (pas d'exclusivité).
 */
export function detecterProfils(profile: Partial<Profile>): string[] {
  const slugs: string[] = [];

  if (profile.primo_declarant === true) slugs.push('primo-declarant');

  if (
    profile.situation_principale === 'salarie' &&
    (profile.tranche_revenus === 'moins_20k' || profile.tranche_revenus === '20_40k')
  ) {
    slugs.push('jeune-actif');
  }

  if (profile.situation_familiale === 'parent_isole') slugs.push('parent-isole');
  if (profile.situation_familiale === 'couple') slugs.push('couple');

  if (profile.situation_familiale === 'divorce' || profile.pension_alimentaire === true) {
    slugs.push('divorce-pension');
  }

  if (profile.situation_principale === 'retraite') slugs.push('retraite');
  if (profile.situation_principale === 'etudiant') slugs.push('etudiant');
  if (profile.situation_principale === 'salarie') slugs.push('salarie');

  if (profile.situation_principale === 'independant' || profile.a_activite_secondaire === true) {
    slugs.push('independant');
  }

  if (profile.a_revenus_lmnp === true) slugs.push('lmnp');

  if (
    profile.metier_categorie === 'culture_creation' ||
    profile.activite_type === 'creation_culture'
  ) {
    slugs.push('artiste-intermittent');
  }

  if (profile.personne_handicap === true) slugs.push('handicap');

  if (
    profile.situation_internationale === 'expatrie_retour' ||
    profile.situation_internationale === 'non_resident'
  ) {
    slugs.push('expatrie');
  }

  if (profile.situation_internationale === 'drom') slugs.push('drom');

  return Array.from(new Set(slugs));
}

/**
 * Retourne l'UUID du métier principal, ou un tableau vide si absent.
 */
export function detecterMetiers(profile: Partial<Profile>): string[] {
  return profile.metier_id ? [profile.metier_id] : [];
}

/**
 * Recalcule profils_detectes et metiers_detectes pour un user puis persiste.
 * Volontairement SANS try/catch : on veut que toute erreur remonte.
 */
export async function recalculerMatching(userId: string): Promise<void> {
  const { data, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (selectError) {
    console.error('[matching] SELECT error:', selectError);
    throw selectError;
  }
  if (!data) {
    console.error('[matching] profil introuvable pour', userId);
    throw new Error('Profil introuvable');
  }

  const profils_detectes = detecterProfils(data);
  const metiers_detectes = detecterMetiers(data);

  const updateResult = await supabase
    .from('profiles')
    .update({ profils_detectes, metiers_detectes })
    .eq('id', userId);

  if (updateResult.error) {
    console.error('[matching] UPDATE failed:', updateResult.error);
    throw updateResult.error;
  }
}
