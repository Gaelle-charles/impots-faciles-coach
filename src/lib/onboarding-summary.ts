/**
 * Labels & helpers pour la page de récap onboarding.
 *
 * IMPORTANT — Option B (validée) : ce fichier DUPLIQUE volontairement les
 * libellés et le scoring de `src/pages/Onboarding.tsx` afin de ne pas toucher
 * au wizard payant stable. Si vous modifiez les options du wizard, pensez à
 * répliquer ici.
 */

export const SITUATION_LABELS: Record<string, string> = {
  salarie: 'Salarié(e) (CDI / CDD / fonctionnaire)',
  independant: 'Indépendant(e) / Auto-entrepreneur',
  dirigeant: 'Dirigeant(e) de société (SASU, EURL, SARL...)',
  retraite: 'Retraité(e)',
  etudiant: 'Étudiant(e) / Jeune actif',
  sans_activite: "Demandeur d'emploi / Sans activité",
};

export const ACTIVITE_LABELS: Record<string, string> = {
  vente_produits: 'Vente de produits / e-commerce',
  services: 'Services (artisanat, BTP, restauration...)',
  manuel: 'Métier manuel (VTC, livraison, construction...)',
  sante: 'Santé / soin (médecin, infirmier, kiné...)',
  creation: 'Création / culture (artiste, graphiste, photographe...)',
  formation: 'Formation / éducation / coaching',
  liberal: 'Libéral cadre (consultant, avocat, expert-comptable...)',
  numerique: 'Numérique / développement',
  autre: 'Autre / activité mixte',
};

export const FORME_JURIDIQUE_LABELS: Record<string, string> = {
  eurl: 'EURL',
  sasu: 'SASU',
  sarl_sas: 'SARL / SAS',
  sel: "SEL (Société d'Exercice Libéral)",
};

export const CATEGORIE_METIER_LABELS: Record<string, string> = {
  manuels_terrain: '🔧 Manuels / Terrain',
  sante_soin: '🧑‍⚕️ Santé / Soin',
  culture_creation: '🎭 Culture / Création',
  education_asso: '👩‍🏫 Éducation / Association',
  liberaux_cadres: '💼 Libéraux / Cadres',
  mobilite_specifiques: '🧳 Mobilité / Spécifiques',
};

export const SITUATION_FAMILIALE_LABELS: Record<string, string> = {
  celibataire: 'Célibataire',
  couple: 'En couple (mariage / PACS / concubinage)',
  parent_isole: 'Parent isolé',
  divorce: 'Divorcé(e)',
};

export const REVENUS_COMPL_LABELS: { key: string; label: string }[] = [
  { key: 'a_activite_secondaire', label: "Une activité secondaire (freelance, job d'appoint...)" },
  { key: 'a_revenus_fonciers_nus', label: 'Des revenus locatifs nus (location vide)' },
  { key: 'a_revenus_lmnp', label: 'Des revenus locatifs meublés (LMNP / LMP)' },
  { key: 'a_placements', label: 'Des placements financiers (dividendes, plus-values...)' },
  { key: 'a_revenus_etrangers', label: "Des revenus ou des comptes à l'étranger" },
  { key: 'a_investissements_defisc', label: 'Des investissements défiscalisants (Pinel, PER, Madelin...)' },
];

export const SITUATION_INTL_LABELS: Record<string, string> = {
  frontalier: 'Frontalier(ère) (Belgique / Suisse / Luxembourg)',
  revenus_etranger: "Revenus d'un pays étranger",
  expat_retour: 'Expatrié de retour en France',
  drom: 'Résident en Outre-Mer (DROM)',
  non_resident: 'Non-résident avec revenus en France',
};

export const TRANCHE_REVENUS_LABELS: Record<string, string> = {
  moins_20k: 'Moins de 20 000 €',
  '20k_40k': '20 000 - 40 000 €',
  '40k_80k': '40 000 - 80 000 €',
  '80k_150k': '80 000 - 150 000 €',
  plus_150k: 'Plus de 150 000 € (potentiellement concerné par la CDHR)',
  non_precise: 'Non précisé',
};

/** Texte humain du profil fiscal — copie de getProfilLabel d'Onboarding.tsx */
export interface ProfilLabelInput {
  situation_principale?: string | null;
  a_revenus_lmnp?: boolean | null;
  a_revenus_fonciers_nus?: boolean | null;
  a_placements?: boolean | null;
  a_activite_secondaire?: boolean | null;
  a_investissements_defisc?: boolean | null;
  a_revenus_etrangers?: boolean | null;
  situation_internationale?: string | null;
  tranche_revenus?: string | null;
}

export function getProfilLabel(
  p: ProfilLabelInput,
  metierNom?: string,
  paysNoms?: string[],
): string {
  const baseMap: Record<string, string> = {
    salarie: 'Salarié(e)',
    independant: 'Indépendant(e)',
    dirigeant: 'Dirigeant(e) de société',
    retraite: 'Retraité(e)',
    etudiant: 'Étudiant(e) / Jeune actif',
    sans_activite: 'Sans activité',
  };
  let base = baseMap[p.situation_principale ?? ''] ?? 'Contribuable';

  if (metierNom && (p.situation_principale === 'independant' || p.situation_principale === 'dirigeant')) {
    base = metierNom;
  }

  const compl: string[] = [];
  if (p.a_revenus_lmnp) compl.push('revenus locatifs meublés');
  if (p.a_revenus_fonciers_nus) compl.push('revenus locatifs nus');
  if (p.a_placements) compl.push('placements financiers');
  if (p.a_activite_secondaire) compl.push('activité secondaire');
  if (p.a_investissements_defisc) compl.push('investissements défiscalisants');

  let sentence = base;
  if (compl.length > 0) sentence += ` avec ${compl.slice(0, 2).join(' et ')}`;

  if (p.a_revenus_etrangers || p.situation_internationale) {
    if (paysNoms && paysNoms.length > 0) {
      sentence += ` et situation internationale (${paysNoms.join(', ')})`;
    } else if (p.situation_internationale === 'drom') {
      sentence += ' résidant en Outre-Mer';
    } else if (p.situation_internationale) {
      sentence += ' avec situation internationale';
    }
  }

  if (p.tranche_revenus === 'plus_150k') sentence += ' — hauts revenus';
  return sentence;
}

/** Hiérarchie des plans pour comparaison */
export const PLAN_RANK: Record<string, number> = {
  nouveau: 0,
  starter: 1,
  expert: 2,
  premium: 3,
};

export const PLAN_LABEL: Record<string, string> = {
  nouveau: 'Gratuit',
  starter: 'Starter',
  expert: 'Expert',
  premium: 'Premium',
};

/** Le user a-t-il accès à un contenu requérant `requiredPlan` ? */
export function hasAccess(currentPlan: string, requiredPlan: string): boolean {
  return (PLAN_RANK[currentPlan] ?? 0) >= (PLAN_RANK[requiredPlan] ?? 0);
}
