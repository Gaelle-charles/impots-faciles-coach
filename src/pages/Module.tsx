import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { Loader2, Menu, RefreshCw, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useAccess } from '@/hooks/useAccess';
import { useOrgRole } from '@/hooks/useOrgRole';
import type { Tables } from '@/integrations/supabase/types';

import { ModuleSidebarContent } from '@/components/module/ModuleSidebarContent';
import { ModuleContent } from '@/components/module/ModuleContent';
import { TeamSidebar } from '@/components/TeamSidebar';

type ModuleRow = Tables<'modules'> & { nb_steps_total: number };
type ContenuRow = Tables<'contenus'>;
type ProgressionRow = Tables<'progressions'>;

const Module = () => {
  const { id: slug } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasModuleAccess, isLoading: accessLoading, isOrgAdminPreview } = useAccess();
  const { org, isOrgAdmin, hasLicense } = useOrgRole();

  const [module, setModule] = useState<ModuleRow | null>(null);
  const [contenus, setContenus] = useState<ContenuRow[]>([]);
  const [progression, setProgression] = useState<ProgressionRow | null>(null);
  // Step local utilisé en mode aperçu (admin orga sans licence) : pas de persistance DB
  const [previewStep, setPreviewStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const rawStep = isOrgAdminPreview ? previewStep : (progression?.step ?? 0);
  const totalSteps = module?.nb_steps_total ?? contenus.length;
  const isCompleted = !isOrgAdminPreview && !!progression?.completion_date;
  const currentStep = Math.min(rawStep, Math.max(0, totalSteps - 1));
  const progressPercent = isCompleted
    ? 100
    : totalSteps > 0
      ? (Math.min(rawStep, totalSteps) / totalSteps) * 100
      : 0;
  const isLastStep = !isCompleted && totalSteps > 0 && rawStep === totalSteps - 1;
  const currentContenu = contenus[Math.max(0, currentStep)] ?? null;

  const fetchData = useCallback(async () => {
    if (!slug || !user) return;

    setLoading(true);
    setError(null);

    const modRes = await (supabase as any)
      .from('modules_with_counts')
      .select('*')
      .eq('module_slug', slug)
      .maybeSingle();

    if (modRes.error) {
      setError('Erreur lors du chargement du module.');
      setLoading(false);
      return;
    }

    if (!modRes.data) {
      toast({ title: 'Module introuvable', description: 'Ce module n\'existe pas.', variant: 'destructive' });
      navigate('/dashboard', { replace: true });
      return;
    }

    const mod = modRes.data;
    setModule(mod);

    const contRes = await supabase
      .from('contenus')
      .select('*')
      .eq('module_id', mod.id)
      .order('ordre', { ascending: true });

    if (contRes.error) {
      setError('Erreur lors du chargement des contenus.');
      setLoading(false);
      return;
    }

    setContenus(contRes.data ?? []);

    // Mode aperçu admin orga : pas de progression DB
    if (isOrgAdminPreview) {
      setLoading(false);
      return;
    }

    const progRes = await supabase
      .from('progressions')
      .select('*')
      .eq('module_id', mod.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (progRes.error) {
      setError('Erreur lors du chargement de la progression.');
      setLoading(false);
      return;
    }

    if (progRes.data) {
      setProgression(progRes.data);
    } else {
      const { data: newProg, error: insertErr } = await supabase
        .from('progressions')
        .insert({ module_id: mod.id, user_id: user.id, step: 0 })
        .select()
        .single();

      if (insertErr) {
        setError('Erreur lors de la création de la progression.');
        setLoading(false);
        return;
      }
      setProgression(newProg);
    }

    setLoading(false);
  }, [slug, user, navigate, isOrgAdminPreview]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (loading || accessLoading) return;
    if (!module) return;
    if (!hasModuleAccess(module)) {
      const requiredPlan = module.accessibilite?.[0] ?? 'starter';
      const label = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);
      toast({
        title: 'Accès restreint',
        description: `Ce module nécessite le plan ${label}. Découvrez nos offres pour y accéder.`,
        variant: 'destructive',
      });
      navigate(`/tarifs?recommended=${requiredPlan}&redirected=1`, { replace: true });
    }
  }, [loading, accessLoading, module, hasModuleAccess, navigate]);

  const updateStep = useCallback(
    async (newStep: number) => {
      // Mode aperçu : pas de persistance, juste un state local
      if (isOrgAdminPreview) {
        setPreviewStep(Math.max(0, Math.min(totalSteps - 1, newStep)));
        return;
      }
      if (!progression) return;
      const { data } = await supabase
        .from('progressions')
        .update({ step: newStep })
        .eq('id', progression.id)
        .select()
        .single();
      if (data) setProgression(data);
    },
    [progression, isOrgAdminPreview, totalSteps],
  );

  const handlePrev = () => {
    if (rawStep > 0) updateStep(rawStep - 1);
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      updateStep(rawStep + 1);
    }
  };

  const handleComplete = async () => {
    if (isOrgAdminPreview) {
      // Aperçu : on ne sauvegarde pas, on indique simplement la fin
      toast({
        title: 'Fin du module (aperçu)',
        description: 'Activez votre licence personnelle pour valider et obtenir le certificat.',
      });
      return;
    }
    if (!progression) return;
    const finalStep = totalSteps;
    await supabase
      .from('progressions')
      .update({ step: finalStep, completion_date: new Date().toISOString() })
      .eq('id', progression.id);
    setProgression(prev => prev ? { ...prev, step: finalStep, completion_date: new Date().toISOString() } : prev);
    setShowCompletion(true);
  };

  const handleStepClick = (index: number) => {
    updateStep(index);
    setSidebarOpen(false);
  };

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (loading || accessLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        {!isMobile && (
          <aside className="hidden w-[280px] shrink-0 border-r border-border bg-background shadow-sm md:flex md:flex-col p-5 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-px w-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </aside>
        )}
        <div className="flex flex-1 flex-col p-6 lg:p-10 gap-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-40 w-full max-w-[720px]" />
          <Skeleton className="h-24 w-full max-w-[720px]" />
        </div>
      </div>
    );
  }

  if (!module) return null;

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
      {!isMobile && (
        <aside className="hidden w-[280px] shrink-0 border-r border-border bg-background shadow-sm md:flex md:flex-col">
          {sidebarContent}
        </aside>
      )}

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

      <div className="flex flex-1 flex-col overflow-y-auto">
        {isMobile && <div className="h-14" />}
        {isOrgAdminPreview && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-yellow-vivid/40 bg-yellow-vivid/15 px-6 py-3 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Eye className="h-4 w-4" />
              <span>
                <strong>Mode aperçu</strong> — vos progressions ne sont pas sauvegardées
              </span>
            </div>
            <Link to="/impots-team/dashboard?tab=membres">
              <Button size="sm" variant="default">
                Activer ma licence personnelle
              </Button>
            </Link>
          </div>
        )}
        <ModuleContent
          currentContenu={currentContenu}
          currentStep={currentStep}
          totalSteps={totalSteps}
          progressPercent={progressPercent}
          isLastStep={isLastStep}
          isCompleted={isCompleted}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>

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
