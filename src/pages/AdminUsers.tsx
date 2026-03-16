import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Search, MoreHorizontal, Download, Users } from 'lucide-react';

// Types
interface UserRow {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  plan: string;
  created_at: string;
  is_active: boolean;
}

interface ProgressionRow {
  module_id: string;
  step: number;
  completion_date: string | null;
}

interface ResultRow {
  module_id: string;
  pourcentage: number;
  date_quiz: string;
}

interface ModuleRow {
  id: string;
  titre: string;
  total_step: number;
}

const PLANS = ['Tous', 'nouveau', 'essentiel', 'pro', 'expert'] as const;
const PAGE_SIZE = 20;

const planBadgeClass: Record<string, string> = {
  nouveau: 'bg-muted text-muted-foreground',
  essentiel: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pro: 'bg-primary/10 text-primary',
  expert: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

function getInitials(prenom: string | null, nom: string | null) {
  return ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase() || '?';
}

function initialsColor(id: string) {
  const colors = [
    'bg-primary text-primary-foreground',
    'bg-accent text-accent-foreground',
    'bg-blue-600 text-white',
    'bg-emerald-600 text-white',
    'bg-orange-500 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const AdminUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [progressions, setProgressions] = useState<(ProgressionRow & { user_id: string })[]>([]);
  const [results, setResults] = useState<(ResultRow & { user_id: string })[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('Tous');
  const [page, setPage] = useState(0);

  // Detail sheet
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Plan change dialog
  const [planDialogUser, setPlanDialogUser] = useState<UserRow | null>(null);
  const [newPlan, setNewPlan] = useState('');

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
      const [uRes, pRes, rRes, mRes] = await Promise.all([
        supabase.from('profiles').select('id, prenom, nom, email, plan, created_at, is_active').order('created_at', { ascending: false }),
        supabase.from('progressions').select('user_id, module_id, step, completion_date'),
        supabase.from('resultat_quiz').select('user_id, module_id, pourcentage, date_quiz'),
        supabase.from('modules').select('id, titre, total_step').order('order', { ascending: true }),
      ]);
      setUsers(uRes.data as UserRow[] ?? []);
      setProgressions(pRes.data ?? []);
      setResults(rRes.data ?? []);
      setModules(mRes.data ?? []);
      setLoading(false);
    };
    init();
  }, [user, navigate]);

  // Computed maps
  const userCompletedMap = useMemo(() => {
    const m = new Map<string, number>();
    progressions.forEach((p) => {
      if (p.completion_date) m.set(p.user_id, (m.get(p.user_id) ?? 0) + 1);
    });
    return m;
  }, [progressions]);

  const userAvgScoreMap = useMemo(() => {
    const m = new Map<string, number[]>();
    results.forEach((r) => {
      if (!m.has(r.user_id)) m.set(r.user_id, []);
      m.get(r.user_id)!.push(Number(r.pourcentage));
    });
    const avg = new Map<string, number>();
    m.forEach((scores, uid) => avg.set(uid, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)));
    return avg;
  }, [results]);

  const moduleTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    modules.forEach((mod) => m.set(mod.id, mod.titre));
    return m;
  }, [modules]);

  // Filtering
  const filtered = useMemo(() => {
    let list = users;
    if (planFilter !== 'Tous') list = list.filter((u) => u.plan === planFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((u) =>
        `${u.prenom ?? ''} ${u.nom ?? ''}`.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, planFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, planFilter]);

  // CSV export
  const handleExport = useCallback(() => {
    const header = ['Prénom', 'Nom', 'Email', 'Plan', 'Date inscription', 'Modules complétés', 'Score moyen'];
    const rows = filtered.map((u) => [
      u.prenom ?? '', u.nom ?? '', u.email ?? '', u.plan,
      new Date(u.created_at).toLocaleDateString('fr-FR'),
      `${userCompletedMap.get(u.id) ?? 0}/${modules.length}`,
      userAvgScoreMap.has(u.id) ? `${userAvgScoreMap.get(u.id)}%` : '—',
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, userCompletedMap, userAvgScoreMap, modules.length]);

  // Plan change
  const handlePlanChange = async () => {
    if (!planDialogUser || !newPlan) return;
    const { error } = await supabase.from('profiles').update({ plan: newPlan }).eq('id', planDialogUser.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setUsers((prev) => prev.map((u) => u.id === planDialogUser.id ? { ...u, plan: newPlan } : u));
      toast({ title: 'Plan modifié', description: `${planDialogUser.prenom ?? ''} est maintenant "${newPlan}".` });
      setPlanDialogUser(null);
    }
  };

  // Suspend
  const handleSuspend = async (u: UserRow) => {
    const nextActive = !u.is_active;
    const { error } = await supabase.from('profiles').update({ is_active: nextActive } as any).eq('id', u.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: nextActive } : x));
      toast({ title: nextActive ? 'Compte réactivé' : 'Compte suspendu' });
    }
  };

  // Detail data for selected user
  const selectedProgressions = useMemo(() => {
    if (!selectedUser) return [];
    return progressions
      .filter((p) => p.user_id === selectedUser.id)
      .map((p) => ({
        ...p,
        moduleTitre: moduleTitleMap.get(p.module_id) ?? 'Inconnu',
        totalStep: modules.find((m) => m.id === p.module_id)?.total_step ?? 1,
      }));
  }, [selectedUser, progressions, moduleTitleMap, modules]);

  const selectedResults = useMemo(() => {
    if (!selectedUser) return [];
    return results
      .filter((r) => r.user_id === selectedUser.id)
      .sort((a, b) => new Date(b.date_quiz).getTime() - new Date(a.date_quiz).getTime())
      .map((r) => ({ ...r, moduleTitre: moduleTitleMap.get(r.module_id) ?? 'Inconnu' }));
  }, [selectedUser, results, moduleTitleMap]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7" /> Utilisateurs
          </h1>
          <p className="mt-1 text-muted-foreground">{filtered.length} utilisateur{filtered.length > 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" /> Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLANS.map((p) => (
              <SelectItem key={p} value={p}>{p === 'Tous' ? 'Tous les plans' : p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border bg-background shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Nom</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="hidden lg:table-cell">Inscrit le</TableHead>
              <TableHead className="text-center">Modules</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Score</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((u) => {
              const completed = userCompletedMap.get(u.id) ?? 0;
              const avg = userAvgScoreMap.get(u.id);
              return (
                <TableRow key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${initialsColor(u.id)}`}>
                      {getInitials(u.prenom, u.nom)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {u.prenom ?? ''} {u.nom ?? ''}
                    {!u.is_active && <Badge className="ml-2 bg-destructive/10 text-destructive text-[10px]">Suspendu</Badge>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">{u.email ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs capitalize ${planBadgeClass[u.plan] ?? planBadgeClass.nouveau}`}>{u.plan}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-center text-sm font-medium">{completed}/{modules.length}</TableCell>
                  <TableCell className="text-center text-sm font-medium hidden sm:table-cell">{avg != null ? `${avg}%` : '—'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedUser(u); setSheetOpen(true); }}>
                          Voir le détail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setPlanDialogUser(u); setNewPlan(u.plan); }}>
                          Changer le plan
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleSuspend(u)}>
                          {u.is_active ? 'Suspendre le compte' : 'Réactiver le compte'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">Aucun utilisateur trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-heading">{selectedUser?.prenom ?? ''} {selectedUser?.nom ?? ''}</SheetTitle>
            <SheetDescription>{selectedUser?.email ?? '—'}</SheetDescription>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <Badge className={`mt-1 capitalize ${planBadgeClass[selectedUser.plan] ?? planBadgeClass.nouveau}`}>{selectedUser.plan}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Inscrit le</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div>
                <h3 className="font-heading font-semibold text-foreground mb-2">Progressions</h3>
                {selectedProgressions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune progression.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedProgressions.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                        <span className="font-medium truncate mr-2">{p.moduleTitre}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {p.step}/{p.totalStep} {p.completion_date ? '✓' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-heading font-semibold text-foreground mb-2">Résultats quiz</h3>
                {selectedResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun quiz passé.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                        <span className="font-medium truncate mr-2">{r.moduleTitre}</span>
                        <div className="shrink-0 flex items-center gap-3">
                          <span className="font-bold text-primary">{Math.round(r.pourcentage)}%</span>
                          <span className="text-muted-foreground text-xs">{new Date(r.date_quiz).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Plan change dialog */}
      <Dialog open={!!planDialogUser} onOpenChange={(open) => { if (!open) setPlanDialogUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Changer le plan</DialogTitle>
            <DialogDescription>{planDialogUser?.prenom ?? ''} {planDialogUser?.nom ?? ''} — plan actuel : {planDialogUser?.plan}</DialogDescription>
          </DialogHeader>
          <Select value={newPlan} onValueChange={setNewPlan}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['nouveau', 'essentiel', 'pro', 'expert'].map((p) => (
                <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogUser(null)}>Annuler</Button>
            <Button onClick={handlePlanChange}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
