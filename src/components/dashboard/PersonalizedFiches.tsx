import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type FicheProfil = Tables<'fiches_profils'>;
type Metier = Tables<'metiers'>;
type Pays = Tables<'pays'>;

type ProfileLite = {
  plan: string;
  profils_detectes: string[] | null;
  metiers_detectes: string[] | null;
  pays_concernes: string[] | null;
  onboarding_done: boolean;
  situation_principale: string | null;
};

interface FicheCardItem {
  id: string;
  icone: string | null;
  nom: string;
  description: string | null;
  slug: string;
}

const FicheCard = ({ item, type }: { item: FicheCardItem; type: 'profil' | 'metier' | 'pays' }) => {
  const navigate = useNavigate();
  return (
    <Card className="border-border bg-background shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-3xl shrink-0" aria-hidden>
            {item.icone || '📄'}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="font-heading text-base font-semibold text-foreground">{item.nom}</h4>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/fiches/${type}/${item.slug}`)}
        >
          Consulter la fiche
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

const LockedSection = ({
  title,
  count,
  requiredPlan,
  description,
}: {
  title: string;
  count: number;
  requiredPlan: string;
  description: string;
}) => {
  const navigate = useNavigate();
  const planCap = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);
  return (
    <Card className="relative overflow-hidden border-border bg-background shadow-sm">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {count > 0
            ? `${count} fiche${count > 1 ? 's' : ''} ${count > 1 ? 'ont été identifiées' : 'a été identifiée'} pour votre profil.`
            : description}
        </p>
        <p className="text-sm text-muted-foreground italic">{description}</p>
        <Button onClick={() => navigate(`/tarifs?recommended=${requiredPlan}`)} className="gap-2">
          Débloquer avec {planCap}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export const PersonalizedFiches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [fichesProfils, setFichesProfils] = useState<FicheProfil[]>([]);
  const [metiers, setMetiers] = useState<Metier[]>([]);
  const [pays, setPays] = useState<Pays[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      const { data: prof } = await supabase
        .from('profiles')
        .select('plan, profils_detectes, metiers_detectes, pays_concernes, onboarding_done, situation_principale')
        .eq('id', user.id)
        .maybeSingle();

      if (!prof) {
        setLoading(false);
        return;
      }
      setProfile(prof as ProfileLite);

      const profilsSlugs = prof.profils_detectes ?? [];
      const metiersIds = prof.metiers_detectes ?? [];
      const paysIds = prof.pays_concernes ?? [];

      const [fpRes, mRes, pRes] = await Promise.all([
        profilsSlugs.length > 0
          ? supabase.from('fiches_profils').select('*').in('slug', profilsSlugs).eq('is_active', true)
          : Promise.resolve({ data: [] as FicheProfil[] }),
        metiersIds.length > 0
          ? supabase.from('metiers').select('*').in('id', metiersIds).eq('is_active', true)
          : Promise.resolve({ data: [] as Metier[] }),
        paysIds.length > 0
          ? supabase.from('pays').select('*').in('id', paysIds).eq('is_active', true)
          : Promise.resolve({ data: [] as Pays[] }),
      ]);

      setFichesProfils((fpRes.data ?? []) as FicheProfil[]);
      setMetiers((mRes.data ?? []) as Metier[]);
      setPays((pRes.data ?? []) as Pays[]);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <section>
        <Skeleton className="h-7 w-64 mb-5" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!profile) return null;

  const plan = profile.plan;
  const profilsSlugs = profile.profils_detectes ?? [];
  const metiersIds = profile.metiers_detectes ?? [];
  const paysIds = profile.pays_concernes ?? [];
  const totalDetected = profilsSlugs.length + metiersIds.length + paysIds.length;

  // === État vide : onboarding non fait ===
  if (!profile.onboarding_done) {
    return (
      <section id="fiches">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-5">
          Vos fiches personnalisées
        </h2>
        <Card className="border-dashed border-2 border-border bg-background">
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="h-10 w-10 text-primary mx-auto" />
            <p className="text-foreground">
              Complétez votre profil pour obtenir des fiches personnalisées.
            </p>
            <Button onClick={() => navigate('/onboarding')}>
              Compléter mon profil
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // === État vide : onboarding fait mais aucun matching ===
  if (totalDetected === 0) {
    return (
      <section id="fiches">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-5">
          Vos fiches personnalisées
        </h2>
        <Card className="border-border bg-background shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Votre situation est standard, les fiches génériques vous conviendront.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // === FREEMIUM (nouveau) : teaser flouté ===
  if (plan === 'nouveau') {
    return (
      <section id="fiches">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-5">
          Vos fiches personnalisées
        </h2>
        <div className="relative overflow-hidden rounded-xl">
          <div className="grid gap-4 sm:grid-cols-2 blur-sm pointer-events-none select-none">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border bg-background">
                <CardContent className="p-5 space-y-3">
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted/60 rounded" />
                  <div className="h-4 w-2/3 bg-muted/60 rounded" />
                  <div className="h-9 w-full bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
            <Card className="max-w-md border-border bg-background shadow-xl">
              <CardContent className="p-6 text-center space-y-4">
                <Sparkles className="h-10 w-10 text-primary mx-auto" />
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {totalDetected} fiche{totalDetected > 1 ? 's' : ''} ont été identifiées pour votre profil
                </h3>
                <p className="text-sm text-muted-foreground">
                  Passez à Starter pour les débloquer.
                </p>
                <Button onClick={() => navigate('/tarifs?recommended=starter')} className="gap-2">
                  Voir les plans
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  const showPasseport =
    profile.situation_principale === 'independant' ||
    profile.situation_principale === 'dirigeant';

  return (
    <section id="fiches" className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
          Vos fiches personnalisées
        </h2>
        <p className="text-sm text-muted-foreground">
          Sélectionnées en fonction de votre profil et de votre plan {plan.charAt(0).toUpperCase() + plan.slice(1)}.
        </p>
      </div>

      {/* === STARTER === */}
      {/* Fiches profils visibles pour starter, expert, premium */}
      {fichesProfils.length > 0 && (
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground mb-4">
            Vos fiches profils
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {fichesProfils.map((f) => (
              <FicheCard
                key={f.id}
                type="profil"
                item={{ id: f.id, icone: f.icone, nom: f.nom, description: f.description, slug: f.slug }}
              />
            ))}
          </div>
        </div>
      )}

      {/* === EXPERT + PREMIUM : métiers + pays === */}
      {(plan === 'expert' || plan === 'premium') ? (
        <>
          {metiers.length > 0 && (
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-4">
                Vos fiches métiers
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {metiers.map((m) => (
                  <FicheCard
                    key={m.id}
                    type="metier"
                    item={{ id: m.id, icone: m.icone, nom: m.nom, description: m.description, slug: m.slug ?? m.id }}
                  />
                ))}
              </div>
            </div>
          )}

          {pays.length > 0 && (
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-4">
                Vos pays concernés
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {pays.map((p) => (
                  <FicheCard
                    key={p.id}
                    type="pays"
                    item={{ id: p.id, icone: p.icone, nom: p.nom, description: null, slug: p.slug ?? p.id }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        // Starter : section flouttée pour métiers + pays
        (metiersIds.length > 0 || paysIds.length > 0) && (
          <LockedSection
            title="Vos fiches métiers & pays"
            count={metiersIds.length + paysIds.length}
            requiredPlan="expert"
            description="Accédez aux fiches métiers et pays personnalisées avec le plan Expert."
          />
        )
      )}

      {/* === PREMIUM : passeport personnalisé === */}
      {plan === 'premium' && showPasseport && (
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground mb-4">
            Votre passeport personnalisé
          </h3>
          <a
            href="#passeport-fiscal"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('passeport-fiscal');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // focus pour l'accessibilité
                (el as HTMLElement).setAttribute('tabindex', '-1');
                (el as HTMLElement).focus({ preventScroll: true });
              }
            }}
            className="block group rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Consulter votre passeport fiscal personnalisé"
          >
            <Card className="border-border bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm transition-all group-hover:shadow-md group-hover:border-primary/40 cursor-pointer">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🛂</span>
                  <div className="flex-1">
                    <h4 className="font-heading text-base font-semibold text-foreground">
                      Régime détecté : {profile.situation_principale === 'independant' ? 'Indépendant' : 'Dirigeant'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Cliquez ici pour consulter votre passeport fiscal personnalisé.
                    </p>
                  </div>
                  <span className="text-primary transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>
      )}


      {/* === EXPERT : teaser passeport personnalisé === */}
      {plan === 'expert' && showPasseport && (
        <LockedSection
          title="Votre passeport personnalisé"
          count={1}
          requiredPlan="premium"
          description="Débloquez votre passeport personnalisé avec le plan Premium."
        />
      )}
    </section>
  );
};

export default PersonalizedFiches;
