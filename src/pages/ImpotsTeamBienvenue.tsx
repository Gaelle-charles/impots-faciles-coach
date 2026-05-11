import { Link, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ImpotsTeamBienvenue() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const redirectTarget = `/impots-team/dashboard`;
  const loginHref = `/connexion?redirect=${encodeURIComponent(redirectTarget)}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-primary/5 to-background px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="p-10 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
              <h1 className="mt-6 font-heading text-3xl font-bold">
                🎉 Bienvenue dans Impôts Team !
              </h1>
              <p className="mt-4 text-muted-foreground">
                Votre paiement a bien été reçu et votre abonnement est activé.
                Vous recevrez votre facture par email dans quelques instants.
              </p>

              {loading ? (
                <p className="mt-8 text-sm text-muted-foreground">Chargement…</p>
              ) : user ? (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link to="/impots-team/dashboard?tab=membres">
                    <Button size="lg">Inviter mes collaborateurs</Button>
                  </Link>
                  <Link to="/impots-team/dashboard?tab=branding">
                    <Button size="lg" variant="outline">Personnaliser notre espace</Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-8 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Pour accéder à votre espace d'administration, reconnectez-vous
                    avec l'email utilisé lors du paiement.
                  </p>
                  <Link to={loginHref}>
                    <Button size="lg">Accéder à mon espace</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
