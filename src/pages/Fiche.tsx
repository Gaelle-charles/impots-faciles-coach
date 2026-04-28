import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccess } from '@/hooks/useAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FicheSections, type FicheSectionsContent } from '@/components/fiches/FicheSections';

type FicheType = 'profil' | 'metier' | 'pays';

const TABLE_BY_TYPE: Record<FicheType, 'fiches_profils' | 'metiers' | 'pays'> = {
  profil: 'fiches_profils',
  metier: 'metiers',
  pays: 'pays',
};

const LABEL_BY_TYPE: Record<FicheType, string> = {
  profil: 'Fiche profil',
  metier: 'Fiche métier',
  pays: 'Fiche pays',
};

interface FicheRow {
  id: string;
  nom: string;
  icone: string | null;
  description: string | null;
  contenu_sections: FicheSectionsContent | null;
  is_active: boolean | null;
}

const Fiche = () => {
  const { type, slug } = useParams<{ type: FicheType; slug: string }>();
  const navigate = useNavigate();
  const { isLoading: accessLoading, hasFicheMetierAccess, plan, isAuthenticated } = useAccess();

  const validType = type && (['profil', 'metier', 'pays'] as const).includes(type as FicheType)
    ? (type as FicheType)
    : null;

  // Profil = starter+ ; Métier/Pays = expert+
  const allowed = useMemo(() => {
    if (!isAuthenticated) return false;
    if (validType === 'profil') {
      return plan === 'starter' || plan === 'expert' || plan === 'premium' || hasFicheMetierAccess();
    }
    return hasFicheMetierAccess();
  }, [validType, plan, isAuthenticated, hasFicheMetierAccess]);

  useEffect(() => {
    if (accessLoading) return;
    if (!validType) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!allowed) {
      const recommended = validType === 'profil' ? 'starter' : 'expert';
      toast({
        title: 'Accès restreint',
        description:
          validType === 'profil'
            ? 'Les fiches profils sont disponibles à partir du plan Starter.'
            : 'Les fiches métiers et pays sont disponibles avec le plan Expert ou Premium.',
        variant: 'destructive',
      });
      navigate(`/tarifs?recommended=${recommended}&redirected=1`, { replace: true });
    }
  }, [accessLoading, allowed, validType, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ['fiche', validType, slug],
    enabled: !!validType && !!slug && allowed,
    queryFn: async (): Promise<FicheRow | null> => {
      if (!validType || !slug) return null;
      const table = TABLE_BY_TYPE[validType];
      // `pays` n'a pas de colonne `description`
      const columns =
        table === 'pays'
          ? 'id, nom, icone, contenu_sections, is_active'
          : 'id, nom, icone, description, contenu_sections, is_active';
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as Record<string, unknown>;
      return {
        id: row.id as string,
        nom: row.nom as string,
        icone: (row.icone as string | null) ?? null,
        description: (row.description as string | null) ?? null,
        contenu_sections: (row.contenu_sections as FicheSectionsContent | null) ?? null,
        is_active: (row.is_active as boolean | null) ?? null,
      };
    },
  });

  if (accessLoading || !validType || !allowed) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data || data.is_active === false) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground">Fiche introuvable</h1>
        <p className="text-muted-foreground">
          Cette fiche n'existe pas ou n'est plus disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </Button>

      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {LABEL_BY_TYPE[validType]}
        </p>
        <div className="flex items-start gap-3">
          {data.icone && (
            <span className="text-4xl shrink-0" aria-hidden>
              {data.icone}
            </span>
          )}
          <h1 className="font-heading text-3xl font-bold text-foreground">{data.nom}</h1>
        </div>
        {data.description && (
          <p className="text-base text-muted-foreground">{data.description}</p>
        )}
      </header>

      <FicheSections content={data.contenu_sections} fallbackMarkdown={data.description} />
    </div>
  );
};

export default Fiche;
