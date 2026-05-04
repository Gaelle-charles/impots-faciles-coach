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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { BookMarked, Plus, Pencil, Trash2, Search } from 'lucide-react';

interface PasseportRow {
  id: string;
  numero: number;
  nom: string;
  slug: string;
  description: string | null;
  regime_fiscal: string;
  regime_social: string;
  plan_minimum: string;
  passeport_card_md: string;
  ordre: number;
  is_active: boolean;
  contenu_sections: unknown;
  conditions_matching: unknown;
}

const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

const formatJson = (v: unknown) => {
  try { return JSON.stringify(v ?? {}, null, 2); } catch { return '{}'; }
};

const AdminPasseportsFiscaux = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PasseportRow[]>([]);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [isAdd, setIsAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    numero: '',
    nom: '',
    slug: '',
    description: '',
    regime_fiscal: '',
    regime_social: '',
    plan_minimum: 'premium',
    passeport_card_md: '',
    ordre: '',
    is_active: true,
  });
  const [contenuStr, setContenuStr] = useState('{}');
  const [conditionsStr, setConditionsStr] = useState('{}');
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<PasseportRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('passeports_fiscaux')
      .select('*')
      .order('ordre', { ascending: true });
    if (error) {
      toast({ title: 'Erreur de chargement', description: error.message, variant: 'destructive' });
    } else {
      setRows((data ?? []) as PasseportRow[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      r.nom.toLowerCase().includes(s) ||
      (r.slug ?? '').toLowerCase().includes(s) ||
      (r.regime_fiscal ?? '').toLowerCase().includes(s),
    );
  }, [rows, search]);

  const openAdd = () => {
    setIsAdd(true);
    setEditingId(null);
    const maxOrdre = rows.reduce((acc, r) => Math.max(acc, r.ordre ?? 0), 0);
    const maxNum = rows.reduce((acc, r) => Math.max(acc, r.numero ?? 0), 0);
    setForm({
      numero: String(maxNum + 1),
      nom: '',
      slug: '',
      description: '',
      regime_fiscal: '',
      regime_social: '',
      plan_minimum: 'premium',
      passeport_card_md: '',
      ordre: String(maxOrdre + 1),
      is_active: true,
    });
    setContenuStr('{\n  "sections": []\n}');
    setConditionsStr('{\n  "match_all": []\n}');
    setOpen(true);
  };

  const openEdit = (r: PasseportRow) => {
    setIsAdd(false);
    setEditingId(r.id);
    setForm({
      numero: String(r.numero ?? ''),
      nom: r.nom,
      slug: r.slug,
      description: r.description ?? '',
      regime_fiscal: r.regime_fiscal ?? '',
      regime_social: r.regime_social ?? '',
      plan_minimum: r.plan_minimum ?? 'premium',
      passeport_card_md: r.passeport_card_md ?? '',
      ordre: String(r.ordre ?? 0),
      is_active: !!r.is_active,
    });
    setContenuStr(formatJson(r.contenu_sections));
    setConditionsStr(formatJson(r.conditions_matching));
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
    if (!form.regime_fiscal.trim() || !form.regime_social.trim()) {
      toast({ title: 'Champs requis', description: 'Régimes fiscal et social sont obligatoires.', variant: 'destructive' });
      return;
    }
    let contenuParsed: unknown;
    let conditionsParsed: unknown;
    try { contenuParsed = JSON.parse(contenuStr || '{}'); }
    catch { toast({ title: 'JSON invalide', description: 'contenu_sections', variant: 'destructive' }); return; }
    try { conditionsParsed = JSON.parse(conditionsStr || '{}'); }
    catch { toast({ title: 'JSON invalide', description: 'conditions_matching', variant: 'destructive' }); return; }

    setSaving(true);
    const basePayload: any = {
      numero: Number(form.numero),
      nom: form.nom.trim(),
      description: form.description || null,
      regime_fiscal: form.regime_fiscal.trim(),
      regime_social: form.regime_social.trim(),
      plan_minimum: form.plan_minimum,
      passeport_card_md: form.passeport_card_md ?? '',
      ordre: Number(form.ordre) || 0,
      is_active: form.is_active,
      contenu_sections: contenuParsed,
      conditions_matching: conditionsParsed,
    };

    if (isAdd) {
      const { error } = await (supabase as any).from('passeports_fiscaux').insert({ ...basePayload, slug: form.slug.trim() });
      setSaving(false);
      if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Passeport créé', description: form.nom });
    } else {
      const { error } = await (supabase as any).from('passeports_fiscaux').update(basePayload).eq('id', editingId!);
      setSaving(false);
      if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Passeport mis à jour' });
    }
    setOpen(false);
    fetchData();
  };

  const handleToggleActive = async (r: PasseportRow, value: boolean) => {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: value } : x)));
    const { error } = await (supabase as any).from('passeports_fiscaux').update({ is_active: value }).eq('id', r.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      fetchData();
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await (supabase as any).from('passeports_fiscaux').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Passeport supprimé', description: toDelete.nom });
    setToDelete(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookMarked className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-heading font-bold">Passeports fiscaux</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les fiches passeport fiscal Premium (matching profil utilisateur).
            </p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau passeport
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, slug ou régime…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">N°</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="hidden md:table-cell">Régime fiscal</TableHead>
              <TableHead className="hidden lg:table-cell">Régime social</TableHead>
              <TableHead className="w-24">Plan min</TableHead>
              <TableHead className="w-24">Actif</TableHead>
              <TableHead className="w-20 text-center">Ordre</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Aucun passeport.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.numero}</TableCell>
                  <TableCell className="font-medium">{r.nom}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.slug}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{r.regime_fiscal}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{r.regime_social}</TableCell>
                  <TableCell className="text-xs capitalize">{r.plan_minimum}</TableCell>
                  <TableCell>
                    <Switch checked={!!r.is_active} onCheckedChange={(v) => handleToggleActive(r, v)} />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{r.ordre ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAdd ? 'Nouveau passeport fiscal' : 'Modifier le passeport fiscal'}</DialogTitle>
            <DialogDescription>
              Renseignez les métadonnées, le contenu structuré et les conditions de matching (JSONB).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Numéro *</Label>
                <Input type="number" value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
              <div>
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={form.ordre}
                  onChange={(e) => setForm((f) => ({ ...f, ordre: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={(e) => handleNomChange(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Slug * {!isAdd && <span className="text-xs text-muted-foreground">(non modifiable)</span>}</Label>
                <Input value={form.slug} disabled={!isAdd}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </div>
              <div>
                <Label>Plan minimum</Label>
                <Select value={form.plan_minimum} onValueChange={(v) => setForm((f) => ({ ...f, plan_minimum: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Régime fiscal *</Label>
                <Input value={form.regime_fiscal}
                  onChange={(e) => setForm((f) => ({ ...f, regime_fiscal: e.target.value }))} />
              </div>
              <div>
                <Label>Régime social *</Label>
                <Input value={form.regime_social}
                  onChange={(e) => setForm((f) => ({ ...f, regime_social: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Description courte</Label>
              <Textarea rows={2} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <Label>Carte passeport (markdown)</Label>
              <Textarea rows={4} value={form.passeport_card_md}
                onChange={(e) => setForm((f) => ({ ...f, passeport_card_md: e.target.value }))} />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Actif (visible côté Premium)</Label>
            </div>

            <div>
              <Label>Contenu sections (JSON)</Label>
              <Textarea rows={10} className="font-mono text-xs" value={contenuStr}
                onChange={(e) => setContenuStr(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Format attendu : {'{ "sections": [{ "key": "...", "title": "...", "content_md": "..." }] }'}
              </p>
            </div>

            <div>
              <Label>Conditions de matching (JSON)</Label>
              <Textarea rows={8} className="font-mono text-xs" value={conditionsStr}
                onChange={(e) => setConditionsStr(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Format : {'{ "match_all": [{ "field": "...", "operator": "equals", "value": "..." }], "match_any": [...] }'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce passeport fiscal ?</AlertDialogTitle>
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

export default AdminPasseportsFiscaux;
