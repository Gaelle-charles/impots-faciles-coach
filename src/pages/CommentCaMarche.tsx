import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  TrendingDown,
  Clock,
  UserPlus,
  BookOpen,
  HelpCircle,
  Target,
  FileText,
  Users,
  Wallet,
  Receipt,
  PiggyBank,
  Hourglass,
  CheckCircle2,
  Layers,
  Briefcase,
  Wrench,
  GraduationCap,
  Home,
  Globe,
  ShieldCheck,
  Smartphone,
  Check,
  Star,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Seo } from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import heroBg from '@/assets/comment-ca-marche-hero.jpg';

/* ─── Animation helpers ─── */

import type { Variants } from 'framer-motion';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ─── Data ─── */

const problemCards = [
  { Icon: AlertCircle, title: "La déclaration, c'est du chinois", text: "Tranches, parts fiscales, cases à remplir… vous ne savez pas par où commencer." },
  { Icon: TrendingDown, title: "Vous ratez peut-être des économies", text: "Frais réels, crédits d'impôt, réductions… des centaines d'euros peuvent vous échapper chaque année." },
  { Icon: Clock, title: "Vous attendez la dernière minute", text: "Parce que vous ne savez pas vraiment quoi faire, vous repoussez… jusqu'au stress de juin." },
];

const steps = [
  { num: '01', Icon: UserPlus, title: "Vous créez votre compte en 30 secondes", text: "Prénom, email, mot de passe. C'est tout.\nPas de carte bancaire requise pour commencer." },
  { num: '02', Icon: BookOpen, title: "Vous suivez les modules à votre rythme", text: "8 modules progressifs couvrent tout : revenus, frais déductibles, crédits d'impôt, profils spécifiques… Chaque module prend 10 à 20 minutes. Vous reprenez exactement où vous vous êtes arrêté." },
  { num: '03', Icon: HelpCircle, title: "Vous validez avec des quiz interactifs", text: "À la fin de chaque module, un quiz vous permet de tester ce que vous avez retenu. Vous recevez un score, des explications pour chaque bonne réponse, et un message personnalisé selon votre niveau." },
  { num: '04', Icon: Target, title: "Vous déclarez en toute confiance", text: "Grâce à votre parcours personnalisé, vous savez exactement quoi remplir, où et pourquoi. Plus de stress, plus d'erreurs, plus d'oublis." },
];

const modules = [
  { num: 1, Icon: FileText, title: "Comprendre l'impôt sur le revenu", desc: 'Pourquoi déclarer, comment est calculé votre impôt, le barème progressif.', available: true },
  { num: 2, Icon: Users, title: 'Le foyer fiscal', desc: 'Qui déclarer avec vous, les parts fiscales, les enfants à rattacher.', available: true },
  { num: 3, Icon: Wallet, title: 'Les revenus à déclarer', desc: 'Salaires, indépendants, locations, placements, revenus en ligne.', available: true },
  { num: 4, Icon: PiggyBank, title: 'Les frais déductibles', desc: 'Abattement de 10%, frais réels, dépenses des salariés et indépendants.', available: true },
  { num: 5, Icon: Receipt, title: "Réductions et crédits d'impôt", desc: "Garde d'enfant, emploi à domicile, dons, scolarité — ce que vous pouvez récupérer.", available: true },
  { num: 6, Icon: Globe, title: 'Spécificités fiscales des DROM', desc: 'Abattements, plafonds et règles propres aux départements et régions d\'outre-mer.', available: true },
  { num: 7, Icon: CheckCircle2, title: 'Valider son impôt final', desc: 'Lire votre résultat, corriger les erreurs, comprendre le prélèvement à la source.', available: true },
  { num: 8, Icon: Layers, title: 'Profils & stratégies personnalisées', desc: 'Salarié, indépendant, parent isolé, expatrié, LMNP — votre fiche sur mesure.', available: true },
];

const profiles = [
  { Icon: Briefcase, title: 'Salarié(e)', text: "Vous voulez vérifier que tout est bien rempli, optimiser vos frais réels et ne pas rater de crédit d'impôt." },
  { Icon: Wrench, title: 'Indépendant(e) / Auto-entrepreneur', text: 'BIC, BNC, frais déductibles, cotisations… vous voulez comprendre ce que vous pouvez déduire.' },
  { Icon: Users, title: 'Parent', text: "Garde alternée, rattachement d'enfants, crédits pour la crèche ou la nounou — on vous explique tout." },
  { Icon: GraduationCap, title: 'Étudiant(e) / Primo-déclarant', text: "C'est votre première déclaration ? On part de zéro, sans jargon." },
  { Icon: Home, title: 'Propriétaire bailleur', text: 'Location vide, meublée, LMNP — vous voulez savoir quoi déclarer et comment.' },
  { Icon: Globe, title: 'Expatrié(e) / Double résidence', text: 'Revenus étrangers, conventions fiscales, case 2047 — on démêle tout ça.' },
];

const trustPoints = [
  { Icon: CheckCircle2, title: 'Pas de jargon', text: 'Chaque notion est expliquée simplement, avec des exemples concrets tirés de la vraie vie.' },
  { Icon: ShieldCheck, title: "Aucune donnée d'impôts collectée", text: 'Vous apprenez à déclarer, mais vous ne saisissez jamais vos vraies données ici. Zéro risque.' },
  { Icon: Smartphone, title: 'Accessible partout', text: 'Sur mobile, tablette ou ordinateur. Vous avancez dans le métro, dans votre canapé, où vous voulez.' },
  { Icon: Target, title: 'Personnalisé selon votre progression', text: "Le parcours s'adapte à ce que vous savez déjà. Plus vous avancez, plus c'est ciblé." },
];

const pricingCards = [
  {
    name: 'Starter',
    badge: 'Pour bien démarrer',
    badgeClass: 'bg-muted text-muted-foreground',
    price: '49 €',
    period: '/an',
    features: ['Accès aux 7 modules pédagogiques', 'Parcours adapté à votre profil', 'Simulateur de frais réels', "Quiz d'évaluation"],
    btnVariant: 'outline' as const,
    btnLabel: 'Choisir Starter',
    highlight: false,
  },
  {
    name: 'Expert',
    badge: 'Le plus populaire',
    badgeClass: 'bg-primary text-primary-foreground',
    price: '99 €',
    period: '/an',
    features: ['Tout Starter inclus', 'Fiches par profil contribuable', 'Fiches par métier'],
    btnVariant: 'default' as const,
    btnLabel: 'Choisir Expert',
    highlight: true,
  },
  {
    name: 'Premium',
    badge: 'Le plus complet',
    badgeClass: 'bg-muted text-muted-foreground',
    price: '159 €',
    period: '/an',
    features: ['Tout Expert inclus', 'Coaching pédagogique personnalisé', 'Vidéos explicatives exclusives'],
    btnVariant: 'outline' as const,
    btnLabel: 'Choisir Premium',
    highlight: false,
  },
];

/* ─── Page ─── */

const CommentCaMarche = () => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (imgRef.current) {
        imgRef.current.style.transform = `translateY(${window.scrollY * 0.4}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Comment ça marche — Impôts Facile"
        description="Découvrez la méthode Impôts Facile : modules pédagogiques, parcours personnalisé et simulateurs pour maîtriser vos impôts en 7 étapes."
        path="/comment-ca-marche"
      />
      <Header />

      {/* ── SECTION 1 — HERO ── */}
      <section className="relative overflow-hidden px-6 py-20 text-center text-white md:py-28">
        <img
          ref={imgRef}
          src={heroBg}
          alt=""
          className="absolute inset-0 h-[130%] w-full object-cover object-center will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(285,52%,15%/0.92)] via-[hsl(275,55%,25%/0.85)] to-[hsl(263,70%,45%/0.85)]" />
        <motion.div
          className="relative z-10 mx-auto max-w-3xl space-y-6"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.span variants={fadeIn} className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            <Sparkles className="h-4 w-4" /> Simple. Guidé. Efficace.
          </motion.span>
          <motion.h1 variants={fadeUp} className="font-heading text-3xl font-bold leading-tight md:text-5xl">
            Comprendre votre déclaration d'impôts,
            <br />
            étape par étape
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto max-w-xl text-base text-white/85 md:text-lg">
            Impôts Facile transforme un sujet complexe en un parcours clair, interactif et personnalisé — en moins d'une heure.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/inscription" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 font-heading font-bold px-6">
                Commencer gratuitement <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#modules" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto border-2 border-white bg-white/10 text-white hover:bg-white hover:text-primary font-heading font-bold px-6 backdrop-blur-sm">
                Voir les modules
              </Button>
            </a>
          </motion.div>
          <motion.div variants={scaleUp} className="flex items-center justify-center gap-6 pt-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <BookOpen className="h-7 w-7" />
            </span>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <Target className="h-7 w-7" />
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── SECTION 2 — PROBLÈME ── */}
      <section className="bg-background px-6 py-16 md:py-20">
        <motion.div
          className="mx-auto max-w-5xl space-y-10 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Vous vous reconnaissez ici ?
          </motion.h2>
          <motion.div className="grid gap-6 sm:grid-cols-3" variants={staggerContainer}>
            {problemCards.map((c) => (
              <motion.div key={c.title} variants={scaleUp}>
                <Card className="border-border bg-background h-full transition-shadow duration-300 hover:shadow-lg">
                  <CardContent className="space-y-3 p-6 text-center">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <c.Icon className="h-6 w-6" />
                    </span>
                    <h3 className="font-heading text-base font-bold text-foreground">{c.title}</h3>
                    <p className="text-sm text-muted-foreground">{c.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          <motion.p variants={fadeUp} className="font-heading text-lg font-bold text-primary">
            Impôts Facile existe pour changer ça.
          </motion.p>
        </motion.div>
      </section>

      {/* ── SECTION 3 — COMMENT ÇA MARCHE ── */}
      <section id="comment-ca-marche" className="bg-muted/30 px-6 py-16 md:py-20">
        <motion.div
          className="mx-auto max-w-3xl space-y-10 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp}>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">Comment ça marche ?</h2>
            <p className="mt-2 text-muted-foreground">4 étapes simples, à votre rythme.</p>
          </motion.div>
          <div className="relative space-y-0 text-left">
            <div className="absolute left-6 top-0 hidden h-full w-0.5 bg-border md:block" />
            {steps.map((s) => (
              <motion.div
                key={s.num}
                className="relative flex gap-5 pb-10 last:pb-0"
                variants={slideInLeft}
              >
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground font-heading shadow-md">
                  {s.num}
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <s.Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-heading text-base font-bold text-foreground">{s.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{s.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── SECTION 4 — LES MODULES ── */}
      <section id="modules" className="bg-background px-6 py-16 md:py-20">
        <motion.div
          className="mx-auto max-w-5xl space-y-10 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp}>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">8 modules pour tout comprendre</h2>
            <p className="mt-2 text-muted-foreground">Du débutant complet au contribuable averti.</p>
          </motion.div>
          <motion.div className="grid gap-5 sm:grid-cols-2" variants={staggerContainer}>
            {modules.map((m) => (
              <motion.div key={m.num} variants={scaleUp}>
                <Card className="border-border bg-background text-left h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Module {m.num}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.available ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {m.available ? 'Inclus' : 'Bientôt'}
                      </span>
                    </div>
                    <h3 className="font-heading text-base font-bold text-foreground inline-flex items-center gap-2">
                      <m.Icon className="h-4 w-4 text-primary shrink-0" />
                      {m.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{m.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp}>
            <Link to="/inscription">
              <Button className="font-heading font-bold">
                Voir tous les modules <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── SECTION 5 — POUR QUI ? ── */}
      <section className="bg-accent/30 px-6 py-16 md:py-20">
        <motion.div
          className="mx-auto max-w-5xl space-y-10 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Fait pour vous, quelle que soit votre situation
          </motion.h2>
          <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" variants={staggerContainer}>
            {profiles.map((p) => (
              <motion.div key={p.title} variants={scaleUp}>
                <Card className="border-border bg-background h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <CardContent className="space-y-2 p-5 text-center">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <p.Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-heading text-base font-bold text-foreground">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── SECTION 6 — RÉASSURANCE ── */}
      <section className="bg-background px-6 py-16 md:py-20">
        <motion.div
          className="mx-auto max-w-4xl space-y-10 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Pourquoi choisir Impôts Facile ?
          </motion.h2>
          <motion.div className="grid gap-6 sm:grid-cols-2" variants={staggerContainer}>
            {trustPoints.map((t) => (
              <motion.div
                key={t.title}
                variants={scaleUp}
                className="space-y-2 rounded-xl border border-border p-6 text-center transition-all duration-300 hover:shadow-lg hover:border-primary/30"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <t.Icon className="h-5 w-5" />
                </span>
                <h3 className="font-heading text-base font-bold text-foreground">{t.title}</h3>
                <p className="text-sm text-muted-foreground">{t.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── SECTION 7 — TARIFS ── */}
      <section className="bg-muted/30 px-6 py-16 md:py-20">
        <motion.div
          className="mx-auto max-w-5xl space-y-10 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp}>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">Un accès simple et transparent</h2>
            <p className="mt-2 text-muted-foreground">Découvrez nos formules adaptées à votre situation.</p>
          </motion.div>
          <motion.div variants={scaleUp}>
            <Link to="/tarifs">
              <Button className="font-heading font-bold px-8 py-3 text-base">
                Voir les tarifs <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <motion.p variants={fadeIn} className="text-xs text-muted-foreground">
            Les prix sont indiqués en TTC. Paiement sécurisé via Stripe.
          </motion.p>
        </motion.div>
      </section>

      {/* ── SECTION 8 — CTA FINAL ── */}
      <motion.section
        className="bg-gradient-to-br from-[hsl(239,84%,67%)] to-[hsl(263,70%,50%)] px-6 py-16 text-center text-white md:py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <div className="mx-auto max-w-2xl space-y-6">
          <motion.h2 variants={fadeUp} className="font-heading text-2xl font-bold md:text-4xl">
            Prêt à comprendre votre déclaration ?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-base text-white/85 md:text-lg">
            Rejoignez des milliers de contribuables qui déclarent sans stress grâce à Impôts Facile.
          </motion.p>
          <motion.div variants={scaleUp}>
            <Link to="/inscription">
              <Button className="bg-white text-[hsl(263,70%,50%)] hover:bg-white/90 font-heading font-bold px-8 py-3 text-base">
                Créer mon compte gratuitement <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <motion.p variants={fadeIn} className="text-sm text-white/60">Sans carte bancaire. Accès immédiat.</motion.p>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
};

export default CommentCaMarche;
