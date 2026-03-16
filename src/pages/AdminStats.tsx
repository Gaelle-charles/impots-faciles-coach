import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Users, BookOpen, Target, Activity, Award, Clock, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const COLORS = ['hsl(285, 52%, 15%)', 'hsl(336, 70%, 62%)', 'hsl(56, 100%, 49%)', 'hsl(200, 70%, 50%)', 'hsl(150, 60%, 45%)'];

const AdminStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [progressions, setProgressions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const [pRes, prRes, rRes, mRes] = await Promise.all([
        supabase.from('profiles').select('id, plan, created_at, is_active, role'),
        supabase.from('progressions').select('user_id, module_id, step, completion_date, created_at'),
        supabase.from('resultat_quiz').select('user_id, module_id, pourcentage, score, score_max, date_quiz'),
        supabase.from('modules').select('id, titre, order, total_step').order('order', { ascending: true }),
      ]);
      setProfiles(pRes.data ?? []);
      setProgressions(prRes.data ?? []);
      setResults(rRes.data ?? []);
      setModules(mRes.data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  // ─── Derived stats ───
  const totalUsers = profiles.filter(p => p.role !== 'admin').length;
  const activeUsers7d = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    return new Set(progressions.filter(p => p.created_at > cutoff).map(p => p.user_id)).size;
  }, [progressions]);

  const avgScore = useMemo(() => {
    if (!results.length) return 0;
    return Math.round(results.reduce((a, r) => a + Number(r.pourcentage), 0) / results.length);
  }, [results]);

  const completionRate = useMemo(() => {
    if (!progressions.length) return 0;
    const completed = progressions.filter(p => p.completion_date).length;
    return Math.round((completed / progressions.length) * 100);
  }, [progressions]);

  // Plan distribution
  const planDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.filter(p => p.role !== 'admin').forEach(p => {
      map[p.plan] = (map[p.plan] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [profiles]);

  // Daily signups last 30 days
  const dailySignups = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = profiles.filter(p => p.created_at.startsWith(key)).length;
      days.push({ date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), count });
    }
    return days;
  }, [profiles]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: '0-20%', min: 0, max: 20, count: 0 },
      { range: '21-40%', min: 21, max: 40, count: 0 },
      { range: '41-60%', min: 41, max: 60, count: 0 },
      { range: '61-80%', min: 61, max: 80, count: 0 },
      { range: '81-100%', min: 81, max: 100, count: 0 },
    ];
    results.forEach(r => {
      const pct = Number(r.pourcentage);
      const bucket = buckets.find(b => pct >= b.min && pct <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets.map(b => ({ name: b.range, count: b.count }));
  }, [results]);

  // Module completion ranking
  const moduleRanking = useMemo(() => {
    return modules.map(mod => {
      const modProgs = progressions.filter(p => p.module_id === mod.id);
      const started = new Set(modProgs.map(p => p.user_id)).size;
      const completed = new Set(modProgs.filter(p => p.completion_date).map(p => p.user_id)).size;
      const modResults = results.filter(r => r.module_id === mod.id);
      const avgPct = modResults.length > 0 ? Math.round(modResults.reduce((a, r) => a + Number(r.pourcentage), 0) / modResults.length) : 0;
      return { titre: mod.titre, started, completed, rate: started > 0 ? Math.round((completed / started) * 100) : 0, avgPct };
    });
  }, [modules, progressions, results]);

  // Top performers
  const topPerformers = useMemo(() => {
    const userScores: Record<string, number[]> = {};
    results.forEach(r => {
      if (!userScores[r.user_id]) userScores[r.user_id] = [];
      userScores[r.user_id].push(Number(r.pourcentage));
    });
    return Object.entries(userScores)
      .map(([uid, scores]) => ({
        uid,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count: scores.length,
        profile: profiles.find(p => p.id === uid),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [results, profiles]);

  const stats = [
    { label: 'Utilisateurs', value: totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Actifs (7j)', value: activeUsers7d, icon: Activity, color: 'text-accent' },
    { label: 'Score moyen', value: `${avgScore}%`, icon: Target, color: 'text-primary' },
    { label: 'Taux complétion', value: `${completionRate}%`, icon: Award, color: 'text-accent' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Statistiques détaillées
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Analyse complète de l'activité de la plateforme.</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label} className="border-border bg-background shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-heading text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily signups */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg">Inscriptions (30 derniers jours)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailySignups}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(285, 20%, 85%)" />
                <XAxis dataKey="date" fontSize={10} interval={4} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                <Line type="monotone" dataKey="count" stroke="hsl(285, 52%, 15%)" strokeWidth={2} dot={false} name="Inscriptions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg">Répartition des plans</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={11}>
                    {planDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            )}
          </CardContent>
        </Card>

        {/* Score distribution */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg">Distribution des scores quiz</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(285, 20%, 85%)" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                <Bar dataKey="count" fill="hsl(336, 70%, 62%)" radius={[4, 4, 0, 0]} name="Résultats" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Module ranking */}
        <Card className="border-border bg-background shadow-sm">
          <CardHeader><CardTitle className="font-heading text-lg">Performance par module</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {moduleRanking.map((mod, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground truncate mr-3">{mod.titre}</span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {mod.completed}/{mod.started} complets · Score {mod.avgPct}%
                  </span>
                </div>
                <Progress value={mod.rate} className="h-2" />
              </div>
            ))}
            {moduleRanking.length === 0 && <p className="text-sm text-muted-foreground">Aucun module.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminStats;
