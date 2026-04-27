import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/cgu.md?raw';

export default function Cgu() {
  return (
    <LegalPage
      title="Conditions Générales d'Utilisation"
      slug="cgu"
      markdown={markdown}
      showDraftBanner={false}
    />
  );
}
