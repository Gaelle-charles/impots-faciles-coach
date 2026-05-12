import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ClipboardList,
  Lock,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  UserCircle2,
  Briefcase,
  Users,
  Coins,
  Globe2,
  Wallet,
  Award,
  Crown,
  MapPin,
  Calculator,
  FileText,
} from 'lucide-react';
import {
  SITUATION_LABELS,
  ACTIVITE_LABELS,
  FORME_JURIDIQUE_LABELS,
  CATEGORIE_METIER_LABELS,
  SITUATION_FAMILIALE_LABELS,
  REVENUS_COMPL_LABELS,
  SITUATION_INTL_LABELS,
  TRANCHE_REVENUS_LABELS,
  getProfilLabel,
  hasAccess,
  PLAN_LABEL,
  PLAN_RANK,
} from '@/lib/onboarding-summary';

const NA = 'Non applicable';
const NR = 'Non renseigné';

interface ProfileRow {
  situation_principale: string | null;
  activite_type: string | null;
  forme_juridique: string | null;
  metier_categorie: string | null;
  metier_id: string | null;
  metier_secondaire_categorie: string | null;
  metier_secondaire_precis: string | null;
  situation_familiale: string | null;
  nb_enfants_charge: number | null;
  personne_handicap: boolean | null;
  aidant_familial: boolean | null;
  pension_alimentaire: boolean | null;
  primo_declarant: boolean | null;
  a_activite_secondaire: boolean | null;
  a_revenus_fonciers_nus: boolean | null;
  a_revenus_lmnp: boolean | null;
  a_placements: boolean | null;
  a_revenus_etrangers: boolean | null;
  a_investissements_defisc: boolean | null;
  situation_internationale: string | null;
  pays_concernes: string[] | null;
  tranche_revenus: string | null;
  score_complexite: number | null;
  plan_recommande: string | null;
  plan: string;
  profils_detectes: string[] | null;
  metiers_detectes: string[] | null;
}

interface FicheProfilRow { id: string; slug: string; nom: string; }
interface MetierRow { id: string; slug: string | null; nom: string; }
interface PaysRow { id: string; slug: string | null; nom: string; }
interface SimulateurRow {
  slug: string; nom: string; description: string; plan_minimum: string;
  highlight_si_placements: boolean; highlight_si_revenus_eleves: boolean;
  highlight_si_revenus_fonciers: boolean; highlight_si_couple: boolean;
  highlight_si_dirigeant: boolean; highlight_si_independant: boolean;
  highlight_si_salarie: boolean;
}

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-baseline gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-foreground text-right max-w-[60%]">{value}</span>
  </div>
);

const ScreenGroup = ({
  step,
  title,
  icon: Icon,
  children,
}: {
  step: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 first:pt-0 border-t border-dashed border-border/60 first:border-0">
    <div className="md:col-span-1 flex md:flex-col items-center md:items-start gap-3 md:gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary/60">{step}</p>
        <h3 className="font-display text-xl text-foreground leading-tight">{title}</h3>
      </div>
    </div>
    <div className="md:col-span-2 space-y-3">{children}</div>
  </div>
);

const LockChip = ({ currentPlan, required }: { currentPlan: string; required: string }) =>
  hasAccess(currentPlan, required) ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Accessible
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      <Lock className="h-3 w-3" /> {PLAN_LABEL[required]}
    </span>
  );

const OnboardingResultats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [metierNom, setMetierNom] = useState<string | null>(null);
  const [paysList, setPaysList] = useState<PaysRow[]>([]);
  const [fichesProfils, setFichesProfils] = useState<FicheProfilRow[]>([]);
  const [metiersMatches, setMetiersMatches] = useState<MetierRow[]>([]);
  const [simulateurs, setSimulateurs] = useState<SimulateurRow[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from('profiles')
        .select(
          'situation_principale, activite_type, forme_juridique, metier_categorie, metier_id, metier_secondaire_categorie, metier_secondaire_precis, situation_familiale, nb_enfants_charge, personne_handicap, aidant_familial, pension_alimentaire, primo_declarant, a_activite_secondaire, a_revenus_fonciers_nus, a_revenus_lmnp, a_placements, a_revenus_etrangers, a_investissements_defisc, situation_internationale, pays_concernes, tranche_revenus, score_complexite, plan_recommande, plan, profils_detectes, metiers_detectes'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled || !prof) { setLoading(false); return; }
      setProfile(prof as ProfileRow);

      const tasks: PromiseLike<unknown>[] = [];

      if (prof.metier_id) {
        tasks.push(
          supabase.from('metiers').select('nom').eq('id', prof.metier_id).maybeSingle()
            .then(({ data }) => { if (!cancelled) setMetierNom(data?.nom ?? null); })
        );
      }

      const paysIds = (prof.pays_concernes ?? []) as string[];
      if (paysIds.length > 0) {
        tasks.push(
          supabase.from('pays').select('id, slug, nom').in('id', paysIds)
            .then(({ data }) => { if (!cancelled) setPaysList((data as PaysRow[]) ?? []); })
        );
      }

      const profilSlugs = (prof.profils_detectes ?? []) as string[];
      if (profilSlugs.length > 0) {
        tasks.push(
          supabase.from('fiches_profils').select('id, slug, nom').in('slug', profilSlugs).eq('is_active', true)
            .then(({ data }) => { if (!cancelled) setFichesProfils((data as FicheProfilRow[]) ?? []); })
        );
      }

      const metierIds = (prof.metiers_detectes ?? []) as string[];
      if (metierIds.length > 0) {
        tasks.push(
          supabase.from('metiers').select('id, slug, nom').in('id', metierIds)
            .then(({ data }) => { if (!cancelled) setMetiersMatches((data as MetierRow[]) ?? []); })
        );
      }

      tasks.push(
        supabase.from('simulateurs').select('slug, nom, description, plan_minimum, highlight_si_placements, highlight_si_revenus_eleves, highlight_si_revenus_fonciers, highlight_si_couple, highlight_si_dirigeant, highlight_si_independant, highlight_si_salarie').eq('is_active', true).order('ordre')
          .then(({ data }) => { if (!cancelled) setSimulateurs((data as SimulateurRow[]) ?? []); })
      );

      await Promise.all(tasks);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !profile) {
    return (
      <div className="space-y-8 max-w-5xl">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-3xl" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  const p = profile;
  const needsActivity = p.situation_principale === 'independant' || p.situation_principale === 'dirigeant';
  const needsIntl = p.a_revenus_etrangers === true || !!p.situation_internationale;

  const profilLabel = getProfilLabel(p, metierNom ?? undefined, paysList.map((x) => x.nom));

  const recommended = p.plan_recommande ?? 'starter';
  const current = p.plan ?? 'nouveau';
  const planMatches = (PLAN_RANK[current] ?? 0) >= (PLAN_RANK[recommended] ?? 0);

  const adaptedSims = simulateurs.filter((s) => {
    if (s.highlight_si_placements && p.a_placements) return true;
    if (s.highlight_si_revenus_fonciers && (p.a_revenus_fonciers_nus || p.a_revenus_lmnp)) return true;
    if (s.highlight_si_revenus_eleves && (p.tranche_revenus === '80k_150k' || p.tranche_revenus === 'plus_150k')) return true;
    if (s.highlight_si_couple && p.situation_familiale === 'couple') return true;
    if (s.highlight_si_dirigeant && p.situation_principale === 'dirigeant') return true;
    if (s.highlight_si_independant && p.situation_principale === 'independant') return true;
    if (s.highlight_si_salarie && p.situation_principale === 'salarie') return true;
    return false;
  });

  const sitPart: string[] = [];
  if (p.personne_handicap) sitPart.push('Personne en situation de handicap');
  if (p.aidant_familial) sitPart.push('Aidant familial');
  if (p.pension_alimentaire) sitPart.push('Pension alimentaire versée/perçue');
  if (p.primo_declarant) sitPart.push('Primo-déclarant');

  const revenusCoches = REVENUS_COMPL_LABELS.filter(
    (r) => (p as unknown as Record<string, boolean | null>)[r.key] === true
  );

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-2">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-foreground leading-[1.1]">
            Mes <em className="accent-serif">réponses</em> d'onboarding
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
            Ces informations personnalisent votre expérience Impôts Facile et définissent les outils que nous mettons en avant pour vous.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/profil')}>
            <ArrowLeft className="h-4 w-4" /> Retour au profil
          </Button>
          <Button size="sm" className="gap-2" onClick={() => navigate('/onboarding?edit=1')}>
            <ClipboardList className="h-4 w-4" /> Modifier mes réponses
          </Button>
        </div>
      </header>

      {/* Section 1 — Réponses */}
      <section className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 py-5 bg-muted/40 border-b border-border flex justify-between items-center flex-wrap gap-3">
          <h2 className="font-heading font-bold text-primary flex items-center gap-2 text-base">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px]">01</span>
            Récapitulatif des étapes
          </h2>
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">7 écrans complétés</span>
        </div>
        <div className="p-6 sm:p-8 space-y-8">
          <ScreenGroup step="Écran 1" title="Situation principale" icon={UserCircle2}>
            <Field label="Situation" value={SITUATION_LABELS[p.situation_principale ?? ''] ?? NR} />
          </ScreenGroup>

          <ScreenGroup step="Écran 2" title="Précision activité" icon={Briefcase}>
            {needsActivity ? (
              <>
                <Field label="Nature de l'activité" value={ACTIVITE_LABELS[p.activite_type ?? ''] ?? NR} />
                <Field
                  label="Forme juridique"
                  value={p.situation_principale === 'dirigeant'
                    ? (FORME_JURIDIQUE_LABELS[p.forme_juridique ?? ''] ?? NR)
                    : NA}
                />
              </>
            ) : (
              <Field label="Statut" value={NA} />
            )}
          </ScreenGroup>

          <ScreenGroup step="Écran 3" title="Métier" icon={Award}>
            <Field label="Catégorie" value={CATEGORIE_METIER_LABELS[p.metier_categorie ?? ''] ?? NR} />
            <Field label="Métier précis" value={metierNom ?? NR} />
            <Field
              label="Second métier — catégorie"
              value={p.metier_secondaire_categorie
                ? (CATEGORIE_METIER_LABELS[p.metier_secondaire_categorie] ?? p.metier_secondaire_categorie)
                : NR}
            />
            <Field label="Second métier — précis" value={p.metier_secondaire_precis ?? NR} />
          </ScreenGroup>

          <ScreenGroup step="Écran 4" title="Situation familiale" icon={Users}>
            <Field label="Situation" value={SITUATION_FAMILIALE_LABELS[p.situation_familiale ?? ''] ?? NR} />
            <Field
              label="Enfants à charge"
              value={(p.nb_enfants_charge ?? 0) > 0 ? `Oui — ${p.nb_enfants_charge}` : 'Non'}
            />
            <Field label="Situations particulières" value={sitPart.length > 0 ? sitPart.join(', ') : 'Aucune'} />
          </ScreenGroup>

          <ScreenGroup step="Écran 5" title="Revenus complémentaires" icon={Coins}>
            {revenusCoches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {revenusCoches.map((r) => (
                  <span key={r.key} className="inline-flex items-center gap-1 rounded-full bg-primary/5 border border-primary/15 px-3 py-1 text-xs font-medium text-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {r.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun revenu complémentaire</p>
            )}
          </ScreenGroup>

          <ScreenGroup step="Écran 6" title="Situation internationale" icon={Globe2}>
            {needsIntl ? (
              <>
                <Field label="Statut" value={SITUATION_INTL_LABELS[p.situation_internationale ?? ''] ?? NR} />
                <Field
                  label="Pays concernés"
                  value={p.situation_internationale === 'drom'
                    ? NA
                    : (paysList.length > 0 ? paysList.map((x) => x.nom).join(', ') : NR)}
                />
              </>
            ) : (
              <Field label="Statut" value={NA} />
            )}
          </ScreenGroup>

          <ScreenGroup step="Écran 7" title="Tranche de revenus" icon={Wallet}>
            <Field label="Tranche" value={TRANCHE_REVENUS_LABELS[p.tranche_revenus ?? ''] ?? NR} />
          </ScreenGroup>
        </div>
      </section>

      {/* Section 2 + 3 — Profil détecté & Plan recommandé */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profil détecté */}
        <section className="relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-xl">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5 blur-3xl" aria-hidden />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-yellow-vivid/10 blur-2xl" aria-hidden />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-vivid text-violet-deep">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-base font-semibold tracking-wide">Profil fiscal détecté</h2>
            </div>
            <p className="font-display text-3xl leading-snug mb-3">{profilLabel}</p>
            {p.score_complexite != null && (
              <div className="mt-auto pt-4 inline-flex items-center self-start gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
                <span className="opacity-70">Score de complexité</span>
                <span className="font-bold">{p.score_complexite}</span>
              </div>
            )}
          </div>
        </section>

        {/* Plan recommandé */}
        <section className="relative bg-background rounded-3xl border-2 border-yellow-vivid p-8 shadow-lg">
          <div className="absolute -top-3 left-8 px-3 py-1 bg-yellow-vivid text-violet-deep text-[10px] font-black uppercase tracking-widest rounded">
            {planMatches ? 'Votre plan' : 'Recommandé pour vous'}
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-base font-semibold text-foreground">Plan recommandé</h2>
          </div>
          <p className="font-display text-3xl text-primary mb-2">{PLAN_LABEL[recommended] ?? recommended}</p>
          <p className="text-sm text-muted-foreground mb-5">
            Plan actuel :{' '}
            <span className="font-semibold text-foreground">{PLAN_LABEL[current] ?? current}</span>
          </p>

          {planMatches ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Votre plan actuel correspond parfaitement à votre profil.
            </div>
          ) : (
            <Button className="w-full gap-2" onClick={() => navigate('/tarifs')}>
              Découvrir les plans <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </section>
      </div>

      {/* Section 4 — Personnalisation */}
      <section className="bg-background rounded-3xl border border-border shadow-sm p-6 sm:p-8 space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/60 mb-1">Section 04</p>
            <h2 className="font-display text-3xl text-foreground">Votre personnalisation</h2>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Contenus adaptés à votre profil
          </p>
        </div>

        {/* Fiches profils */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">Fiches profils</h3>
          </div>
          {fichesProfils.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune fiche profil matchée pour votre situation.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {fichesProfils.map((f) => {
                const access = hasAccess(current, 'expert');
                return (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                      access ? 'border-primary/15 bg-primary/5 hover:bg-primary/10' : 'border-border bg-muted/30'
                    }`}
                  >
                    {access ? (
                      <Link to={`/fiches/profil/${f.slug}`} className="text-sm font-semibold text-foreground hover:text-primary inline-flex items-center gap-1">
                        {f.nom} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-foreground">{f.nom}</span>
                    )}
                    <LockChip currentPlan={current} required="expert" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fiches métiers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">Fiches métiers</h3>
          </div>
          {metiersMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune fiche métier matchée.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {metiersMatches.map((m) => {
                const access = hasAccess(current, 'expert');
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                      access ? 'border-primary/15 bg-primary/5 hover:bg-primary/10' : 'border-border bg-muted/30'
                    }`}
                  >
                    {access ? (
                      <Link to={`/fiche-metier/${m.id}`} className="text-sm font-semibold text-foreground hover:text-primary inline-flex items-center gap-1">
                        {m.nom} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-foreground">{m.nom}</span>
                    )}
                    <LockChip currentPlan={current} required="expert" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pays */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">Fiches pays</h3>
          </div>
          {paysList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun pays renseigné.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {paysList.map((py) => (
                <div key={py.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-4">
                  <span className="text-sm font-semibold text-foreground">{py.nom}</span>
                  <LockChip currentPlan={current} required="premium" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Simulateurs */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">Simulateurs adaptés</h3>
          </div>
          {adaptedSims.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun simulateur particulièrement mis en avant pour votre profil.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {adaptedSims.map((s) => {
                const access = hasAccess(current, s.plan_minimum);
                return (
                  <div
                    key={s.slug}
                    className={`flex flex-col gap-2 rounded-2xl border p-4 transition-colors ${
                      access ? 'border-primary/15 bg-primary/5 hover:bg-primary/10' : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {access ? (
                        <Link to={`/simulateur/${s.slug}`} className="text-sm font-semibold text-foreground hover:text-primary inline-flex items-center gap-1">
                          {s.nom} <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-foreground">{s.nom}</span>
                      )}
                      <LockChip currentPlan={current} required={s.plan_minimum} />
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default OnboardingResultats;
