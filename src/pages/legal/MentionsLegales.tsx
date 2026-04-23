// TODO — 21 placeholder(s) à compléter avant lancement :
//   - [RAISON SOCIALE — ex. : ANNUL'IMPÔTS ou NOM PRÉNOM en cas d'auto-entrepreneur]
//   - [Micro-entreprise / SASU / EURL / SAS]
//   - [Montant en euros — ou « N/A » pour micro-entreprise]
//   - [14 chiffres]
//   - [Ville d'immatriculation + numéro — si applicable]
//   - [Si assujetti]
//   - [Adresse complète : numéro, rue, code postal, ville, France]
//   - [Numéro de téléphone — recommandé]
//   - [PRÉNOM NOM du responsable légal / gérant / auto-entrepreneur]
//   - [Représentant légal / Gérant / Auto-entrepreneur]
//   - [NOM DE L'HÉBERGEUR — ex. : OVH SAS / Amazon Web Services / Scaleway SAS]
//   - [À compléter]
//   - [Adresse complète de l'hébergeur]
//   - [URL de l'hébergeur]
//   - [Contact de l'hébergeur]
//   - [RAISON SOCIALE]
//   - [NOM ET COORDONNÉES DU MÉDIATEUR AGRÉÉ]
//   - [URL]
//   - [NOM DE L'AGENCE / PRESTATAIRE ou « En interne »]
//   - [Source — ex. : Unsplash, Adobe Stock, créations originales — à préciser pour éviter tout litige droit à l'image]
//   - [Source — à préciser]
// REMOVE_BEFORE_LAUNCH — passer showDraftBanner à false une fois validé.
import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/mentions-legales.md?raw';

const TODOS = [
  "RAISON SOCIALE — ex. : ANNUL'IMPÔTS ou NOM PRÉNOM en cas d'auto-entrepreneur",
  "Micro-entreprise / SASU / EURL / SAS",
  "Montant en euros — ou « N/A » pour micro-entreprise",
  "14 chiffres",
  "Ville d'immatriculation + numéro — si applicable",
  "Si assujetti",
  "Adresse complète : numéro, rue, code postal, ville, France",
  "Numéro de téléphone — recommandé",
  "PRÉNOM NOM du responsable légal / gérant / auto-entrepreneur",
  "Représentant légal / Gérant / Auto-entrepreneur",
  "NOM DE L'HÉBERGEUR — ex. : OVH SAS / Amazon Web Services / Scaleway SAS",
  "À compléter",
  "Adresse complète de l'hébergeur",
  "URL de l'hébergeur",
  "Contact de l'hébergeur",
  "RAISON SOCIALE",
  "NOM ET COORDONNÉES DU MÉDIATEUR AGRÉÉ",
  "URL",
  "NOM DE L'AGENCE / PRESTATAIRE ou « En interne »",
  "Source — ex. : Unsplash, Adobe Stock, créations originales — à préciser pour éviter tout litige droit à l'image",
  "Source — à préciser"
];

export default function MentionsLegales() {
  return (
    <LegalPage
      title="Mentions Légales"
      slug="mentions-legales"
      markdown={markdown}
      showDraftBanner={true}
      todos={TODOS}
    />
  );
}
