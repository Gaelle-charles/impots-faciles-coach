import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Search, Users, TrendingUp, DollarSign, ArrowUpRight } from 'lucide-react';

const PLAN_OPTIONS = ['nouveau', 'essentiel', 'pro', 'expert'];
const planBadgeClass: Record<string, string> = {
  nouveau: 'bg-muted text-muted-foreground',
  essentiel: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pro: 'bg-primary/10 text-primary',
  expert: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const AdminSubscriptions = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('Tous');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('id, prenom, nom, email, plan, is_active, date_paiement, created_at, role').order('created_at', { ascending: false });
      setProfiles((data ?? []).filter(p => p.role !== 'admin'));
      setLoading(false);
    };
    fetch();
  }, [user]);

  const planCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PLAN_OPTIONS.forEach(p => counts[p] = 0);
    profiles.forEach(p => { counts[p.plan] = (counts[p.plan] || 0) + 1; });
    return counts;
  }, [profiles]);

  const filtered = useMemo(() => {
    let list = profiles;
    if (planFilter !== 'Tous') list = list.filter(p => p.plan === planFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(p =>
        `${p.prenom ?? ''} ${p.nom ?? ''}`.toLowerCase().includes(s) ||
        (p.email ?? '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [profiles, planFilter, search]);

  const handleChangePlan = async (userId: string, newPlan: string) => {
    const { error } = await supabase.from('profiles').update({ plan: newPlan } as any).eq('id', userId);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, plan: newPlan } : p));
      toast({ title: `Plan mis à jour → ${newPlan}` });
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-96 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
        <CreditCard className="h-6 w-6" /> Abonnements
      </h1>

      {/* Plan summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {PLAN_OPTIONS.map(plan => (
          <Card key={plan} className="border-border bg-background shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPlanFilter(planFilter === plan ? 'Tous' : plan)}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground capitalize">{plan}</p>
                <p className="font-heading text-xl font-bold text-foreground">{planCounts[plan]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous les plans</SelectItem>
            {PLAN_OPTIONS.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border bg-background shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Plan actuel</TableHead>
              <TableHead className="hidden lg:table-cell">Date paiement</TableHead>
              <TableHead>Changer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                <TableCell className="font-medium text-sm">{p.prenom ?? ''} {p.nom ?? ''}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">{p.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge className={`text-xs capitalize ${planBadgeClass[p.plan] ?? planBadgeClass.nouveau}`}>{p.plan}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '—'}
                </TableCell>
                <TableCell>
                  <Select value={p.plan} onValueChange={v => handleChangePlan(p.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">Aucun abonné trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;
