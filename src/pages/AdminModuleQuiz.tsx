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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Pencil, Trash2, AlertTriangle, FileQuestion, CheckCircle2,
} from 'lucide-react';

interface QuizRow {
  id: string;
  question: string;
  options: string[];
  bonne_reponse: string;
  explication: string | null;
}

interface ModuleInfo {
  id: string;
  titre: string;
}

const ANSWER_LABELS = ['A', 'B', 'C'];

const AdminModuleQuiz = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [questions, setQuestions] = useState<QuizRow[]>([]);

  // Add/Edit modal
  const [editQuestion, setEditQuestion] = useState<QuizRow | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    bonneReponse: 'A',
    explication: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteQuestion, setDeleteQuestion] = useState<QuizRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch ───
  const fetchData = useCallback(async () => {
    if (!user || !moduleId) return;
    setLoading(true);
    const [modRes, quizRes] = await Promise.all([
      supabase.from('modules').select('id, titre').eq('id', moduleId).maybeSingle(),
      supabase.from('quizz').select('id, question, options, bonne_reponse, explication').eq('module_id', moduleId).order('created_at', { ascending: true }),
    ]);
    setModuleInfo(modRes.data as ModuleInfo | null);
    setQuestions(quizRes.data ?? []);
    setLoading(false);
  }, [user, moduleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Add / Edit ───
  const openAdd = () => {
    setIsAdd(true);
    setEditQuestion(null);
    setForm({ question: '', optionA: '', optionB: '', optionC: '', bonneReponse: 'A', explication: '' });
  };

  const openEdit = (q: QuizRow) => {
    setIsAdd(false);
    setEditQuestion(q);
    setForm({
      question: q.question,
      optionA: q.options[0] ?? '',
      optionB: q.options[1] ?? '',
      optionC: q.options[2] ?? '',
      bonneReponse: q.bonne_reponse,
      explication: q.explication ?? '',
    });
  };

  const closeModal = () => { setIsAdd(false); setEditQuestion(null); };

  const handleSave = async () => {
    if (!form.question.trim() || !form.optionA.trim() || !form.optionB.trim() || !form.optionC.trim()) {
      toast({ title: 'Tous les champs obligatoires doivent être remplis', variant: 'destructive' });
      return;
    }
    if (!moduleId) return;
    setSaving(true);

    const payload = {
      question: form.question.trim(),
      options: [form.optionA.trim(), form.optionB.trim(), form.optionC.trim()],
      bonne_reponse: form.bonneReponse,
      explication: form.explication.trim() || null,
    };

    if (isAdd) {
      const { error } = await supabase.from('quizz').insert({
        module_id: moduleId,
        nom_quizz: `Quiz ${moduleInfo?.titre ?? ''}`,
        ...payload,
      });
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Question créée ✓' });
        closeModal();
        fetchData();
      }
    } else if (editQuestion) {
      const { error } = await supabase.from('quizz').update(payload).eq('id', editQuestion.id);
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Question mise à jour ✓' });
        closeModal();
        fetchData();
      }
    }
    setSaving(false);
  };

  // ─── Delete ───
  const handleDelete = async () => {
    if (!deleteQuestion) return;
    setDeleting(true);
    const { error } = await supabase.from('quizz').delete().eq('id', deleteQuestion.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Question supprimée' });
      setDeleteQuestion(null);
      fetchData();
    }
    setDeleting(false);
  };

  // ─── Render ───
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-80" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
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
          to={`/admin/modules/${moduleId}/contenus`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au contenu du module
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <FileQuestion className="h-6 w-6" /> Quiz — {moduleInfo.titre}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Button
            size="sm"
            className="gap-2 bg-green-700 hover:bg-green-800 text-white"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4" /> Ajouter une question
          </Button>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-lg border border-border bg-background p-5 shadow-sm space-y-3"
          >
            <div className="flex items-start gap-3">
              <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                Q{idx + 1}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-foreground">{q.question}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteQuestion(q)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Options */}
            <div className="ml-11 space-y-1.5">
              {q.options.map((opt, optIdx) => {
                const label = ANSWER_LABELS[optIdx];
                const isCorrect = q.bonne_reponse === label;
                return (
                  <div key={optIdx} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-muted-foreground w-5">{label}.</span>
                    <span className={isCorrect ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                      {opt}
                    </span>
                    {isCorrect && (
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Bonne réponse
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explication */}
            {q.explication && (
              <p className="ml-11 text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                {q.explication}
              </p>
            )}
          </div>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Aucune question pour ce module.</p>
          <Button className="gap-2 bg-green-700 hover:bg-green-800 text-white" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Créer la première question
          </Button>
        </div>
      )}

      {/* ─── Add / Edit Modal ─── */}
      <Dialog open={isAdd || !!editQuestion} onOpenChange={open => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isAdd ? '➕ Ajouter une question' : '✏️ Modifier la question'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Question */}
            <div className="space-y-1.5">
              <Label htmlFor="quiz-question">Question *</Label>
              <Textarea
                id="quiz-question"
                value={form.question}
                onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                placeholder="Quel est le taux de TVA standard en France ?"
                className="min-h-[60px]"
                rows={2}
              />
            </div>

            {/* Options */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="quiz-optA">Option A *</Label>
                <Input
                  id="quiz-optA"
                  value={form.optionA}
                  onChange={e => setForm(p => ({ ...p, optionA: e.target.value }))}
                  placeholder="10%"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quiz-optB">Option B *</Label>
                <Input
                  id="quiz-optB"
                  value={form.optionB}
                  onChange={e => setForm(p => ({ ...p, optionB: e.target.value }))}
                  placeholder="20%"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quiz-optC">Option C *</Label>
                <Input
                  id="quiz-optC"
                  value={form.optionC}
                  onChange={e => setForm(p => ({ ...p, optionC: e.target.value }))}
                  placeholder="25%"
                />
              </div>
            </div>

            {/* Bonne réponse */}
            <div className="space-y-2">
              <Label>Bonne réponse *</Label>
              <RadioGroup
                value={form.bonneReponse}
                onValueChange={v => setForm(p => ({ ...p, bonneReponse: v }))}
                className="flex gap-6"
              >
                {ANSWER_LABELS.map(label => (
                  <div key={label} className="flex items-center gap-2">
                    <RadioGroupItem value={label} id={`answer-${label}`} />
                    <Label htmlFor={`answer-${label}`} className="cursor-pointer font-mono">
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Explication */}
            <div className="space-y-1.5">
              <Label htmlFor="quiz-explication">Explication (affichée après validation)</Label>
              <Textarea
                id="quiz-explication"
                value={form.explication}
                onChange={e => setForm(p => ({ ...p, explication: e.target.value }))}
                placeholder="Le taux normal de TVA en France est de 20%..."
                className="min-h-[80px]"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? 'Enregistrement…' : isAdd ? '➕ Créer la question' : '💾 Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Modal ─── */}
      <Dialog open={!!deleteQuestion} onOpenChange={open => { if (!open) setDeleteQuestion(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Supprimer cette question
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ⚠️ Supprimer cette question ? Cette action est irréversible.
          </p>
          <p className="text-sm font-medium text-foreground line-clamp-2">
            « {deleteQuestion?.question} »
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteQuestion(null)}>Annuler</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminModuleQuiz;
