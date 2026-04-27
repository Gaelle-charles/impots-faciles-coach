import { useEffect, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Check, Info, Loader2, Lock, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgRole } from '@/hooks/useOrgRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const plans = [
  {
    name: 'Starter',
    slug: 'starter',
    price: 49,
    popular: false,
    features: [
      'Accès aux 7 modules pédagogiques',
      'Contenu personnalisé',
      'Simulateur de frais professionnels',
      "Quiz d'évaluation",
    ],
  },
  {
    name: 'Expert',
    slug: 'expert',
    price: 79,
    popular: true,
    features: [
      'Tout Starter +',
      'Fiches par profil contribuable',
      'Fiches par métier',
      'Parcours adaptatif IA',
    ],
  },
  {
    name: 'Premium',
    slug: 'premium',
    price: 119,
    popular: false,
    features: [
      'Tout Expert +',
      'Parcours pédagogique IA personnalisé',
      '5 webinaires thématiques',
    ],
  },
];

// Plan tier ordering (higher = better). Free / nouveau plans = 0.
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
    return () => { cancelled = true; };
  }, [user]);

  const currentTier = tierOf(currentPlan);

  const handleCheckout = async (planSlug: string) => {
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
    try {
      setLoadingPlan(planSlug);
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: planSlug },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('URL Stripe manquante');
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast.error('Erreur de paiement', { description: message });
      setLoadingPlan(null);
    }
  };

  const recommendedRaw =
    searchParams.get('recommended') ?? state.recommendedPlan ?? '';
  const recommended = recommendedRaw.toLowerCase();
  const wasRedirected =
    !!recommended || searchParams.get('redirected') === '1' || !!state.reason;

  const recommendedPlan = plans.find((p) => p.slug === recommended);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center px-4 py-20 sm:px-6 lg:px-8">
        {/* Bannière "particuliers uniquement" */}
        <div className="mb-6 w-full max-w-3xl rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Ces formations sont destinées à la <strong>déclaration de revenus des particuliers</strong>.
          Pour les obligations fiscales de votre structure professionnelle (SAS, SARL, SCI, etc.),
          consultez un expert-comptable.
        </div>

        {wasRedirected && (
          <div className="mb-8 flex w-full max-w-3xl items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-foreground">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-semibold">
                Vous avez été redirigé ici car le contenu demandé nécessite un plan supérieur.
              </p>
              {recommendedPlan && (
                <p className="mt-1 text-muted-foreground">
                  Le plan <span className="font-semibold text-foreground">{recommendedPlan.name}</span> est recommandé pour débloquer cet accès.
                </p>
              )}
            </div>
          </div>
        )}

        <h1 className="font-heading text-4xl font-bold text-foreground">Nos tarifs</h1>
        <p className="mt-4 max-w-xl text-center text-lg text-muted-foreground">
          Choisissez la formule qui vous convient pour maîtriser et réduire vos impôts.
        </p>

        <div className="mt-14 grid w-full max-w-6xl gap-8 grid-cols-1 md:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => {
            const isRecommended = plan.slug === recommended;
            const planTier = tierOf(plan.slug);
            const isCurrent = !!currentPlan && currentTier === planTier;
            const isDowngrade = currentTier > planTier;
            const isUpgrade = currentTier > 0 && planTier > currentTier;
            const disabled = isCurrent || isDowngrade;

            let ctaLabel: React.ReactNode;
            if (loadingPlan === plan.slug) {
              ctaLabel = <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirection…</>;
            } else if (isCurrent) {
              ctaLabel = 'Votre plan actuel';
            } else if (isDowngrade) {
              ctaLabel = <><Lock className="mr-2 h-4 w-4" /> Plan inférieur — non disponible</>;
            } else if (isUpgrade) {
              ctaLabel = `Upgrader vers ${plan.name}`;
            } else {
              ctaLabel = `Payer ${plan.price}€`;
            }

            return (
              <div
                key={plan.name}
                className={cn(
                  'relative flex flex-col rounded-xl border p-8 transition-all',
                  disabled
                    ? 'border-border bg-muted/30 opacity-60'
                    : isRecommended
                      ? 'border-primary bg-background shadow-2xl shadow-primary/30 ring-4 ring-primary lg:scale-105 lg:-my-2'
                      : plan.popular
                        ? 'border-accent bg-background shadow-lg shadow-accent/20 ring-2 ring-accent'
                        : 'border-border bg-card',
                )}
              >
                {isCurrent ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-4 py-1 text-xs font-bold text-background shadow-md">
                    ✓ Votre plan actuel
                  </span>
                ) : isRecommended ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-md">
                    ⭐ Plan recommandé pour votre accès
                  </span>
                ) : (
                  plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground">
                      Populaire
                    </span>
                  )
                )}

                <h3 className="font-heading text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="mt-3">
                  <span
                    className={cn(
                      'font-heading font-bold text-foreground',
                      isRecommended ? 'text-5xl' : 'text-4xl',
                    )}
                  >
                    {plan.price}€
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">/ an</span>
                </p>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleCheckout(plan.slug)}
                  disabled={loadingPlan !== null || disabled}
                  variant={disabled ? 'outline' : 'cta'}
                  size={isRecommended ? 'lg' : 'default'}
                  className={cn(
                    'mt-8 w-full',
                    isRecommended && !disabled && 'text-base font-bold shadow-lg',
                  )}
                >
                  {ctaLabel}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Bloc Impôts Team — offre entreprises */}
        <div className="mt-16 w-full max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 sm:p-10">
            <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Pour les entreprises
                  </span>
                </div>
                <h2 className="mt-4 font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  Impôts Team — Offre multi-licences
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Offrez à vos collaborateurs la formation la plus claire pour comprendre leurs impôts personnels.
                  À partir de 2 licences, profitez d'une <strong className="text-foreground">remise de 10%</strong> sur chaque licence.
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    'Tarifs dégressifs dès 2 licences',
                    'Dashboard administrateur dédié',
                    'Paiement par carte ou SEPA',
                    'Facturation annuelle TTC',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-3 lg:items-end">
                <Button
                  size="lg"
                  variant="cta"
                  onClick={() => navigate('/impots-team')}
                  className="font-bold shadow-lg"
                >
                  Découvrir Impôts Team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-center text-xs text-muted-foreground lg:text-right">
                  Simulateur de tarif inclus
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center text-xs text-muted-foreground leading-relaxed">
          ⚠️ Note : le passage à un plan inférieur n'est pas possible en cours d'abonnement.
          Choisissez avec soin.
        </p>

        <p className="mt-4 max-w-3xl text-center text-xs text-muted-foreground leading-relaxed">
          Les formations Impôts Facile apportent une information pédagogique générale et ne remplacent
          pas un conseil personnalisé d'un professionnel réglementé.
        </p>
      </div>

      <Footer />
    </div>
  );
};

export default Tarifs;
