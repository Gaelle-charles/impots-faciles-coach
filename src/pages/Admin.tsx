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
import { Users, Euro, TrendingUp, Activity, BookMarked, ArrowRight, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PasseportFiscalCard } from '@/components/dashboard/PasseportFiscalCard';
import type { Passeport } from '@/hooks/usePasseportFiscal';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAccess } from '@/hooks/useAccess';

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  nouveau: { label: 'Freemium', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100' },
  freemium: { label: 'Freemium', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100' },
  starter: { label: 'Starter', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  essentiel: { label: 'Essentiel', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  pro: { label: 'Pro', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  expert: { label: 'Expert', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  premium: { label: 'Premium', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
};

const renderPlanBadge = (plan: string | null | undefined) => {
  const key = (plan ?? 'nouveau').toLowerCase();
  const cfg = PLAN_BADGE[key] ?? { label: plan ?? '—', className: 'bg-muted text-muted-foreground' };
  return <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>;
};
import { RevenueStats } from '@/components/admin/RevenueStats';
import { StripeRevenueStats } from '@/components/admin/StripeRevenueStats';

interface ProfileRow {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  plan: string;
  created_at: string;
  role: string;
  is_active?: boolean | null;
  date_paiement?: string | null;
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
  const [passeports, setPasseports] = useState<Array<{ id: string; numero: number; nom: string; regime_fiscal: string; plan_minimum: string; is_active: boolean; ordre: number }>>([]);
  const [previewPasseport, setPreviewPasseport] = useState<Passeport | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [stripeKpi, setStripeKpi] = useState<{ net: number; mrr: number; currency: string } | null>(null);

  const handlePreviewPasseport = async (id: string) => {
    setPreviewLoading(true);
    const { data, error } = await (supabase as any)
      .from('passeports_fiscaux')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setPreviewLoading(false);
    if (error || !data) {
      toast({ title: 'Erreur', description: 'Impossible de charger le passeport.', variant: 'destructive' });
      return;
    }
    setPreviewPasseport(data as Passeport);
  };

  // Access guard
  useEffect(() => {
    if (accessLoading) return;
    if (!isAdmin) {
      toast({
        title: 'Accès restreint',
        description: 'Accès réservé aux administrateurs',
        variant: 'destructive',
      });
      navigate('/dashboard', { replace: true });
    }
  }, [accessLoading, isAdmin, navigate]);

  useEffect(() => {
    if (!user || accessLoading || !isAdmin) return;

    const init = async () => {
      setLoading(true);
      const [profRes, progRes, modRes, resRes, passRes] = await Promise.all([
        supabase.from('profiles').select('prenom, nom, email, plan, created_at, role, is_active, date_paiement, deleted_at').is('deleted_at', null),
        supabase.from('progressions').select('module_id, completion_date, user_id, created_at'),
        supabase.from('modules').select('id, titre, order').order('order', { ascending: true }),
        supabase.from('resultat_quiz').select('pourcentage'),
        (supabase as any).from('passeports_fiscaux').select('id, numero, nom, regime_fiscal, plan_minimum, is_active, ordre').order('ordre', { ascending: true }),
      ]);
      setPasseports(passRes.data ?? []);

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
    // Fetch Stripe KPIs (CA net + MRR) for top cards
    supabase.functions.invoke('stripe-revenue').then(({ data, error }) => {
      if (error || !data || (data as any).error) return;
      const d = data as any;
      setStripeKpi({ net: d.net_revenue ?? 0, mrr: d.mrr ?? 0, currency: d.currency ?? 'eur' });
    });
  }, [user, accessLoading, isAdmin]);

  const fmtMoney = (cents: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: (stripeKpi?.currency ?? 'eur').toUpperCase(),
      maximumFractionDigits: 0,
    }).format(cents / 100);

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

      {/* Revenue / business KPIs */}
      <div className="space-y-6">
        <h2 className="font-heading text-xl font-bold text-foreground">Revenus & abonnements</h2>
        <StripeRevenueStats />
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Voir aussi l'estimation interne (basée sur profiles.plan)
          </summary>
          <div className="mt-4">
            <RevenueStats profiles={profiles} />
          </div>
        </details>
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
                    {renderPlanBadge(u.plan)}
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

      {/* Aperçu Passeports fiscaux */}
      <Card className="border-border bg-background shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <BookMarked className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="font-heading text-lg">Passeports fiscaux</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {passeports.length} fiche{passeports.length > 1 ? 's' : ''} —{' '}
                {passeports.filter((p) => p.is_active).length} active{passeports.filter((p) => p.is_active).length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/passeports-fiscaux">
              Gérer <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">N°</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Régime fiscal</TableHead>
                <TableHead className="hidden sm:table-cell">Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passeports.slice(0, 6).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.numero}</TableCell>
                  <TableCell className="font-medium text-sm">{p.nom}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.regime_fiscal}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {renderPlanBadge(p.plan_minimum)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-xs">
                      {p.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handlePreviewPasseport(p.id)}
                      disabled={previewLoading}
                      title="Aperçu"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {passeports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Aucun passeport fiscal.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!previewPasseport} onOpenChange={(v) => !v && setPreviewPasseport(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Aperçu — {previewPasseport?.nom}
            </DialogTitle>
          </DialogHeader>
          {previewPasseport && <PasseportFiscalCard passeport={previewPasseport} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
