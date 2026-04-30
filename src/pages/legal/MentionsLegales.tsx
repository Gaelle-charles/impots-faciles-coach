import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/mentions-legales.md?raw';

export default function MentionsLegales() {
  return (
    <LegalPage
      title="Mentions Légales"
      slug="mentions-legales"
      markdown={markdown}
      showDraftBanner={false}
    />
  );
}
