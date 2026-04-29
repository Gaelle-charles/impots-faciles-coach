import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from '@/hooks/use-toast';
import { Globe2, Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import { ContenuSectionsEditor } from '@/components/admin/ContenuSectionsEditor';
import { FichePreviewDialog } from '@/components/admin/FichePreviewDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PaysRow {
  id: string;
  nom: string;
  slug: string | null;
  zone: string;
  code_iso: string | null;
  type: string | null;
  icone: string | null;
  order_display: number | null;
  is_active: boolean | null;
  contenu_sections: unknown;
  created_at: string | null;
}

const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

const ZONES = ['UE', 'Europe hors UE', 'Amérique du Nord', 'Amérique latine', 'Asie', 'Afrique', 'Océanie', 'Moyen-Orient', 'Autre'];

const AdminPays = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaysRow[]>([]);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('Toutes');

  const [open, setOpen] = useState(false);
  const [isAdd, setIsAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: '',
    slug: '',
    zone: '',
    code_iso: '',
    icone: '',
    order_display: '',
    is_active: true,
  });
  const [contenuSections, setContenuSections] = useState<unknown>(null);
  const [contenuValid, setContenuValid] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<PaysRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewRow, setPreviewRow] = useState<PaysRow | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('pays')
      .select('*')
      .order('order_display', { ascending: true, nullsFirst: false });
    if (error) {
      toast({ title: 'Erreur de chargement', description: error.message, variant: 'destructive' });
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const zones = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.zone) set.add(r.zone); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (zoneFilter !== 'Toutes') list = list.filter((r) => r.zone === zoneFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((r) =>
        r.nom.toLowerCase().includes(s) ||
        (r.slug ?? '').toLowerCase().includes(s) ||
        (r.code_iso ?? '').toLowerCase().includes(s),
      );
    }
    return list;
  }, [rows, search, zoneFilter]);

  const openAdd = () => {
    setIsAdd(true);
    setEditingId(null);
    const maxOrder = rows.reduce((acc, r) => Math.max(acc, r.order_display ?? 0), 0);
    setForm({
      nom: '',
      slug: '',
      zone: 'UE',
      code_iso: '',
      icone: '',
      order_display: String(maxOrder + 1),
      is_active: true,
    });
    setContenuSections(null);
    setContenuValid(true);
    setOpen(true);
  };

  const openEdit = (r: PaysRow) => {
    setIsAdd(false);
    setEditingId(r.id);
    setForm({
      nom: r.nom,
      slug: r.slug ?? '',
      zone: r.zone ?? '',
      code_iso: r.code_iso ?? '',
      icone: r.icone ?? '',
      order_display: r.order_display != null ? String(r.order_display) : '',
      is_active: r.is_active ?? true,
    });
    const cs = r.contenu_sections;
    const hasContent = cs && typeof cs === 'object' && Object.keys(cs as object).length > 0;
    setContenuSections(hasContent ? cs : null);
    setContenuValid(true);
    setOpen(true);
  };

  const handleNomChange = (value: string) => {
    setForm((f) => {
      if (isAdd && (f.slug === '' || f.slug === slugify(f.nom))) {
        return { ...f, nom: value, slug: slugify(value) };
      }
      return { ...f, nom: value };
    });
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.zone.trim()) {
      toast({ title: 'Champs requis', description: 'Nom et zone sont obligatoires.', variant: 'destructive' });
      return;
    }
    if (isAdd && !form.slug.trim()) {
      toast({ title: 'Champ requis', description: 'Le slug est obligatoire.', variant: 'destructive' });
      return;
    }
    if (!contenuValid) {
      toast({ title: 'JSON invalide', description: 'Corrigez les erreurs avant d\'enregistrer.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const orderNum = form.order_display.trim() === '' ? null : Number(form.order_display);
    const contenuPayload = (contenuSections ?? {}) as never;

    const basePayload = {
      nom: form.nom.trim(),
      zone: form.zone.trim(),
      code_iso: form.code_iso.trim() || null,
      icone: form.icone.trim() || null,
      order_display: Number.isFinite(orderNum as number) ? orderNum : null,
      is_active: form.is_active,
      contenu_sections: contenuPayload,
    };

    if (isAdd) {
      const { error } = await supabase.from('pays').insert({ ...basePayload, slug: form.slug.trim() });
      setSaving(false);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Fiche pays créée', description: form.nom });
    } else {
      const { error } = await supabase.from('pays').update(basePayload).eq('id', editingId!);
      setSaving(false);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Fiche pays mise à jour' });
    }
    setOpen(false);
    fetchData();
  };

  const handleToggleActive = async (r: PaysRow, value: boolean) => {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: value } : x)));
    const { error } = await supabase.from('pays').update({ is_active: value }).eq('id', r.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      fetchData();
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('pays').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Fiche supprimée', description: toDelete.nom });
    setToDelete(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Globe2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-heading font-bold">Fiches pays</h1>
            <p className="text-sm text-muted-foreground">Gérez les fiches éditoriales par pays / zone fiscale.</p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle fiche
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, slug, code ISO…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Toutes">Toutes les zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead className="w-20">ISO</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-24">Actif</TableHead>
              <TableHead className="w-20 text-center">Ordre</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucune fiche pays.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {r.icone && <span>{r.icone}</span>}
                      <span>{r.nom}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.zone}</TableCell>
                  <TableCell className="text-xs font-mono">{r.code_iso ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.slug ?? '—'}</TableCell>
                  <TableCell>
                    <Switch checked={!!r.is_active} onCheckedChange={(v) => handleToggleActive(r, v)} />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{r.order_display ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPreviewRow(r)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Aperçu de la fiche</TooltipContent>
                      </Tooltip>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(r)} title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(r)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAdd ? 'Nouvelle fiche pays' : 'Modifier la fiche pays'}</DialogTitle>
            <DialogDescription>
              Renseignez les métadonnées et le contenu structuré (JSONB).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={(e) => handleNomChange(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Slug * {!isAdd && <span className="text-xs text-muted-foreground">(non modifiable)</span>}</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  disabled={!isAdd}
                />
              </div>
              <div>
                <Label>Code ISO (ex. FR, US)</Label>
                <Input
                  value={form.code_iso}
                  onChange={(e) => setForm((f) => ({ ...f, code_iso: e.target.value.toUpperCase() }))}
                  maxLength={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Zone *</Label>
                <Select value={form.zone} onValueChange={(v) => setForm((f) => ({ ...f, zone: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONES.map((z) => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Icône (emoji / drapeau)</Label>
                <Input value={form.icone} onChange={(e) => setForm((f) => ({ ...f, icone: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={form.order_display}
                  onChange={(e) => setForm((f) => ({ ...f, order_display: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label>Active (visible côté public)</Label>
              </div>
            </div>

            <ContenuSectionsEditor
              type="pays"
              value={contenuSections}
              onChange={setContenuSections}
              onValidityChange={setContenuValid}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !contenuValid}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette fiche pays ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer <strong>{toDelete?.nom}</strong>. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FichePreviewDialog
        open={!!previewRow}
        onOpenChange={(v) => !v && setPreviewRow(null)}
        ficheType="pays"
        ficheData={previewRow}
      />
    </div>
  );
};

export default AdminPays;
