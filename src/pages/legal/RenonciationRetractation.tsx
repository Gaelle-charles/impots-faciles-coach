import { LegalPage } from './LegalPage';
import markdown from '@/content/legal/renonciation-retractation.md?raw';

export default function RenonciationRetractation() {
  return (
    <LegalPage
      title="Formulaire de Renonciation au Droit de Rétractation"
      slug="renonciation-retractation"
      markdown={markdown}
      showDraftBanner={false}
    />
  );
}
