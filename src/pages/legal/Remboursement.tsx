// TODO — 1 placeholder(s) à compléter avant lancement :
//   - [votre numéro de commande]
// REMOVE_BEFORE_LAUNCH — passer showDraftBanner à false une fois validé.
import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/remboursement.md?raw';

const TODOS = [
  "votre numéro de commande"
];

export default function Remboursement() {
  return (
    <LegalPage
      title="Politique de Remboursement"
      slug="remboursement"
      markdown={markdown}
      showDraftBanner={true}
      todos={TODOS}
    />
  );
}
