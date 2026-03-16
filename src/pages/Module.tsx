import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type ModuleRow = Tables<'modules'>;
type ContenuRow = Tables<'contenus'>;
type ProgressionRow = Tables<'progressions'>;

const Module = () => {
  const { id: slug } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [module, setModule] = useState<ModuleRow | null>(null);
  const [contenus, setContenus] = useState<ContenuRow[]>([]);
  const [progression, setProgression] = useState<ProgressionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);

  const currentStep = progression?.step ?? 0;
  const totalSteps = contenus.length;
  const progressPercent = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isLastStep = currentStep === totalSteps - 1;
  const currentContenu = contenus[currentStep] ?? null;

  // Fetch module + contenus + progression
  useEffect(() => {
    if (!slug || !user) return;

    const fetchData = async () => {
      setLoading(true);

      // 1. Fetch module by slug
      const { data: mod } = await supabase
        .from('modules')
        .select('*')
        .eq('module_slug', slug)
        .single();

      if (!mod) {
        setLoading(false);
        return;
      }
      setModule(mod);

      // 2. Fetch contenus
      const { data: cont } = await supabase
        .from('contenus')
        .select('*')
        .eq('module_id', mod.id)
        .order('ordre', { ascending: true });

      setContenus(cont ?? []);

      // 3. Fetch or create progression
      const { data: prog } = await supabase
        .from('progressions')
        .select('*')
        .eq('module_id', mod.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (prog) {
        setProgression(prog);
      } else {
        const { data: newProg } = await supabase
          .from('progressions')
          .insert({ module_id: mod.id, user_id: user.id, step: 0 })
          .select()
          .single();
        setProgression(newProg);
      }

      setLoading(false);
    };

    fetchData();
  }, [slug, user]);

  const updateStep = useCallback(
    async (newStep: number) => {
      if (!progression) return;
      const { data } = await supabase
        .from('progressions')
        .update({ step: newStep })
        .eq('id', progression.id)
        .select()
        .single();
      if (data) setProgression(data);
    },
    [progression],
  );

  const handlePrev = () => {
    if (currentStep > 0) updateStep(currentStep - 1);
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    if (!progression) return;
    await supabase
      .from('progressions')
      .update({ completion_date: new Date().toISOString() })
      .eq('id', progression.id);
    setShowCompletion(true);
  };

  const handleStepClick = (index: number) => {
    updateStep(index);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">Module introuvable</h1>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>
          Retour au dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 lg:flex-row">
      {/* Sidebar des steps */}
      <aside className="w-full shrink-0 border-b border-border bg-card p-4 lg:w-72 lg:border-b-0 lg:border-r lg:p-6">
        <h2 className="mb-4 font-heading text-lg font-bold text-foreground">{module.titre}</h2>
        <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-x-visible">
          {contenus.map((c, i) => {
            const isActive = i === currentStep;
            const isDone = progression?.completion_date ? true : i < currentStep;
            return (
              <button
                key={c.id}
                onClick={() => handleStepClick(i)}
                className={`flex items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors whitespace-nowrap lg:whitespace-normal ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : isDone
                      ? 'text-muted-foreground hover:bg-muted'
                      : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="shrink-0 font-heading text-xs font-bold opacity-60">
                  {i + 1}.
                </span>
                <span className="truncate lg:whitespace-normal">{c.titre}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 p-4 lg:p-8">
        {/* Barre de progression */}
        <div className="mb-6">
          <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Étape {currentStep + 1} sur {totalSteps}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Contenu du step */}
        {currentContenu && (
          <article className="mb-8">
            <h1 className="mb-4 font-heading text-2xl font-bold text-foreground lg:text-3xl">
              {currentContenu.titre}
            </h1>

            {currentContenu.image_url && (
              <img
                src={currentContenu.image_url}
                alt={currentContenu.titre}
                className="mb-6 max-h-64 rounded-lg object-cover"
                loading="lazy"
              />
            )}

            {currentContenu.contenu && (
              <div
                className="prose prose-sm max-w-none text-foreground lg:prose-base"
                dangerouslySetInnerHTML={{ __html: currentContenu.contenu }}
              />
            )}

            {currentContenu.texte_2 && (
              <div
                className="prose prose-sm mt-4 max-w-none rounded-lg border border-border bg-muted p-4 text-foreground"
                dangerouslySetInnerHTML={{ __html: currentContenu.texte_2 }}
              />
            )}
          </article>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </Button>

          <Button onClick={handleNext} className="gap-1">
            {isLastStep ? (
              <>
                Terminer le module
                <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dialog de félicitation */}
      <Dialog open={showCompletion} onOpenChange={setShowCompletion}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-heading text-2xl">
              {module.titre} terminé ! 🎉
            </DialogTitle>
            <DialogDescription className="text-center">
              Félicitations ! Vous avez terminé ce module. Testez vos connaissances avec le quiz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full gap-2"
              onClick={() => navigate(`/quizz/${slug}`)}
            >
              📝 Passer le quiz
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              Retour au dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Module;
