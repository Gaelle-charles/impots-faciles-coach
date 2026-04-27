import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, FileCheck2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Acceptance {
  document_type: string;
  document_version: string;
  accepted_at: string;
  context: string;
}

const DOC_LABELS: Record<string, { label: string; href: string }> = {
  cgv: { label: 'Conditions Générales de Vente (CGV)', href: '/legal/cgv' },
  cgu: { label: "Conditions Générales d'Utilisation (CGU)", href: '/legal/cgu' },
  waiver_retraction: {
    label: 'Renonciation expresse au droit de rétractation (art. L221-28, 13° C. conso.)',
    href: '/legal/renonciation-retractation',
  },
  commercial_guarantee_b2b: {
    label: 'Garantie commerciale 7 jours (B2B)',
    href: '/legal/cgv',
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

const PaiementSucces = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    toast.success('Bienvenue !', {
      description: 'Votre abonnement est maintenant actif.',
    });
    queryClient.invalidateQueries({ queryKey: ['access-profile'] });
  }, [queryClient]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // On récupère les acceptations les plus récentes de l'utilisateur
      // (le checkout vient juste de les enregistrer côté edge function)
      const { data, error } = await supabase
        .from('legal_acceptances')
        .select('document_type, document_version, accepted_at, context')
        .eq('user_id', user.id)
        .order('accepted_at', { ascending: false })
        .limit(10);

      if (cancelled) return;
      if (error) {
        console.error('Erreur chargement acceptations:', error);
      } else if (data) {
        // Dédupliquer : on garde la plus récente par type
        const seen = new Set<string>();
        const unique: Acceptance[] = [];
        for (const a of data) {
          if (!seen.has(a.document_type)) {
            seen.add(a.document_type);
            unique.push(a as Acceptance);
          }
        }
        setAcceptances(unique);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-heading text-4xl font-bold text-foreground sm:text-5xl">
          Paiement validé
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Votre abonnement est maintenant actif. Vous avez accès à tous vos modules.
        </p>

        <Card className="mt-10 w-full text-left">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Récapitulatif des conditions acceptées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : acceptances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune acceptation enregistrée n'a pu être récupérée. Si vous venez de payer,
                rafraîchissez la page dans quelques secondes ou contactez{' '}
                <a href="mailto:info@impotsfacile.com" className="text-primary underline">
                  info@impotsfacile.com
                </a>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {acceptances.map((a) => {
                  const meta = DOC_LABELS[a.document_type] ?? {
                    label: a.document_type,
                    href: '#',
                  };
                  return (
                    <li
                      key={`${a.document_type}-${a.accepted_at}`}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0">
                        <a
                          href={meta.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {meta.label}
                        </a>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Version <span className="font-mono">{a.document_version}</span>
                          {a.context ? <> · contexte : {a.context.toUpperCase()}</> : null}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground sm:text-right">
                        Accepté le
                        <br className="hidden sm:block" />{' '}
                        <span className="text-foreground">{formatDate(a.accepted_at)}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Une copie de ce récapitulatif est conservée dans nos registres légaux. Vous pouvez
              consulter à tout moment vos acceptations depuis votre{' '}
              <button
                type="button"
                onClick={() => navigate('/profil')}
                className="text-primary underline"
              >
                profil
              </button>
              .
            </p>
          </CardContent>
        </Card>

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
