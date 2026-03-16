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
import { BookOpen, Target, Clock, Trophy } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type ModuleRow = Tables<'modules'>;
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

  const [profile, setProfile] = useState<{ prenom: string | null; nom: string | null; plan: string } | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [progressions, setProgressions] = useState<ProgressionRow[]>([]);
  const [results, setResults] = useState<ResultatRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [profRes, modRes, progRes, resRes] = await Promise.all([
      supabase.from('profiles').select('prenom, nom, plan').eq('id', user.id).maybeSingle(),
      supabase.from('modules').select('*').order('order', { ascending: true }),
      supabase.from('progressions').select('*').eq('user_id', user.id),
      supabase.from('resultat_quiz').select('*').eq('user_id', user.id).order('date_quiz', { ascending: false }),
    ]);

    if (profRes.data) setProfile(profRes.data);
    setModules(modRes.data ?? []);
    setProgressions(progRes.data ?? []);
    setResults(resRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, location.key]);

  // Scroll to hash anchor after loading
  useEffect(() => {
    if (!loading && location.hash) {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, location.hash]);

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

  // Module title map for quiz table
  const moduleTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    modules.forEach((mod) => m.set(mod.id, mod.titre));
    return m;
  }, [modules]);

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
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {profile?.prenom ? `Bonjour ${profile.prenom} 👋` : 'Tableau de bord'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Voici où tu en es dans ta formation fiscale.
        </p>
      </div>

      {/* Reprendre block */}
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
            const totalStep = mod.total_step || 1;
            const pct = Math.min(Math.round((latest.step / totalStep) * 100), 100);
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
                      Étape {latest.step} sur {mod.total_step}
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

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

      {/* Modules */}
      <section id="modules">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-5">Mes modules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((mod, idx) => {
            const prog = progMap.get(mod.id);
            const lastQuiz = lastResultMap.get(mod.id);
            const isCompleted = !!prog?.completion_date;
            const step = prog?.step ?? 0;
            const totalStep = mod.total_step || 1;
            const progressPct = isCompleted ? 100 : Math.min(Math.round((step / totalStep) * 100), 100);

            let statusLabel: string;
            let statusColor: string;
            let btnLabel: string;
            let btnVariant: 'default' | 'outline';

            if (isCompleted) {
              statusLabel = 'Terminé ✓';
              statusColor = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
              btnLabel = 'Revoir';
              btnVariant = 'outline';
            } else if (prog) {
              statusLabel = 'En cours';
              statusColor = 'bg-primary/10 text-primary';
              btnLabel = 'Continuer';
              btnVariant = 'default';
            } else {
              statusLabel = 'Non commencé';
              statusColor = 'bg-muted text-muted-foreground';
              btnLabel = 'Commencer';
              btnVariant = 'default';
            }

            return (
              <Card key={mod.id} className="border-border bg-background shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base font-semibold text-foreground leading-snug">
                      <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                      {mod.titre}
                    </h3>
                    <Badge className={`shrink-0 text-xs ${statusColor}`}>
                      {statusLabel}
                    </Badge>
                  </div>

                  <Progress value={progressPct} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {step}/{totalStep} étapes complétées
                  </p>

                  {lastQuiz && (
                    <button
                      className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left"
                      onClick={() => navigate(`/quizz/${mod.module_slug}`)}
                    >
                      🎯 Quiz : <span className="font-semibold text-foreground">{Math.round(Number(lastQuiz.pourcentage))}%</span>
                    </button>
                  )}

                  <Button
                    size="sm"
                    className="w-full"
                    variant={btnVariant}
                    onClick={() => navigate(`/module/${mod.module_slug}`)}
                  >
                    {btnLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

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
