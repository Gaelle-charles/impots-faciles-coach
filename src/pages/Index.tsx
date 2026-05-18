import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Sparkles,
  Zap,
  Layers,
  Wrench,
  Euro,
  BookOpen,
  Check,
  ChevronDown,
  GraduationCap,
  Map,
  Users,
  Rocket,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useEffect, useRef } from 'react';
import heroBg from '@/assets/hero-bg.jpg';
import ctaBg from '@/assets/cta-bg.jpg';
import { Footer } from '@/components/Footer';
import { SimulateurGratuitBento } from '@/components/home/SimulateurGratuitBento';
import { Seo } from '@/components/Seo';
import { Eyebrow } from '@/components/ui/eyebrow';
import { AccentText } from '@/components/ui/accent-text';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqItems = [
  {
    question: "Qu'est-ce que les frais professionnels réels ?",
    answer:
      "Les frais professionnels réels sont les dépenses que vous engagez dans le cadre de votre activité salariée (transport, repas, formation, matériel…). Au lieu de la déduction forfaitaire de 10 %, vous pouvez choisir de déclarer le montant exact de ces frais pour réduire votre revenu imposable.",
  },
  {
    question: 'Comment fonctionne la déduction de frais ?',
    answer:
      "Par défaut, l'administration fiscale applique un abattement forfaitaire de 10 % sur vos revenus. Si vos dépenses professionnelles dépassent ce montant, vous avez intérêt à opter pour la déduction des frais réels.",
  },
  {
    question: 'Qui peut bénéficier de la déduction des frais réels ?',
    answer:
      "Tous les salariés peuvent opter pour les frais réels, quelle que soit leur profession. C'est particulièrement avantageux pour ceux qui ont de longs trajets domicile-travail ou qui engagent des frais de formation.",
  },
  {
    question: 'Quels justificatifs dois-je conserver ?',
    answer:
      "Vous devez conserver tous les justificatifs de vos dépenses : factures, tickets de péage, attestations kilométriques, notes de frais de repas, etc. L'administration peut vous les demander pendant 3 ans.",
  },
  {
    question: 'La plateforme est-elle gratuite ?',
    answer:
      "Impôts Facile propose une formule Découverte gratuite avec accès à un module, un quizz et un simulateur basique. Des formules payantes donnent accès à l'ensemble des contenus.",
  },
  {
    question: 'Comment télécharger mes factures ?',
    answer:
      "Vos factures sont envoyées automatiquement par email à chaque paiement (depuis info@stripe.com ou info@impotsfacile.com). Vous pouvez également les consulter à tout moment depuis votre espace personnel : 1) Connectez-vous à impotsfacile.com,\n 2) Cliquez sur « Mon abonnement » dans le menu, \n3) Cliquez sur « Voir mes factures », \n4) Téléchargez le PDF de la facture souhaitée. \nSi vous ne trouvez pas une facture, contactez-nous à info@impotsfacile.com en précisant la date de paiement concernée.",
  },
];

const stats = [
  { value: '8', label: 'Modules pédagogiques' },
  { value: '50+', label: 'Quiz pour valider vos acquis' },
  { value: '12', label: 'Simulateurs disponibles' },
  { value: '100%', label: 'Pédagogique & accessible' },
];

const steps = [
  {
    num: '01',
    title: 'Personnaliser',
    desc: "Répondez à 7 questions courtes pour qu'on vous propose les modules et fiches les plus pertinents pour votre situation.",
    tag: '3 minutes',
  },
  {
    num: '02',
    title: 'Apprendre',
    desc: 'Suivez les modules à votre rythme. Vidéos, fiches, quiz : tout est conçu pour être clair, même si vous partez de zéro.',
    tag: 'À votre rythme',
  },
  {
    num: '03',
    title: 'Maîtriser',
    desc: 'Validez vos acquis avec les quiz de fin de module. Obtenez votre certificat de parcours et abordez votre déclaration sereinement.',
    tag: 'Certificat inclus',
  },
];

const Index = () => {
  const imgRef = useRef<HTMLDivElement>(null);
  const ctaImgRef = useRef<HTMLImageElement>(null);
  const ctaSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (imgRef.current) {
        imgRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
      if (ctaImgRef.current && ctaSectionRef.current) {
        const rect = ctaSectionRef.current.getBoundingClientRect();
        const sectionH = rect.height;
        const viewH = window.innerHeight;
        const progress = (viewH - rect.top) / (viewH + sectionH);
        const maxShift = sectionH * 0.3;
        const offset = (progress - 0.5) * maxShift;
        ctaImgRef.current.style.transform = `translateY(${offset}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Impôts Facile — Apprenez la fiscalité française simplement"
        description="Modules pédagogiques, quiz et simulateurs pour comprendre vos impôts et optimiser votre déclaration. Commencez gratuitement."
        path="/"
        jsonLd={faqJsonLd}
      />
      <Header />
      <main>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-background">
        {/* Décor */}
        <div
          className="blob-decor"
          style={{
            background: 'hsl(var(--rose-light))',
            width: 480,
            height: 480,
            top: -120,
            right: -80,
            opacity: 0.7,
          }}
          aria-hidden
        />
        <div
          className="blob-decor"
          style={{
            background: 'hsl(var(--yellow-vivid) / 0.18)',
            width: 360,
            height: 360,
            bottom: -120,
            left: -100,
          }}
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          {/* Texte */}
          <div className="relative z-10">
            <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] leading-[1.05] text-foreground">
              Comprenez vos impôts.
              <br />
              <AccentText>Sans jargon.</AccentText>
            </h1>
            <p className="mt-4 font-display text-2xl md:text-3xl text-rose-dynamic">
              Récupérez votre argent
            </p>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Une formation en ligne claire et progressive pour vous aider à
              mieux déclarer vos revenus, étape par étape.
            </p>
            <p className="mt-3 max-w-xl text-sm italic text-muted-foreground/80">
              Plateforme pédagogique destinée aux particuliers, ne se substitue
              pas à un conseil professionnel.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link to="/inscription">
                <Button variant="cta-pill" size="lg" className="w-full sm:w-auto px-7 py-6 text-base">
                  Commencer gratuitement
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/comment-ca-marche">
                <Button variant="outline-violet" size="lg" className="w-full sm:w-auto px-7 py-6 text-base">
                  Voir le programme
                </Button>
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-rose-dynamic" /> Aucune carte requise
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-rose-dynamic" /> Module 1 offert
              </li>
            </ul>
          </div>

          {/* Photo */}
          <div className="relative z-10 hidden lg:block">
            <div className="relative overflow-hidden rounded-[32px] aspect-[4/5] shadow-2xl shadow-primary/20">
              <div
                ref={imgRef}
                className="absolute inset-0 -top-12 -bottom-12 bg-cover bg-center will-change-transform"
                style={{ backgroundImage: `url(${heroBg})` }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-transparent" />
            </div>

            {/* Floating cards */}
            <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 z-20 hidden md:flex items-center gap-3 rounded-2xl bg-background px-4 py-3 shadow-xl border border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-light text-rose-dynamic">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Module 1</p>
                <p className="text-xs text-muted-foreground">15 minutes</p>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 z-20 hidden md:flex items-center gap-3 rounded-2xl bg-background px-4 py-3 shadow-xl border border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-vivid/20 text-violet-deep">
                <Euro className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Vous comprenez</p>
                <p className="text-xs text-muted-foreground">tout sur l'IR</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground py-12 md:py-14">
        <div
          className="blob-decor"
          style={{
            background: 'hsl(var(--rose-dynamic) / 0.25)',
            width: 380,
            height: 380,
            top: '50%',
            left: '20%',
            transform: 'translateY(-50%)',
          }}
          aria-hidden
        />
        <div
          className="blob-decor"
          style={{
            background: 'hsl(var(--yellow-vivid) / 0.18)',
            width: 380,
            height: 380,
            top: '50%',
            left: '80%',
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-display text-5xl md:text-6xl text-yellow-vivid">
                {s.value}
              </p>
              <p
                className="mt-2 text-xs uppercase text-rose-light/90"
                style={{ letterSpacing: '0.08em' }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ COMMENT ÇA MARCHE ============ */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <Eyebrow><Map className="mr-1.5 inline h-3.5 w-3.5" />Votre parcours</Eyebrow>
            <h2 className="font-display mt-5 text-4xl md:text-5xl text-foreground">
              Apprendre, à votre <AccentText>rythme.</AccentText>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
              Trois étapes simples pour passer de la confusion à la maîtrise.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.num}
                className="rounded-3xl p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                style={{ background: 'hsl(285 30% 97%)' }}
              >
                <p
                  className="font-display text-7xl"
                  style={{ color: 'hsl(var(--rose-light))', marginBottom: '-0.4em' }}
                >
                  {s.num}
                </p>
                <h3 className="font-display text-2xl text-primary mt-2">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
                <span
                  className="mt-5 inline-block rounded-full bg-yellow-vivid px-3 py-1 text-xs font-bold text-violet-deep"
                  style={{ letterSpacing: '0.04em' }}
                >
                  {s.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SIMULATEUR GRATUIT (sans inscription) ============ */}
      <SimulateurGratuitBento />



      {/* ============ BENTO AVANTAGES ============ */}
      <section className="px-6 py-20 md:py-28" style={{ background: 'hsl(285 30% 97%)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Eyebrow variant="violet"><Sparkles className="mr-1.5 inline h-3.5 w-3.5" />Pourquoi nous choisir</Eyebrow>
            <h2 className="font-display mt-5 text-4xl md:text-5xl text-foreground">
              Une plateforme conçue <AccentText>pour vous.</AccentText>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 md:grid-rows-2 md:auto-rows-fr">
            {/* Grande card violette */}
            <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-8 md:p-10 md:col-span-2 md:row-span-2">
              <div
                className="blob-decor"
                style={{
                  background: 'hsl(var(--rose-dynamic) / 0.4)',
                  width: 380,
                  height: 380,
                  bottom: -120,
                  right: -120,
                }}
                aria-hidden
              />
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-vivid text-violet-deep mb-5">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="font-display text-3xl md:text-4xl leading-tight">
                  Une méthode pédagogique pensée pour les{' '}
                  <span className="accent-yellow">particuliers</span>, pas pour les comptables.
                </h3>
                <p className="mt-5 max-w-lg text-primary-foreground/80 leading-relaxed">
                  Pas de jargon technique. Des modules courts, des exemples
                  concrets, des quiz pour valider votre progression. Vous
                  avancez à votre rythme, sans pression.
                </p>
              </div>
            </div>

            {/* Card jaune */}
            <div className="rounded-3xl bg-yellow-vivid text-violet-deep p-8">
              <Zap className="h-7 w-7" />
              <h3 className="font-display text-2xl mt-4">Mis à jour chaque année</h3>
              <p className="mt-2 text-sm opacity-80 leading-relaxed">
                Contenus actualisés selon les barèmes officiels et les
                nouveautés fiscales annuelles.
              </p>
            </div>

            {/* Card blanche */}
            <div className="rounded-3xl bg-background border border-border p-8">
              <Layers className="h-7 w-7 text-rose-dynamic" />
              <h3 className="font-display text-2xl mt-4 text-foreground">
                Adapté à votre profil
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Salarié, indépendant, retraité, expatrié , chaque parcours
                s'adapte à votre situation.
              </p>
            </div>

            {/* Card rose pâle */}
            <div className="rounded-3xl p-8 md:col-span-3 h-auto" style={{ background: 'hsl(var(--rose-light))' }}>
              <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-rose-dynamic shrink-0">
                  <Wrench className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-2xl text-foreground">Simulateurs inclus</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    12 outils interactifs pour estimer votre impôt, comparer
                    plusieurs scénarios et prendre les bonnes décisions
                    fiscales sans formules à connaître par cœur. Modifiez vos
                    paramètres en temps réel et visualisez l'impact immédiat
                    sur votre imposition.
                  </p>
                  <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 text-sm text-foreground">
                    {[
                      'Impôt sur le revenu (barème)',
                      'Quotient familial',
                      'Prélèvement à la source',
                      'Frais réels vs forfait',
                      'Crédits & réductions d\'impôt',
                      'Et 7 autres simulateurs',
                    ].map((s) => (
                      <li key={s} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-rose-dynamic shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ B2B IMPÔTS TEAM ============ */}
      <section className="px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div
            className="rounded-[28px] p-8 md:p-12"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--rose-light)) 0%, hsl(0 0% 100%) 100%)',
            }}
          >
            <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-center">
              <div>
                <Eyebrow><Users className="mr-1.5 inline h-3.5 w-3.5" />Pour les entreprises</Eyebrow>
                <h2 className="font-display mt-5 text-3xl md:text-4xl text-foreground leading-tight">
                  Impôts Team —{' '}
                  <AccentText>offre multi-licences.</AccentText>
                </h2>
                <p className="mt-4 text-muted-foreground max-w-xl">
                  Offrez à vos collaborateurs la formation la plus claire pour
                  comprendre leurs impôts personnels. Dès 2 licences, profitez
                  d'une remise de <strong className="text-foreground">10%</strong>{' '}
                  (code <strong>TEAM10</strong>).
                </p>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {[
                    'Tarifs dégressifs',
                    'Dashboard admin dédié',
                    'Paiement carte ou SEPA',
                    'Facturation TTC',
                  ].map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-rose-dynamic shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-start lg:justify-end">
                <Link to="/impots-team">
                  <Button variant="cta-pill" size="lg" className="px-7 py-6 text-base">
                    Découvrir Impôts Team
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="px-6 py-20 md:py-28" style={{ background: 'hsl(var(--rose-light))' }}>
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <Eyebrow variant="violet">FAQ</Eyebrow>
            <h2 className="font-display mt-5 text-4xl md:text-5xl text-foreground">
              Questions <AccentText>fréquentes.</AccentText>
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border-0 bg-background px-5 shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground py-5 hover:no-underline [&[data-state=open]>svg]:text-rose-dynamic">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section ref={ctaSectionRef} className="relative overflow-hidden px-4 py-24 md:py-32">
        <img
          ref={ctaImgRef}
          src={ctaBg}
          alt=""
          width="1920"
          height="1080"
          loading="lazy"
          decoding="async"
          className="absolute -top-[15%] left-0 h-[130%] w-full object-cover will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(285,52%,15%/0.92)] to-[hsl(263,70%,30%/0.85)]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Eyebrow variant="white"><Rocket className="mr-1.5 inline h-3.5 w-3.5" />Prêt(e) à commencer ?</Eyebrow>
          <h2 className="font-display mt-6 text-4xl md:text-6xl text-white leading-tight">
            Démarrez aujourd'hui,{' '}
            <span className="accent-yellow">gratuitement.</span>
          </h2>
          <p className="mt-5 text-rose-light/90 max-w-md mx-auto">
            Aucune carte requise. Module 1 offert, à votre rythme.
          </p>
          <Link to="/inscription">
            <Button variant="cta-pill" size="lg" className="mt-8 px-8 py-6 text-base">
              Créer mon compte
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
