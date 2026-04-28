import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import {
  Briefcase, Plus, Pencil, Trash2, Copy, Search, GripVertical, Lock,
  Download, ChevronUp, ChevronDown, ArrowUpDown,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { ContenuSectionsEditor } from '@/components/admin/ContenuSectionsEditor';

interface MetierRow {
  id: string;
  nom: string;
  categorie: string | null;
  sous_categorie: string | null;
  code_ref: string | null;
  slug: string | null;
  description: string | null;
  icone: string | null;
  order_display: number | null;
  is_active: boolean | null;
  created_at: string;
  contenu_sections: unknown;
}

const PAGE_SIZE = 30;

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);

type SortKey = 'nom' | 'categorie' | 'slug' | 'is_active' | 'order_display' | 'created_at';

const SortableMetierRow = ({
  m, onEdit, onDuplicate, onDelete, onToggleActive,
}: {
  m: MetierRow;
  onEdit: (m: MetierRow) => void;
  onDuplicate: (m: MetierRow) => void;
  onDelete: (m: MetierRow) => void;
  onToggleActive: (m: MetierRow, value: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: m.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
      <TableCell className="w-8 px-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
          aria-label="Réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {m.icone && <span className="text-base">{m.icone}</span>}
          <span className="truncate max-w-[260px]">{m.nom}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {m.categorie ?? <span className="italic">—</span>}
      </TableCell>
      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
        {m.slug ?? <span className="italic">—</span>}
      </TableCell>
      <TableCell>
        <Switch
          checked={!!m.is_active}
          onCheckedChange={(v) => onToggleActive(m, v)}
          aria-label={m.is_active ? 'Désactiver' : 'Activer'}
        />
      </TableCell>
      <TableCell className="text-sm text-center text-muted-foreground">
        {m.order_display ?? '—'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(m.created_at).toLocaleDateString('fr-FR')}
      </TableCell>
      <TableCell className="px-1">
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onEdit(m)} title="Modifier">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onDuplicate(m)} title="Dupliquer">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(m)}
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const AdminMetiers = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metiers, setMetiers] = useState<MetierRow[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');
  const [sortKey, setSortKey] = useState<SortKey>('order_display');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  // Edit modal
  const [open, setOpen] = useState(false);
  const [isAdd, setIsAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: '',
    categorie: '',
    sous_categorie: '',
    code_ref: '',
    slug: '',
    description: '',
    icone: '',
    order_display: '' as string,
    is_active: true,
  });
  // contenu_sections est géré séparément (édition JSONB validée)
  const [contenuSections, setContenuSections] = useState<unknown>(null);
  const [contenuValid, setContenuValid] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [toDelete, setToDelete] = useState<MetierRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteBlocker, setDeleteBlocker] = useState<{ count: number } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('metiers')
      .select('*')
      .order('order_display', { ascending: true, nullsFirst: false });
    if (error) {
      toast({ title: 'Erreur de chargement', description: error.message, variant: 'destructive' });
    } else {
      setMetiers(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    metiers.forEach((m) => { if (m.categorie) set.add(m.categorie); });
    return Array.from(set).sort();
  }, [metiers]);

  const filtered = useMemo(() => {
    let list = metiers;
    if (categoryFilter !== 'Toutes') {
      list = list.filter((m) => m.categorie === categoryFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((m) =>
        m.nom.toLowerCase().includes(s) ||
        (m.slug ?? '').toLowerCase().includes(s) ||
        (m.categorie ?? '').toLowerCase().includes(s) ||
        (m.code_ref ?? '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [metiers, search, categoryFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const va = (a[sortKey] ?? '') as string | number | boolean;
      const vb = (b[sortKey] ?? '') as string | number | boolean;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'fr') * dir;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const isDndMode = sortKey === 'order_display' && sortDir === 'asc'
    && search.trim() === '' && categoryFilter === 'Toutes';

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sorted, safePage],
  );

  useEffect(() => { setPage(1); }, [search, categoryFilter, sortKey, sortDir]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder full sorted list (DnD only available when sorted by order_display asc, no filter)
    const oldIndex = sorted.findIndex((m) => m.id === active.id);
    const newIndex = sorted.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sorted, oldIndex, newIndex);

    // Optimistic update : compute new order_display values starting at 1
    const idToOrder = new Map<string, number>();
    reordered.forEach((m, i) => idToOrder.set(m.id, i + 1));
    setMetiers((prev) =>
      prev.map((m) =>
        idToOrder.has(m.id) ? { ...m, order_display: idToOrder.get(m.id)! } : m,
      ),
    );

    // Persist
    const updates = reordered.map((m, i) =>
      supabase.from('metiers').update({ order_display: i + 1 }).eq('id', m.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast({ title: 'Erreur de réordonnancement', description: failed.error.message, variant: 'destructive' });
      fetchData();
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openAdd = () => {
    setIsAdd(true);
    setEditingId(null);
    const maxOrder = metiers.reduce((m, x) => Math.max(m, x.order_display ?? 0), 0);
    setForm({
      nom: '',
      categorie: '',
      sous_categorie: '',
      code_ref: '',
      slug: '',
      description: '',
      icone: '',
      order_display: String(maxOrder + 1),
      is_active: true,
    });
    setContenuSections(null);
    setContenuValid(true);
    setOpen(true);
  };

  const openEdit = (m: MetierRow) => {
    setIsAdd(false);
    setEditingId(m.id);
    setForm({
      nom: m.nom,
      categorie: m.categorie ?? '',
      sous_categorie: m.sous_categorie ?? '',
      code_ref: m.code_ref ?? '',
      slug: m.slug ?? '',
      description: m.description ?? '',
      icone: m.icone ?? '',
      order_display: m.order_display != null ? String(m.order_display) : '',
      is_active: m.is_active ?? true,
    });
    // contenu_sections : on garde tel quel ; null/{} = pas de contenu enrichi
    const cs = m.contenu_sections;
    const hasContent = cs && typeof cs === 'object' && Object.keys(cs as object).length > 0;
    setContenuSections(hasContent ? cs : null);
    setContenuValid(true);
    setOpen(true);
  };

  const handleNomChange = (value: string) => {
    setForm((f) => {
      // Auto-update slug only on creation, only while it matches the slugified previous nom (i.e. user hasn't edited slug manually)
      if (isAdd && (f.slug === '' || f.slug === slugify(f.nom))) {
        return { ...f, nom: value, slug: slugify(value) };
      }
      return { ...f, nom: value };
    });
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      toast({ title: 'Champ requis', description: 'Le nom est obligatoire.', variant: 'destructive' });
      return;
    }
    if (isAdd && !form.slug.trim()) {
      toast({ title: 'Champ requis', description: 'Le slug est obligatoire.', variant: 'destructive' });
      return;
    }
    if (!contenuValid) {
      toast({
        title: 'Contenu structuré invalide',
        description: 'Corrigez les erreurs JSON avant d\'enregistrer.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    const orderNum = form.order_display.trim() === '' ? null : Number(form.order_display);
    // Si l'éditeur a renvoyé null, on stocke {} pour respecter NOT NULL DEFAULT '{}'
    const contenuPayload = contenuSections ?? {};

    if (isAdd) {
      const payload = {
        nom: form.nom.trim(),
        categorie: form.categorie.trim() || null,
        sous_categorie: form.sous_categorie.trim() || null,
        code_ref: form.code_ref.trim() || null,
        slug: form.slug.trim(),
        description: form.description || null,
        icone: form.icone.trim() || null,
        order_display: Number.isFinite(orderNum as number) ? orderNum : null,
        is_active: form.is_active,
        contenu_sections: contenuPayload,
      };
      const { error } = await supabase.from('metiers').insert(payload);
      setSaving(false);
      if (error) {
        const msg = error.message.includes('metiers_slug_key')
          ? 'Ce slug est déjà utilisé par une autre fiche.'
          : error.message;
        toast({ title: 'Erreur', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Fiche créée', description: form.nom });
    } else {
      // UPDATE — slug is read-only, do not include it in payload
      const payload = {
        nom: form.nom.trim(),
        categorie: form.categorie.trim() || null,
        sous_categorie: form.sous_categorie.trim() || null,
        code_ref: form.code_ref.trim() || null,
        description: form.description || null,
        icone: form.icone.trim() || null,
        order_display: Number.isFinite(orderNum as number) ? orderNum : null,
        is_active: form.is_active,
        contenu_sections: contenuPayload,
      };
      const { error } = await supabase.from('metiers').update(payload).eq('id', editingId!);
      setSaving(false);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Fiche mise à jour' });
    }
    setOpen(false);
    fetchData();
  };

  const handleDuplicate = async (m: MetierRow) => {
    const baseSlug = m.slug ?? slugify(m.nom);
    // Find next available slug : base-2, base-3...
    const existingSlugs = new Set(metiers.map((x) => x.slug).filter(Boolean) as string[]);
    let n = 2;
    let newSlug = `${baseSlug}-${n}`;
    while (existingSlugs.has(newSlug)) {
      n += 1;
      newSlug = `${baseSlug}-${n}`;
    }
    const maxOrder = metiers.reduce((acc, x) => Math.max(acc, x.order_display ?? 0), 0);
    const payload = {
      nom: `${m.nom} (copie)`,
      categorie: m.categorie,
      sous_categorie: m.sous_categorie,
      code_ref: m.code_ref,
      slug: newSlug,
      description: m.description,
      icone: m.icone,
      order_display: maxOrder + 1,
      is_active: false, // duplication = brouillon par défaut
    };
    const { error } = await supabase.from('metiers').insert(payload);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Fiche dupliquée', description: payload.nom });
    fetchData();
  };

  const handleToggleActive = async (m: MetierRow, value: boolean) => {
    // Optimistic
    setMetiers((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_active: value } : x)));
    const { error } = await supabase.from('metiers').update({ is_active: value }).eq('id', m.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      fetchData();
    }
  };

  const askDelete = async (m: MetierRow) => {
    // Pré-check : profiles.metier_id = m.id
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('metier_id', m.id);
    if (error) {
      toast({ title: 'Erreur de vérification', description: error.message, variant: 'destructive' });
      return;
    }
    setToDelete(m);
    setDeleteBlocker({ count: count ?? 0 });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('metiers').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Erreur de suppression', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Fiche supprimée', description: toDelete.nom });
    setToDelete(null);
    setDeleteBlocker(null);
    fetchData();
  };

  const exportCsv = () => {
    const headers = [
      'id', 'nom', 'categorie', 'sous_categorie', 'code_ref', 'slug',
      'icone', 'order_display', 'is_active', 'description', 'created_at',
    ];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...metiers.map((m) => headers.map((h) => escape((m as any)[h])).join(',')),
    ];
    const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metiers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {sortKey === k
          ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Fiches métiers</h1>
            <p className="text-sm text-muted-foreground">
              {metiers.length} fiche{metiers.length > 1 ? 's' : ''} — {metiers.filter((m) => m.is_active).length} active{metiers.filter((m) => m.is_active).length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Exporter CSV
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter une fiche
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, slug, catégorie, code)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Toutes les catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isDndMode && (
          <Badge variant="outline" className="text-xs gap-1">
            <Lock className="h-3 w-3" /> Drag & drop désactivé (filtre/tri actif)
          </Badge>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center">
          <p className="text-muted-foreground">Aucune fiche trouvée.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={isDndMode ? handleDragEnd : undefined}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <SortHeader k="nom" label="Nom" />
                  <SortHeader k="categorie" label="Catégorie" />
                  <SortHeader k="slug" label="Slug" />
                  <SortHeader k="is_active" label="Statut" />
                  <SortHeader k="order_display" label="Ordre" className="text-center" />
                  <SortHeader k="created_at" label="Créée le" />
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={pageRows.map((m) => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {pageRows.map((m) => (
                    <SortableMetierRow
                      key={m.id}
                      m={m}
                      onEdit={openEdit}
                      onDuplicate={handleDuplicate}
                      onDelete={askDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>
      )}

      {/* Pagination */}
      {!loading && sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} sur {sorted.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              Précédent
            </Button>
            <span className="px-3 py-1.5 text-muted-foreground">
              Page {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAdd ? 'Nouvelle fiche métier' : 'Modifier la fiche métier'}
            </DialogTitle>
            <DialogDescription>
              {isAdd
                ? 'Le slug est généré automatiquement à partir du nom — vous pouvez l\'ajuster avant le premier enregistrement.'
                : 'Le slug ne peut plus être modifié après création pour préserver la cohérence des profils.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom <span className="text-destructive">*</span></Label>
                <Input
                  id="nom"
                  value={form.nom}
                  onChange={(e) => handleNomChange(e.target.value)}
                  maxLength={200}
                  placeholder="Ex. Médecin libéral"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="icone">Icône (emoji)</Label>
                <Input
                  id="icone"
                  value={form.icone}
                  onChange={(e) => setForm((f) => ({ ...f, icone: e.target.value }))}
                  maxLength={4}
                  placeholder="🩺"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug" className="flex items-center gap-1.5">
                Slug
                {!isAdd && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Le slug ne peut être modifié pour préserver la cohérence des profils utilisateurs.
                      Pour changer un slug, supprimer puis recréer la fiche.
                    </TooltipContent>
                  </Tooltip>
                )}
              </Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                disabled={!isAdd}
                className={!isAdd ? 'bg-muted cursor-not-allowed font-mono text-sm' : 'font-mono text-sm'}
                placeholder="medecin-liberal"
                maxLength={80}
              />
              {isAdd && (
                <p className="text-[11px] text-muted-foreground">
                  Auto-généré depuis le nom. Caractères autorisés : a-z, 0-9, tiret.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="categorie">Catégorie</Label>
                <Input
                  id="categorie"
                  list="metier-categories"
                  value={form.categorie}
                  onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
                  placeholder="Ex. manuels_terrain"
                />
                <datalist id="metier-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sous_categorie">Sous-catégorie</Label>
                <Input
                  id="sous_categorie"
                  value={form.sous_categorie}
                  onChange={(e) => setForm((f) => ({ ...f, sous_categorie: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code_ref">Code de référence</Label>
                <Input
                  id="code_ref"
                  value={form.code_ref}
                  onChange={(e) => setForm((f) => ({ ...f, code_ref: e.target.value }))}
                  placeholder="1.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="order_display">Ordre d'affichage</Label>
                <Input
                  id="order_display"
                  type="number"
                  value={form.order_display}
                  onChange={(e) => setForm((f) => ({ ...f, order_display: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  {form.is_active ? 'Publiée (visible des utilisateurs)' : 'Non publiée (brouillon)'}
                </Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <RichTextEditor
                value={form.description}
                onChange={(val) => setForm((f) => ({ ...f, description: val }))}
                placeholder="Décrivez le métier, ses spécificités fiscales, les régimes applicables…"
                minHeight={240}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) { setToDelete(null); setDeleteBlocker(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la fiche métier ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Vous êtes sur le point de supprimer <strong>{toDelete?.nom}</strong>.
                  Cette action est <strong>irréversible</strong>.
                </p>
                {deleteBlocker && deleteBlocker.count > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    Cette fiche est utilisée par <strong>{deleteBlocker.count}</strong> utilisateur{deleteBlocker.count > 1 ? 's' : ''}.
                    Vous devez d'abord les réaffecter à un autre métier avant suppression.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting || (deleteBlocker?.count ?? 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression…' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminMetiers;
