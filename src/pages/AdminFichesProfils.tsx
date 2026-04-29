import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from '@/hooks/use-toast';
import { UserSquare2, Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import { ContenuSectionsEditor } from '@/components/admin/ContenuSectionsEditor';
import { FichePreviewDialog } from '@/components/admin/FichePreviewDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ProfilRow {
  id: string;
  numero: number;
  nom: string;
  slug: string;
  icone: string | null;
  description: string | null;
  order_display: number | null;
  is_active: boolean | null;
  contenu_sections: unknown;
  created_at: string | null;
}

const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

const AdminFichesProfils = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProfilRow[]>([]);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [isAdd, setIsAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    numero: '',
    nom: '',
    slug: '',
    icone: '',
    description: '',
    order_display: '',
    is_active: true,
  });
  const [contenuSections, setContenuSections] = useState<unknown>(null);
  const [contenuValid, setContenuValid] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<ProfilRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('fiches_profils')
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

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      r.nom.toLowerCase().includes(s) ||
      (r.slug ?? '').toLowerCase().includes(s),
    );
  }, [rows, search]);

  const openAdd = () => {
    setIsAdd(true);
    setEditingId(null);
    const maxOrder = rows.reduce((acc, r) => Math.max(acc, r.order_display ?? 0), 0);
    const maxNum = rows.reduce((acc, r) => Math.max(acc, r.numero ?? 0), 0);
    setForm({
      numero: String(maxNum + 1),
      nom: '',
      slug: '',
      icone: '',
      description: '',
      order_display: String(maxOrder + 1),
      is_active: true,
    });
    setContenuSections(null);
    setContenuValid(true);
    setOpen(true);
  };

  const openEdit = (r: ProfilRow) => {
    setIsAdd(false);
    setEditingId(r.id);
    setForm({
      numero: String(r.numero ?? ''),
      nom: r.nom,
      slug: r.slug,
      icone: r.icone ?? '',
      description: r.description ?? '',
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
    if (!form.nom.trim() || !form.slug.trim() || !form.numero.trim()) {
      toast({ title: 'Champs requis', description: 'Numéro, nom et slug sont obligatoires.', variant: 'destructive' });
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
      numero: Number(form.numero),
      nom: form.nom.trim(),
      icone: form.icone.trim() || null,
      description: form.description || null,
      order_display: Number.isFinite(orderNum as number) ? orderNum : null,
      is_active: form.is_active,
      contenu_sections: contenuPayload,
    };

    if (isAdd) {
      const { error } = await supabase.from('fiches_profils').insert({ ...basePayload, slug: form.slug.trim() });
      setSaving(false);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Fiche profil créée', description: form.nom });
    } else {
      const { error } = await supabase.from('fiches_profils').update(basePayload).eq('id', editingId!);
      setSaving(false);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Fiche profil mise à jour' });
    }
    setOpen(false);
    fetchData();
  };

  const handleToggleActive = async (r: ProfilRow, value: boolean) => {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: value } : x)));
    const { error } = await supabase.from('fiches_profils').update({ is_active: value }).eq('id', r.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      fetchData();
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('fiches_profils').delete().eq('id', toDelete.id);
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
          <UserSquare2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-heading font-bold">Fiches profils contribuables</h1>
            <p className="text-sm text-muted-foreground">Gérez les fiches éditoriales par profil de contribuable.</p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle fiche
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">N°</TableHead>
              <TableHead>Nom</TableHead>
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
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucune fiche profil.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.numero}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {r.icone && <span>{r.icone}</span>}
                      <span>{r.nom}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.slug}</TableCell>
                  <TableCell>
                    <Switch checked={!!r.is_active} onCheckedChange={(v) => handleToggleActive(r, v)} />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{r.order_display ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(r)}
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
            <DialogTitle>{isAdd ? 'Nouvelle fiche profil' : 'Modifier la fiche profil'}</DialogTitle>
            <DialogDescription>
              Renseignez les métadonnées et le contenu structuré (JSONB).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Numéro *</Label>
                <Input
                  type="number"
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                />
              </div>
              <div>
                <Label>Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={form.order_display}
                  onChange={(e) => setForm((f) => ({ ...f, order_display: e.target.value }))}
                />
              </div>
            </div>

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
                <Label>Icône (emoji)</Label>
                <Input value={form.icone} onChange={(e) => setForm((f) => ({ ...f, icone: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Description courte (résumé / fallback si pas de sections)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label>Active (visible côté public)</Label>
            </div>

            <ContenuSectionsEditor
              type="fiches_profils"
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
            <AlertDialogTitle>Supprimer cette fiche profil ?</AlertDialogTitle>
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
    </div>
  );
};

export default AdminFichesProfils;
