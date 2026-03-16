import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { BookOpen, ExternalLink, Eye, AlertTriangle } from 'lucide-react';

interface ModuleRow {
  id: string;
  titre: string;
  module_slug: string;
  is_published: boolean;
  order: number;
  total_step: number;
}

interface ProgressionRow {
  module_id: string;
  user_id: string;
  completion_date: string | null;
}

interface ResultRow {
  module_id: string;
  pourcentage: number;
}

interface ContenuRow {
  module_id: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

const AdminModules = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [progressions, setProgressions] = useState<ProgressionRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [contenus, setContenus] = useState<ContenuRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (prof?.role !== 'admin') {
        toast({ title: 'Accès refusé', variant: 'destructive' });
        navigate('/dashboard', { replace: true });
        return;
      }
      setLoading(true);
      const [mRes, pRes, rRes, cRes] = await Promise.all([
        supabase.from('modules').select('id, titre, module_slug, is_published, order, total_step').order('order', { ascending: true }),
        supabase.from('progressions').select('module_id, user_id, completion_date'),
        supabase.from('resultat_quiz').select('module_id, pourcentage'),
        supabase.from('contenus').select('module_id'),
      ]);
      setModules(mRes.data as ModuleRow[] ?? []);
      setProgressions(pRes.data ?? []);
      setResults(rRes.data ?? []);
      setContenus(cRes.data ?? []);
      setLoading(false);
    };
    init();
  }, [user, navigate]);

  // Stats per module
  const moduleStats = useMemo(() => {
    return modules.map((mod) => {
      const modProgs = progressions.filter((p) => p.module_id === mod.id);
      const startedUsers = new Set(modProgs.map((p) => p.user_id)).size;
      const completedUsers = new Set(modProgs.filter((p) => !!p.completion_date).map((p) => p.user_id)).size;
      const rate = startedUsers > 0 ? Math.round((completedUsers / startedUsers) * 100) : 0;

      const modResults = results.filter((r) => r.module_id === mod.id);
      const avgScore = modResults.length > 0
        ? Math.round(modResults.reduce((a, r) => a + Number(r.pourcentage), 0) / modResults.length)
        : null;

      const contenuCount = contenus.filter((c) => c.module_id === mod.id).length;
      const mismatch = contenuCount !== mod.total_step;

      return { ...mod, startedUsers, completedUsers, rate, avgScore, contenuCount, mismatch };
    });
  }, [modules, progressions, results, contenus]);

  const mismatchModules = moduleStats.filter((m) => m.mismatch);

  const handleToggle = async (mod: ModuleRow, checked: boolean) => {
    const { error } = await supabase.from('modules').update({ is_published: checked } as any).eq('id', mod.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setModules((prev) => prev.map((m) => m.id === mod.id ? { ...m, is_published: checked } : m));
      toast({ title: checked ? 'Module publié' : 'Module masqué' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-7 w-7" /> Modules
        </h1>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {moduleStats.map((mod, idx) => (
          <Card key={mod.id} className="border-border bg-background shadow-sm">
            <CardContent className="p-5 space-y-4">
              {/* Title + toggle */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading text-base font-semibold text-foreground leading-snug">
                  <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                  {mod.titre}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{mod.is_published ? 'Publié' : 'Masqué'}</span>
                  <Switch
                    checked={mod.is_published}
                    onCheckedChange={(checked) => handleToggle(mod, checked)}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Commencé par</p>
                  <p className="font-semibold text-foreground">{mod.startedUsers} utilisateur{mod.startedUsers > 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Terminé par</p>
                  <p className="font-semibold text-foreground">{mod.completedUsers} utilisateur{mod.completedUsers > 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Taux complétion</p>
                  <p className="font-semibold text-foreground">{mod.rate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Score moyen quiz</p>
                  <p className="font-semibold text-foreground">{mod.avgScore != null ? `${mod.avgScore}%` : '—'}</p>
                </div>
              </div>

              <Progress value={mod.rate} className="h-2" />

              {/* Mismatch warning */}
              {mod.mismatch && (
                <div className="flex items-center gap-2 rounded-md bg-orange-100 dark:bg-orange-900/30 px-3 py-2 text-xs text-orange-800 dark:text-orange-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>total_step ({mod.total_step}) ≠ contenus réels ({mod.contenuCount})</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1"
                  asChild
                >
                  <a href={`/module/${mod.module_slug}`} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5" /> Prévisualiser
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content mismatch section */}
      {mismatchModules.length > 0 && (
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" /> Contenu manquant
          </h2>
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4 space-y-2">
              {mismatchModules.map((mod) => (
                <div key={mod.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{mod.titre}</span>
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    {mod.contenuCount} contenus / {mod.total_step} étapes déclarées
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
};

export default AdminModules;
