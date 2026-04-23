// TODO — 4 placeholder(s) à compléter avant lancement :
//   - [RAISON SOCIALE]
//   - [URL à compléter]
//   - [Calendly ou outil équivalent]
//   - [30 jours]
// REMOVE_BEFORE_LAUNCH — passer showDraftBanner à false une fois validé.
import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/cgu.md?raw';

const TODOS = [
  "RAISON SOCIALE",
  "URL à compléter",
  "Calendly ou outil équivalent",
  "30 jours"
];

export default function Cgu() {
  return (
    <LegalPage
      title="Conditions Générales d'Utilisation"
      slug="cgu"
      markdown={markdown}
      showDraftBanner={true}
      todos={TODOS}
    />
  );
}
