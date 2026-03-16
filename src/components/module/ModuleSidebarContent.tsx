import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Tables } from '@/integrations/supabase/types';

type ContenuRow = Tables<'contenus'>;

interface ModuleSidebarContentProps {
  moduleTitle: string;
  slug: string;
  contenus: ContenuRow[];
  currentStep: number;
  completionDate: string | null;
  onStepClick: (index: number) => void;
}

export function ModuleSidebarContent({
  moduleTitle,
  slug,
  contenus,
  currentStep,
  completionDate,
  onStepClick,
}: ModuleSidebarContentProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-5">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Retour au dashboard
        </button>
        <h2 className="font-heading text-base font-bold text-foreground leading-snug">
          {moduleTitle}
        </h2>
      </div>

      <Separator />

      {/* Stepper */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {contenus.map((c, i) => {
            const isActive = i === currentStep;
            const isDone = completionDate ? true : i < currentStep;
            const isLocked = !isDone && !isActive;

            return (
              <li key={c.id}>
                <button
                  onClick={() => {
                    if (!isLocked) onStepClick(i);
                  }}
                  disabled={isLocked}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : isDone
                        ? 'text-foreground hover:bg-muted cursor-pointer'
                        : 'text-muted-foreground/50 cursor-not-allowed'
                  }`}
                >
                  {/* Status icon */}
                  <span className="shrink-0">
                    {isDone && !isActive ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : isActive ? (
                      <span className="relative flex h-5 w-5 items-center justify-center">
                        <span className="absolute h-5 w-5 animate-ping rounded-full bg-primary/20" />
                        <span className="relative h-3 w-3 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <Circle className="h-5 w-5 text-border" />
                    )}
                  </span>
                  <span className="leading-tight">{c.titre}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Quiz link */}
      <div className="border-t border-border p-4">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate(`/quizz/${slug}`)}
        >
          📝 Passer le quiz
        </Button>
      </div>
    </div>
  );
}
