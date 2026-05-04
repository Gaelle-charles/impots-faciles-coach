import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Sparkles, ArrowRight, Star } from 'lucide-react';
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
  recommended?: boolean;
}

const FicheCard = ({ item, type }: { item: FicheCardItem; type: 'profil' | 'metier' | 'pays' }) => {
  const navigate = useNavigate();
  return (
    <Card
      className={`relative border bg-background rounded-3xl shadow-none hover:-translate-y-1 hover:shadow-xl transition-all ${
        item.recommended ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
      }`}
    >
      {item.recommended && (
        <Badge className="absolute -top-2 right-4 gap-1 bg-primary text-primary-foreground">
          <Star className="h-3 w-3" />
          Pour vous
        </Badge>
      )}
      <CardContent className="p-7 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl shrink-0" aria-hidden>
            {item.icone || '📄'}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-xl text-foreground leading-tight">{item.nom}</h4>
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
    <Card className="relative overflow-hidden border-border bg-background rounded-3xl shadow-none">
      <CardContent className="p-7 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display text-xl text-foreground">{title}</h3>
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

const sortRecommendedFirst = <T extends { recommended?: boolean; nom: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    if (!!b.recommended !== !!a.recommended) return b.recommended ? 1 : -1;
    return a.nom.localeCompare(b.nom);
  });

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

      const userPlan = (prof as ProfileLite).plan;
      const profilsSlugs = prof.profils_detectes ?? [];
      const metiersIds = prof.metiers_detectes ?? [];
      const paysIds = prof.pays_concernes ?? [];

      // Pour expert/premium : on charge TOUTES les fiches actives
      // Pour starter : on charge seulement les détectées
      // Pour nouveau : on charge seulement le compte (via détectées)
      const loadAllProfilsAndMetiers = userPlan === 'expert' || userPlan === 'premium';
      const loadAllPays = userPlan === 'premium';

      const [fpRes, mRes, pRes] = await Promise.all([
        loadAllProfilsAndMetiers
          ? supabase.from('fiches_profils').select('*').eq('is_active', true).order('order_display', { ascending: true })
          : profilsSlugs.length > 0
            ? supabase.from('fiches_profils').select('*').in('slug', profilsSlugs).eq('is_active', true)
            : Promise.resolve({ data: [] as FicheProfil[] }),
        loadAllProfilsAndMetiers
          ? supabase.from('metiers').select('*').eq('is_active', true).order('order_display', { ascending: true })
          : metiersIds.length > 0
            ? supabase.from('metiers').select('*').in('id', metiersIds).eq('is_active', true)
            : Promise.resolve({ data: [] as Metier[] }),
        loadAllPays
          ? supabase.from('pays').select('*').eq('is_active', true).order('order_display', { ascending: true })
          : paysIds.length > 0
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
        <h2 className="font-display text-2xl text-foreground mb-5">
          Vos fiches personnalisées
        </h2>
        <Card className="border-dashed border-2 border-border bg-background rounded-3xl">
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

  // === FREEMIUM (nouveau) : teaser flouté ===
  if (plan === 'nouveau') {
    return (
      <section id="fiches">
        <h2 className="font-display text-2xl text-foreground mb-5">
          Vos fiches personnalisées
        </h2>
        <div className="relative overflow-hidden rounded-3xl">
          <div className="grid gap-4 sm:grid-cols-2 blur-sm pointer-events-none select-none">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border bg-background rounded-3xl">
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
            <Card className="max-w-md border-border bg-background shadow-xl rounded-3xl">
              <CardContent className="p-6 text-center space-y-4">
                <Sparkles className="h-10 w-10 text-primary mx-auto" />
                <h3 className="font-display text-xl text-foreground">
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

  // Préparer les items avec flag "recommended"
  const profilsItems: FicheCardItem[] = sortRecommendedFirst(
    fichesProfils.map((f) => ({
      id: f.id,
      icone: f.icone,
      nom: f.nom,
      description: f.description,
      slug: f.slug,
      recommended: profilsSlugs.includes(f.slug),
    }))
  );

  const metiersItems: FicheCardItem[] = sortRecommendedFirst(
    metiers.map((m) => ({
      id: m.id,
      icone: m.icone,
      nom: m.nom,
      description: m.description,
      slug: m.slug ?? m.id,
      recommended: metiersIds.includes(m.id),
    }))
  );

  const paysItems: FicheCardItem[] = sortRecommendedFirst(
    pays.map((p) => ({
      id: p.id,
      icone: p.icone,
      nom: p.nom,
      description: null,
      slug: p.slug ?? p.id,
      recommended: paysIds.includes(p.id),
    }))
  );

  const nbRecoProfils = profilsItems.filter((i) => i.recommended).length;
  const nbRecoMetiers = metiersItems.filter((i) => i.recommended).length;
  const nbRecoPays = paysItems.filter((i) => i.recommended).length;

  return (
    <section id="fiches" className="space-y-10">
      <div>
        <h2 className="font-display text-2xl text-foreground mb-2">
          Vos fiches
        </h2>
        <p className="text-sm text-muted-foreground">
          Plan {plan.charAt(0).toUpperCase() + plan.slice(1)} —
          {plan === 'starter' && ' accès aux fiches profils correspondant à votre situation.'}
          {plan === 'expert' && ' accès complet à toutes les fiches profils et métiers, mises en avant selon votre profil.'}
          {plan === 'premium' && ' accès complet à toutes les fiches profils, métiers et pays, mises en avant selon votre profil.'}
        </p>
      </div>

      {/* === FICHES PROFILS === */}
      {profilsItems.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
            <h3 className="font-display text-xl text-foreground">
              Fiches profils contribuable
            </h3>
            {(plan === 'expert' || plan === 'premium') && nbRecoProfils > 0 && (
              <span className="text-xs text-muted-foreground">
                {nbRecoProfils} recommandée{nbRecoProfils > 1 ? 's' : ''} pour vous
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {profilsItems.map((item) => (
              <FicheCard key={item.id} type="profil" item={item} />
            ))}
          </div>
        </div>
      )}

      {/* === FICHES MÉTIERS (expert + premium) === */}
      {plan === 'expert' || plan === 'premium' ? (
        metiersItems.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
              <h3 className="font-display text-xl text-foreground">
                Fiches métiers
              </h3>
              {nbRecoMetiers > 0 && (
                <span className="text-xs text-muted-foreground">
                  {nbRecoMetiers} recommandée{nbRecoMetiers > 1 ? 's' : ''} pour vous
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {metiersItems.map((item) => (
                <FicheCard key={item.id} type="metier" item={item} />
              ))}
            </div>
          </div>
        )
      ) : (
        <LockedSection
          title="Fiches métiers"
          count={metiersIds.length}
          requiredPlan="expert"
          description="Accédez à l'ensemble des fiches métiers, avec mise en avant de celles qui correspondent à votre profil, avec le plan Expert."
        />
      )}

      {/* === FICHES PAYS (premium seulement) === */}
      {plan === 'premium' ? (
        paysItems.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
              <h3 className="font-display text-xl text-foreground">
                Fiches pays
              </h3>
              {nbRecoPays > 0 && (
                <span className="text-xs text-muted-foreground">
                  {nbRecoPays} recommandée{nbRecoPays > 1 ? 's' : ''} pour vous
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {paysItems.map((item) => (
                <FicheCard key={item.id} type="pays" item={item} />
              ))}
            </div>
          </div>
        )
      ) : (
        <LockedSection
          title="Fiches pays"
          count={paysIds.length}
          requiredPlan="premium"
          description="Accédez à l'ensemble des fiches pays, avec mise en avant de celles qui correspondent à votre profil, avec le plan Premium."
        />
      )}

      {/* === PREMIUM : passeport personnalisé === */}
      {plan === 'premium' && showPasseport && (
        <div>
          <h3 className="font-display text-xl text-foreground mb-4">
            Votre passeport personnalisé
          </h3>
          <button
            type="button"
            onClick={() => navigate('/passeport-fiscal')}
            className="block w-full text-left group rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Consulter votre passeport fiscal personnalisé"
          >
            <Card className="border-border bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl shadow-none transition-all group-hover:shadow-md group-hover:border-primary/40 cursor-pointer">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🛂</span>
                  <div className="flex-1">
                    <h4 className="font-display text-lg text-foreground">
                      Régime détecté : {profile.situation_principale === 'independant' ? 'Indépendant' : 'Dirigeant'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Cliquez ici pour consulter votre passeport fiscal personnalisé.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </button>
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
