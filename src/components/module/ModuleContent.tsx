import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type ContenuRow = Tables<'contenus'>;

interface ModuleContentProps {
  currentContenu: ContenuRow | null;
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
  isLastStep: boolean;
  isCompleted: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function ModuleContent({
  currentContenu,
  currentStep,
  totalSteps,
  progressPercent,
  isLastStep,
  isCompleted,
  onPrev,
  onNext,
}: ModuleContentProps) {
  return (
    <div className="flex flex-1 flex-col p-6 lg:p-10">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-medium">
            Étape {currentStep + 1} sur {totalSteps}
          </span>
          <span className="font-semibold text-primary">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Content */}
      {currentContenu && (
        <article className="mb-auto max-w-[720px]">
          <h2 className="mb-6 font-heading text-2xl font-bold text-foreground lg:text-3xl">
            {currentContenu.titre}
          </h2>

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
              className="prose prose-sm max-w-none leading-relaxed text-foreground lg:prose-base"
              style={{ lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: currentContenu.contenu }}
            />
          )}

          {currentContenu.texte_2 && (
            <div
              className="mt-6 rounded-lg bg-muted/50 p-5 prose prose-sm max-w-none text-foreground"
              style={{ lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: currentContenu.texte_2 }}
            />
          )}
        </article>
      )}

      {/* Navigation */}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end sm:gap-4">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>

        {isCompleted ? (
          <Button disabled className="gap-2 opacity-60">
            Module terminé
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onNext} className="gap-2">
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
        )}
      </div>
    </div>
  );
}
