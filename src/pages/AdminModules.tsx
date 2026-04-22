import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Library,
  Plus,
  Trash2,
  GripVertical,
  Save,
  X,
  AlertTriangle,
  Settings,
  FileText,
  HelpCircle,
  Eye,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ───
interface ModuleRow {
  id: string;
  titre: string;
  module_slug: string;
  is_published: boolean;
  order: number;
  total_step: number;
  accessibilite: string[];
  text_resultat_expert: string | null;
  text_resultat_moyen: string | null;
  text_resultat_faible: string | null;
}

interface ModuleStats extends ModuleRow {
  contenuCount: number;
  quizCount: number;
  rate: number;
}

const PLANS = ['nouveau', 'essentiel', 'pro', 'expert'];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Sortable Row ───
function SortableModuleRow({
  mod,
  reorderMode,
  onEdit,
  onDelete,
  onToggle,
}: {
  mod: ModuleStats;
  reorderMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (checked: boolean) => void;
}) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod.id, disabled: !reorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-lg border border-border bg-background p-4 shadow-sm"
    >
      <div className="flex items-center gap-3 min-w-0">
        {reorderMode && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        {/* Order badge */}
        <Badge variant="outline" className="shrink-0 font-mono text-xs w-8 justify-center">
          {String(mod.order).padStart(2, '0')}
        </Badge>

        {/* Status */}
        <Badge
          className={`shrink-0 text-xs ${
            mod.is_published
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {mod.is_published ? 'Publié' : 'Brouillon'}
        </Badge>

        {/* Title */}
        <span className="font-heading font-semibold text-foreground min-w-0 truncate">
          {mod.titre}
        </span>

        {/* Stats inline on larger screens */}
        <span className="hidden lg:inline text-xs text-muted-foreground whitespace-nowrap">
          {mod.contenuCount} étapes
        </span>
        <span className="hidden lg:inline text-xs text-muted-foreground whitespace-nowrap">
          {mod.quizCount} questions
        </span>
        <span className="hidden xl:inline text-xs text-muted-foreground whitespace-nowrap">
          {mod.rate}%
        </span>
      </div>

      {/* Stats on mobile */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground lg:hidden pl-11">
        <span>{mod.contenuCount} étapes</span>
        <span>{mod.quizCount} questions</span>
        <span>{mod.rate}%</span>
      </div>

      {!reorderMode && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap lg:ml-auto pl-11 lg:pl-0">
          <Switch
            checked={mod.is_published}
            onCheckedChange={onToggle}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.open(`/module/${mod.module_slug}`, '_blank', 'noopener,noreferrer')}
            title="Voir comme un utilisateur (nouvel onglet)"
          >
            <Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Aperçu</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onEdit}
          >
            <Settings className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Métadonnées</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900"
            onClick={() => navigate(`/admin/modules/${mod.id}/contenus`)}
          >
            <FileText className="h-3.5 w-3.5" /> Étapes ({mod.total_step})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900"
            onClick={() => navigate(`/admin/modules/${mod.id}/quiz`)}
          >
            <HelpCircle className="h-3.5 w-3.5" /> Quiz ({mod.quizCount})
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───
const AdminModules = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [contenus, setContenus] = useState<{ module_id: string }[]>([]);
  const [quizzes, setQuizzes] = useState<{ module_id: string }[]>([]);
  const [progressions, setProgressions] = useState<{ module_id: string; user_id: string; completion_date: string | null }[]>([]);

  // Reorder state
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedModules, setOrderedModules] = useState<ModuleRow[]>([]);
  const [originalOrder, setOriginalOrder] = useState<ModuleRow[]>([]);

  // Edit / Add modal
  const [editModule, setEditModule] = useState<ModuleRow | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({
    titre: '',
    module_slug: '',
    accessibilite: [] as string[],
    text_resultat_expert: '',
    text_resultat_moyen: '',
    text_resultat_faible: '',
    is_published: false,
  });
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteModule, setDeleteModule] = useState<ModuleRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Fetch ───
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [mRes, cRes, qRes, pRes] = await Promise.all([
      supabase.from('modules').select('id, titre, module_slug, is_published, order, total_step, accessibilite, text_resultat_expert, text_resultat_moyen, text_resultat_faible').order('order', { ascending: true }),
      supabase.from('contenus').select('module_id'),
      supabase.from('quizz').select('module_id'),
      supabase.from('progressions').select('module_id, user_id, completion_date'),
    ]);
    const mods = (mRes.data ?? []) as ModuleRow[];
    setModules(mods);
    setContenus(cRes.data ?? []);
    setQuizzes(qRes.data ?? []);
    setProgressions(pRes.data ?? []);
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

  // ─── Computed stats ───
  const moduleStats: ModuleStats[] = useMemo(() => {
    return modules.map((mod) => {
      const contenuCount = contenus.filter((c) => c.module_id === mod.id).length;
      const quizCount = quizzes.filter((q) => q.module_id === mod.id).length;
      const modProgs = progressions.filter((p) => p.module_id === mod.id);
      const startedUsers = new Set(modProgs.map((p) => p.user_id)).size;
      const completedUsers = new Set(modProgs.filter((p) => !!p.completion_date).map((p) => p.user_id)).size;
      const rate = startedUsers > 0 ? Math.round((completedUsers / startedUsers) * 100) : 0;
      return { ...mod, contenuCount, quizCount, rate };
    });
  }, [modules, contenus, quizzes, progressions]);

  const displayList = reorderMode ? orderedModules : modules;

  // ─── Reorder ───
  const enterReorder = () => {
    setOriginalOrder([...modules]);
    setOrderedModules([...modules]);
    setReorderMode(true);
  };

  const cancelReorder = () => {
    setReorderMode(false);
    setOrderedModules([]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedModules((prev) => {
      const oldIdx = prev.findIndex((m) => m.id === active.id);
      const newIdx = prev.findIndex((m) => m.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    const updates = orderedModules.map((m, i) => ({
      id: m.id,
      order: i + 1,
    }));
    // Update each module order
    for (const u of updates) {
      await supabase.from('modules').update({ order: u.order } as any).eq('id', u.id);
    }
    setModules(orderedModules.map((m, i) => ({ ...m, order: i + 1 })));
    setReorderMode(false);
    setSaving(false);
    toast({ title: 'Ordre enregistré ✓' });
  };

  // ─── Toggle publish ───
  const handleToggle = async (mod: ModuleRow, checked: boolean) => {
    const { error } = await supabase.from('modules').update({ is_published: checked } as any).eq('id', mod.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setModules((prev) => prev.map((m) => m.id === mod.id ? { ...m, is_published: checked } : m));
      toast({ title: checked ? 'Module publié' : 'Module masqué' });
    }
  };

  // ─── Edit / Add modal ───
  const openEdit = (mod: ModuleRow) => {
    setEditModule(mod);
    setIsAddMode(false);
    setSlugManual(false);
    setFormData({
      titre: mod.titre,
      module_slug: mod.module_slug,
      accessibilite: mod.accessibilite ?? [],
      text_resultat_expert: mod.text_resultat_expert ?? '',
      text_resultat_moyen: mod.text_resultat_moyen ?? '',
      text_resultat_faible: mod.text_resultat_faible ?? '',
      is_published: mod.is_published,
    });
  };

  const openAdd = () => {
    setEditModule(null);
    setIsAddMode(true);
    setSlugManual(false);
    setFormData({
      titre: '',
      module_slug: '',
      accessibilite: [],
      text_resultat_expert: '',
      text_resultat_moyen: '',
      text_resultat_faible: '',
      is_published: false,
    });
  };

  const closeModal = () => {
    setEditModule(null);
    setIsAddMode(false);
  };

  const handleTitleChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      titre: val,
      module_slug: slugManual ? prev.module_slug : slugify(val),
    }));
  };

  const toggleAccess = (plan: string) => {
    setFormData((prev) => ({
      ...prev,
      accessibilite: prev.accessibilite.includes(plan)
        ? prev.accessibilite.filter((p) => p !== plan)
        : [...prev.accessibilite, plan],
    }));
  };

  const saveModule = async () => {
    if (!formData.titre.trim() || !formData.module_slug.trim()) {
      toast({ title: 'Le titre et le slug sont obligatoires', variant: 'destructive' });
      return;
    }
    setSaving(true);

    if (isAddMode) {
      const maxOrder = modules.reduce((max, m) => Math.max(max, m.order), 0);
      const { error } = await supabase.from('modules').insert({
        titre: formData.titre,
        module_slug: formData.module_slug,
        accessibilite: formData.accessibilite,
        text_resultat_expert: formData.text_resultat_expert || null,
        text_resultat_moyen: formData.text_resultat_moyen || null,
        text_resultat_faible: formData.text_resultat_faible || null,
        is_published: formData.is_published,
        order: maxOrder + 1,
        total_step: 0,
      });
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Module créé ✓' });
        closeModal();
        fetchData();
      }
    } else if (editModule) {
      const { error } = await supabase.from('modules').update({
        titre: formData.titre,
        module_slug: formData.module_slug,
        accessibilite: formData.accessibilite,
        text_resultat_expert: formData.text_resultat_expert || null,
        text_resultat_moyen: formData.text_resultat_moyen || null,
        text_resultat_faible: formData.text_resultat_faible || null,
        is_published: formData.is_published,
      } as any).eq('id', editModule.id);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Module mis à jour ✓' });
        closeModal();
        fetchData();
      }
    }
    setSaving(false);
  };

  // ─── Delete ───
  const confirmDelete = async () => {
    if (!deleteModule) return;
    setDeleting(true);
    // Delete related data first (in case no CASCADE)
    await Promise.all([
      supabase.from('resultat_quiz').delete().eq('module_id', deleteModule.id),
      supabase.from('progressions').delete().eq('module_id', deleteModule.id),
      supabase.from('quizz').delete().eq('module_id', deleteModule.id),
      supabase.from('contenus').delete().eq('module_id', deleteModule.id),
    ]);
    const { error } = await supabase.from('modules').delete().eq('id', deleteModule.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Module supprimé' });
      setDeleteModule(null);
      setDeleteConfirm('');
      fetchData();
    }
    setDeleting(false);
  };

  // ─── Stats helper for display list ───
  const getStats = (id: string) => moduleStats.find((m) => m.id === id);

  // ─── Render ───
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Library className="h-6 w-6" /> Modules ({modules.length})
        </h1>
        <div className="flex items-center gap-3">
          {reorderMode ? (
            <>
              <Button
                size="sm"
                className="gap-2"
                style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
                onClick={saveOrder}
                disabled={saving}
              >
                <Save className="h-4 w-4" /> {saving ? 'Enregistrement…' : 'Enregistrer l\'ordre'}
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={cancelReorder}>
                <X className="h-4 w-4" /> Annuler
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={enterReorder}>
                Mode réorganisation
              </Button>
              <Button
                size="sm"
                className="gap-2"
                style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
                onClick={openAdd}
              >
                <Plus className="h-4 w-4" /> Ajouter un module
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Module list */}
      {reorderMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedModules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderedModules.map((mod, idx) => {
                const stats = getStats(mod.id);
                return (
                  <SortableModuleRow
                    key={mod.id}
                    mod={{ ...(stats ?? { ...mod, contenuCount: 0, quizCount: 0, rate: 0 }), order: idx + 1 }}
                    reorderMode
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onToggle={() => {}}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {moduleStats.map((mod) => (
            <SortableModuleRow
              key={mod.id}
              mod={mod}
              reorderMode={false}
              onEdit={() => openEdit(mod)}
              onDelete={() => { setDeleteModule(mod); setDeleteConfirm(''); }}
              onToggle={(checked) => handleToggle(mod, checked)}
            />
          ))}
        </div>
      )}

      {modules.length === 0 && (
        <p className="text-center text-muted-foreground py-10">Aucun module pour le moment.</p>
      )}

      {/* ─── Edit / Add Modal ─── */}
      <Dialog open={!!editModule || isAddMode} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isAddMode ? '➕ Ajouter un module' : '✏️ Modifier le module'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="mod-title">Titre *</Label>
              <Input
                id="mod-title"
                value={formData.titre}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex : Comprendre l'impôt sur le revenu"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="mod-slug">Slug</Label>
              <Input
                id="mod-slug"
                value={formData.module_slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setFormData((prev) => ({ ...prev, module_slug: e.target.value }));
                }}
                placeholder="comprendre-limpot-sur-le-revenu"
              />
              {!isAddMode && slugManual && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Changer le slug cassera les liens existants vers ce module.
                </p>
              )}
            </div>

            {/* Étapes (read-only) */}
            {!isAddMode && editModule && (
              <div className="space-y-1.5">
                <Label>Nombre d'étapes (contenus)</Label>
                <Input
                  value={`${contenus.filter((c) => c.module_id === editModule.id).length} contenus`}
                  disabled
                  className="opacity-60"
                />
              </div>
            )}

            {/* Accessibilité */}
            <div className="space-y-1.5">
              <Label>Accessibilité</Label>
              <div className="flex flex-wrap gap-3">
                {PLANS.map((plan) => (
                  <label key={plan} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                    <Checkbox
                      checked={formData.accessibilite.includes(plan)}
                      onCheckedChange={() => toggleAccess(plan)}
                    />
                    {plan}
                  </label>
                ))}
              </div>
            </div>

            {/* Résultats texts */}
            <div className="space-y-1.5">
              <Label htmlFor="mod-expert">Texte résultat expert (≥ 80%)</Label>
              <Textarea
                id="mod-expert"
                value={formData.text_resultat_expert}
                onChange={(e) => setFormData((prev) => ({ ...prev, text_resultat_expert: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-moyen">Texte résultat moyen (50-79%)</Label>
              <Textarea
                id="mod-moyen"
                value={formData.text_resultat_moyen}
                onChange={(e) => setFormData((prev) => ({ ...prev, text_resultat_moyen: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-faible">Texte résultat débutant (&lt; 50%)</Label>
              <Textarea
                id="mod-faible"
                value={formData.text_resultat_faible}
                onChange={(e) => setFormData((prev) => ({ ...prev, text_resultat_faible: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Statut */}
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <RadioGroup
                value={formData.is_published ? 'published' : 'draft'}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, is_published: v === 'published' }))}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="published" /> Publié
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="draft" /> Brouillon
                </label>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>Annuler</Button>
            <Button
              onClick={saveModule}
              disabled={saving}
              style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
            >
              {saving ? 'Enregistrement…' : isAddMode ? '➕ Créer le module' : '💾 Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Modal ─── */}
      <Dialog open={!!deleteModule} onOpenChange={(open) => { if (!open) { setDeleteModule(null); setDeleteConfirm(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Supprimer ce module
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              ⚠️ Supprimer ce module supprimera aussi tous ses contenus, quiz et progressions.
              <br />
              <strong>Cette action est irréversible.</strong>
            </p>
            <p className="text-sm">
              Tapez <strong className="text-foreground">« {deleteModule?.titre} »</strong> pour confirmer :
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteModule?.titre}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteModule(null); setDeleteConfirm(''); }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== deleteModule?.titre || deleting}
              onClick={confirmDelete}
            >
              {deleting ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminModules;
