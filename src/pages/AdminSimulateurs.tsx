import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, GripVertical, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Simulateur } from '@/hooks/useSimulateurs';

type PlanMin = 'starter' | 'expert' | 'premium';

type FormState = {
  slug: string;
  nom: string;
  description: string;
  plan_minimum: PlanMin;
  is_active: boolean;
  highlight_si_salarie: boolean;
  highlight_si_independant: boolean;
  highlight_si_dirigeant: boolean;
  highlight_si_couple: boolean;
  highlight_si_revenus_fonciers: boolean;
  highlight_si_placements: boolean;
  highlight_si_revenus_eleves: boolean;
};

const emptyForm: FormState = {
  slug: '',
  nom: '',
  description: '',
  plan_minimum: 'starter',
  is_active: true,
  highlight_si_salarie: false,
  highlight_si_independant: false,
  highlight_si_dirigeant: false,
  highlight_si_couple: false,
  highlight_si_revenus_fonciers: false,
  highlight_si_placements: false,
  highlight_si_revenus_eleves: false,
};

const HIGHLIGHTS: Array<{ key: keyof FormState; label: string }> = [
  { key: 'highlight_si_salarie', label: 'Salarié' },
  { key: 'highlight_si_independant', label: 'Indépendant' },
  { key: 'highlight_si_dirigeant', label: 'Dirigeant' },
  { key: 'highlight_si_couple', label: 'Couple' },
  { key: 'highlight_si_revenus_fonciers', label: 'Revenus fonciers' },
  { key: 'highlight_si_placements', label: 'Placements' },
  { key: 'highlight_si_revenus_eleves', label: 'Revenus élevés (>80K)' },
];

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function SortableRow({
  sim,
  onEdit,
  onToggle,
}: {
  sim: Simulateur;
  onEdit: (s: Simulateur) => void;
  onToggle: (s: Simulateur) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sim.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="w-12 text-center text-xs text-muted-foreground">{sim.ordre}</TableCell>
      <TableCell className="font-medium">{sim.nom}</TableCell>
      <TableCell className="text-xs font-mono text-muted-foreground">{sim.slug}</TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {sim.plan_minimum}
        </Badge>
      </TableCell>
      <TableCell>
        <Switch checked={sim.is_active} onCheckedChange={() => onToggle(sim)} />
      </TableCell>
      <TableCell className="text-right tabular-nums">{sim.nb_utilisations}</TableCell>
      <TableCell className="text-right">
        <Button size="icon" variant="ghost" onClick={() => onEdit(sim)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function AdminSimulateurs() {
  const [items, setItems] = useState<Simulateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('simulateurs')
      .select('*')
      .order('ordre', { ascending: true });
    if (error) toast.error('Erreur de chargement');
    else setItems((data ?? []) as Simulateur[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const actifs = items.filter((s) => s.is_active).length;
    const utilisations = items.reduce((acc, s) => acc + s.nb_utilisations, 0);
    return { total, actifs, utilisations };
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Simulateur) => {
    setEditingId(s.id);
    setForm({
      slug: s.slug,
      nom: s.nom,
      description: s.description,
      plan_minimum: s.plan_minimum,
      is_active: s.is_active,
      highlight_si_salarie: s.highlight_si_salarie,
      highlight_si_independant: s.highlight_si_independant,
      highlight_si_dirigeant: s.highlight_si_dirigeant,
      highlight_si_couple: s.highlight_si_couple,
      highlight_si_revenus_fonciers: s.highlight_si_revenus_fonciers,
      highlight_si_placements: s.highlight_si_placements,
      highlight_si_revenus_eleves: s.highlight_si_revenus_eleves,
    });
    setDialogOpen(true);
  };

  const validate = (): string | null => {
    if (!form.nom.trim()) return 'Le nom est obligatoire.';
    if (!form.description.trim()) return 'La description est obligatoire.';
    if (!editingId) {
      if (!form.slug.trim()) return 'Le slug est obligatoire.';
      if (!SLUG_REGEX.test(form.slug.trim())) {
        return 'Le slug doit être en kebab-case (ex: mon-simulateur).';
      }
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    if (editingId) {
      // Mise à jour : pas de modif du slug
      const { slug: _slug, ...rest } = form;
      const { error } = await supabase.from('simulateurs').update(rest).eq('id', editingId);
      setSaving(false);
      if (error) {
        toast.error(`Erreur : ${error.message}`);
        return;
      }
      toast.success('Simulateur mis à jour');
    } else {
      // Création : on place en fin de liste
      const nextOrdre =
        items.length === 0 ? 1 : Math.max(...items.map((i) => i.ordre)) + 1;
      const { error } = await supabase.from('simulateurs').insert({
        ...form,
        slug: form.slug.trim(),
        ordre: nextOrdre,
      });
      setSaving(false);
      if (error) {
        toast.error(`Erreur : ${error.message}`);
        return;
      }
      toast.success('Simulateur créé');
    }
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (s: Simulateur) => {
    const { error } = await supabase
      .from('simulateurs')
      .update({ is_active: !s.is_active })
      .eq('id', s.id);
    if (error) {
      toast.error('Erreur lors du changement de statut');
      return;
    }
    toast.success(s.is_active ? 'Désactivé' : 'Activé');
    load();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({
      ...it,
      ordre: idx + 1,
    }));
    setItems(reordered); // optimistic
    // Persist : un update par item (table 12 lignes max → OK)
    const updates = await Promise.all(
      reordered.map((it) =>
        supabase.from('simulateurs').update({ ordre: it.ordre }).eq('id', it.id)
      )
    );
    const failed = updates.find((u) => u.error);
    if (failed) {
      toast.error('Erreur de réordonnancement');
      load();
    } else {
      toast.success('Ordre mis à jour');
    }
  };

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" /> Gestion des simulateurs
          </h1>
          <p className="text-sm text-muted-foreground">
            Pilotez les 12 simulateurs : ordre, plan minimum, mise en avant par profil, statut.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un simulateur
        </Button>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground tracking-wider">Total</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground tracking-wider">Actifs</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-600">{stats.actifs}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground tracking-wider">Utilisations totales</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.utilisations.toLocaleString('fr-FR')}</p></CardContent>
        </Card>
      </div>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des simulateurs ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun simulateur.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan min.</TableHead>
                    <TableHead className="w-24">Actif</TableHead>
                    <TableHead className="text-right">Utilisations</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {items.map((sim) => (
                      <SortableRow key={sim.id} sim={sim} onEdit={openEdit} onToggle={toggleActive} />
                    ))}
                  </TableBody>
                </SortableContext>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier le simulateur' : 'Nouveau simulateur'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Le slug ne peut pas être modifié après création.'
                : 'Le slug doit être en kebab-case (ex : mon-simulateur).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Slug {editingId ? '(lecture seule)' : '*'}</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                disabled={!!editingId}
                placeholder="mon-simulateur"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan minimum</Label>
                <Select
                  value={form.plan_minimum}
                  onValueChange={(v) => setForm({ ...form, plan_minimum: v as PlanMin })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Actif</Label>
                <div className="h-10 flex items-center">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Mis en avant si profil…</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {HIGHLIGHTS.map((h) => (
                  <label key={h.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch
                      checked={form[h.key] as boolean}
                      onCheckedChange={(v) => setForm({ ...form, [h.key]: v } as FormState)}
                    />
                    <span>{h.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
