// TODO — 14 placeholder(s) à compléter avant lancement :
//   - [RAISON SOCIALE — ex. : ANNUL'IMPÔTS ou NOM PRÉNOM]
//   - [Micro-entreprise / SASU / EURL]
//   - [14 chiffres]
//   - [Adresse postale complète]
//   - [NOM DU DPO si désigné — optionnel pour les petites structures mais recommandé / ou indiquer : « Aucun DPO désigné — contact RGPD : contact@annulimpots.fr »]
//   - [6 mois maximum — À DÉFINIR]
//   - [Hébergeur — ex. : OVH / AWS / Scaleway]
//   - [France / UE / USA — à préciser]
//   - [Outil emailing — ex. : Mailchimp / Brevo]
//   - [À préciser]
//   - [Calendly ou équivalent]
//   - [Outil analytics — ex. : Google Analytics / Plausible]
//   - [Si TikTok Pixel est utilisé]
//   - [Lien vers le panneau de gestion des cookies — à configurer sur la plateforme]
// REMOVE_BEFORE_LAUNCH — passer showDraftBanner à false une fois validé.
import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/confidentialite.md?raw';

const TODOS = [
  "RAISON SOCIALE — ex. : ANNUL'IMPÔTS ou NOM PRÉNOM",
  "Micro-entreprise / SASU / EURL",
  "14 chiffres",
  "Adresse postale complète",
  "NOM DU DPO si désigné — optionnel pour les petites structures mais recommandé / ou indiquer : « Aucun DPO désigné — contact RGPD : contact@annulimpots.fr »",
  "6 mois maximum — À DÉFINIR",
  "Hébergeur — ex. : OVH / AWS / Scaleway",
  "France / UE / USA — à préciser",
  "Outil emailing — ex. : Mailchimp / Brevo",
  "À préciser",
  "Calendly ou équivalent",
  "Outil analytics — ex. : Google Analytics / Plausible",
  "Si TikTok Pixel est utilisé",
  "Lien vers le panneau de gestion des cookies — à configurer sur la plateforme"
];

export default function Confidentialite() {
  return (
    <LegalPage
      title="Politique de Confidentialité"
      slug="confidentialite"
      markdown={markdown}
      showDraftBanner={true}
      todos={TODOS}
    />
  );
}
