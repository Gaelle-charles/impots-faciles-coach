import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/cgv.md?raw';

export default function Cgv() {
  return (
    <LegalPage
      title="Conditions Générales de Vente"
      slug="cgv"
      markdown={markdown}
      showDraftBanner={false}
    />
  );
}
