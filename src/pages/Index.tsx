import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/Header';
import heroBg from '@/assets/hero-bg.jpg';
import { Footer } from '@/components/Footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqItems = [
  {
    question: 'Qu\'est-ce que les frais professionnels réels ?',
    answer: 'Les frais professionnels réels sont les dépenses que vous engagez dans le cadre de votre activité salariée (transport, repas, formation, matériel…). Au lieu de la déduction forfaitaire de 10 %, vous pouvez choisir de déclarer le montant exact de ces frais pour réduire votre revenu imposable.',
  },
  {
    question: 'Comment fonctionne la déduction de frais ?',
    answer: 'Par défaut, l\'administration fiscale applique un abattement forfaitaire de 10 % sur vos revenus. Si vos dépenses professionnelles dépassent ce montant, vous avez intérêt à opter pour la déduction des frais réels : vous listez et justifiez chaque dépense, et le total vient diminuer votre revenu imposable.',
  },
  {
    question: 'Qui peut bénéficier de la déduction des frais réels ?',
    answer: 'Tous les salariés peuvent opter pour les frais réels, quelle que soit leur profession. C\'est particulièrement avantageux pour ceux qui ont de longs trajets domicile-travail, qui utilisent leur véhicule personnel, ou qui engagent des frais de formation ou de double résidence.',
  },
  {
    question: 'Quels justificatifs dois-je conserver ?',
    answer: 'Vous devez conserver tous les justificatifs de vos dépenses : factures, tickets de péage, attestations kilométriques, notes de frais de repas, etc. L\'administration peut vous les demander pendant 3 ans après la déclaration.',
  },
  {
    question: 'La plateforme est-elle gratuite ?',
    answer: 'Impôts Facile propose une formule Découverte gratuite avec accès à un module, un quizz et un simulateur basique. Des formules payantes donnent accès à l\'ensemble des contenus, simulateurs avancés et fiches métier.',
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="flex flex-col items-center px-4 py-24 text-center">
        <h2 className="max-w-2xl font-heading text-5xl font-bold leading-tight text-foreground">
          La fiscalité, enfin accessible.
        </h2>
        <p className="mt-6 max-w-lg text-lg text-muted-foreground">
          Maîtrisez l'impôt sur le revenu, la TVA, les régimes fiscaux et bien plus
          grâce à des modules clairs et des simulateurs pratiques.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link to="/connexion">
            <Button variant="cta" size="lg" className="gap-2">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-heading text-sm font-semibold text-foreground">Commencer gratuitement</span>
        </div>
      </section>

      {/* Features */}
      <section className="bg-secondary px-4 py-20">
        <div className="mx-auto max-w-content">
          <h3 className="text-center font-heading text-3xl font-bold text-foreground">
            Tout ce qu'il faut pour comprendre vos impôts
          </h3>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { title: 'Modules de formation', desc: 'Des cours structurés, du débutant à l\'expert.' },
              { title: 'Quizz interactifs', desc: 'Testez vos connaissances à chaque étape.' },
              { title: 'Simulateurs', desc: 'Estimez votre imposition en quelques clics.' },
            ].map((f) => (
              <div key={f.title} className="rounded-lg bg-background p-6">
                <h4 className="font-heading text-lg font-bold text-foreground">{f.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <h3 className="text-center font-heading text-3xl font-bold text-foreground">
            Questions fréquentes
          </h3>
          <Accordion type="single" collapsible className="mt-10">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-heading font-semibold text-foreground">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
