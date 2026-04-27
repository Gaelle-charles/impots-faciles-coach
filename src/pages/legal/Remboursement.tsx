import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/remboursement.md?raw';

export default function Remboursement() {
  return (
    <LegalPage
      title="Politique de Remboursement"
      slug="politique-remboursement"
      markdown={markdown}
      showDraftBanner={false}
    />
  );
}
