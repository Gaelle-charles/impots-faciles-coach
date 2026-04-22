import { useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Check, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
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

interface RedirectState {
  recommendedPlan?: string;
  reason?: string;
}

const Tarifs = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = (location.state ?? {}) as RedirectState;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planSlug: string) => {
    if (!user) {
      navigate(`/connexion?redirect=${encodeURIComponent('/tarifs')}`);
      return;
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
            return (
              <div
                key={plan.name}
                className={cn(
                  'relative flex flex-col rounded-xl border p-8 transition-all',
                  isRecommended
                    ? 'border-primary bg-background shadow-2xl shadow-primary/30 ring-4 ring-primary lg:scale-105 lg:-my-2'
                    : plan.popular
                      ? 'border-accent bg-background shadow-lg shadow-accent/20 ring-2 ring-accent'
                      : 'border-border bg-card',
                )}
              >
                {isRecommended ? (
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
                  <span className="ml-1 text-sm text-muted-foreground">/ accès</span>
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
                  disabled={loadingPlan !== null}
                  variant="cta"
                  size={isRecommended ? 'lg' : 'default'}
                  className={cn(
                    'mt-8 w-full',
                    isRecommended && 'text-base font-bold shadow-lg',
                  )}
                >
                  {loadingPlan === plan.slug ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirection…</>
                  ) : (
                    <>Payer {plan.price}€</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mt-12 max-w-3xl text-center text-xs text-muted-foreground leading-relaxed">
          Les formations Impôts Facile apportent une information pédagogique générale et ne remplacent
          pas un conseil personnalisé d'un professionnel réglementé.
        </p>
      </div>

      <Footer />
    </div>
  );
};

export default Tarifs;
