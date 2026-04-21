import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { useAccess } from '@/hooks/useAccess';

type ModuleRow = Tables<'modules'>;
type ProgressionRow = Tables<'progressions'>;
type ResultatRow = Tables<'resultat_quiz'>;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MesModules = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasModuleAccess, isLoading: accessLoading } = useAccess();

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [progressions, setProgressions] = useState<ProgressionRow[]>([]);
  const [results, setResults] = useState<ResultatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const [modRes, progRes, resRes] = await Promise.all([
        supabase.from('modules').select('*').order('order', { ascending: true }),
        supabase.from('progressions').select('*').eq('user_id', user.id),
        supabase.from('resultat_quiz').select('*').eq('user_id', user.id).order('date_quiz', { ascending: false }),
      ]);
      setModules(modRes.data ?? []);
      setProgressions(progRes.data ?? []);
      setResults(resRes.data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const progMap = useMemo(() => {
    const m = new Map<string, ProgressionRow>();
    progressions.forEach((p) => m.set(p.module_id, p));
    return m;
  }, [progressions]);

  const lastResultMap = useMemo(() => {
    const m = new Map<string, ResultatRow>();
    results.forEach((r) => { if (!m.has(r.module_id)) m.set(r.module_id, r); });
    return m;
  }, [results]);

  if (loading || accessLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">📚 Mes modules</h1>
        <p className="mt-1 text-muted-foreground">
          {modules.length} modules disponibles dans ta formation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((mod, idx) => {
          const hasAccess = hasModuleAccess(mod);
          const prog = progMap.get(mod.id);
          const lastQuiz = lastResultMap.get(mod.id);
          const isCompleted = !!prog?.completion_date;
          const step = prog?.step ?? 0;
          const totalStep = mod.total_step || 1;
          const progressPct = isCompleted ? 100 : Math.min(Math.round((step / totalStep) * 100), 100);
          const requiredPlan = mod.accessibilite?.[0] ?? 'starter';

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
            <Card
              key={mod.id}
              className={`relative overflow-hidden border-border bg-background shadow-sm ${!hasAccess ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base font-semibold text-foreground leading-snug">
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                    {mod.titre}
                  </h3>
                  {hasAccess && (
                    <Badge className={`shrink-0 text-xs ${statusColor}`}>
                      {statusLabel}
                    </Badge>
                  )}
                </div>

                {hasAccess && (
                  <>
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
                  </>
                )}

                <Button
                  size="sm"
                  className="w-full"
                  variant={btnVariant}
                  disabled={!hasAccess}
                  onClick={() =>
                    hasAccess
                      ? navigate(`/module/${mod.module_slug}`)
                      : navigate(`/tarifs?recommended=${requiredPlan}&redirected=1`)
                  }
                >
                  {hasAccess ? btnLabel : `Débloquer avec ${capitalize(requiredPlan)}`}
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
    </div>
  );
};

export default MesModules;
