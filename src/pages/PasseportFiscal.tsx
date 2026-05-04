import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePasseportFiscal } from '@/hooks/usePasseportFiscal';
import { PasseportFiscalCard } from '@/components/dashboard/PasseportFiscalCard';
import { Card, CardContent } from '@/components/ui/card';
import { Crown } from 'lucide-react';

export default function PasseportFiscal() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setProfileLoading(false);
      });
  }, [user]);

  const { passeport, loading: passeportLoading } = usePasseportFiscal(profile?.plan, profile);

  if (authLoading || profileLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/connexion" replace />;
  if (profile?.plan !== 'premium') return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground">
          👑 Votre <em className="accent-serif">Passeport Fiscal</em>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Votre passeport personnalisé en fonction de votre profil et de votre régime.
        </p>
      </div>

      <div className="rounded-lg bg-yellow-vivid/15 border border-yellow-vivid/30 p-4 text-sm text-foreground">
        <span className="font-semibold">⚠️ Estimations pédagogiques.</span>{" "}
        Non opposables à la DGFIP. Pour votre déclaration officielle, rendez-vous sur impots.gouv.fr.
      </div>

      {passeportLoading && (
        <Card className="border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/10">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Chargement de votre passeport fiscal…</p>
          </CardContent>
        </Card>
      )}

      {!passeportLoading && passeport && <PasseportFiscalCard passeport={passeport} />}

      {!passeportLoading && !passeport && (
        <Card className="border-2 border-amber-400/60 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/10 shadow-sm">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <Crown className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Passeport Fiscal Premium
              </h3>
              <p className="text-sm text-muted-foreground">
                Le Passeport Fiscal est disponible pour les profils indépendants,
                dirigeants de société, loueurs LMNP et artistes-auteurs.
                Si tu penses correspondre à l'un de ces profils, vérifie tes
                réponses dans le formulaire d'onboarding pour activer ton passeport personnalisé.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
