import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Loader2, Menu } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

import { ModuleSidebarContent } from '@/components/module/ModuleSidebarContent';
import { ModuleContent } from '@/components/module/ModuleContent';

type ModuleRow = Tables<'modules'>;
type ContenuRow = Tables<'contenus'>;
type ProgressionRow = Tables<'progressions'>;

const Module = () => {
  const { id: slug } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [module, setModule] = useState<ModuleRow | null>(null);
  const [contenus, setContenus] = useState<ContenuRow[]>([]);
  const [progression, setProgression] = useState<ProgressionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentStep = progression?.step ?? 0;
  const totalSteps = contenus.length;
  const progressPercent = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isLastStep = currentStep === totalSteps - 1;
  const currentContenu = contenus[currentStep] ?? null;

  useEffect(() => {
    if (!slug || !user) return;

    const fetchData = async () => {
      setLoading(true);

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

      const { data: cont } = await supabase
        .from('contenus')
        .select('*')
        .eq('module_id', mod.id)
        .order('ordre', { ascending: true });

      setContenus(cont ?? []);

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
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">Module introuvable</h1>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Retour au dashboard
        </Button>
      </div>
    );
  }

  const sidebarContent = (
    <ModuleSidebarContent
      moduleTitle={module.titre}
      slug={slug ?? ''}
      contenus={contenus}
      currentStep={currentStep}
      completionDate={progression?.completion_date ?? null}
      onStepClick={handleStepClick}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="hidden w-[280px] shrink-0 border-r border-border bg-background shadow-sm md:flex md:flex-col">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile header + sheet */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="fixed left-3 top-3 z-50 gap-2 md:hidden"
            >
              <Menu className="h-4 w-4" />
              Plan du module
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {isMobile && <div className="h-14" />}
        <ModuleContent
          currentContenu={currentContenu}
          currentStep={currentStep}
          totalSteps={totalSteps}
          progressPercent={progressPercent}
          isLastStep={isLastStep}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>

      {/* Completion dialog */}
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
            <Button className="w-full gap-2" onClick={() => navigate(`/quizz/${slug}`)}>
              📝 Passer le quiz
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
              Retour au dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Module;
