import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, BookOpen, Target, Activity } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAccess } from '@/hooks/useAccess';

interface ProfileRow {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  plan: string;
  created_at: string;
  role: string;
}

interface ProgressionRow {
  module_id: string;
  completion_date: string | null;
  user_id: string;
  created_at: string;
}

interface ModuleRow {
  id: string;
  titre: string;
  order: number;
}

interface ResultRow {
  pourcentage: number;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isLoading: accessLoading, hasAdminAccess, role } = useAccess();
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [progressions, setProgressions] = useState<ProgressionRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [avgScore, setAvgScore] = useState(0);

  // Access guard
  useEffect(() => {
    if (accessLoading) return;
    if (!hasAdminAccess()) {
      toast({
        title: 'Accès restreint',
        description: 'Accès réservé aux administrateurs',
        variant: 'destructive',
      });
      navigate('/dashboard', { replace: true });
    }
  }, [accessLoading, hasAdminAccess, navigate]);

  useEffect(() => {
    if (!user || accessLoading || !hasAdminAccess()) return;

    const init = async () => {
      setLoading(true);
      const [profRes, progRes, modRes, resRes] = await Promise.all([
        supabase.from('profiles').select('prenom, nom, email, plan, created_at, role'),
        supabase.from('progressions').select('module_id, completion_date, user_id, created_at'),
        supabase.from('modules').select('id, titre, order').order('order', { ascending: true }),
        supabase.from('resultat_quiz').select('pourcentage'),
      ]);

      setProfiles(profRes.data ?? []);
      setProgressions(progRes.data ?? []);
      setModules(modRes.data ?? []);

      const scores = resRes.data ?? [];
      if (scores.length > 0) {
        setAvgScore(Math.round(scores.reduce((a, r) => a + Number(r.pourcentage), 0) / scores.length));
      }
      setLoading(false);
    };

    init();
  }, [user, accessLoading, hasAdminAccess]);

  // Stats
  const totalUsers = profiles.length;
  const completedTotal = progressions.filter((p) => !!p.completion_date).length;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const activeUsers = new Set(progressions.filter((p) => p.created_at > sevenDaysAgo).map((p) => p.user_id)).size;

  // Weekly signups (last 8 weeks)
  const weeklySignups = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      const count = profiles.filter((p) => {
        const d = new Date(p.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({
        label: `S-${i}`,
        count,
      });
    }
    return weeks;
  }, [profiles]);

  // Completion rate per module
  const moduleStats = useMemo(() => {
    return modules.map((mod) => {
      const modProgs = progressions.filter((p) => p.module_id === mod.id);
      const started = modProgs.length;
      const completed = modProgs.filter((p) => !!p.completion_date).length;
      const rate = started > 0 ? Math.round((completed / started) * 100) : 0;
      return { ...mod, started, completed, rate };
    });
  }, [modules, progressions]);

  // Last 5 users
  const lastUsers = useMemo(() => {
    return [...profiles]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [profiles]);

  const stats = [
    { label: 'Utilisateurs', value: totalUsers, icon: Users },
    { label: 'Modules complétés', value: completedTotal, icon: BookOpen },
    { label: 'Score moyen', value: `${avgScore}%`, icon: Target },
    { label: 'Actifs (7j)', value: activeUsers, icon: Activity },
  ];

  if (accessLoading || loading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!hasAdminAccess()) return null;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Administration</h1>
        <p className="mt-1 text-muted-foreground">Vue d'ensemble de la plateforme.</p>
      </div>

      {/* Stats cards */}
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

      {/* Weekly signups chart */}
      <Card className="border-border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Inscriptions par semaine</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklySignups}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(285, 20%, 85%)" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(285, 20%, 85%)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="count" name="Inscriptions" fill="hsl(285, 52%, 15%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Completion rate per module */}
      <Card className="border-border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Taux de complétion par module</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {moduleStats.map((mod) => (
            <div key={mod.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground truncate mr-4">{mod.titre}</span>
                <span className="shrink-0 text-muted-foreground">
                  {mod.completed}/{mod.started} — {mod.rate}%
                </span>
              </div>
              <Progress value={mod.rate} className="h-2" />
            </div>
          ))}
          {moduleStats.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun module.</p>
          )}
        </CardContent>
      </Card>

      {/* Last registered users */}
      <Card className="border-border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Derniers inscrits</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden sm:table-cell">Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lastUsers.map((u, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">
                    {u.prenom ?? ''} {u.nom ?? ''}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {u.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-primary/10 text-primary capitalize text-xs">
                      {u.plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                </TableRow>
              ))}
              {lastUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Aucun utilisateur.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
