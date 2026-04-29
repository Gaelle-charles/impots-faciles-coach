import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Search, MoreHorizontal, Download, Users, Plus, Pencil, Trash2,
  KeyRound, Eye, EyeOff, RefreshCw, AlertTriangle, RotateCcw, MailWarning,
} from 'lucide-react';

// ─── Types ───
interface UserRow {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  plan: string;
  role: string;
  created_at: string;
  is_active: boolean;
  date_paiement: string | null;
  metier_id: string | null;
  deleted_at: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

interface ProgressionRow {
  id: string;
  module_id: string;
  user_id: string;
  step: number;
  completion_date: string | null;
}

interface ResultRow {
  id: string;
  module_id: string;
  user_id: string;
  pourcentage: number;
  score: number;
  score_max: number;
  date_quiz: string;
}

interface ModuleRow {
  id: string;
  titre: string;
  total_step: number;
}

const PLAN_OPTIONS = ['nouveau', 'essentiel', 'pro', 'expert'];
const ROLE_OPTIONS = [
  { value: 'client', label: 'Utilisateur' },
  { value: 'admin', label: 'Administrateur' },
];
const PLANS_FILTER = ['Tous', ...PLAN_OPTIONS];
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

function generatePassword(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join('');
}

function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return 'Jamais';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 0) return new Date(iso).toLocaleDateString('fr-FR');
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Il y a ${days} j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Il y a ${weeks} sem`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Il y a ${months} mois`;
  const years = Math.floor(days / 365);
  return `Il y a ${years} an${years > 1 ? 's' : ''}`;
}

type StatusFilter = 'tous' | 'pending' | 'deleted';

// ─── Main Component ───
const AdminUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [progressions, setProgressions] = useState<ProgressionRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous');
  const [page, setPage] = useState(0);

  // Create user modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    prenom: '', nom: '', email: '', password: '',
    plan: 'nouveau', role: 'client', sendWelcome: false,
  });
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit user modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    prenom: '', nom: '', email: '', plan: 'nouveau', role: 'client', is_active: true,
  });
  const [editTab, setEditTab] = useState('info');
  const [saving, setSaving] = useState(false);

  // Delete user modal
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Restore
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // ─── Fetch ───
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [uRes, pRes, rRes, mRes, metaRes] = await Promise.all([
      supabase.from('profiles').select('id, prenom, nom, email, plan, role, created_at, is_active, date_paiement, metier_id, deleted_at').order('created_at', { ascending: false }),
      supabase.from('progressions').select('id, user_id, module_id, step, completion_date'),
      supabase.from('resultat_quiz').select('id, user_id, module_id, pourcentage, score, score_max, date_quiz'),
      supabase.from('modules').select('id, titre, total_step').order('order', { ascending: true }),
      supabase.functions.invoke('admin-users', { body: { action: 'list_users_meta' } }),
    ]);

    const metaMap = new Map<string, { email_confirmed_at: string | null; last_sign_in_at: string | null }>();
    const metaUsers = (metaRes.data as any)?.users as Array<any> | undefined;
    if (metaUsers) {
      metaUsers.forEach((u) => metaMap.set(u.id, {
        email_confirmed_at: u.email_confirmed_at,
        last_sign_in_at: u.last_sign_in_at,
      }));
    }

    const enriched = (uRes.data as UserRow[] ?? []).map((u) => ({
      ...u,
      email_confirmed_at: metaMap.get(u.id)?.email_confirmed_at ?? null,
      last_sign_in_at: metaMap.get(u.id)?.last_sign_in_at ?? null,
    }));

    setUsers(enriched);
    setProgressions(pRes.data ?? []);
    setResults(rRes.data ?? []);
    setModules(mRes.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (prof?.role !== 'admin') {
        toast({ title: 'Accès refusé', variant: 'destructive' });
        navigate('/dashboard', { replace: true });
        return;
      }
      fetchData();
    };
    init();
  }, [user, navigate, fetchData]);

  // ─── Computed ───
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

  const moduleTotalStepMap = useMemo(() => {
    const m = new Map<string, number>();
    modules.forEach((mod) => m.set(mod.id, mod.total_step));
    return m;
  }, [modules]);

  // Filter
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

  // ─── CSV Export ───
  const handleExport = useCallback(() => {
    const header = ['Prénom', 'Nom', 'Email', 'Plan', 'Rôle', 'Date inscription', 'Modules complétés', 'Score moyen'];
    const rows = filtered.map((u) => [
      u.prenom ?? '', u.nom ?? '', u.email ?? '', u.plan, u.role,
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

  // ─── Create User ───
  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.prenom || !createForm.nom) {
      toast({ title: 'Tous les champs obligatoires doivent être remplis', variant: 'destructive' });
      return;
    }
    if (createForm.password.length < 8) {
      toast({ title: 'Le mot de passe doit contenir au moins 8 caractères', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'create_user',
        email: createForm.email,
        password: createForm.password,
        prenom: createForm.prenom,
        nom: createForm.nom,
        plan: createForm.plan,
        role: createForm.role,
        sendActivationEmail: createForm.role === 'admin',
        siteUrl: window.location.origin,
      },
    });
    if (error || data?.error) {
      toast({ title: 'Erreur', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Utilisateur créé ✓' });
      setCreateOpen(false);
      setCreateForm({ prenom: '', nom: '', email: '', password: '', plan: 'nouveau', role: 'client', sendWelcome: false });
      fetchData();
    }
    setCreating(false);
  };

  // ─── Open Edit ───
  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditTab('info');
    setEditForm({
      prenom: u.prenom ?? '',
      nom: u.nom ?? '',
      email: u.email ?? '',
      plan: u.plan,
      role: u.role,
      is_active: u.is_active,
    });
  };

  // ─── Save Edit ───
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      prenom: editForm.prenom || null,
      nom: editForm.nom || null,
      email: editForm.email || null,
      plan: editForm.plan,
      role: editForm.role,
      is_active: editForm.is_active,
    } as any).eq('id', editUser.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profil mis à jour ✓' });
      setUsers((prev) => prev.map((u) => u.id === editUser.id ? {
        ...u,
        prenom: editForm.prenom || null,
        nom: editForm.nom || null,
        email: editForm.email || null,
        plan: editForm.plan,
        role: editForm.role,
        is_active: editForm.is_active,
      } : u));
      setEditUser(null);
    }
    setSaving(false);
  };

  // ─── Delete User ───
  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'delete_user', userId: deleteUser.id },
    });
    if (error || data?.error) {
      toast({ title: 'Erreur', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Utilisateur supprimé' });
      setDeleteUser(null);
      setDeleteConfirm('');
      fetchData();
    }
    setDeleting(false);
  };

  // ─── Reset Password ───
  const handleResetPassword = async (u: UserRow) => {
    if (!u.email) return;
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'reset_password', email: u.email, siteUrl: window.location.origin },
    });
    if (error || data?.error) {
      toast({ title: 'Erreur', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: `Email de réinitialisation envoyé à ${u.email}` });
    }
  };

  // ─── Reset Progression ───
  const handleResetProgression = async (userId: string, moduleId?: string) => {
    if (moduleId) {
      await supabase.from('progressions').delete().eq('user_id', userId).eq('module_id', moduleId);
    } else {
      await supabase.from('progressions').delete().eq('user_id', userId);
    }
    toast({ title: 'Progression réinitialisée ✓' });
    fetchData();
  };

  // ─── Delete Quiz Result ───
  const handleDeleteResult = async (resultId: string) => {
    await supabase.from('resultat_quiz').delete().eq('id', resultId);
    toast({ title: 'Résultat supprimé' });
    fetchData();
  };

  // ─── Edit user data helpers ───
  const editProgressions = useMemo(() => {
    if (!editUser) return [];
    return progressions
      .filter((p) => p.user_id === editUser.id)
      .map((p) => ({
        ...p,
        moduleTitre: moduleTitleMap.get(p.module_id) ?? 'Inconnu',
        totalStep: moduleTotalStepMap.get(p.module_id) ?? 1,
      }));
  }, [editUser, progressions, moduleTitleMap, moduleTotalStepMap]);

  const editResults = useMemo(() => {
    if (!editUser) return [];
    return results
      .filter((r) => r.user_id === editUser.id)
      .sort((a, b) => new Date(b.date_quiz).getTime() - new Date(a.date_quiz).getTime())
      .map((r) => ({ ...r, moduleTitre: moduleTitleMap.get(r.module_id) ?? 'Inconnu' }));
  }, [editUser, results, moduleTitleMap]);

  // ─── Render ───
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
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Utilisateurs ({filtered.length})
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button
            size="sm"
            className="gap-2"
            style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Ajouter un utilisateur
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLANS_FILTER.map((p) => (
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
                    {u.role === 'admin' && <Badge className="ml-2 text-[10px]" style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}>Admin</Badge>}
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
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Modifier le profil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(u)}>
                          <KeyRound className="h-3.5 w-3.5 mr-2" /> Envoyer un lien de réinitialisation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => { setDeleteUser(u); setDeleteConfirm(''); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer le compte
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
          <p className="text-muted-foreground">Page {page + 1} / {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </div>
      )}

      {/* ─── Create User Modal ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">➕ Créer un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prénom *</Label>
                <Input value={createForm.prenom} onChange={(e) => setCreateForm((p) => ({ ...p, prenom: e.target.value }))} placeholder="Jean" />
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={createForm.nom} onChange={(e) => setCreateForm((p) => ({ ...p, nom: e.target.value }))} placeholder="Dupont" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} placeholder="jean@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe temporaire *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showCreatePwd ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 8 caractères"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCreatePwd(!showCreatePwd)}
                  >
                    {showCreatePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateForm((p) => ({ ...p, password: generatePassword() }))}
                >
                  Générer
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={createForm.plan} onValueChange={(v) => setCreateForm((p) => ({ ...p, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
            >
              {creating ? 'Création…' : 'Créer l\'utilisateur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit User Modal ─── */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              ✏️ {editUser?.prenom ?? ''} {editUser?.nom ?? ''}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={editTab} onValueChange={setEditTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="info">Infos</TabsTrigger>
              <TabsTrigger value="access">Plan & Accès</TabsTrigger>
              <TabsTrigger value="progress">Progression</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
            </TabsList>

            {/* Tab: Informations */}
            <TabsContent value="info" className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prénom</Label>
                  <Input value={editForm.prenom} onChange={(e) => setEditForm((p) => ({ ...p, prenom: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom</Label>
                  <Input value={editForm.nom} onChange={(e) => setEditForm((p) => ({ ...p, nom: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Changer l'email ne modifie que le profil, pas le compte auth.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Date d'inscription</Label>
                <Input value={editUser ? new Date(editUser.created_at).toLocaleDateString('fr-FR') : ''} disabled className="opacity-60" />
              </div>
            </TabsContent>

            {/* Tab: Plan & Accès */}
            <TabsContent value="access" className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={editForm.plan} onValueChange={(v) => setEditForm((p) => ({ ...p, plan: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Rôle</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm((p) => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Statut du compte</p>
                  <p className="text-xs text-muted-foreground">{editForm.is_active ? 'Actif' : 'Suspendu'}</p>
                </div>
                <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm((p) => ({ ...p, is_active: v }))} />
              </div>
            </TabsContent>

            {/* Tab: Progression */}
            <TabsContent value="progress" className="space-y-4 pt-2">
              {editProgressions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune progression.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Module</TableHead>
                          <TableHead className="text-center">Step</TableHead>
                          <TableHead className="text-center">Statut</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editProgressions.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-medium">{p.moduleTitre}</TableCell>
                            <TableCell className="text-center text-sm">{p.step}/{p.totalStep}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={p.completion_date ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}>
                                {p.completion_date ? 'Terminé' : 'En cours'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => editUser && handleResetProgression(editUser.id, p.module_id)}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (editUser && confirm('Réinitialiser TOUTE la progression ?')) {
                        handleResetProgression(editUser.id);
                      }
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Réinitialiser TOUT
                  </Button>
                </>
              )}
            </TabsContent>

            {/* Tab: Quiz */}
            <TabsContent value="quiz" className="space-y-4 pt-2">
              {editResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun quiz passé.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editResults.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm font-medium">{r.moduleTitre}</TableCell>
                          <TableCell className="text-center font-bold text-primary">{Math.round(r.pourcentage)}%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.date_quiz).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteResult(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
            >
              {saving ? 'Enregistrement…' : '💾 Enregistrer les modifications'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete User Modal ─── */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => { if (!open) { setDeleteUser(null); setDeleteConfirm(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Supprimer ce compte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              ⚠️ Supprimer <strong>{deleteUser?.prenom ?? ''} {deleteUser?.nom ?? ''}</strong> supprimera définitivement son compte, ses progressions et ses résultats de quiz.
            </p>
            <p className="text-sm">
              Tapez <strong className="text-foreground">« {deleteUser?.email} »</strong> pour confirmer :
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteUser?.email ?? ''}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteUser(null); setDeleteConfirm(''); }}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== deleteUser?.email || deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
