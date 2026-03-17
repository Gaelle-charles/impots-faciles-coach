import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import heroBg from '@/assets/comment-ca-marche-hero.jpg';

/* ─── Animation helpers ─── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

/* ─── Data ─── */

const problemCards = [
  { emoji: '😰', title: "La déclaration, c'est du chinois", text: "Tranches, parts fiscales, cases à remplir… tu ne sais pas par où commencer." },
  { emoji: '💸', title: "Tu rates peut-être des économies", text: "Frais réels, crédits d'impôt, réductions… des centaines d'euros peuvent t'échapper chaque année." },
  { emoji: '⏰', title: "Tu attends la dernière minute", text: "Parce que tu ne sais pas vraiment quoi faire, tu repousses… jusqu'au stress de juin." },
];

const steps = [
  { num: '01', icon: '👤', title: "Tu crées ton compte en 30 secondes", text: "Prénom, email, mot de passe. C'est tout.\nPas de carte bancaire requise pour commencer." },
  { num: '02', icon: '📚', title: "Tu suis les modules à ton rythme", text: "8 modules progressifs couvrent tout : revenus, frais déductibles, crédits d'impôt, profils spécifiques… Chaque module prend 10 à 20 minutes. Tu reprends exactement où tu t'es arrêté." },
  { num: '03', icon: '❓', title: "Tu valides avec des quiz interactifs", text: "À la fin de chaque module, un quiz te permet de tester ce que tu as retenu. Tu reçois un score, des explications pour chaque bonne réponse, et un message personnalisé selon ton niveau." },
  { num: '04', icon: '🎯', title: "Tu déclares en toute confiance", text: "Grâce à ton parcours personnalisé, tu sais exactement quoi remplir, où et pourquoi. Plus de stress, plus d'erreurs, plus d'oublis." },
];

const modules = [
  { num: 1, icon: '📋', title: "Comprendre l'impôt sur le revenu", desc: 'Pourquoi déclarer, comment est calculé votre impôt, le barème progressif.', available: true },
  { num: 2, icon: '👨‍👩‍👧', title: 'Le foyer fiscal', desc: 'Qui déclarer avec vous, les parts fiscales, les enfants à rattacher.', available: true },
  { num: 3, icon: '💰', title: 'Les revenus à déclarer', desc: 'Salaires, indépendants, locations, placements, revenus en ligne.', available: true },
  { num: 4, icon: '📉', title: 'Les frais déductibles', desc: 'Abattement de 10%, frais réels, dépenses des salariés et indépendants.', available: true },
  { num: 5, icon: '🧾', title: "Réductions et crédits d'impôt", desc: "Garde d'enfant, emploi à domicile, dons, scolarité — ce que vous pouvez récupérer.", available: true },
  { num: 6, icon: '🔜', title: 'Bientôt disponible', desc: 'Nouveau module en cours de préparation.', available: false },
  { num: 7, icon: '✅', title: 'Valider son impôt final', desc: 'Lire votre résultat, corriger les erreurs, comprendre le prélèvement à la source.', available: true },
  { num: 8, icon: '🧩', title: 'Profils & stratégies personnalisées', desc: 'Salarié, indépendant, parent isolé, expatrié, LMNP — votre fiche sur mesure.', available: true },
];

const profiles = [
  { icon: '🧑‍💼', title: 'Salarié(e)', text: "Tu veux vérifier que tout est bien rempli, optimiser tes frais réels et ne pas rater de crédit d'impôt." },
  { icon: '🛠️', title: 'Indépendant(e) / Auto-entrepreneur', text: 'BIC, BNC, frais déductibles, cotisations… tu veux comprendre ce que tu peux déduire.' },
  { icon: '👨‍👩‍👧', title: 'Parent', text: "Garde alternée, rattachement d'enfants, crédits pour la crèche ou la nounou — on t'explique tout." },
  { icon: '🎓', title: 'Étudiant(e) / Primo-déclarant', text: "C'est ta première déclaration ? On part de zéro, sans jargon." },
  { icon: '🏠', title: 'Propriétaire bailleur', text: 'Location vide, meublée, LMNP — tu veux savoir quoi déclarer et comment.' },
  { icon: '🌍', title: 'Expatrié(e) / Double résidence', text: 'Revenus étrangers, conventions fiscales, case 2047 — on démêle tout ça.' },
];

const trustPoints = [
  { icon: '✅', title: 'Pas de jargon', text: 'Chaque notion est expliquée simplement, avec des exemples concrets tirés de la vraie vie.' },
  { icon: '🔒', title: 'Aucune donnée fiscale collectée', text: 'Tu apprends à déclarer, mais tu ne saisis jamais tes vraies données ici. Zéro risque.' },
  { icon: '📱', title: 'Accessible partout', text: 'Sur mobile, tablette ou ordinateur. Tu avances dans le métro, dans ton canapé, où tu veux.' },
  { icon: '🎯', title: 'Personnalisé selon ta progression', text: "Le parcours s'adapte à ce que tu sais déjà. Plus tu avances, plus c'est ciblé." },
];

const pricingCards = [
  {
    name: 'Nouveau',
    badge: 'Gratuit',
    badgeClass: 'bg-muted text-muted-foreground',
    price: '0 €',
    features: ['Accès au Module 1', 'Quiz du Module 1', 'Tableau de bord personnel'],
    btnVariant: 'outline' as const,
    btnLabel: 'Commencer →',
    highlight: false,
  },
  {
    name: 'Essentiel',
    badge: 'Le plus populaire ⭐',
    badgeClass: 'bg-primary text-primary-foreground',
    price: 'XX €/an',
    features: ['Modules 1 à 5', 'Tous les quiz', 'Tableau de bord + progression', 'Support par email'],
    btnVariant: 'default' as const,
    btnLabel: 'Choisir Essentiel →',
    highlight: true,
  },
  {
    name: 'Pro / Expert',
    badge: 'Complet',
    badgeClass: 'bg-muted text-muted-foreground',
    price: 'XX €/an',
    features: ['Tous les modules (1 à 8)', 'Quiz + résultats détaillés', 'Parcours adaptatif IA', 'Module profils & stratégies', 'Support prioritaire'],
    btnVariant: 'outline' as const,
    btnLabel: 'Choisir Pro →',
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
      <Header />

      {/* ── SECTION 1 — HERO ── */}
      <section className="relative overflow-hidden px-6 py-20 text-center text-white md:py-28">
        <img
          ref={imgRef}
          src={heroBg}
          alt=""
          className="absolute inset-0 h-[130%] w-full object-cover will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(285,52%,15%/0.85)] to-[hsl(263,70%,50%/0.75)]" />
        <motion.div
          className="relative z-10 mx-auto max-w-3xl space-y-6"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.span variants={fadeIn} className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            ✨ Simple. Guidé. Efficace.
          </motion.span>
          <motion.h1 variants={fadeUp} className="font-heading text-3xl font-bold leading-tight md:text-5xl">
            Comprendre ta déclaration d'impôts,
            <br />
            étape par étape
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto max-w-xl text-base text-white/85 md:text-lg">
            Impôts Facile transforme un sujet complexe en un parcours clair, interactif et personnalisé — en moins d'une heure.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/inscription">
              <Button className="bg-white text-primary hover:bg-white/90 font-heading font-bold px-6">
                Commencer gratuitement →
              </Button>
            </Link>
            <a href="#modules">
              <Button variant="outline" className="border-white/50 text-white hover:bg-white/10 font-heading font-bold px-6">
                Voir les modules
              </Button>
            </a>
          </motion.div>
          <motion.div variants={scaleUp} className="flex items-center justify-center gap-6 pt-4 text-4xl">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">📚</span>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">✅</span>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">🎯</span>
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
            Tu te reconnais ici ?
          </motion.h2>
          <motion.div className="grid gap-6 sm:grid-cols-3" variants={staggerContainer}>
            {problemCards.map((c) => (
              <motion.div key={c.title} variants={scaleUp}>
                <Card className="border-border bg-background h-full transition-shadow duration-300 hover:shadow-lg">
                  <CardContent className="space-y-3 p-6 text-center">
                    <span className="text-4xl">{c.emoji}</span>
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
            <p className="mt-2 text-muted-foreground">4 étapes simples, à ton rythme.</p>
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
                    <span className="text-2xl">{s.icon}</span>
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
                    <h3 className="font-heading text-base font-bold text-foreground">
                      <span className="mr-1.5">{m.icon}</span>{m.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{m.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp}>
            <Link to="/inscription">
              <Button className="font-heading font-bold">Voir tous les modules →</Button>
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
            Fait pour toi, quelle que soit ta situation
          </motion.h2>
          <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" variants={staggerContainer}>
            {profiles.map((p) => (
              <motion.div key={p.title} variants={scaleUp}>
                <Card className="border-border bg-background h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <CardContent className="space-y-2 p-5 text-center">
                    <span className="text-3xl">{p.icon}</span>
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
                <span className="text-3xl">{t.icon}</span>
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
            <p className="mt-2 text-muted-foreground">Commence gratuitement, évolue selon tes besoins.</p>
          </motion.div>
          <motion.div className="grid gap-6 sm:grid-cols-3" variants={staggerContainer}>
            {pricingCards.map((card) => (
              <motion.div key={card.name} variants={scaleUp}>
                <Card
                  className={`border-border bg-background h-full transition-all duration-300 hover:shadow-lg ${card.highlight ? 'ring-2 ring-primary shadow-xl scale-[1.03]' : ''}`}
                >
                  <CardContent className="flex flex-col items-center space-y-4 p-6">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${card.badgeClass}`}>{card.badge}</span>
                    <p className="font-heading text-3xl font-bold text-foreground">{card.price}</p>
                    <ul className="w-full space-y-2 text-left text-sm text-muted-foreground">
                      {card.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <span className="mt-0.5 text-primary">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/inscription" className="w-full">
                      <Button variant={card.btnVariant} className="w-full font-heading font-bold">
                        {card.btnLabel}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
            Prêt à comprendre ta déclaration ?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-base text-white/85 md:text-lg">
            Rejoins des milliers de contribuables qui déclarent sans stress grâce à Impôts Facile.
          </motion.p>
          <motion.div variants={scaleUp}>
            <Link to="/inscription">
              <Button className="bg-white text-[hsl(263,70%,50%)] hover:bg-white/90 font-heading font-bold px-8 py-3 text-base">
                Créer mon compte gratuitement →
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
