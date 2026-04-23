// TODO — 22 placeholder(s) à compléter avant lancement :
//   - [RAISON SOCIALE — ex. : ANNUL'IMPÔTS ou NOM PRÉNOM pour auto-entrepreneur]
//   - [Micro-entreprise / SASU / EURL / SAS — à compléter selon statut choisi]
//   - [Montant en euros — ou mention « N/A » pour auto-entrepreneur]
//   - [14 chiffres — à remplir dès immatriculation]
//   - [FR + 11 chiffres — si assujetti à la TVA]
//   - [Numéro, rue, code postal, ville, France]
//   - [Numéro de téléphone — optionnel mais recommandé]
//   - [Prénom NOM du responsable légal]
//   - [**À compléter selon statut :**]
//   - [20% / taux réduit applicable]
//   - [Tout autre moyen de paiement intégré sur la plateforme à compléter]
//   - [XXXX]
//   - [ADRESSE POSTALE DU VENDEUR]
//   - [immédiatement / délai maximum de 24 heures]
//   - [12 mois à compter de la date d'activation / Accès illimité — À DÉFINIR]
//   - [6 mois / 12 mois — À DÉFINIR]
//   - [12 mois / Accès illimité — À DÉFINIR]
//   - [RAISON SOCIALE]
//   - [ADRESSE]
//   - [NOM DU MÉDIATEUR — ex. : Médiateur du Commerce Électronique (FEVAD) ou médiateur sectoriel agréé]
//   - [URL du médiateur]
//   - [Adresse du médiateur]
// REMOVE_BEFORE_LAUNCH — passer showDraftBanner à false une fois validé.
import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/cgv.md?raw';

const TODOS = [
  "RAISON SOCIALE — ex. : ANNUL'IMPÔTS ou NOM PRÉNOM pour auto-entrepreneur",
  "Micro-entreprise / SASU / EURL / SAS — à compléter selon statut choisi",
  "Montant en euros — ou mention « N/A » pour auto-entrepreneur",
  "14 chiffres — à remplir dès immatriculation",
  "FR + 11 chiffres — si assujetti à la TVA",
  "Numéro, rue, code postal, ville, France",
  "Numéro de téléphone — optionnel mais recommandé",
  "Prénom NOM du responsable légal",
  "**À compléter selon statut :**",
  "20% / taux réduit applicable",
  "Tout autre moyen de paiement intégré sur la plateforme à compléter",
  "XXXX",
  "ADRESSE POSTALE DU VENDEUR",
  "immédiatement / délai maximum de 24 heures",
  "12 mois à compter de la date d'activation / Accès illimité — À DÉFINIR",
  "6 mois / 12 mois — À DÉFINIR",
  "12 mois / Accès illimité — À DÉFINIR",
  "RAISON SOCIALE",
  "ADRESSE",
  "NOM DU MÉDIATEUR — ex. : Médiateur du Commerce Électronique (FEVAD) ou médiateur sectoriel agréé",
  "URL du médiateur",
  "Adresse du médiateur"
];

export default function Cgv() {
  return (
    <LegalPage
      title="Conditions Générales de Vente"
      slug="cgv"
      markdown={markdown}
      showDraftBanner={true}
      todos={TODOS}
    />
  );
}
