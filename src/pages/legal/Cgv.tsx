// TODO — 2 placeholders restants (médiateur consommation à valider avant lancement)
import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/cgv.md?raw';

const TODOS = [
  "Médiateur de la consommation — site internet à compléter (Article 13.2)",
  "Médiateur de la consommation — adresse postale à compléter (Article 13.2)",
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
