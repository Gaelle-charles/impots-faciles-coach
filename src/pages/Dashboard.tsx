import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookOpen, Target, Clock, Trophy, Lock, Award, Download, Sparkles } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { useAccess } from '@/hooks/useAccess';
import PersonalizedFiches from '@/components/dashboard/PersonalizedFiches';
import { downloadCertificatPdf, type CertificatData } from '@/lib/certificat-pdf';



type ModuleRow = Tables<'modules'> & { nb_steps_total: number };
type ProgressionRow = Tables<'progressions'>;
type ResultatRow = Tables<'resultat_quiz'>;

function getLevel(avgScore: number) {
  if (avgScore >= 80) return 'Expert';
  if (avgScore >= 50) return 'Intermédiaire';
  return 'Débutant';
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasModuleAccess, isLoading: accessLoading, isOrgAdminPreview, role } = useAccess();
  const isAdmin = role === 'admin';
  const bypassSequential = isAdmin || isOrgAdminPreview;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const [profile, setProfile] = useState<any>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [progressions, setProgressions] = useState<ProgressionRow[]>([]);
  const [results, setResults] = useState<ResultatRow[]>([]);
  const [certificat, setCertificat] = useState<CertificatData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [profRes, modRes, progRes, resRes, certRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      (supabase as any).from('modules_with_counts').select('*').order('order', { ascending: true }),
      supabase.from('progressions').select('*').eq('user_id', user.id),
      supabase.from('resultat_quiz').select('*').eq('user_id', user.id).order('date_quiz', { ascending: false }),
      supabase.from('certificats_parcours')
        .select('numero, prenom, nom, plan, nb_modules_valides, date_obtention')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (profRes.data) setProfile(profRes.data);
    setModules(modRes.data ?? []);
    setProgressions(progRes.data ?? []);
    setResults(resRes.data ?? []);
    setCertificat((certRes.data as CertificatData | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, location.key]);



  // Refresh data when user returns to this tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  

  // Maps for quick lookup
  const progMap = useMemo(() => {
    const m = new Map<string, ProgressionRow>();
    progressions.forEach((p) => m.set(p.module_id, p));
    return m;
  }, [progressions]);

  const lastResultMap = useMemo(() => {
    const m = new Map<string, ResultatRow>();
    // results already sorted desc, so first per module wins
    results.forEach((r) => { if (!m.has(r.module_id)) m.set(r.module_id, r); });
    return m;
  }, [results]);

  // Best score par module (pour badge "Module validé" ≥ 70%)
  const bestScoreMap = useMemo(() => {
    const m = new Map<string, number>();
    results.forEach((r) => {
      const pct = Math.round(Number(r.pourcentage));
      const prev = m.get(r.module_id) ?? 0;
      if (pct > prev) m.set(r.module_id, pct);
    });
    return m;
  }, [results]);

  // Module title map for quiz table
  const moduleTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    modules.forEach((mod) => m.set(mod.id, mod.titre));
    return m;
  }, [modules]);

  // Modules visibles : on n'affiche que les modules terminés + le prochain à débloquer.
  // Les admins et le mode aperçu admin orga voient tous les modules.
  const visibleModules = useMemo(() => {
    if (bypassSequential) return modules;
    const result: ModuleRow[] = [];
    let nextShown = false;
    for (const mod of modules) {
      if (!hasModuleAccess(mod)) continue;
      const isCompleted = !!progMap.get(mod.id)?.completion_date;
      if (isCompleted) {
        result.push(mod);
      } else if (!nextShown) {
        result.push(mod);
        nextShown = true;
      }
    }
    return result;
  }, [modules, progMap, hasModuleAccess, bypassSequential]);

  // Stats
  const completedCount = progressions.filter((p) => !!p.completion_date).length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((acc, r) => acc + Number(r.pourcentage), 0) / results.length)
    : 0;
  const remainingModules = modules.length - completedCount;
  const estimatedHours = remainingModules * 2;

  const stats = [
    { label: 'Modules complétés', value: `${completedCount}/${modules.length}`, icon: BookOpen },
    { label: 'Score moyen', value: results.length > 0 ? `${avgScore}%` : '—', icon: Target },
    { label: 'Temps estimé restant', value: `${estimatedHours}h`, icon: Clock },
    { label: 'Niveau actuel', value: results.length > 0 ? getLevel(avgScore) : 'Débutant', icon: Trophy },
  ];

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-2 h-5 w-80" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div>
          <Skeleton className="h-7 w-40 mb-5" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground">
          {profile?.prenom ? <>Bonjour <em className="accent-serif">{profile.prenom}</em></> : 'Accueil'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Voici où tu en es dans ta formation sur les impôts.
        </p>
      </div>

      {/* Passeport Fiscal Premium → désormais sur sa propre page /passeport-fiscal */}

      {(() => {
        const inProgress = progressions.filter((p) => !p.completion_date);
        const allCompleted = modules.length > 0 && completedCount >= modules.length;

        if (modules.length === 0) return null;

        // CAS 3: Tous terminés
        if (allCompleted) {
          return (
            <Card className="border-border bg-background shadow-sm">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <span className="text-5xl">🏆</span>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Félicitations ! Tu as tout complété.
                </h2>
                <Button onClick={() => navigate('/simulateur')} className="gap-2">
                  🧮 Essaie le simulateur →
                </Button>
              </CardContent>
            </Card>
          );
        }

        // CAS 2: Module(s) en cours
        if (inProgress.length > 0) {
          const latest = inProgress[0]; // already sorted or pick first
          const mod = modules.find((m) => m.id === latest.module_id);
          if (mod) {
            const totalStep = mod.nb_steps_total || 0;
            const safeStep = Math.min(latest.step, totalStep);
            const pct = totalStep > 0 ? Math.min(Math.round((safeStep / totalStep) * 100), 100) : 0;
            return (
              <Card className="border-border bg-secondary shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-heading text-lg font-bold text-foreground">
                    Reprends là où tu t'es arrêté 👇
                  </h2>
                  <div className="rounded-lg bg-background p-4 space-y-3">
                    <h3 className="font-heading text-base font-semibold text-foreground">{mod.titre}</h3>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Étape {safeStep} sur {totalStep}
                    </p>
                  </div>
                  <Button onClick={() => navigate(`/module/${mod.module_slug}`)} className="gap-2">
                    ▶️ Continuer →
                  </Button>
                </CardContent>
              </Card>
            );
          }
        }

        // CAS 1: Aucun module commencé
        const firstMod = modules[0];
        return (
          <div className="rounded-xl bg-gradient-to-r from-[hsl(263,70%,58%)] to-[hsl(234,68%,52%)] p-6 text-white shadow-md">
            <h2 className="font-heading text-xl font-bold">Prêt à comprendre ta déclaration ?</h2>
            <p className="mt-1 text-sm text-white/80">
              Commence par le Module 1 — environ 15 minutes suffisent.
            </p>
            <Button
              className="mt-4 bg-white text-primary hover:bg-white/90 font-heading font-bold"
              onClick={() => navigate(`/module/${firstMod.module_slug}`)}
            >
              📚 Commencer le Module 1 →
            </Button>
          </div>
        );
      })()}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border bg-background shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-heading text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modules list with access control */}
      <section id="modules">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-5">Mon parcours déclaration</h2>
        {accessLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <p className="text-muted-foreground">Aucun module disponible.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleModules.map((mod) => {
              const hasAccess = hasModuleAccess(mod);
              const prog = progMap.get(mod.id);
              const totalStep = mod.nb_steps_total ?? 0;
              const isEmpty = totalStep === 0;
              const safeStep = prog ? Math.min(prog.step, totalStep) : 0;
              const pct = isEmpty ? 0 : prog ? Math.min(Math.round((safeStep / totalStep) * 100), 100) : 0;
              const isCompleted = !!prog?.completion_date;
              const requiredPlan = mod.accessibilite?.[0] ?? 'starter';

              return (
                <Card key={mod.id} className="relative overflow-hidden border-border bg-background shadow-sm">
                  <CardContent className={`p-5 space-y-3 ${!hasAccess ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-base font-semibold text-foreground">{mod.titre}</h3>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {hasAccess && (bestScoreMap.get(mod.id) ?? 0) >= 70 && (
                          <Badge className="bg-green-600 text-white hover:bg-green-700 gap-1 text-xs">
                            ✓ Module validé
                          </Badge>
                        )}
                        {isCompleted && hasAccess && (bestScoreMap.get(mod.id) ?? 0) < 70 && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Terminé
                          </Badge>
                        )}
                        {isEmpty && hasAccess && (
                          <Badge className="bg-muted text-muted-foreground">En préparation</Badge>
                        )}
                      </div>
                    </div>
                    {hasAccess && !isEmpty && (
                      <>
                        <Progress value={pct} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Étape {safeStep} sur {totalStep}
                        </p>
                      </>
                    )}
                    {hasAccess && isEmpty && (
                      <p className="text-xs text-muted-foreground italic">
                        Contenu en préparation, disponible bientôt.
                      </p>
                    )}
                    <Button
                      onClick={() =>
                        hasAccess && !isEmpty
                          ? navigate(`/module/${mod.module_slug}`)
                          : !hasAccess
                            ? navigate(`/tarifs?recommended=${requiredPlan}&redirected=1`)
                            : undefined
                      }
                      disabled={!hasAccess || isEmpty}
                      title={hasAccess && isEmpty ? 'Contenu en préparation' : undefined}
                      className="w-full"
                    >
                      {!hasAccess
                        ? `Débloquer avec ${capitalize(requiredPlan)}`
                        : isEmpty
                          ? 'Contenu en préparation'
                          : isCompleted
                            ? 'Revoir'
                            : prog
                              ? 'Continuer'
                              : 'Commencer'}
                    </Button>
                  </CardContent>
                  {!hasAccess && (
                    <button
                      type="button"
                      onClick={() => navigate(`/tarifs?recommended=${requiredPlan}&redirected=1`)}
                      aria-label={`Débloquer avec ${capitalize(requiredPlan)}`}
                      className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] transition-colors hover:bg-background/30"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/80 shadow-lg">
                        <Lock className="h-6 w-6 text-background" />
                      </span>
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Fiches personnalisées déplacées vers /mes-modules (onglet) */}

      {/* Certificat de parcours (si tous les modules sont validés) */}
      {certificat && (
        <section id="certificat">
          <Card className="border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-950/20 dark:to-yellow-950/10 shadow-md overflow-hidden">
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <Award className="h-7 w-7" />
              </div>
              <div className="flex-1 space-y-1">
                <Badge className="bg-green-600 text-white">🏆 Parcours validé</Badge>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Certificat Impôts Facile débloqué !
                </h3>
                <p className="text-sm text-muted-foreground">
                  Bravo, tu as validé l'intégralité du parcours ({certificat.nb_modules_valides} modules).
                  N° <span className="font-mono">{certificat.numero}</span>
                </p>
                <p className="text-xs text-muted-foreground italic mt-1">
                  💎 Module 8 disponible en bonus pour découvrir nos fiches Premium.
                </p>
              </div>
              <Button
                onClick={() => downloadCertificatPdf(certificat)}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white shrink-0"
              >
                <Download className="h-4 w-4" /> Télécharger le PDF
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Bonus Module 8 — affiché uniquement si certificat obtenu */}
      {certificat && (
        <section id="bonus-module-8">
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/10 shadow-sm overflow-hidden">
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="flex-1 space-y-1">
                <Badge className="bg-primary text-primary-foreground">✨ Bonus disponible</Badge>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Bonus disponible
                </h3>
                <p className="text-sm text-muted-foreground">
                  Vous avez obtenu votre certificat ! Le Module 8 « Profils de contribuables et stratégies personnalisées » reste accessible pour découvrir nos fiches profils et stratégies personnalisées.
                </p>
              </div>
              <Button
                onClick={() => navigate('/module/module-8-profils-de-contribuables-et-strategies-personnalisees')}
                className="gap-2 shrink-0"
              >
                <Sparkles className="h-4 w-4" /> Découvrir le Module 8
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quiz results */}
      <section id="resultats">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-5">Mes quiz</h2>
        {results.length === 0 ? (
          <p className="text-muted-foreground">Aucun quiz passé pour le moment.</p>
        ) : (
          <Card className="border-border bg-background shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.slice(0, 5).map((r) => {
                  const pct = Math.round(Number(r.pourcentage));
                  const status = pct >= 70 ? 'Réussi' : pct >= 50 ? 'À améliorer' : 'Échoué';
                  const statusColor = pct >= 70
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : pct >= 50
                      ? 'bg-primary/10 text-primary'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">
                        {moduleTitleMap.get(r.module_id) ?? 'Module inconnu'}
                      </TableCell>
                      <TableCell className="text-center font-heading font-bold text-primary">{pct}%</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {new Date(r.date_quiz).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColor}>{status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
