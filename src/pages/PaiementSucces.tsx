import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PaiementSucces = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    toast.success('Bienvenue !', {
      description: 'Votre abonnement est maintenant actif.',
    });
    // Invalidate profile cache so the new plan is fetched
    queryClient.invalidateQueries({ queryKey: ['access-profile'] });
  }, [queryClient]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl">
          🎉 Paiement validé !
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Votre abonnement est maintenant actif. Vous avez accès à tous vos modules.
        </p>
        <Button
          variant="cta"
          size="lg"
          className="mt-10"
          onClick={() => navigate('/dashboard')}
        >
          Accéder à mon dashboard
        </Button>
      </main>
      <Footer />
    </div>
  );
};

export default PaiementSucces;
