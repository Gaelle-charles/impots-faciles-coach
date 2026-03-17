import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Brain, Calculator, Shield, Clock, Users, Star, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { useEffect, useRef } from 'react';
import heroBg from '@/assets/hero-bg.jpg';
import ctaBg from '@/assets/cta-bg.jpg';
import { Footer } from '@/components/Footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqItems = [
  {
    question: "Qu'est-ce que les frais professionnels réels ?",
    answer: "Les frais professionnels réels sont les dépenses que vous engagez dans le cadre de votre activité salariée (transport, repas, formation, matériel…). Au lieu de la déduction forfaitaire de 10 %, vous pouvez choisir de déclarer le montant exact de ces frais pour réduire votre revenu imposable.",
  },
  {
    question: 'Comment fonctionne la déduction de frais ?',
    answer: "Par défaut, l'administration fiscale applique un abattement forfaitaire de 10 % sur vos revenus. Si vos dépenses professionnelles dépassent ce montant, vous avez intérêt à opter pour la déduction des frais réels.",
  },
  {
    question: 'Qui peut bénéficier de la déduction des frais réels ?',
    answer: "Tous les salariés peuvent opter pour les frais réels, quelle que soit leur profession. C'est particulièrement avantageux pour ceux qui ont de longs trajets domicile-travail ou qui engagent des frais de formation.",
  },
  {
    question: 'Quels justificatifs dois-je conserver ?',
    answer: "Vous devez conserver tous les justificatifs de vos dépenses : factures, tickets de péage, attestations kilométriques, notes de frais de repas, etc. L'administration peut vous les demander pendant 3 ans.",
  },
  {
    question: 'La plateforme est-elle gratuite ?',
    answer: "Impôts Facile propose une formule Découverte gratuite avec accès à un module, un quizz et un simulateur basique. Des formules payantes donnent accès à l'ensemble des contenus.",
  },
];

const features = [
  {
    icon: BookOpen,
    title: 'Modules de formation',
    desc: 'Des cours structurés et progressifs, du débutant à l\'expert fiscal.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Brain,
    title: 'Quizz interactifs',
    desc: 'Testez et validez vos connaissances à chaque étape du parcours.',
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: Calculator,
    title: 'Simulateurs avancés',
    desc: 'Estimez votre imposition et vos frais déductibles en temps réel.',
    color: 'bg-[hsl(56,100%,49%)]/10 text-[hsl(56,80%,35%)]',
  },
];

const advantages = [
  {
    icon: Shield,
    title: 'Fiable et à jour',
    desc: 'Contenus basés sur le barème officiel 2025 et mis à jour chaque année.',
  },
  {
    icon: Clock,
    title: 'Gain de temps',
    desc: 'Comprenez en 30 minutes ce que des heures de recherche ne vous apprendront pas.',
  },
  {
    icon: Users,
    title: 'Pour tous les profils',
    desc: 'Salariés, indépendants, propriétaires — chaque parcours est adapté à votre situation.',
  },
  {
    icon: Star,
    title: 'Pédagogie avant tout',
    desc: 'Pas de jargon, des explications claires avec des exemples concrets.',
  },
  {
    icon: CheckCircle2,
    title: 'Résultats concrets',
    desc: 'Identifiez vos déductions, optimisez votre déclaration et réduisez votre impôt.',
  },
  {
    icon: ArrowRight,
    title: 'Progression guidée',
    desc: 'Un parcours étape par étape avec suivi de votre avancement.',
  },
];

const Index = () => {
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (imgRef.current) {
        const offset = window.scrollY;
        imgRef.current.style.transform = `translateY(${offset * 0.4}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 py-32 md:py-40 text-center overflow-hidden">
        <div
          ref={imgRef}
          className="absolute inset-0 -top-20 -bottom-20 bg-cover bg-center will-change-transform"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-[hsl(var(--violet-deep))]/40" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground text-sm font-medium backdrop-blur-sm">
            🎓 La plateforme n°1 de formation fiscale
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-primary-foreground">
            La fiscalité, enfin{' '}
            <span className="text-[hsl(var(--yellow-vivid))]">accessible.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/85 mx-auto leading-relaxed">
            Maîtrisez l'impôt sur le revenu, la TVA, les régimes fiscaux et bien plus
            grâce à des modules clairs et des simulateurs pratiques.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/inscription">
              <Button variant="cta" size="lg" className="gap-2 text-base px-8 py-6 shadow-lg">
                Commencer gratuitement
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/comment-ca-marche">
              <Button variant="outline" size="lg" className="gap-2 text-base px-8 py-6 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
                Découvrir le parcours
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-primary-foreground/60 text-sm">
            Aucune carte bancaire requise · Accès immédiat
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-primary text-primary-foreground py-8">
        <div className="mx-auto max-w-5xl px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '8', label: 'Modules de formation' },
            { value: '50+', label: 'Questions de quizz' },
            { value: '2', label: 'Simulateurs avancés' },
            { value: '100%', label: 'Pédagogique' },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-heading text-3xl md:text-4xl font-bold text-[hsl(var(--yellow-vivid))]">{s.value}</p>
              <p className="mt-1 text-sm text-primary-foreground/80">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-secondary text-accent text-xs font-semibold uppercase tracking-wider mb-3">
              Fonctionnalités
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Tout ce qu'il faut pour comprendre vos impôts
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Une plateforme complète pensée pour vous rendre autonome sur votre déclaration fiscale.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border bg-background p-8 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <div className={`inline-flex items-center justify-center h-14 w-14 rounded-xl ${f.color} mb-5`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground">{f.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="bg-secondary px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              Pourquoi nous choisir
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Nos avantages
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Impôts Facile simplifie la fiscalité pour que chacun puisse déclarer en toute confiance.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {advantages.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.title}
                  className="flex gap-4 rounded-xl bg-background border border-border p-6 transition-all hover:shadow-lg hover:shadow-accent/5"
                >
                  <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-foreground">{a.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28">
        <img src={ctaBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(285,52%,15%/0.85)] to-[hsl(263,70%,50%/0.75)]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
            Prêt à maîtriser vos impôts ?
          </h2>
          <p className="mt-4 text-white/80 max-w-md mx-auto">
            Rejoignez Impôts Facile et commencez votre formation fiscale dès aujourd'hui.
          </p>
          <Link to="/inscription">
            <Button variant="cta" size="lg" className="mt-8 gap-2 text-base px-8 py-6 shadow-lg">
              Créer mon compte gratuit
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-secondary px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              FAQ
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Questions fréquentes
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-background px-5">
                <AccordionTrigger className="text-left font-heading font-semibold text-foreground py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
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
