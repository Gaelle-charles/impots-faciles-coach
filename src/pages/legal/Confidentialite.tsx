import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/confidentialite.md?raw';

export default function Confidentialite() {
  return (
    <LegalPage
      title="Politique de Confidentialité"
      slug="politique-confidentialite"
      markdown={markdown}
      showDraftBanner={false}
    />
  );
}
