import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { FolderOpen, Plus, Pencil, Trash2, AlertTriangle, Search, GripVertical } from 'lucide-react';

interface ContenuRow {
  id: string;
  module_id: string;
  titre: string;
  ordre: number;
  type_contenu: string | null;
  contenu: string | null;
  texte_2: string | null;
  image_url: string | null;
}

interface ModuleRow {
  id: string;
  titre: string;
  order: number;
}

const TYPE_OPTIONS = [
  { value: 'texte', label: 'Texte' },
  { value: 'video', label: 'Vidéo' },
  { value: 'image', label: 'Image' },
  { value: 'exercice', label: 'Exercice' },
];

const AdminContenus = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contenus, setContenus] = useState<ContenuRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('Tous');

  const [editItem, setEditItem] = useState<ContenuRow | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState({
    module_id: '', titre: '', ordre: 0, type_contenu: 'texte',
    contenu: '', texte_2: '', image_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ContenuRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cRes, mRes] = await Promise.all([
      supabase.from('contenus').select('*').order('ordre', { ascending: true }),
      supabase.from('modules').select('id, titre, order').order('order', { ascending: true }),
    ]);
    setContenus(cRes.data ?? []);
    setModules(mRes.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const moduleMap = useMemo(() => {
    const m = new Map<string, ModuleRow>();
    modules.forEach(mod => m.set(mod.id, mod));
    return m;
  }, [modules]);

  const moduleTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    modules.forEach(mod => m.set(mod.id, mod.titre));
    return m;
  }, [modules]);

  const filtered = useMemo(() => {
    let list = contenus;
    if (moduleFilter !== 'Tous') list = list.filter(c => c.module_id === moduleFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(c => c.titre.toLowerCase().includes(s));
    }
    return list;
  }, [contenus, moduleFilter, search]);

  // Group by module, sorted by module order
  const groupedByModule = useMemo(() => {
    const groups = new Map<string, ContenuRow[]>();
    filtered.forEach(c => {
      const existing = groups.get(c.module_id) ?? [];
      existing.push(c);
      groups.set(c.module_id, existing);
    });
    // Sort groups by module order
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        const orderA = moduleMap.get(a)?.order ?? 999;
        const orderB = moduleMap.get(b)?.order ?? 999;
        return orderA - orderB;
      })
      .map(([moduleId, items]) => ({
        moduleId,
        module: moduleMap.get(moduleId),
        items: items.sort((a, b) => a.ordre - b.ordre),
      }));
  }, [filtered, moduleMap]);

  const openAdd = () => {
    setIsAdd(true);
    setEditItem(null);
    const maxOrdre = contenus.length > 0 ? Math.max(...contenus.map(c => c.ordre)) + 1 : 1;
    setForm({ module_id: modules[0]?.id ?? '', titre: '', ordre: maxOrdre, type_contenu: 'texte', contenu: '', texte_2: '', image_url: '' });
  };

  const openEdit = (c: ContenuRow) => {
    setIsAdd(false);
    setEditItem(c);
    setForm({
      module_id: c.module_id, titre: c.titre, ordre: c.ordre,
      type_contenu: c.type_contenu ?? 'texte',
      contenu: c.contenu ?? '', texte_2: c.texte_2 ?? '', image_url: c.image_url ?? '',
    });
  };

  const closeModal = () => { setIsAdd(false); setEditItem(null); };

  const handleSave = async () => {
    if (!form.module_id || !form.titre.trim()) {
      toast({ title: 'Le module et le titre sont obligatoires', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      module_id: form.module_id,
      titre: form.titre.trim(),
      ordre: form.ordre,
      type_contenu: form.type_contenu,
      contenu: form.contenu.trim() || null,
      texte_2: form.texte_2.trim() || null,
      image_url: form.image_url.trim() || null,
    };

    if (isAdd) {
      const { error } = await supabase.from('contenus').insert(payload);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Contenu créé ✓' }); closeModal(); fetchData(); }
    } else if (editItem) {
      const { error } = await supabase.from('contenus').update(payload as any).eq('id', editItem.id);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Contenu mis à jour ✓' }); closeModal(); fetchData(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    const { error } = await supabase.from('contenus').delete().eq('id', deleteItem.id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Contenu supprimé' }); setDeleteItem(null); fetchData(); }
    setDeleting(false);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-96 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="h-6 w-6" /> Contenus ({filtered.length})
        </h1>
        <Button size="sm" className="gap-2" style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }} onClick={openAdd}>
          <Plus className="h-4 w-4" /> Ajouter un contenu
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un contenu…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous les modules</SelectItem>
            {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.titre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {groupedByModule.length === 0 ? (
        <Card className="border-border bg-background shadow-sm p-10 text-center text-muted-foreground">
          Aucun contenu trouvé.
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByModule.map(({ moduleId, module, items }) => (
            <Card key={moduleId} className="border-border bg-background shadow-sm overflow-hidden">
              {/* Module header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <Badge variant="outline" className="font-mono text-xs w-8 justify-center shrink-0">
                  {String(module?.order ?? '?').padStart(2, '0')}
                </Badge>
                <h3 className="font-heading font-semibold text-foreground text-sm truncate">
                  {module?.titre ?? 'Module inconnu'}
                </h3>
                <Badge className="ml-auto shrink-0 text-xs bg-primary/10 text-primary">
                  {items.length} contenu{items.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Ordre</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{String(c.ordre).padStart(2, '0')}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium truncate max-w-[250px]">{c.titre}</TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary text-xs capitalize">{c.type_contenu ?? 'texte'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteItem(c)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isAdd || !!editItem} onOpenChange={open => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{isAdd ? '➕ Nouveau contenu' : '✏️ Modifier le contenu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Module *</Label>
                <Select value={form.module_id} onValueChange={v => setForm(p => ({ ...p, module_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.titre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ordre</Label>
                <Input type="number" value={form.ordre} onChange={e => setForm(p => ({ ...p, ordre: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type de contenu</Label>
              <Select value={form.type_contenu} onValueChange={v => setForm(p => ({ ...p, type_contenu: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contenu principal</Label>
              <Textarea value={form.contenu} onChange={e => setForm(p => ({ ...p, contenu: e.target.value }))} rows={5} />
            </div>
            <div className="space-y-1.5">
              <Label>Texte secondaire</Label>
              <Textarea value={form.texte_2} onChange={e => setForm(p => ({ ...p, texte_2: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>URL de l'image</Label>
              <Input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://…" />
              {form.image_url && (
                <img src={form.image_url} alt="Aperçu" className="mt-2 rounded-md max-h-32 object-cover" />
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}>
              {saving ? 'Enregistrement…' : isAdd ? '➕ Créer' : '💾 Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deleteItem} onOpenChange={open => { if (!open) setDeleteItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Supprimer ce contenu
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ⚠️ « {deleteItem?.titre} » sera supprimé définitivement.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Annuler</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContenus;
