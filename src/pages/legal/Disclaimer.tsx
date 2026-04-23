// TODO — 1 placeholder(s) à compléter avant lancement :
//   - [Voir notre avertissement légal complet]
// REMOVE_BEFORE_LAUNCH — passer showDraftBanner à false une fois validé.
import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/disclaimer.md?raw';

const TODOS = [
  "Voir notre avertissement légal complet"
];

export default function Disclaimer() {
  return (
    <LegalPage
      title="Disclaimer Fiscal"
      slug="disclaimer"
      markdown={markdown}
      showDraftBanner={true}
      todos={TODOS}
    />
  );
}
