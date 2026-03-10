import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Starter',
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
    price: 119,
    popular: false,
    features: [
      'Tout Expert +',
      'Conseil fiscal IA avancé',
      '5 webinaires thématiques',
    ],
  },
];

const Tarifs = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1 flex-col items-center px-4 py-20">
        <h1 className="font-heading text-4xl font-bold text-foreground">Nos tarifs</h1>
        <p className="mt-4 max-w-xl text-center text-lg text-muted-foreground">
          Choisissez la formule qui vous convient pour maîtriser la fiscalité et réduire vos impôts.
        </p>

        <div className="mt-14 grid w-full max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-xl border p-8 transition-shadow',
                plan.popular
                  ? 'border-accent bg-background shadow-lg shadow-accent/20 ring-2 ring-accent'
                  : 'border-border bg-card'
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground">
                  Populaire
                </span>
              )}

              <h3 className="font-heading text-xl font-bold text-foreground">{plan.name}</h3>
              <p className="mt-3">
                <span className="font-heading text-4xl font-bold text-foreground">{plan.price}€</span>
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
                disabled
                variant={plan.popular ? 'cta' : 'default'}
                className="mt-8 w-full"
              >
                Payer {plan.price}€
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Tarifs;
