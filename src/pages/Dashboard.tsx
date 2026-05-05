import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AccentText } from '@/components/ui/accent-text';
import {
  BookOpen,
  Target,
  Trophy,
  Award,
  Download,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Map as MapIcon,
  Wrench,
  Heart,
} from 'lucide-react';
import { ExpandableText } from '@/components/dashboard/ExpandableText';
import type { Tables } from '@/integrations/supabase/types';
import { useAccess } from '@/hooks/useAccess';
import { downloadCertificatPdf, type CertificatData } from '@/lib/certificat-pdf';

type ModuleRow = Tables<'modules'> & { nb_steps_total: number };
type ProgressionRow = Tables<'progressions'>;
type ResultatRow = Tables<'resultat_quiz'>;

function getLevel(avgScore: number) {
  if (avgScore >= 80) return 'Expert';
  if (avgScore >= 50) return 'Intermédiaire';
  return 'Débutant';
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasModuleAccess } = useAccess();

  const [profile, setProfile] = useState<any>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [progressions, setProgressions] = useState<ProgressionRow[]>([]);
  const [results, setResults] = useState<ResultatRow[]>([]);
  const [certificat, setCertificat] = useState<CertificatData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [profRes, modRes, progRes, resRes, certRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      (supabase as any).from('modules_with_counts').select('*').order('order', { ascending: true }),
      supabase.from('progressions').select('*').eq('user_id', user.id),
      supabase.from('resultat_quiz').select('*').eq('user_id', user.id).order('date_quiz', { ascending: false }),
      supabase.from('certificats_parcours')
        .select('numero, prenom, nom, plan, nb_modules_valides, date_obtention')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (profRes.data) setProfile(profRes.data);
    setModules(modRes.data ?? []);
    setProgressions(progRes.data ?? []);
    setResults(resRes.data ?? []);
    setCertificat((certRes.data as CertificatData | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, location.key]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  const progMap = useMemo(() => {
    const m = new Map<string, ProgressionRow>();
    progressions.forEach((p) => m.set(p.module_id, p));
    return m;
  }, [progressions]);

  // Module en cours = premier module accessible non terminé avec progression existante (ou le 1er à commencer)
  const currentModule = useMemo(() => {
    const inProgress = progressions
      .filter((p) => !p.completion_date)
      .map((p) => modules.find((m) => m.id === p.module_id))
      .find((m) => m && hasModuleAccess(m));
    if (inProgress) return inProgress;
    return modules.find((m) => hasModuleAccess(m) && !progMap.get(m.id)?.completion_date) ?? null;
  }, [modules, progressions, progMap, hasModuleAccess]);

  const completedCount = progressions.filter((p) => !!p.completion_date).length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((acc, r) => acc + Number(r.pourcentage), 0) / results.length)
    : 0;

  const stats = [
    { label: 'Modules', value: `${completedCount}/${modules.length || '—'}`, icon: BookOpen },
    { label: 'Score moyen', value: results.length > 0 ? `${avgScore}%` : '—', icon: Target },
    { label: 'Niveau', value: results.length > 0 ? getLevel(avgScore) : 'Débutant', icon: Trophy },
  ];

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <Skeleton className="h-12 w-64" />
          <Skeleton className="mt-3 h-5 w-80" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const currentProg = currentModule ? progMap.get(currentModule.id) : null;
  const totalStep = currentModule?.nb_steps_total ?? 0;
  const safeStep = currentProg ? Math.min(currentProg.step, totalStep) : 0;
  const currentPct = totalStep > 0 ? Math.min(Math.round((safeStep / totalStep) * 100), 100) : 0;

  return (
    <div className="space-y-12">
      {/* En-tête */}
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground leading-tight">
          {profile?.prenom ? <>Bonjour <AccentText>{profile.prenom}</AccentText></> : <>Bonjour</>}
        </h1>
        <p className="mt-2 text-sm sm:text-base md:text-lg text-muted-foreground">
          Avancez à votre rythme, on vous guide.
        </p>
      </div>

      {/* Stats compactes */}
      <div className="grid gap-2 sm:gap-4 grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-background px-3 py-2 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-4 shadow-sm"
          >
            <div className="flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-rose-light text-rose-dynamic">
              <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground leading-tight">{s.label}</p>
              <p className="font-display text-lg sm:text-2xl text-foreground leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards principales — style home épuré */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Mes formations — module en cours */}
        <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-7 md:p-8 flex flex-col">
          <div
            className="blob-decor"
            style={{ background: 'hsl(var(--rose-dynamic) / 0.35)', width: 280, height: 280, bottom: -100, right: -100 }}
            aria-hidden
          />
          <div className="relative flex-1 flex flex-col">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-vivid text-violet-deep mb-4">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl leading-tight">
              Mes <span className="accent-yellow">formations</span>
            </h2>
            <ExpandableText
              className="mt-2 text-sm text-primary-foreground/80 leading-relaxed"
              clampClassName="line-clamp-2"
              breakpoint="lg"
            >
              {currentModule
                ? <>Reprenez là où vous vous êtes arrêté. Quelques minutes suffisent pour avancer pas à pas dans votre parcours pédagogique adapté.</>
                : <>Découvrez votre parcours pédagogique adapté à votre situation, conçu pour vous guider pas à pas dans la compréhension de la fiscalité.</>}
            </ExpandableText>

            {currentModule && (
              <div className="mt-5 rounded-2xl bg-background/10 backdrop-blur-sm p-4 space-y-2 border border-white/10">
                <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Module en cours</p>
                <p className="font-heading font-semibold text-base">{currentModule.titre}</p>
                {totalStep > 0 && (
                  <>
                    <Progress value={currentPct} className="h-1.5 bg-white/20" />
                    <p className="text-xs text-primary-foreground/80">Étape {safeStep} sur {totalStep}</p>
                  </>
                )}
              </div>
            )}

            <div className="mt-auto pt-6 flex flex-wrap gap-3">
              {currentModule && (
                <Button
                  onClick={() => navigate(`/module/${currentModule.module_slug}`)}
                  className="bg-yellow-vivid text-violet-deep hover:bg-yellow-vivid/90 font-bold gap-2"
                >
                  Reprendre <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate('/mes-modules')}
                className="bg-transparent border-white/30 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground gap-2"
              >
                Mes formations
              </Button>
            </div>
          </div>
        </div>

        {/* Mon parcours déclaration */}
        <Link
          to="/mes-modules"
          className="group relative overflow-hidden rounded-3xl bg-background border border-border p-7 md:p-8 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-light text-rose-dynamic mb-4">
            <MapIcon className="h-5 w-5" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl text-foreground leading-tight">
            Mon parcours <AccentText>déclaration</AccentText>
          </h2>
          <ExpandableText className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
            Retrouvez ici les fiches pratiques recommandées en fonction de votre profil avec des fiches contribuable, fiches métiers et fiches pays pour vous accompagner pas à pas dans votre déclaration de revenus : cases à cocher, justificatifs à préparer, abattements et déductions à ne pas oublier.
          </ExpandableText>
          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount}/{modules.length} modules
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:gap-2 transition-all">
              Voir le parcours <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>

        {/* Mes simulateurs */}
        <div
          className="group relative overflow-hidden rounded-3xl p-7 md:p-8 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl"
          style={{ background: 'hsl(var(--rose-light))' }}
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-rose-dynamic mb-4">
            <Wrench className="h-5 w-5" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl text-foreground leading-tight">
            Mes <AccentText>simulateurs</AccentText>
          </h2>
          <ExpandableText className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
            12 outils interactifs pour estimer votre impôt, comparer plusieurs scénarios et anticiper vos choix fiscaux sans formules à connaître.
          </ExpandableText>
          <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-3">
            <Button
              onClick={() => navigate('/simulateur-frais-pro')}
              className="gap-2 bg-violet-deep text-yellow-vivid hover:bg-violet-deep/90 w-full sm:w-auto justify-center"
            >
              Simulateur de frais complet <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/mes-simulateurs')}
              className="gap-2 bg-background/60 w-full sm:w-auto justify-center"
            >
              Voir les simulateurs
            </Button>
          </div>
        </div>

        {/* Mes recommandations — don sur impôt */}
        <Link
          to="/recommandations"
          className="group relative overflow-hidden rounded-3xl bg-yellow-vivid text-violet-deep p-7 md:p-8 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-deep text-yellow-vivid mb-4">
            <Heart className="h-5 w-5" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl leading-tight">
            Mes recommandations
          </h2>
          <ExpandableText className="mt-2 text-sm opacity-80 leading-relaxed flex-1">
            Saviez-vous qu'un don à une association ouvre droit à une <span className="font-bold">réduction d'impôt jusqu'à 66 %</span> (et 75 % pour l'aide aux personnes en difficulté) ? Soutenez une cause qui vous tient à cœur tout en allégeant votre impôt.
          </ExpandableText>
          <div className="mt-5 flex items-center justify-end text-sm">
            <span className="inline-flex items-center gap-1 font-bold group-hover:gap-2 transition-all">
              Découvrir nos recommandations <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </div>

      {/* Certificat (si débloqué) */}
      {certificat && (
        <Card className="border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-950/20 dark:to-yellow-950/10 shadow-md overflow-hidden rounded-3xl">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              <Award className="h-7 w-7" />
            </div>
            <div className="flex-1 space-y-1">
              <Badge className="bg-green-600 text-white">Parcours validé</Badge>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Certificat Impôts Facile débloqué
              </h3>
              <p className="text-sm text-muted-foreground">
                Bravo, vous avez validé l'intégralité du parcours ({certificat.nb_modules_valides} modules).
                N° <span className="font-mono">{certificat.numero}</span>
              </p>
            </div>
            <Button
              onClick={() => downloadCertificatPdf(certificat)}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white shrink-0"
            >
              <Download className="h-4 w-4" /> Télécharger le PDF
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bonus Module 8 */}
      {certificat && (
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/10 shadow-sm overflow-hidden rounded-3xl">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="flex-1 space-y-1">
              <Badge className="bg-primary text-primary-foreground">Bonus disponible</Badge>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Module 8 — Profils et stratégies
              </h3>
              <p className="text-sm text-muted-foreground">
                Découvrez nos fiches profils et stratégies personnalisées en bonus de votre parcours.
              </p>
            </div>
            <Button
              onClick={() => navigate('/module/module-8-profils-de-contribuables-et-strategies-personnalisees')}
              className="gap-2 shrink-0"
            >
              <Sparkles className="h-4 w-4" /> Découvrir
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
