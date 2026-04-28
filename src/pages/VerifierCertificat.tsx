import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Download, ExternalLink, Shield, Trophy } from 'lucide-react';
import { downloadCertificatPdf, type CertificatData } from '@/lib/certificat-pdf';

const VerifierCertificat = () => {
  const { numero } = useParams<{ numero: string }>();
  const [loading, setLoading] = useState(true);
  const [certificat, setCertificat] = useState<CertificatData | null>(null);

  useEffect(() => {
    if (!numero) return;
    setLoading(true);
    supabase
      .from('certificats_parcours')
      .select('numero, prenom, nom, plan, nb_modules_valides, date_obtention')
      .eq('numero', numero)
      .maybeSingle()
      .then(({ data }) => {
        setCertificat(data as CertificatData | null);
        setLoading(false);
      });
  }, [numero]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted/20 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Vérification de certificat
          </h1>
          <p className="text-sm text-muted-foreground">
            Outil public de vérification des certificats Impôts Facile
          </p>
        </div>

        {/* Card principale */}
        <div className="rounded-xl border-2 border-border bg-card shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !certificat ? (
            <div className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Certificat introuvable
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Aucun certificat ne correspond au numéro <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{numero}</code>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Vérifiez que le numéro saisi est exact (format <code className="font-mono">IF-AAAA-NNNNNN</code>).
              </p>
            </div>
          ) : (
            <>
              {/* Bandeau succès */}
              <div className="bg-green-50 dark:bg-green-950/20 border-b-2 border-green-500/40 p-5 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-heading font-semibold text-green-800 dark:text-green-300">
                  Certificat valide et authentique
                </span>
              </div>

              {/* Détails */}
              <div className="p-8 space-y-6">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Délivré à
                  </p>
                  <p className="font-heading text-2xl font-bold text-primary mt-1">
                    {[certificat.prenom, certificat.nom].filter(Boolean).join(' ') || 'Apprenant·e'}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/40 border border-border p-5 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Trophy className="h-5 w-5" />
                    <p className="font-heading text-lg font-bold">Parcours Impôts Facile validé</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                        Modules validés
                      </p>
                      <p className="font-heading text-xl font-bold text-green-600 mt-1">
                        {certificat.nb_modules_valides}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Plan {certificat.plan}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                        Date d'obtention
                      </p>
                      <p className="text-base font-medium text-foreground mt-1">
                        {new Date(certificat.date_obtention).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
                  <span>N° certificat</span>
                  <Badge variant="outline" className="font-mono">{certificat.numero}</Badge>
                </div>

                <Button
                  onClick={() => downloadCertificatPdf(certificat)}
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" /> Télécharger le certificat (PDF)
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Mention légale */}
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
            <strong>⚠️ Mention légale.</strong> Les certificats Impôts Facile attestent du suivi
            d'un parcours pédagogique. Ils ne constituent pas une certification professionnelle au
            sens du RNCP, ni une qualification officielle en fiscalité.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 space-y-2">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" />
            Découvrir Impôts Facile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifierCertificat;
