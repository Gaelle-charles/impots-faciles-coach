import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { FileQuestion, Plus, Pencil, Trash2, AlertTriangle, Search, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface QuizRow {
  id: string;
  module_id: string;
  question: string;
  options: string[];
  bonne_reponse: string;
  explication: string | null;
  nom_quizz: string | null;
  ordre: number;
}

interface ModuleRow {
  id: string;
  titre: string;
  order: number;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const getAnswerLetter = (q: QuizRow) => {
  const idx = q.options.findIndex(o => o === q.bonne_reponse);
  return idx >= 0 ? LETTERS[idx] : '?';
};

// Sortable row component
const SortableQuizRow = ({ q, onEdit, onDelete }: { q: QuizRow; onEdit: (q: QuizRow) => void; onDelete: (q: QuizRow) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
      <TableCell className="w-8 px-1">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="text-sm font-medium truncate max-w-[350px]">{q.question}</TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">{q.options.length}</TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="text-xs font-mono text-green-700 border-green-300">{getAnswerLetter(q)}</Badge>
      </TableCell>
      <TableCell className="px-1">
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onEdit(q)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(q)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const AdminQuiz = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('Tous');

  // Modal state
  const [editQuiz, setEditQuiz] = useState<QuizRow | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState({
    module_id: '', question: '', options: ['', '', '', ''],
    bonne_reponse: '', explication: '', nom_quizz: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteQuiz, setDeleteQuiz] = useState<QuizRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [qRes, mRes] = await Promise.all([
      supabase.from('quizz').select('*').order('ordre', { ascending: true }),
      supabase.from('modules').select('id, titre, order').order('order', { ascending: true }),
    ]);
    setQuizzes(qRes.data ?? []);
    setModules(mRes.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const moduleTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    modules.forEach(mod => m.set(mod.id, mod.titre));
    return m;
  }, [modules]);

  const moduleOrderMap = useMemo(() => {
    const m = new Map<string, number>();
    modules.forEach(mod => m.set(mod.id, mod.order));
    return m;
  }, [modules]);

  const filtered = useMemo(() => {
    let list = quizzes;
    if (moduleFilter !== 'Tous') list = list.filter(q => q.module_id === moduleFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(q => q.question.toLowerCase().includes(s));
    }
    return list;
  }, [quizzes, moduleFilter, search]);

  // Group filtered questions by module, sorted by module order
  const groupedByModule = useMemo(() => {
    const groups = new Map<string, QuizRow[]>();
    filtered.forEach(q => {
      if (!groups.has(q.module_id)) groups.set(q.module_id, []);
      groups.get(q.module_id)!.push(q);
    });
    // Sort questions within each group by ordre
    groups.forEach((qs, key) => {
      groups.set(key, qs.sort((a, b) => a.ordre - b.ordre));
    });
    return [...groups.entries()].sort((a, b) => {
      return (moduleOrderMap.get(a[0]) ?? 999) - (moduleOrderMap.get(b[0]) ?? 999);
    });
  }, [filtered, moduleOrderMap]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (moduleId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const group = groupedByModule.find(([id]) => id === moduleId);
    if (!group) return;
    const items = group[1];
    const oldIndex = items.findIndex(q => q.id === active.id);
    const newIndex = items.findIndex(q => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);

    // Optimistic update
    setQuizzes(prev => {
      const updated = [...prev];
      reordered.forEach((q, i) => {
        const idx = updated.findIndex(x => x.id === q.id);
        if (idx !== -1) updated[idx] = { ...updated[idx], ordre: i };
      });
      return updated;
    });

    // Persist
    const updates = reordered.map((q, i) =>
      supabase.from('quizz').update({ ordre: i } as any).eq('id', q.id)
    );
    await Promise.all(updates);
  };

  const openAdd = () => {
    setIsAdd(true);
    setEditQuiz(null);
    setForm({ module_id: modules[0]?.id ?? '', question: '', options: ['', '', '', ''], bonne_reponse: '', explication: '', nom_quizz: '' });
  };

  const openEdit = (q: QuizRow) => {
    setIsAdd(false);
    setEditQuiz(q);
    const opts = [...q.options];
    while (opts.length < 4) opts.push('');
    setForm({
      module_id: q.module_id, question: q.question,
      options: opts, bonne_reponse: q.bonne_reponse,
      explication: q.explication ?? '', nom_quizz: q.nom_quizz ?? '',
    });
  };

  const closeModal = () => { setIsAdd(false); setEditQuiz(null); };

  const handleSave = async () => {
    const cleanOpts = form.options.filter(o => o.trim());
    if (!form.module_id || !form.question.trim() || cleanOpts.length < 2 || !form.bonne_reponse.trim()) {
      toast({ title: 'Remplissez tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      module_id: form.module_id,
      question: form.question.trim(),
      options: cleanOpts,
      bonne_reponse: form.bonne_reponse.trim(),
      explication: form.explication.trim() || null,
      nom_quizz: form.nom_quizz.trim() || null,
    };

    if (isAdd) {
      const { error } = await supabase.from('quizz').insert(payload);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Question créée ✓' }); closeModal(); fetchData(); }
    } else if (editQuiz) {
      const { error } = await supabase.from('quizz').update(payload as any).eq('id', editQuiz.id);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Question mise à jour ✓' }); closeModal(); fetchData(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteQuiz) return;
    setDeleting(true);
    // Also delete related results
    await supabase.from('resultat_quiz').delete().eq('module_id', deleteQuiz.module_id);
    const { error } = await supabase.from('quizz').delete().eq('id', deleteQuiz.id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Question supprimée' }); setDeleteQuiz(null); fetchData(); }
    setDeleting(false);
  };

  const updateOption = (idx: number, val: string) => {
    setForm(prev => {
      const opts = [...prev.options];
      opts[idx] = val;
      return { ...prev, options: opts };
    });
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-96 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <FileQuestion className="h-6 w-6" /> Quiz ({filtered.length} questions)
        </h1>
        <Button size="sm" className="gap-2" style={{ backgroundColor: 'hsl(0 67% 35%)', color: 'white' }} onClick={openAdd}>
          <Plus className="h-4 w-4" /> Ajouter une question
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une question…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous les modules</SelectItem>
            {modules.map(m => <SelectItem key={m.id} value={m.id}>Module {m.order} — {m.titre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border bg-background shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Question</TableHead>
              <TableHead className="text-center">Options</TableHead>
              <TableHead className="hidden lg:table-cell">Bonne réponse</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedByModule.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">Aucune question trouvée.</TableCell>
              </TableRow>
            )}
            {groupedByModule.map(([moduleId, questions]) => {
              const moduleOrder = moduleOrderMap.get(moduleId) ?? 0;
              const moduleTitle = moduleTitleMap.get(moduleId) ?? '—';
              return (
                <React.Fragment key={moduleId}>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableCell colSpan={5} className="py-2.5">
                      <span className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-mono">{moduleOrder}</Badge>
                        {moduleTitle}
                        <span className="text-muted-foreground font-normal ml-1">({questions.length} question{questions.length > 1 ? 's' : ''})</span>
                      </span>
                    </TableCell>
                  </TableRow>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={(e) => handleDragEnd(moduleId, e)}
                  >
                    <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                      {questions.map(q => (
                        <SortableQuizRow key={q.id} q={q} onEdit={openEdit} onDelete={setDeleteQuiz} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAdd || !!editQuiz} onOpenChange={open => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{isAdd ? '➕ Nouvelle question' : '✏️ Modifier la question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Label>Nom du quiz (optionnel)</Label>
              <Input value={form.nom_quizz} onChange={e => setForm(p => ({ ...p, nom_quizz: e.target.value }))} placeholder="Ex: Quiz final" />
            </div>
            <div className="space-y-1.5">
              <Label>Question *</Label>
              <Textarea value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Options de réponse *</Label>
              {form.options.map((opt, i) => (
                <Input
                  key={i}
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="mb-1.5"
                />
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, options: [...p.options, ''] }))}>
                + Option
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Bonne réponse *</Label>
              <Select
                value={form.bonne_reponse}
                onValueChange={v => setForm(p => ({ ...p, bonne_reponse: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionnez la bonne réponse" /></SelectTrigger>
                <SelectContent>
                  {form.options.filter(o => o.trim()).map((opt, i) => (
                    <SelectItem key={i} value={opt.trim()}>{opt.trim()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Explication (optionnel)</Label>
              <Textarea value={form.explication} onChange={e => setForm(p => ({ ...p, explication: e.target.value }))} rows={2} />
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
      <Dialog open={!!deleteQuiz} onOpenChange={open => { if (!open) setDeleteQuiz(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Supprimer cette question
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ⚠️ Cette action est irréversible. La question sera supprimée définitivement.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteQuiz(null)}>Annuler</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQuiz;
