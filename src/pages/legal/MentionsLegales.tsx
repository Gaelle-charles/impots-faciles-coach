import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/mentions-legales.md?raw';

const TODOS = [
  "Médiateur de la consommation — nom à compléter (Section 7)",
  "Médiateur de la consommation — site internet à compléter (Section 7)",
  "Médiateur de la consommation — adresse postale à compléter (Section 7)",
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
