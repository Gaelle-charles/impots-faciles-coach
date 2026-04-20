import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccess } from '@/hooks/useAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

const FicheMetier = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoading, hasFicheMetierAccess } = useAccess();

  useEffect(() => {
    if (isLoading) return;
    if (!hasFicheMetierAccess()) {
      toast({
        title: 'Accès restreint',
        description: 'Les fiches métier sont disponibles avec le plan Expert ou Premium',
        variant: 'destructive',
      });
      navigate('/tarifs?recommended=expert&redirected=1', { replace: true });
    }
  }, [isLoading, hasFicheMetierAccess, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!hasFicheMetierAccess()) return null;

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground">Fiche métier</h1>
      <p className="mt-2 text-muted-foreground">Informations fiscales pour le métier {id}.</p>
    </div>
  );
};

export default FicheMetier;
