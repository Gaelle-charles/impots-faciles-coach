import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ExternalLink, Sparkles } from 'lucide-react';

type Reco = {
  id: string;
  type: 'association' | 'partenaire';
  nom: string;
  description: string;
  benefice_user: string;
  url: string;
  logo_url: string | null;
  ordre: number;
};

function getInitials(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function RecoCard({ reco }: { reco: Reco }) {
  return (
    <Card className="border-border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-5 flex flex-col h-full gap-4">
        <div className="flex items-center gap-3">
          {reco.logo_url ? (
            <img
              src={reco.logo_url}
              alt={reco.nom}
              className="h-12 w-12 shrink-0 rounded-lg object-contain bg-white border border-border"
            />
          ) : (
            <div
              className="h-12 w-12 shrink-0 rounded-lg flex items-center justify-center font-heading font-bold text-sm text-primary-foreground"
              style={{ backgroundColor: '#E15A97' }}
            >
              {getInitials(reco.nom) || <Sparkles className="h-5 w-5" />}
            </div>
          )}
          <h3 className="font-heading text-lg font-bold text-foreground leading-tight">
            {reco.nom}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground flex-1">{reco.description}</p>

        <div
          className="rounded-lg p-3 text-sm"
          style={{ backgroundColor: '#FFE4FA', color: '#2C1338' }}
        >
          <p className="font-semibold text-xs uppercase tracking-wide mb-1 opacity-70">
            Ce que ça vous apporte
          </p>
          <p>{reco.benefice_user}</p>
        </div>

        <a href={reco.url} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full gap-2" style={{ backgroundColor: '#2C1338', color: '#F9E900' }}>
            Découvrir <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}

export default function Recommandations() {
  const [loading, setLoading] = useState(true);
  const [recos, setRecos] = useState<Reco[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('recommandations')
        .select('id, type, nom, description, benefice_user, url, logo_url, ordre')
        .eq('is_active', true)
        .order('ordre', { ascending: true });
      setRecos((data as Reco[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const associations = recos.filter((r) => r.type === 'association');
  const partenaires = recos.filter((r) => r.type === 'partenaire');

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-6xl mx-auto">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FFE4FA' }}
          >
            <Heart className="h-5 w-5" style={{ color: '#E15A97' }} />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Nos recommandations</h1>
        </div>
        <p className="text-muted-foreground">
          Associations et partenaires sélectionnés pour vous accompagner.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : recos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-muted-foreground">
            Section bientôt disponible.
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="font-heading text-xl font-bold" style={{ color: '#2C1338' }}>
              Associations à soutenir
            </h2>
            {associations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune association pour le moment.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {associations.map((r) => (
                  <RecoCard key={r.id} reco={r} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-bold" style={{ color: '#2C1338' }}>
              Nos partenaires
            </h2>
            {partenaires.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun partenaire pour le moment.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {partenaires.map((r) => (
                  <RecoCard key={r.id} reco={r} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
