import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/disclaimer.md?raw';

export default function Disclaimer() {
  return (
    <LegalPage
      title="Disclaimer Fiscal"
      slug="disclaimer-fiscal"
      markdown={markdown}
      showDraftBanner={false}
    />
  );
}
