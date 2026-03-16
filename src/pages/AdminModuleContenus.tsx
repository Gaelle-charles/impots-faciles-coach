import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Pencil, Trash2, Save, X, GripVertical, AlertTriangle, BookOpen, FileQuestion,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MarkdownEditor } from '@/components/admin/MarkdownEditor';

// ─── Types ───
interface ContenuRow {
  id: string;
  titre: string;
  contenu: string | null;
  texte_2: string | null;
  image_url: string | null;
  ordre: number;
  type_contenu: string | null;
}

interface ModuleInfo {
  id: string;
  titre: string;
  total_step: number;
}

// ─── Sortable Row ───
function SortableStepRow({
  step,
  reorderMode,
  onEdit,
  onDelete,
}: {
  step: ContenuRow;
  reorderMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    disabled: !reorderMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Extract first ~120 chars of contenu as preview
  const preview = step.contenu
    ? step.contenu.replace(/[#*>\-_`]/g, '').slice(0, 120).trim() + (step.contenu.length > 120 ? '…' : '')
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 shadow-sm"
    >
      {reorderMode && (
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      <Badge variant="outline" className="shrink-0 font-mono text-xs w-8 justify-center mt-0.5">
        {String(step.ordre).padStart(2, '0')}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-foreground truncate">{step.titre}</p>
        {preview && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{preview}</p>
        )}
      </div>

      {!reorderMode && (
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
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
const AdminModuleContenus = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const { user } = useAuth();
  

  const [loading, setLoading] = useState(true);
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [steps, setSteps] = useState<ContenuRow[]>([]);
  const [quizCount, setQuizCount] = useState(0);

  // Reorder
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedSteps, setOrderedSteps] = useState<ContenuRow[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  // Edit/Add modal
  const [editStep, setEditStep] = useState<ContenuRow | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    contenu: '',
    texte_2: '',
    image_url: '',
  });
  const [previewTab, setPreviewTab] = useState<string>('edit');
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteStep, setDeleteStep] = useState<ContenuRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Fetch ───
  const fetchData = useCallback(async () => {
    if (!user || !moduleId) return;
    setLoading(true);
    const [modRes, stepsRes, quizRes] = await Promise.all([
      supabase.from('modules').select('id, titre, total_step').eq('id', moduleId).maybeSingle(),
      supabase.from('contenus').select('id, titre, contenu, texte_2, image_url, ordre, type_contenu').eq('module_id', moduleId).order('ordre', { ascending: true }),
      supabase.from('quizz').select('id', { count: 'exact', head: true }).eq('module_id', moduleId),
    ]);
    setModuleInfo(modRes.data as ModuleInfo | null);
    setSteps(stepsRes.data ?? []);
    setQuizCount(quizRes.count ?? 0);
    setLoading(false);
  }, [user, moduleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Reorder ───
  const enterReorder = () => {
    setOrderedSteps([...steps]);
    setReorderMode(true);
  };

  const cancelReorder = () => {
    setReorderMode(false);
    setOrderedSteps([]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedSteps(prev => {
      const oldIdx = prev.findIndex(s => s.id === active.id);
      const newIdx = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    for (let i = 0; i < orderedSteps.length; i++) {
      await supabase.from('contenus').update({ ordre: i + 1 } as any).eq('id', orderedSteps[i].id);
    }
    setSteps(orderedSteps.map((s, i) => ({ ...s, ordre: i + 1 })));
    setReorderMode(false);
    setSavingOrder(false);
    toast({ title: 'Ordre enregistré ✓' });
  };

  // ─── Add / Edit ───
  const openAdd = () => {
    setIsAdd(true);
    setEditStep(null);
    setPreviewTab('edit');
    setForm({ titre: '', contenu: '', texte_2: '', image_url: '' });
  };

  const openEdit = (step: ContenuRow) => {
    setIsAdd(false);
    setEditStep(step);
    setPreviewTab('edit');
    setForm({
      titre: step.titre,
      contenu: step.contenu ?? '',
      texte_2: step.texte_2 ?? '',
      image_url: step.image_url ?? '',
    });
  };

  const closeModal = () => { setIsAdd(false); setEditStep(null); };

  const handleSave = async () => {
    if (!form.titre.trim()) {
      toast({ title: 'Le titre est obligatoire', variant: 'destructive' });
      return;
    }
    if (!moduleId) return;
    setSaving(true);

    if (isAdd) {
      const maxOrdre = steps.length > 0 ? Math.max(...steps.map(s => s.ordre)) : 0;
      const { error } = await supabase.from('contenus').insert({
        module_id: moduleId,
        titre: form.titre.trim(),
        contenu: form.contenu.trim() || null,
        texte_2: form.texte_2.trim() || null,
        image_url: form.image_url.trim() || null,
        ordre: maxOrdre + 1,
      });
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        // Update total_step
        await supabase.from('modules').update({ total_step: (moduleInfo?.total_step ?? 0) + 1 } as any).eq('id', moduleId);
        toast({ title: 'Étape créée ✓' });
        closeModal();
        fetchData();
      }
    } else if (editStep) {
      const { error } = await supabase.from('contenus').update({
        titre: form.titre.trim(),
        contenu: form.contenu.trim() || null,
        texte_2: form.texte_2.trim() || null,
        image_url: form.image_url.trim() || null,
      } as any).eq('id', editStep.id);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Étape mise à jour ✓' });
        closeModal();
        fetchData();
      }
    }
    setSaving(false);
  };

  // ─── Delete ───
  const handleDelete = async () => {
    if (!deleteStep || !moduleId) return;
    setDeleting(true);
    const { error } = await supabase.from('contenus').delete().eq('id', deleteStep.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('modules').update({ total_step: Math.max(0, (moduleInfo?.total_step ?? 1) - 1) } as any).eq('id', moduleId);
      toast({ title: 'Étape supprimée' });
      setDeleteStep(null);
      fetchData();
    }
    setDeleting(false);
  };

  const displayList = reorderMode ? orderedSteps : steps;

  // ─── Render ───
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-80" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  if (!moduleInfo) {
    return (
      <div className="space-y-4">
        <Link to="/admin/modules" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux modules
        </Link>
        <p className="text-muted-foreground">Module introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/admin/modules"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux modules
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6" /> Contenu du module — {moduleInfo.titre}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-3">
              <span>{steps.length} étapes de cours</span>
              <span>·</span>
              <span>{quizCount} questions de quiz</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/admin/modules/${moduleId}/quiz`}>
              <Button variant="outline" size="sm" className="gap-2">
                <FileQuestion className="h-4 w-4" /> Gérer le quiz
              </Button>
            </Link>

            {reorderMode ? (
              <>
                <Button
                  size="sm"
                  className="gap-2"
                  style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
                  onClick={saveOrder}
                  disabled={savingOrder}
                >
                  <Save className="h-4 w-4" /> {savingOrder ? 'Enregistrement…' : 'Sauvegarder l\'ordre'}
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={cancelReorder}>
                  <X className="h-4 w-4" /> Annuler
                </Button>
              </>
            ) : (
              <>
                {steps.length > 1 && (
                  <Button size="sm" variant="outline" onClick={enterReorder}>
                    Mode réorganisation
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-2 bg-green-700 hover:bg-green-800 text-white"
                  onClick={openAdd}
                >
                  <Plus className="h-4 w-4" /> Ajouter une étape
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Steps list */}
      {reorderMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedSteps.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderedSteps.map((step, idx) => (
                <SortableStepRow
                  key={step.id}
                  step={{ ...step, ordre: idx + 1 }}
                  reorderMode
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {steps.map(step => (
            <SortableStepRow
              key={step.id}
              step={step}
              reorderMode={false}
              onEdit={() => openEdit(step)}
              onDelete={() => setDeleteStep(step)}
            />
          ))}
        </div>
      )}

      {steps.length === 0 && !reorderMode && (
        <div className="text-center py-16 space-y-3">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Aucune étape pour ce module.</p>
          <Button className="gap-2 bg-green-700 hover:bg-green-800 text-white" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Créer la première étape
          </Button>
        </div>
      )}

      {/* ─── Add / Edit Modal ─── */}
      <Dialog open={isAdd || !!editStep} onOpenChange={open => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isAdd ? '➕ Ajouter une étape' : '✏️ Modifier l\'étape'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="step-title">Titre de l'étape *</Label>
              <Input
                id="step-title"
                value={form.titre}
                onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
                placeholder="🧾 Ce que vous devez déclarer"
              />
            </div>

            {/* Contenu principal with Markdown preview */}
            <div className="space-y-1.5">
              <Label>Contenu principal *</Label>
              <MarkdownEditor
                value={form.contenu}
                onChange={(v) => setForm(p => ({ ...p, contenu: v }))}
                placeholder="# Titre&#10;&#10;Votre contenu en **Markdown**…"
                minHeight={300}
              />
              <p className="text-xs text-muted-foreground">
                Supporte le Markdown (# titres, **gras**, - listes, &gt; citations)
              </p>
            </div>

            {/* Contenu secondaire */}
            <div className="space-y-1.5">
              <Label>Contenu secondaire (encadré gris)</Label>
              <Textarea
                value={form.texte_2}
                onChange={e => setForm(p => ({ ...p, texte_2: e.target.value }))}
                className="min-h-[150px]"
                placeholder="Points clés à retenir, résumé…"
              />
              <p className="text-xs text-muted-foreground">
                Affiché dans un encadré gris sous le contenu principal. Idéal pour les points clés.
              </p>
            </div>

            {/* Image */}
            <div className="space-y-1.5">
              <Label>Image illustrative (URL)</Label>
              <Input
                value={form.image_url}
                onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                placeholder="https://exemple.com/image.png"
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Aperçu"
                  className="mt-2 rounded-md max-h-40 object-cover border border-border"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }}
            >
              {saving ? 'Enregistrement…' : isAdd ? '➕ Créer l\'étape' : '💾 Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Modal ─── */}
      <Dialog open={!!deleteStep} onOpenChange={open => { if (!open) setDeleteStep(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Supprimer cette étape
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ⚠️ Supprimer « <strong>{deleteStep?.titre}</strong> » ? Cette action est irréversible.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteStep(null)}>Annuler</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminModuleContenus;
