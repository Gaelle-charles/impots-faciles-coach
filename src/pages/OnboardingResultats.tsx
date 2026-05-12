import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ClipboardList, Lock, CheckCircle2, ExternalLink } from 'lucide-react';
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

const Row = ({ q, a }: { q: string; a: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2">
    <dt className="text-sm text-muted-foreground">{q}</dt>
    <dd className="sm:col-span-2 text-sm text-foreground">{a}</dd>
  </div>
);

const LockBadge = ({ currentPlan, required }: { currentPlan: string; required: string }) =>
  hasAccess(currentPlan, required) ? (
    <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Accessible</Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Lock className="h-3 w-3" />Débloquer avec {PLAN_LABEL[required]}
    </Badge>
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

      // Lookups en parallèle
      const tasks: Promise<unknown>[] = [];

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
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  const p = profile;
  const needsActivity = p.situation_principale === 'independant' || p.situation_principale === 'dirigeant';
  const needsIntl = p.a_revenus_etrangers === true || !!p.situation_internationale;

  // Profil détecté label
  const profilLabel = getProfilLabel(p, metierNom ?? undefined, paysList.map((x) => x.nom));

  // Plan reco
  const recommended = p.plan_recommande ?? 'starter';
  const current = p.plan ?? 'nouveau';
  const planMatches = (PLAN_RANK[current] ?? 0) >= (PLAN_RANK[recommended] ?? 0);

  // Simulateurs adaptés (highlights matchés)
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

  // Situations particulières (écran 4)
  const sitPart: string[] = [];
  if (p.personne_handicap) sitPart.push('Personne en situation de handicap');
  if (p.aidant_familial) sitPart.push('Aidant familial');
  if (p.pension_alimentaire) sitPart.push('Pension alimentaire versée/perçue');
  if (p.primo_declarant) sitPart.push('Primo-déclarant');

  // Revenus complémentaires (écran 5)
  const revenusCoches = REVENUS_COMPL_LABELS.filter(
    (r) => (p as unknown as Record<string, boolean | null>)[r.key] === true
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight">
            Mes <em className="accent-serif">réponses</em> d'onboarding
          </h1>
          <p className="mt-2 lg:mt-3 text-xs sm:text-sm lg:text-lg text-muted-foreground">
            Ces informations personnalisent votre expérience Impôts Facile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/profil')}>
            <ArrowLeft className="h-4 w-4" /> Retour à mon profil
          </Button>
          <Button size="sm" className="gap-2" onClick={() => navigate('/onboarding?edit=1')}>
            <ClipboardList className="h-4 w-4" /> Modifier mes réponses
          </Button>
        </div>
      </div>

      {/* Section 1 — Mes réponses */}
      <Card className="border-border bg-background rounded-3xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">Mes réponses (7 écrans)</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {/* Écran 1 */}
            <div className="py-3">
              <p className="font-heading text-sm font-semibold text-foreground mb-1">Écran 1 — Situation principale</p>
              <Row q="Situation" a={SITUATION_LABELS[p.situation_principale ?? ''] ?? NR} />
            </div>

            {/* Écran 2 */}
            <div className="py-3">
              <p className="font-heading text-sm font-semibold text-foreground mb-1">Écran 2 — Précision activité</p>
              {needsActivity ? (
                <>
                  <Row q="Nature de l'activité" a={ACTIVITE_LABELS[p.activite_type ?? ''] ?? NR} />
                  <Row
                    q="Forme juridique"
                    a={p.situation_principale === 'dirigeant'
                      ? (FORME_JURIDIQUE_LABELS[p.forme_juridique ?? ''] ?? NR)
                      : NA}
                  />
                </>
              ) : (
                <Row q="Statut" a={NA} />
              )}
            </div>

            {/* Écran 3 */}
            <div className="py-3">
              <p className="font-heading text-sm font-semibold text-foreground mb-1">Écran 3 — Métier</p>
              <Row q="Catégorie" a={CATEGORIE_METIER_LABELS[p.metier_categorie ?? ''] ?? NR} />
              <Row q="Métier précis" a={metierNom ?? NR} />
              <Row
                q="Second métier — catégorie"
                a={p.metier_secondaire_categorie
                  ? (CATEGORIE_METIER_LABELS[p.metier_secondaire_categorie] ?? p.metier_secondaire_categorie)
                  : NR}
              />
              <Row q="Second métier — précis" a={p.metier_secondaire_precis ?? NR} />
            </div>

            {/* Écran 4 */}
            <div className="py-3">
              <p className="font-heading text-sm font-semibold text-foreground mb-1">Écran 4 — Situation familiale</p>
              <Row q="Situation" a={SITUATION_FAMILIALE_LABELS[p.situation_familiale ?? ''] ?? NR} />
              <Row
                q="Enfants à charge"
                a={(p.nb_enfants_charge ?? 0) > 0 ? `Oui — ${p.nb_enfants_charge}` : 'Non'}
              />
              <Row q="Situations particulières" a={sitPart.length > 0 ? sitPart.join(', ') : 'Aucune'} />
            </div>

            {/* Écran 5 */}
            <div className="py-3">
              <p className="font-heading text-sm font-semibold text-foreground mb-1">Écran 5 — Revenus complémentaires</p>
              {revenusCoches.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
                  {revenusCoches.map((r) => <li key={r.key}>{r.label}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun revenu complémentaire</p>
              )}
            </div>

            {/* Écran 6 */}
            <div className="py-3">
              <p className="font-heading text-sm font-semibold text-foreground mb-1">Écran 6 — Situation internationale</p>
              {needsIntl ? (
                <>
                  <Row q="Statut" a={SITUATION_INTL_LABELS[p.situation_internationale ?? ''] ?? NR} />
                  <Row
                    q="Pays concernés"
                    a={p.situation_internationale === 'drom'
                      ? NA
                      : (paysList.length > 0 ? paysList.map((x) => x.nom).join(', ') : NR)}
                  />
                </>
              ) : (
                <Row q="Statut" a={NA} />
              )}
            </div>

            {/* Écran 7 */}
            <div className="py-3">
              <p className="font-heading text-sm font-semibold text-foreground mb-1">Écran 7 — Tranche de revenus</p>
              <Row q="Tranche" a={TRANCHE_REVENUS_LABELS[p.tranche_revenus ?? ''] ?? NR} />
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Section 2 — Profil détecté */}
      <Card className="border-border bg-background rounded-3xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">Mon profil fiscal détecté</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-base text-foreground">{profilLabel}</p>
          {p.score_complexite != null && (
            <p className="text-xs text-muted-foreground">Score de complexité : {p.score_complexite}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Plan recommandé */}
      <Card className="border-border bg-background rounded-3xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">Mon plan recommandé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">Recommandé :</span>
            <Badge>{PLAN_LABEL[recommended] ?? recommended}</Badge>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-muted-foreground">Actuel :</span>
            <Badge variant="secondary">{PLAN_LABEL[current] ?? current}</Badge>
          </div>
          {planMatches ? (
            <p className="text-sm text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Votre plan actuel correspond à votre profil.
            </p>
          ) : (
            <>
              <p className="text-sm text-foreground">
                Vous pourriez bénéficier du plan <strong>{PLAN_LABEL[recommended]}</strong> pour
                accéder à plus de fiches et de simulateurs adaptés à votre situation.
              </p>
              <Button size="sm" variant="outline" onClick={() => navigate('/tarifs')}>
                Voir les plans
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Personnalisation */}
      <Card className="border-border bg-background rounded-3xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">Ma personnalisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fiches profils */}
          <div>
            <p className="font-heading text-sm font-semibold text-foreground mb-2">Fiches profils matchées</p>
            {fichesProfils.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune fiche profil matchée pour votre situation.</p>
            ) : (
              <ul className="space-y-2">
                {fichesProfils.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 flex-wrap">
                    {hasAccess(current, 'expert') ? (
                      <Link to={`/fiches/profil/${f.slug}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                        {f.nom} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-sm text-foreground">{f.nom}</span>
                    )}
                    <LockBadge currentPlan={current} required="expert" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Fiches métiers */}
          <div>
            <p className="font-heading text-sm font-semibold text-foreground mb-2">Fiches métiers matchées</p>
            {metiersMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune fiche métier matchée.</p>
            ) : (
              <ul className="space-y-2">
                {metiersMatches.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 flex-wrap">
                    {hasAccess(current, 'expert') ? (
                      <Link to={`/fiche-metier/${m.id}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                        {m.nom} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-sm text-foreground">{m.nom}</span>
                    )}
                    <LockBadge currentPlan={current} required="expert" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Pays */}
          <div>
            <p className="font-heading text-sm font-semibold text-foreground mb-2">Fiches pays matchées</p>
            {paysList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun pays renseigné.</p>
            ) : (
              <ul className="space-y-2">
                {paysList.map((py) => (
                  <li key={py.id} className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm text-foreground">{py.nom}</span>
                    <LockBadge currentPlan={current} required="premium" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Simulateurs */}
          <div>
            <p className="font-heading text-sm font-semibold text-foreground mb-2">Simulateurs adaptés à votre profil</p>
            {adaptedSims.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun simulateur particulièrement mis en avant pour votre profil.</p>
            ) : (
              <ul className="space-y-2">
                {adaptedSims.map((s) => (
                  <li key={s.slug} className="flex items-center justify-between gap-3 flex-wrap">
                    {hasAccess(current, s.plan_minimum) ? (
                      <Link to={`/simulateur/${s.slug}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                        {s.nom} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-sm text-foreground">{s.nom}</span>
                    )}
                    <LockBadge currentPlan={current} required={s.plan_minimum} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingResultats;
