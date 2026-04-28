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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Pencil, Trash2, AlertTriangle, FileQuestion, CheckCircle2, X,
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

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

const getAnswerLetter = (q: QuizRow) => {
  const idx = q.options.findIndex(o => o === q.bonne_reponse);
  return idx >= 0 ? LETTERS[idx] : '?';
};

const AdminModuleQuiz = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [questions, setQuestions] = useState<QuizRow[]>([]);

  // Add/Edit modal — options dynamiques 2 à 6
  const [editQuestion, setEditQuestion] = useState<QuizRow | null>(null);
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState({
    question: '',
    options: ['', '', '', ''] as string[],
    bonne_reponse: '',
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
      supabase.from('quizz').select('id, question, options, bonne_reponse, explication').eq('module_id', moduleId).order('ordre', { ascending: true }),
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
    setForm({ question: '', options: ['', '', '', ''], bonne_reponse: '', explication: '' });
  };

  const openEdit = (q: QuizRow) => {
    setIsAdd(false);
    setEditQuestion(q);
    const opts = [...q.options];
    while (opts.length < MIN_OPTIONS) opts.push('');
    setForm({
      question: q.question,
      options: opts,
      bonne_reponse: q.bonne_reponse,
      explication: q.explication ?? '',
    });
  };

  const closeModal = () => { setIsAdd(false); setEditQuestion(null); };

  const updateOption = (idx: number, val: string) => {
    setForm(prev => {
      const opts = [...prev.options];
      const previous = opts[idx];
      opts[idx] = val;
      // si la bonne réponse correspondait à l'ancien texte, la suivre
      const newBonne = prev.bonne_reponse === previous ? val : prev.bonne_reponse;
      return { ...prev, options: opts, bonne_reponse: newBonne };
    });
  };

  const addOption = () => {
    setForm(prev => prev.options.length >= MAX_OPTIONS ? prev : { ...prev, options: [...prev.options, ''] });
  };

  const removeOption = (idx: number) => {
    setForm(prev => {
      if (prev.options.length <= MIN_OPTIONS) return prev;
      const removed = prev.options[idx];
      const opts = prev.options.filter((_, i) => i !== idx);
      const newBonne = prev.bonne_reponse === removed ? '' : prev.bonne_reponse;
      return { ...prev, options: opts, bonne_reponse: newBonne };
    });
  };

  const handleSave = async () => {
    const cleanOpts = form.options.map(o => o.trim()).filter(Boolean);
    if (!form.question.trim()) {
      toast({ title: 'La question est obligatoire', variant: 'destructive' });
      return;
    }
    if (cleanOpts.length < MIN_OPTIONS) {
      toast({ title: `Au moins ${MIN_OPTIONS} options requises`, variant: 'destructive' });
      return;
    }
    if (!form.bonne_reponse.trim() || !cleanOpts.includes(form.bonne_reponse.trim())) {
      toast({ title: 'Sélectionnez la bonne réponse parmi les options', variant: 'destructive' });
      return;
    }
    if (!moduleId) return;
    setSaving(true);

    const payload = {
      question: form.question.trim(),
      options: cleanOpts,
      bonne_reponse: form.bonne_reponse.trim(),
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

  const cleanOptsForSelect = form.options.map(o => o.trim()).filter(Boolean);

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
                <p className="font-heading font-semibold text-foreground break-words">{q.question}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs font-mono text-green-700 border-green-300">
                  Rép. {getAnswerLetter(q)}
                </Badge>
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
                const label = LETTERS[optIdx] ?? '?';
                const isCorrect = q.bonne_reponse === opt;
                return (
                  <div key={optIdx} className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-muted-foreground w-5 shrink-0 pt-0.5">{label}.</span>
                    <span className={`flex-1 break-words ${isCorrect ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {opt}
                    </span>
                    {isCorrect && (
                      <Badge variant="outline" className="shrink-0 text-green-700 border-green-300 bg-green-50 text-xs gap-1">
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

            {/* Options dynamiques (2 à 6) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options de réponse * <span className="text-xs text-muted-foreground">(2 à 6)</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={form.options.length >= MAX_OPTIONS}
                  className="h-7 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground w-6 shrink-0">{LETTERS[i]}.</span>
                  <Input
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${LETTERS[i]}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeOption(i)}
                    disabled={form.options.length <= MIN_OPTIONS}
                    title={form.options.length <= MIN_OPTIONS ? 'Minimum 2 options' : 'Supprimer'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Bonne réponse */}
            <div className="space-y-1.5">
              <Label>Bonne réponse *</Label>
              <Select
                value={form.bonne_reponse}
                onValueChange={v => setForm(p => ({ ...p, bonne_reponse: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez la bonne réponse" />
                </SelectTrigger>
                <SelectContent>
                  {cleanOptsForSelect.map((opt, i) => (
                    <SelectItem key={i} value={opt}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{LETTERS[form.options.map(o => o.trim()).indexOf(opt)]}.</span>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
