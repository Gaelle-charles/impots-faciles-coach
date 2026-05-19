import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowLeft, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
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

  const totalSteps = contenus.length;
  const doneCount = completionDate
    ? totalSteps
    : Math.min(currentStep, totalSteps);
  const progressPct = totalSteps > 0 ? (doneCount / totalSteps) * 100 : 0;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-rose-light/40 via-background to-background">
      {/* Header */}
      <div className="relative overflow-hidden px-5 pt-5 pb-6">
        {/* Decorative blob */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-dynamic/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 top-12 h-20 w-20 rounded-full bg-yellow-vivid/30 blur-2xl" />

        <button
          onClick={() => navigate('/dashboard')}
          className="relative mb-4 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold text-violet-deep shadow-sm ring-1 ring-violet-deep/10 transition-all hover:bg-background hover:shadow-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>

        <Eyebrow className="relative mb-3">
          <BookOpen className="mr-1.5 inline h-3 w-3" />
          Module en cours
        </Eyebrow>

        <h2 className="font-display text-xl leading-tight text-violet-deep">
          {moduleTitle}
        </h2>

        {/* Progress */}
        <div className="relative mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-violet-deep/70">
              {doneCount}/{totalSteps} étapes
            </span>
            <span className="text-rose-dynamic">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-deep/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-dynamic to-yellow-vivid transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {contenus.map((c, i) => {
            const isActive = i === currentStep;
            const isDone = completionDate ? true : i < currentStep;
            const isReachable = i <= currentStep || !!completionDate;
            const isLocked = !isReachable;

            return (
              <li key={c.id}>
                <button
                  onClick={() => {
                    if (!isLocked) onStepClick(i);
                  }}
                  disabled={isLocked}
                  className={`group relative flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-deep to-violet-deep/90 font-semibold text-white shadow-md shadow-violet-deep/20'
                      : isDone
                        ? 'text-violet-deep hover:bg-rose-light/60 cursor-pointer'
                        : 'text-muted-foreground/50 cursor-not-allowed'
                  }`}
                >
                  <span className="shrink-0 pt-0.5">
                    {isDone && !isActive ? (
                      <CheckCircle2 className="h-5 w-5 text-rose-dynamic" />
                    ) : isActive ? (
                      <span className="relative flex h-5 w-5 items-center justify-center">
                        <span className="absolute h-5 w-5 animate-ping rounded-full bg-yellow-vivid/40" />
                        <span className="relative h-2.5 w-2.5 rounded-full bg-yellow-vivid ring-2 ring-yellow-vivid/30" />
                      </span>
                    ) : (
                      <Circle className="h-5 w-5 text-border" />
                    )}
                  </span>
                  <span className="leading-snug">{c.titre}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Quiz CTA */}
      <div className="border-t border-violet-deep/10 bg-background/60 p-4 backdrop-blur">
        <Button
          className="w-full gap-2 bg-yellow-vivid font-semibold text-violet-deep shadow-sm hover:bg-yellow-vivid/90 hover:shadow-md"
          onClick={() => navigate(`/quizz/${slug}`)}
        >
          <Sparkles className="h-4 w-4" />
          Passer le quiz
        </Button>
      </div>
    </div>
  );
}
