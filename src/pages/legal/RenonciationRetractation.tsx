// TODO — 2 placeholder(s) à compléter avant lancement :
//   - [Case à cocher — obligatoire pour valider la commande avec accès immédiat]
//   - [Impôts Facile / Annul'Impôts / Impôts Gagnants]
// REMOVE_BEFORE_LAUNCH — passer showDraftBanner à false une fois validé.
import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/renonciation-retractation.md?raw';

const TODOS = [
  "Case à cocher — obligatoire pour valider la commande avec accès immédiat",
  "Impôts Facile / Annul'Impôts / Impôts Gagnants"
];

export default function RenonciationRetractation() {
  return (
    <LegalPage
      title="Formulaire de Renonciation au Droit de Rétractation"
      slug="renonciation-retractation"
      markdown={markdown}
      showDraftBanner={true}
      todos={TODOS}
    />
  );
}
