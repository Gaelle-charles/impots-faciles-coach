import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Eye, ListOrdered, FileQuestion } from 'lucide-react';
import { ModuleContent } from '@/components/module/ModuleContent';
import type { Tables } from '@/integrations/supabase/types';

type ContenuRow = Tables<'contenus'>;
type QuizzRow = Tables<'quizz'>;

interface ModulePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string | null;
  moduleTitle?: string;
  /** Optional: open directly on a specific step (1-based ordre). */
  initialStepOrdre?: number;
  /** Optional: which tab to show first. */
  initialTab?: 'module' | 'step' | 'quiz';
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function ModulePreviewDialog({
  open,
  onOpenChange,
  moduleId,
  moduleTitle,
  initialStepOrdre,
  initialTab = 'module',
}: ModulePreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [contenus, setContenus] = useState<ContenuRow[]>([]);
  const [quizz, setQuizz] = useState<QuizzRow[]>([]);
  const [tab, setTab] = useState<'module' | 'step' | 'quiz'>(initialTab);
  const [stepIndex, setStepIndex] = useState(0);
  const [simulateUserQuiz, setSimulateUserQuiz] = useState(false);

  // Load module data when dialog opens
  useEffect(() => {
    if (!open || !moduleId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [cRes, qRes] = await Promise.all([
        supabase
          .from('contenus')
          .select('*')
          .eq('module_id', moduleId)
          .order('ordre', { ascending: true }),
        supabase
          .from('quizz')
          .select('*')
          .eq('module_id', moduleId)
          .order('ordre', { ascending: true }),
      ]);
      if (cancelled) return;
      setContenus(cRes.data ?? []);
      setQuizz(qRes.data ?? []);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, moduleId]);

  // When opening, reset to requested tab + step
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setSimulateUserQuiz(false);
    if (initialStepOrdre && contenus.length > 0) {
      const idx = contenus.findIndex((c) => c.ordre === initialStepOrdre);
      setStepIndex(idx >= 0 ? idx : 0);
    } else {
      setStepIndex(0);
    }
  }, [open, initialTab, initialStepOrdre, contenus]);

  const totalSteps = contenus.length;
  const currentContenu = contenus[stepIndex] ?? null;
  const isLastStep = stepIndex === totalSteps - 1;
  const progressPercent = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  const goToStep = (idx: number, switchTab = false) => {
    setStepIndex(Math.max(0, Math.min(idx, totalSteps - 1)));
    if (switchTab) setTab('step');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="font-heading flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Aperçu admin — {moduleTitle ?? 'Module'}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
              <TabsTrigger value="module" className="gap-1.5">
                <ListOrdered className="h-4 w-4" /> Vue module
              </TabsTrigger>
              <TabsTrigger value="step" className="gap-1.5">
                <Eye className="h-4 w-4" /> Étape par étape
              </TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5">
                <FileQuestion className="h-4 w-4" /> Quiz ({quizz.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ─── TAB: Vue module ─── */}
            <TabsContent value="module" className="px-6 py-5 mt-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : contenus.length === 0 ? (
                <p className="text-muted-foreground italic py-8 text-center">
                  Ce module ne contient aucune étape.
                </p>
              ) : (
                <div className="space-y-2">
                  {contenus.map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 shadow-sm"
                    >
                      <Badge
                        variant="outline"
                        className="shrink-0 font-mono text-xs w-8 justify-center"
                      >
                        {String(c.ordre).padStart(2, '0')}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-semibold text-foreground truncate">
                          {c.titre}
                        </p>
                        {c.type_contenu && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.type_contenu}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => goToStep(idx, true)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── TAB: Étape par étape ─── */}
            <TabsContent value="step" className="mt-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-8 w-72" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : contenus.length === 0 ? (
                <p className="text-muted-foreground italic p-8 text-center">
                  Aucune étape à afficher.
                </p>
              ) : (
                <div>
                  {/* Step jumper */}
                  <div className="px-6 pt-4 pb-2 flex items-center gap-3 border-b border-border">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Sauter à :
                    </span>
                    <Select
                      value={String(stepIndex)}
                      onValueChange={(v) => goToStep(Number(v))}
                    >
                      <SelectTrigger className="max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contenus.map((c, idx) => (
                          <SelectItem key={c.id} value={String(idx)}>
                            {String(c.ordre).padStart(2, '0')} — {c.titre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ModuleContent
                    currentContenu={currentContenu}
                    currentStep={stepIndex}
                    totalSteps={totalSteps}
                    progressPercent={progressPercent}
                    isLastStep={isLastStep}
                    isCompleted={false}
                    onPrev={() => goToStep(stepIndex - 1)}
                    onNext={() => {
                      if (!isLastStep) goToStep(stepIndex + 1);
                    }}
                    isPreviewMode
                  />
                </div>
              )}
            </TabsContent>

            {/* ─── TAB: Quiz ─── */}
            <TabsContent value="quiz" className="px-6 py-5 mt-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : quizz.length === 0 ? (
                <p className="text-muted-foreground italic py-8 text-center">
                  Aucune question de quiz pour ce module.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Vue admin : les bonnes réponses sont surlignées en vert.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSimulateUserQuiz(true)}
                    >
                      🎮 Simuler le quiz en mode user
                    </Button>
                  </div>

                  {quizz.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-lg border border-border bg-background p-5 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono shrink-0">
                          Q{idx + 1}
                        </Badge>
                        <h4 className="font-heading font-semibold text-foreground">
                          {q.question}
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {(q.options ?? []).map((opt, i) => {
                          const isCorrect = opt === q.bonne_reponse;
                          return (
                            <li
                              key={i}
                              className={`flex items-start gap-3 rounded-md border-2 p-3 text-sm ${
                                isCorrect
                                  ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                                  : 'border-border bg-muted/30'
                              }`}
                            >
                              <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                                {LETTERS[i]}
                              </span>
                              <span
                                className={`flex-1 ${
                                  isCorrect
                                    ? 'font-semibold underline decoration-green-600 decoration-2 underline-offset-2'
                                    : ''
                                }`}
                              >
                                {opt}
                              </span>
                              {isCorrect && (
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {q.explication && (
                        <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 p-3 text-sm">
                          💡 {q.explication}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>

      {/* Nested simulate-user quiz modal */}
      <UserQuizSimulator
        open={simulateUserQuiz}
        onOpenChange={setSimulateUserQuiz}
        questions={quizz}
        moduleTitle={moduleTitle}
      />
    </Dialog>
  );
}

// ─── Sub: Quiz simulator (no DB writes) ───
function UserQuizSimulator({
  open,
  onOpenChange,
  questions,
  moduleTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuizzRow[];
  moduleTitle?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (open) {
      setIdx(0);
      setSelected(null);
      setValidated(false);
      setScore(0);
      setFinished(false);
    }
  }, [open]);

  const total = questions.length;
  const q = questions[idx];
  const isLast = idx === total - 1;

  const handleValidate = () => {
    if (!selected || !q) return;
    if (selected === q.bonne_reponse) setScore((s) => s + 1);
    setValidated(true);
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setValidated(false);
  };

  if (!q && !finished) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            🎮 Quiz mode user — {moduleTitle ?? ''}
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
          🛠️ Aperçu — aucun résultat n'est enregistré.
        </div>

        {finished ? (
          <div className="text-center space-y-4 py-6">
            <p className="text-4xl font-heading font-bold text-primary">
              {Math.round((score / total) * 100)}%
            </p>
            <p className="text-muted-foreground">
              {score}/{total} bonnes réponses
            </p>
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Question {idx + 1} / {total}
            </p>
            <h4 className="font-heading text-lg font-semibold">{q.question}</h4>
            <div className="space-y-2">
              {(q.options ?? []).map((opt, i) => {
                const isCorrect = opt === q.bonne_reponse;
                const isSelected = selected === opt;
                let cls =
                  'flex items-start gap-3 w-full rounded-md border-2 p-3 text-left text-sm transition-all';
                if (validated) {
                  if (isCorrect) cls += ' border-green-500 bg-green-50 dark:bg-green-950/30';
                  else if (isSelected)
                    cls += ' border-destructive bg-red-50 dark:bg-red-950/30';
                  else cls += ' border-border bg-muted/30 opacity-60';
                  cls += ' cursor-default';
                } else {
                  cls += isSelected
                    ? ' border-primary bg-primary/5'
                    : ' border-border hover:border-primary/40 cursor-pointer';
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    onClick={() => !validated && setSelected(opt)}
                    disabled={validated}
                  >
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                      {LETTERS[i]}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
            {validated && q.explication && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 p-3 text-sm">
                💡 {q.explication}
              </div>
            )}
            {!validated ? (
              <Button className="w-full" disabled={!selected} onClick={handleValidate}>
                Valider
              </Button>
            ) : (
              <Button className="w-full" onClick={handleNext}>
                {isLast ? 'Voir mon score' : 'Question suivante →'}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
