import { useEffect, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Check, Info, Loader2, Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgRole } from '@/hooks/useOrgRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckoutAcceptanceDialog } from '@/components/CheckoutAcceptanceDialog';
import { Eyebrow } from '@/components/ui/eyebrow';
import { AccentText } from '@/components/ui/accent-text';

const plans = [
  {
    name: 'Starter',
    slug: 'starter',
    tagline: 'Pour bien démarrer',
    price: 49,
    perMonth: 'Soit moins de 4,10€ par mois',
    popular: false,
    features: [
      '🎓 Accès aux 7 modules pédagogiques',
      '🎯 Parcours adapté à votre profil',
      '🛠️ Simulateur de frais professionnels',
      "✅ Quiz d'évaluation",
    ],
    footerNote: 'Aucune carte requise — accès immédiat',
  },
  {
    name: 'Expert',
    slug: 'expert',
    tagline: 'Le plus complet',
    price: 79,
    perMonth: 'Soit moins de 6,60€ par mois',
    popular: true,
    features: [
      '✅ Tout Starter +',
      '📂 Fiches par profil contribuable',
      '👔 Fiches par métier',
      '🤖 Coaching pédagogique personnalisé',
    ],
    footerNote: '14 jours pour changer d\'avis · Loi Hamon',
  },
  {
    name: 'Premium',
    slug: 'premium',
    tagline: 'Pour situations complexes',
    price: 119,
    perMonth: 'Soit moins de 9,95€ par mois',
    popular: false,
    features: [
      '✅ Tout Expert +',
      '🎓 Coaching pédagogique avancé',
      '🎓 5 webinaires exclusifs',
    ],
    footerNote: 'Accompagnement renforcé toute l\'année',
  },
];

const PLAN_TIER: Record<string, number> = {
  nouveau: 0,
  gratuit: 0,
  free: 0,
  starter: 1,
  expert: 2,
  premium: 3,
};

function tierOf(slug: string | null | undefined): number {
  if (!slug) return 0;
  return PLAN_TIER[slug.toLowerCase()] ?? 0;
}

interface RedirectState {
  recommendedPlan?: string;
  reason?: string;
}

const Tarifs = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { org, isOrgAdmin } = useOrgRole();
  const state = (location.state ?? {}) as RedirectState;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCurrentPlan(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setCurrentPlan(data?.plan ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentTier = tierOf(currentPlan);

  const handleCheckout = (planSlug: string) => {
    if (!user) {
      navigate(`/connexion?redirect=${encodeURIComponent('/tarifs')}`);
      return;
    }
    if (isOrgAdmin) {
      const ok = window.confirm(
        `Vous êtes rattaché à l'organisation « ${org?.raison_sociale ?? ''} » (plan ${org?.plan ?? ''}). ` +
          `Souscrire un abonnement B2C personnel doublonnera votre licence orga et vous serez facturé séparément. ` +
          `Continuer quand même ?`
      );
      if (!ok) return;
    }
    setPendingPlan(planSlug);
  };

  const confirmCheckout = async (acceptances: {
    cgv_accepted_at: string;
    cgu_accepted_at: string;
    waiver_accepted_at: string;
  }) => {
    if (!pendingPlan) return;
    try {
      setLoadingPlan(pendingPlan);
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: pendingPlan, ...acceptances },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('URL Stripe manquante');
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast.error('Erreur de paiement', { description: message });
      setLoadingPlan(null);
      setPendingPlan(null);
    }
  };

  const recommendedRaw = searchParams.get('recommended') ?? state.recommendedPlan ?? '';
  const recommended = recommendedRaw.toLowerCase();
  const wasRedirected =
    !!recommended || searchParams.get('redirected') === '1' || !!state.reason;

  const recommendedPlan = plans.find((p) => p.slug === recommended);

  // Mobile : place Expert (popular) en premier
  const orderedMobile = [...plans].sort((a, b) => {
    if (a.popular === b.popular) return 0;
    return a.popular ? -1 : 1;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 sm:py-20">
        {/* Hero tarifs */}
        <div className="text-center">
          <Eyebrow>💸 Sans engagement · Résiliable à tout moment</Eyebrow>
          <h1 className="font-display mt-6 text-5xl md:text-6xl text-foreground leading-tight">
            Le bon plan pour vos <AccentText>impôts.</AccentText>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-muted-foreground">
            Choisissez la formule qui correspond à votre situation. Tous les
            plans incluent le module 1 gratuit pour bien commencer.
          </p>
          <div
            className="mt-6 inline-block rounded-full px-5 py-2 text-xs font-semibold"
            style={{
              background: 'hsl(var(--rose-light))',
              color: 'hsl(var(--rose-dynamic))',
            }}
          >
            📌 Destinées à la déclaration de revenus des particuliers — pas pour SAS / SARL / SCI
          </div>
        </div>

        {/* Bannières contextuelles */}
        {isOrgAdmin && org && (
          <div className="mt-8 rounded-2xl border-2 border-yellow-vivid/60 bg-yellow-vivid/10 p-4 text-sm text-foreground">
            ⚠️ Vous êtes rattaché à l'organisation <strong>{org.raison_sociale}</strong> (plan{' '}
            <strong className="capitalize">{org.plan}</strong>). Vous avez déjà un accès via votre licence
            orga — souscrire un abonnement personnel ici doublonnera votre facturation.{' '}
            <button
              type="button"
              onClick={() => navigate('/impots-team/dashboard')}
              className="underline underline-offset-2 hover:no-underline"
            >
              Aller au dashboard équipe
            </button>
          </div>
        )}

        {wasRedirected && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-rose-dynamic/40 bg-rose-light/60 p-4 text-sm text-foreground">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-rose-dynamic" />
            <div>
              <p className="font-semibold">
                Vous avez été redirigé ici car le contenu demandé nécessite un plan supérieur.
              </p>
              {recommendedPlan && (
                <p className="mt-1 text-muted-foreground">
                  Le plan{' '}
                  <span className="font-semibold text-foreground">{recommendedPlan.name}</span>{' '}
                  est recommandé pour débloquer cet accès.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pricing cards */}
        <div className="mt-14 grid w-full gap-6 lg:gap-5 grid-cols-1 lg:grid-cols-3 lg:items-center">
          {(typeof window !== 'undefined' && window.innerWidth < 1024 ? orderedMobile : plans).map((plan) => {
            const isRecommended = plan.slug === recommended;
            const planTier = tierOf(plan.slug);
            const isCurrent = !!currentPlan && currentTier === planTier;
            const isDowngrade = currentTier > planTier;
            const isUpgrade = currentTier > 0 && planTier > currentTier;
            const disabled = isCurrent || isDowngrade;
            const isExpert = plan.popular; // Expert = card centrale

            let ctaLabel: React.ReactNode;
            if (loadingPlan === plan.slug) {
              ctaLabel = (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirection…
                </>
              );
            } else if (isCurrent) {
              ctaLabel = 'Votre plan actuel';
            } else if (isDowngrade) {
              ctaLabel = (
                <>
                  <Lock className="mr-2 h-4 w-4" /> Plan inférieur — non disponible
                </>
              );
            } else if (isUpgrade) {
              ctaLabel = `Upgrader vers ${plan.name} →`;
            } else {
              ctaLabel = `Choisir ${plan.name} →`;
            }

            return (
              <div
                key={plan.name}
                className={cn(
                  'relative flex flex-col rounded-3xl p-8 transition-all',
                  isExpert
                    ? 'bg-primary text-primary-foreground lg:scale-105 lg:-my-2 shadow-2xl'
                    : 'bg-background border border-border lg:scale-[0.97]',
                  disabled && 'opacity-60'
                )}
                style={
                  isExpert
                    ? {
                        boxShadow: '0 30px 60px -20px hsl(var(--violet-deep) / 0.45)',
                      }
                    : undefined
                }
              >
                {isExpert && (
                  <div
                    className="blob-decor"
                    style={{
                      background: 'hsl(var(--rose-dynamic) / 0.4)',
                      width: 240,
                      height: 240,
                      top: -40,
                      right: -40,
                    }}
                    aria-hidden
                  />
                )}

                {/* Badge */}
                {isCurrent ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-4 py-1 text-xs font-bold text-background shadow-md">
                    ✓ Votre plan actuel
                  </span>
                ) : isRecommended ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-vivid px-4 py-1 text-xs font-bold text-violet-deep shadow-md">
                    ⭐ Recommandé pour votre accès
                  </span>
                ) : isExpert ? (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-vivid px-4 py-1 text-xs font-bold text-violet-deep"
                    style={{ animation: 'pulse 2.5s ease-in-out infinite' }}
                  >
                    ✨ Recommandé pour vous
                  </span>
                ) : null}

                <div className="relative">
                  <h3
                    className={cn(
                      'font-display text-3xl',
                      isExpert ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      'mt-1 text-sm',
                      isExpert ? 'text-rose-light' : 'text-muted-foreground'
                    )}
                  >
                    {plan.tagline}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span
                      className={cn(
                        'font-display text-6xl',
                        isExpert ? 'text-yellow-vivid' : 'text-foreground'
                      )}
                    >
                      {plan.price}€
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        isExpert ? 'text-rose-light' : 'text-muted-foreground'
                      )}
                    >
                      /an
                    </span>
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-xs',
                      isExpert ? 'text-rose-light/80' : 'text-muted-foreground'
                    )}
                  >
                    {plan.perMonth}
                  </p>

                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className={cn(
                          'flex items-start gap-3 text-sm',
                          isExpert ? 'text-primary-foreground/90' : 'text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                            isExpert ? 'bg-yellow-vivid text-violet-deep' : 'bg-rose-light text-rose-dynamic'
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleCheckout(plan.slug)}
                    disabled={loadingPlan !== null || disabled}
                    variant={isExpert ? 'cta-pill' : disabled ? 'outline' : 'default'}
                    size="lg"
                    className="mt-8 w-full"
                  >
                    {ctaLabel}
                  </Button>

                  <p
                    className={cn(
                      'mt-4 text-center text-xs',
                      isExpert ? 'text-rose-light/80' : 'text-muted-foreground'
                    )}
                  >
                    {plan.footerNote}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* B2B Impôts Team */}
        <div className="mt-20">
          <div
            className="rounded-[28px] p-8 md:p-12"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--rose-light)) 0%, hsl(0 0% 100%) 100%)',
            }}
          >
            <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-center">
              <div>
                <Eyebrow>👥 Pour les entreprises</Eyebrow>
                <h2 className="font-display mt-5 text-3xl md:text-4xl text-foreground leading-tight">
                  Impôts Team — <AccentText>offre multi-licences.</AccentText>
                </h2>
                <p className="mt-4 text-muted-foreground max-w-xl">
                  Dès 2 licences, profitez d'une remise de{' '}
                  <strong className="text-foreground">10%</strong> (code{' '}
                  <strong>TEAM10</strong>). Dashboard administrateur et
                  facturation TTC inclus.
                </p>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {[
                    'Tarifs dégressifs',
                    'Dashboard admin dédié',
                    'Paiement carte ou SEPA',
                    'Facturation annuelle TTC',
                  ].map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-rose-dynamic shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-start lg:justify-end">
                <Button
                  variant="cta-pill"
                  size="lg"
                  onClick={() => navigate('/impots-team')}
                  className="px-7 py-6 text-base"
                >
                  Découvrir Impôts Team
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 max-w-2xl mx-auto text-center text-xs text-muted-foreground leading-relaxed">
          ⚠️ Note : le passage à un plan inférieur n'est pas possible en cours d'abonnement. Choisissez avec soin.
        </p>
        <p className="mt-3 max-w-3xl mx-auto text-center text-xs text-muted-foreground leading-relaxed">
          Les formations Impôts Facile apportent une information pédagogique générale et ne remplacent pas un
          conseil personnalisé d'un professionnel réglementé.
        </p>
      </main>

      <Footer />

      <CheckoutAcceptanceDialog
        open={pendingPlan !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingPlan(null);
            setLoadingPlan(null);
          }
        }}
        planLabel={plans.find((p) => p.slug === pendingPlan)?.name ?? ''}
        planPrice={plans.find((p) => p.slug === pendingPlan)?.price ?? 0}
        loading={loadingPlan !== null}
        onConfirm={confirmCheckout}
      />
    </div>
  );
};

export default Tarifs;
