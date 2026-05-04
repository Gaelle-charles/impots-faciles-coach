import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Lock, Sparkles, ArrowRight, Star, Briefcase, Globe, Users, FolderOpen,
  Palette, GraduationCap, Scale, Hammer, Plane, Stethoscope, MoreHorizontal,
  Mountain, Map as MapIcon, Building2, Sparkle, type LucideIcon,
} from 'lucide-react';

// Catégories métiers : icône + libellé lisible + description (tooltip)
const METIER_CATEGORIES: Record<string, { label: string; icon: LucideIcon; description: string }> = {
  culture_creation: { label: 'Culture & création', icon: Palette, description: "Métiers artistiques et créatifs : artistes-auteurs, artisans d'art, designers, journalistes, photographes." },
  education_asso: { label: 'Éducation & associatif', icon: GraduationCap, description: "Enseignement, formation, recherche et secteur associatif ou de l'économie sociale et solidaire." },
  liberaux_cadres: { label: 'Libéraux & cadres', icon: Scale, description: "Professions libérales (avocats, experts-comptables, consultants) et cadres salariés du tertiaire." },
  manuels_terrain: { label: 'Manuels & terrain', icon: Hammer, description: "Métiers du bâtiment, de l'artisanat, de l'industrie et des services techniques sur le terrain." },
  mobilite_specifiques: { label: 'Mobilité & spécifiques', icon: Plane, description: "Métiers liés à la mobilité (transport, voyage) et situations professionnelles particulières." },
  sante_soin: { label: 'Santé & soin', icon: Stethoscope, description: "Professionnels de santé, paramédicaux et métiers du soin à la personne." },
  Autres: { label: 'Autres', icon: MoreHorizontal, description: 'Autres métiers non classés dans les catégories ci-dessus.' },
};

// Zones pays : icône + libellé + description (tooltip)
const PAYS_ZONES: Record<string, { label: string; icon: LucideIcon; description: string }> = {
  Afrique: { label: 'Afrique', icon: Mountain, description: 'Pays du continent africain et du Maghreb.' },
  Amériques: { label: 'Amériques', icon: MapIcon, description: "Amérique du Nord, Amérique latine et Caraïbes." },
  Asie: { label: 'Asie', icon: Globe, description: "Pays d'Asie de l'Est, du Sud-Est et d'Asie centrale." },
  Europe: { label: 'Europe', icon: Building2, description: "Pays de l'Union européenne et du reste du continent européen." },
  'Moyen-Orient': { label: 'Moyen-Orient', icon: MapIcon, description: "Pays du Moyen-Orient et du Golfe." },
  Océanie: { label: 'Océanie', icon: Globe, description: 'Australie, Nouvelle-Zélande et îles du Pacifique.' },
  special: { label: 'Régimes spéciaux', icon: Sparkle, description: 'Régimes fiscaux particuliers et situations internationales spécifiques.' },
  Autres: { label: 'Autres', icon: MoreHorizontal, description: 'Autres zones non classées.' },
};
import type { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

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

// Palette de section : 4 ambiances distinctes basées sur les tokens
const SECTION_THEMES = {
  recos: {
    bg: 'bg-yellow-vivid/15',
    border: 'border-yellow-vivid/40',
    iconBg: 'bg-yellow-vivid text-violet-deep',
    title: 'text-foreground',
  },
  profils: {
    bg: 'bg-rose-light',
    border: 'border-rose-dynamic/30',
    iconBg: 'bg-rose-dynamic text-white',
    title: 'text-foreground',
  },
  metiers: {
    bg: 'bg-primary/5',
    border: 'border-primary/30',
    iconBg: 'bg-primary text-primary-foreground',
    title: 'text-foreground',
  },
  pays: {
    bg: 'bg-accent/10',
    border: 'border-accent/30',
    iconBg: 'bg-accent text-accent-foreground',
    title: 'text-foreground',
  },
} as const;

type SectionKey = keyof typeof SECTION_THEMES;

const SectionShell = ({
  themeKey,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  themeKey: SectionKey;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => {
  const t = SECTION_THEMES[themeKey];
  return (
    <section className={cn('rounded-3xl border p-6 md:p-8 space-y-5', t.bg, t.border)}>
      <header className="flex items-start gap-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', t.iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className={cn('font-display text-2xl leading-tight', t.title)}>{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
};

const FicheCard = ({ item, type }: { item: FicheCardItem; type: 'profil' | 'metier' | 'pays' }) => {
  const navigate = useNavigate();
  return (
    <Card
      className={`relative border bg-background rounded-2xl shadow-none hover:-translate-y-0.5 hover:shadow-md transition-all ${
        item.recommended ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
      }`}
    >
      {item.recommended && (
        <Badge className="absolute -top-2 right-4 gap-1 bg-primary text-primary-foreground">
          <Star className="h-3 w-3" />
          Pour vous
        </Badge>
      )}
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden>
            {item.icone || '📄'}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="font-heading font-semibold text-base text-foreground leading-tight">{item.nom}</h4>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate(`/fiches/${type}/${item.slug}`)}
        >
          Consulter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

const LockedBlock = ({
  requiredPlan,
  description,
  count,
}: {
  requiredPlan: string;
  description: string;
  count: number;
}) => {
  const navigate = useNavigate();
  const planCap = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {count > 0
            ? `${count} fiche${count > 1 ? 's' : ''} identifiée${count > 1 ? 's' : ''} pour votre profil.`
            : description}
        </p>
      </div>
      <p className="text-sm text-muted-foreground italic">{description}</p>
      <Button onClick={() => navigate(`/tarifs?recommended=${requiredPlan}`)} size="sm" className="gap-2">
        Débloquer avec {planCap}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

const sortRecommendedFirst = <T extends { recommended?: boolean; nom: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    if (!!b.recommended !== !!a.recommended) return b.recommended ? 1 : -1;
    return a.nom.localeCompare(b.nom);
  });

// Vue par catégories : grille de cartes catégorie cliquables (ouvre la liste filtrée en dessous)
const CategoryGrid = <T extends { id: string; nom: string; icone: string | null }>({
  groups,
  selected,
  onSelect,
  themeKey,
}: {
  groups: { key: string; label: string; icon: LucideIcon; description?: string; items: T[] }[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  themeKey: SectionKey;
}) => {
  const t = SECTION_THEMES[themeKey];
  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {groups.map((g) => {
          const active = selected === g.key;
          const Icon = g.icon;
          const button = (
            <button
              type="button"
              onClick={() => onSelect(active ? null : g.key)}
              className={cn(
                'group w-full rounded-2xl border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                active ? cn('ring-2', t.border, 'border-transparent') : 'border-border',
              )}
              style={active ? { boxShadow: `0 0 0 2px hsl(var(--primary) / 0.4)` } : undefined}
            >
              <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl mb-2', t.iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="font-heading font-semibold text-sm text-foreground leading-tight">{g.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {g.items.length} fiche{g.items.length > 1 ? 's' : ''}
              </p>
            </button>
          );
          return g.description ? (
            <Tooltip key={g.key}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                {g.description}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div key={g.key}>{button}</div>
          );
        })}
      </div>
    </TooltipProvider>
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

  const [selectedMetierCat, setSelectedMetierCat] = useState<string | null>(null);
  const [selectedPaysZone, setSelectedPaysZone] = useState<string | null>(null);

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
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  const plan = profile.plan;
  const profilsSlugs = profile.profils_detectes ?? [];
  const metiersIds = profile.metiers_detectes ?? [];
  const paysIds = profile.pays_concernes ?? [];
  const totalDetected = profilsSlugs.length + metiersIds.length + paysIds.length;

  // Onboarding non fait
  if (!profile.onboarding_done) {
    return (
      <Card className="border-dashed border-2 border-border bg-background rounded-3xl">
        <CardContent className="p-8 text-center space-y-4">
          <Sparkles className="h-10 w-10 text-primary mx-auto" />
          <p className="text-foreground">Complétez votre profil pour obtenir des fiches personnalisées.</p>
          <Button onClick={() => navigate('/onboarding')}>Compléter mon profil</Button>
        </CardContent>
      </Card>
    );
  }

  // Freemium
  if (plan === 'nouveau') {
    return (
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
              <p className="text-sm text-muted-foreground">Passez à Starter pour les débloquer.</p>
              <Button onClick={() => navigate('/tarifs?recommended=starter')} className="gap-2">
                Voir les plans
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Items
  const profilsItems: FicheCardItem[] = sortRecommendedFirst(
    fichesProfils.map((f) => ({
      id: f.id, icone: f.icone, nom: f.nom, description: f.description, slug: f.slug,
      recommended: profilsSlugs.includes(f.slug),
    })),
  );
  const metiersItems: (FicheCardItem & { categorie: string })[] = sortRecommendedFirst(
    metiers.map((m) => ({
      id: m.id, icone: m.icone, nom: m.nom, description: m.description,
      slug: m.slug ?? m.id, recommended: metiersIds.includes(m.id),
      categorie: m.categorie || 'Autres',
    })),
  );
  const paysItems: (FicheCardItem & { zone: string })[] = sortRecommendedFirst(
    pays.map((p) => ({
      id: p.id, icone: p.icone, nom: p.nom, description: null,
      slug: p.slug ?? p.id, recommended: paysIds.includes(p.id),
      zone: p.zone || 'Autres',
    })),
  );

  // Toutes recommandées (Vos fiches)
  const allRecos: { item: FicheCardItem; type: 'profil' | 'metier' | 'pays' }[] = [
    ...profilsItems.filter((i) => i.recommended).map((item) => ({ item, type: 'profil' as const })),
    ...metiersItems.filter((i) => i.recommended).map((item) => ({ item, type: 'metier' as const })),
    ...paysItems.filter((i) => i.recommended).map((item) => ({ item, type: 'pays' as const })),
  ];

  // Catégories métiers
  const metiersCategories = Array.from(
    metiersItems.reduce((acc, m) => {
      const arr = acc.get(m.categorie) ?? [];
      arr.push(m);
      acc.set(m.categorie, arr);
      return acc;
    }, new Map<string, typeof metiersItems>()),
  )
    .map(([key, items]) => {
      const meta = METIER_CATEGORIES[key] ?? METIER_CATEGORIES.Autres;
      return { key, label: meta.label, icon: meta.icon, description: meta.description, items };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  // Zones pays
  const paysZones = Array.from(
    paysItems.reduce((acc, p) => {
      const arr = acc.get(p.zone) ?? [];
      arr.push(p);
      acc.set(p.zone, arr);
      return acc;
    }, new Map<string, typeof paysItems>()),
  )
    .map(([key, items]) => {
      const meta = PAYS_ZONES[key] ?? PAYS_ZONES.Autres;
      return { key, label: meta.label, icon: meta.icon, description: meta.description, items };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const visibleMetiers = selectedMetierCat
    ? metiersItems.filter((m) => m.categorie === selectedMetierCat)
    : [];
  const visiblePays = selectedPaysZone
    ? paysItems.filter((p) => p.zone === selectedPaysZone)
    : [];

  return (
    <div className="space-y-8">
      {/* === 1. VOS FICHES (recommandations) === */}
      <SectionShell
        themeKey="recos"
        icon={Star}
        title="Vos fiches"
        subtitle={
          allRecos.length > 0
            ? `${allRecos.length} fiche${allRecos.length > 1 ? 's' : ''} recommandée${allRecos.length > 1 ? 's' : ''} d'après votre profil.`
            : 'Aucune fiche recommandée pour le moment.'
        }
      >
        {allRecos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allRecos.map(({ item, type }) => (
              <FicheCard key={`${type}-${item.id}`} item={item} type={type} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Mettez à jour votre profil pour obtenir des recommandations ciblées.
          </p>
        )}
      </SectionShell>

      {/* === 2. FICHES PROFILS CONTRIBUABLE === */}
      <SectionShell
        themeKey="profils"
        icon={Users}
        title="Fiches profils contribuable"
        subtitle="Profils types selon votre situation fiscale."
      >
        {profilsItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profilsItems.map((item) => (
              <FicheCard key={item.id} type="profil" item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune fiche profil disponible pour votre plan.</p>
        )}
      </SectionShell>

      {/* === 3. FICHES MÉTIERS — par catégorie === */}
      <SectionShell
        themeKey="metiers"
        icon={Briefcase}
        title="Fiches métiers"
        subtitle="Choisissez une catégorie pour afficher les fiches correspondantes."
      >
        {plan === 'expert' || plan === 'premium' ? (
          metiersCategories.length > 0 ? (
            <>
              <CategoryGrid
                groups={metiersCategories}
                selected={selectedMetierCat}
                onSelect={setSelectedMetierCat}
                themeKey="metiers"
              />
              {selectedMetierCat && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                  {visibleMetiers.map((item) => (
                    <FicheCard key={item.id} type="metier" item={item} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun métier disponible.</p>
          )
        ) : (
          <LockedBlock
            requiredPlan="expert"
            count={metiersIds.length}
            description="Accédez à l'ensemble des fiches métiers, organisées par catégorie, avec le plan Expert."
          />
        )}
      </SectionShell>

      {/* === 4. FICHES PAYS — par zone === */}
      <SectionShell
        themeKey="pays"
        icon={Globe}
        title="Fiches pays"
        subtitle="Choisissez une zone pour afficher les fiches pays correspondantes."
      >
        {plan === 'premium' ? (
          paysZones.length > 0 ? (
            <>
              <CategoryGrid
                groups={paysZones}
                selected={selectedPaysZone}
                onSelect={setSelectedPaysZone}
                themeKey="pays"
              />
              {selectedPaysZone && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                  {visiblePays.map((item) => (
                    <FicheCard key={item.id} type="pays" item={item} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun pays disponible.</p>
          )
        ) : (
          <LockedBlock
            requiredPlan="premium"
            count={paysIds.length}
            description="Accédez à l'ensemble des fiches pays, organisées par zone, avec le plan Premium."
          />
        )}
      </SectionShell>
    </div>
  );
};

export default PersonalizedFiches;
