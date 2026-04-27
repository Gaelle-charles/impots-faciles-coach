import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Lock } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type QuizzRow = Tables<'quizz'>;
type ResultatRow = Tables<'resultat_quiz'>;

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function getResultMessage(
  pct: number,
  texts: { faible: string | null; moyen: string | null; expert: string | null },
) {
  if (pct >= 80) return texts.expert || 'Excellent ! Tu maîtrises parfaitement ce sujet. 🏆';
  if (pct >= 50) return texts.moyen || 'Pas mal ! Quelques révisions et tu seras au top. 💪';
  return texts.faible || 'Continue tes efforts, tu progresses ! 📚';
}

const Quizz = () => {
  const { id: slug } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isOrgAdminPreview } = useAccess();
  const navigate = useNavigate();

  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [moduleTexts, setModuleTexts] = useState<{
    faible: string | null; moyen: string | null; expert: string | null;
  }>({ faible: null, moyen: null, expert: null });
  const [questions, setQuestions] = useState<QuizzRow[]>([]);
  const [previousResult, setPreviousResult] = useState<ResultatRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [score, setScore] = useState(0);
  const [reponsesUtilisateur, setReponsesUtilisateur] = useState<
    { question_id: string; reponse_donnee: string; correct: boolean }[]
  >([]);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const fetchData = useCallback(async () => {
    if (!slug || !user) return;
    setLoading(true);
    setError(null);

    const { data: mod, error: modErr } = await supabase
      .from('modules')
      .select('id, titre, module_slug, text_resultat_faible, text_resultat_moyen, text_resultat_expert')
      .eq('module_slug', slug)
      .maybeSingle();

    if (modErr) { setError('Erreur lors du chargement.'); setLoading(false); return; }
    if (!mod) { setError('Module introuvable.'); setLoading(false); return; }

    setModuleTitle(mod.titre);
    setModuleId(mod.id);
    setModuleTexts({
      faible: mod.text_resultat_faible,
      moyen: mod.text_resultat_moyen,
      expert: mod.text_resultat_expert,
    });

    const [qRes, rRes] = await Promise.all([
      supabase
        .from('quizz')
        .select('*')
        .eq('module_id', mod.id)
        .order('id', { ascending: true }),
      supabase
        .from('resultat_quiz')
        .select('*')
        .eq('module_id', mod.id)
        .eq('user_id', user.id)
        .order('date_quiz', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (qRes.error) { setError('Erreur lors du chargement des questions.'); setLoading(false); return; }

    setQuestions(qRes.data ?? []);
    setPreviousResult(rRes.data ?? null);
    if (!rRes.data) setStarted(true);
    setLoading(false);
  }, [slug, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const total = questions.length;
  const question = questions[currentIndex];
  const isLast = currentIndex === total - 1;
  const progressPercent = total > 0 ? ((currentIndex + (validated ? 1 : 0)) / total) * 100 : 0;

  const handleValidate = () => {
    if (!selectedOption || !question) return;
    const correct = selectedOption === question.bonne_reponse;
    setValidated(true);
    if (correct) setScore((s) => s + 1);
    setReponsesUtilisateur((prev) => [
      ...prev,
      { question_id: question.id, reponse_donnee: selectedOption, correct },
    ]);
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setValidated(false);
  };

  const handleFinish = async () => {
    // score already includes the last answer from handleValidate
    const computedScore = score;
    setFinalScore(computedScore);
    setFinished(true);

    if (!moduleId || !user) return;
    const pct = Math.round((computedScore / total) * 100);
    await supabase.from('resultat_quiz').insert({
      module_id: moduleId,
      user_id: user.id,
      score: computedScore,
      score_max: total,
      pourcentage: pct,
    });
  };

  const handleRestart = () => {
    setPreviousResult(null);
    setStarted(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setValidated(false);
    setScore(0);
    setFinalScore(0);
    setReponsesUtilisateur([]);
    setFinished(false);
  };

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 px-4 py-8">
        <div className="mx-auto w-full max-w-[700px] space-y-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-72 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" onClick={fetchData}>Réessayer</Button>
        </div>
      </div>
    );
  }

  // --- Mode aperçu admin orga : pas de quiz certifiant ---
  if (isOrgAdminPreview) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-vivid/20">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Quiz indisponible en mode aperçu</h1>
          <p className="text-muted-foreground">
            Le quiz de certification est réservé aux comptes ayant une licence active.
            Activez votre licence personnelle pour passer le quiz et obtenir le certificat.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/impots-team/dashboard?tab=membres">
              <Button>Activer ma licence personnelle</Button>
            </Link>
            <Button variant="outline" onClick={() => navigate(`/module/${slug}`)}>
              Retour au module
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- No questions ---
  if (total === 0) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">Quiz indisponible</h1>
          <p className="text-muted-foreground">Aucune question n'est disponible pour ce module.</p>
          <Button onClick={() => navigate('/dashboard')}>Retour au dashboard</Button>
        </div>
      </div>
    );
  }

  // --- Previous result screen ---
  if (previousResult && !started) {
    const prevPct = Math.round(Number(previousResult.pourcentage));
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="w-full max-w-[700px] text-center space-y-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Quiz — {moduleTitle}
          </h1>
          <p className="text-lg text-muted-foreground">
            Tu as déjà obtenu <span className="font-bold text-primary">{prevPct}%</span> à ce quiz.
            Tu peux le repasser pour améliorer ton score.
          </p>
          <p className="text-sm text-muted-foreground italic">
            {getResultMessage(prevPct, moduleTexts)}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={handleRestart}>Repasser le quiz</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Voir mes résultats</Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Finished ---
  if (finished) {
    const pct = Math.round((finalScore / total) * 100);
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="w-full max-w-[700px] text-center space-y-6">
          <h1 className="font-heading text-3xl font-bold text-foreground">Résultat du quiz 🎯</h1>
          <p className="text-5xl font-heading font-bold text-primary">{pct}%</p>
          <p className="text-lg text-muted-foreground">
            Tu as obtenu {finalScore}/{total} bonnes réponses.
          </p>
          <p className="text-base text-foreground">
            {getResultMessage(pct, moduleTexts)}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate(`/module/${slug}`)}>← Revenir au module</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Retour au dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Quiz in progress ---
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto w-full max-w-[700px] space-y-6">
        <button
          onClick={() => navigate(`/module/${slug}`)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Revenir au module
        </button>

        <div className="text-center space-y-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Quiz — {moduleTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} / {total}
          </p>
        </div>

        <Progress value={progressPercent} className="h-2" />

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="font-heading text-xl font-semibold text-foreground leading-snug">
            {question.question}
          </h3>

          <div className="space-y-3">
            {(question.options ?? []).map((opt, i) => {
              const letter = LETTERS[i];
              const isCorrect = opt === question.bonne_reponse;
              const isSelected = selectedOption === opt;

              let optClasses =
                'flex items-start gap-4 w-full rounded-lg border-2 p-4 text-left transition-all cursor-pointer';

              if (validated) {
                if (isCorrect) {
                  optClasses += ' border-green-500 bg-green-50 dark:bg-green-950/30';
                } else if (isSelected && !isCorrect) {
                  optClasses += ' border-destructive bg-red-50 dark:bg-red-950/30';
                } else {
                  optClasses += ' border-border bg-muted/50 opacity-60';
                }
                optClasses += ' cursor-default';
              } else {
                if (isSelected) {
                  optClasses += ' border-primary bg-primary/5';
                } else {
                  optClasses += ' border-border hover:border-primary/40 hover:bg-primary/5';
                }
              }

              return (
                <button
                  key={i}
                  className={optClasses}
                  onClick={() => { if (!validated) setSelectedOption(opt); }}
                  disabled={validated}
                >
                  <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 font-heading font-bold text-primary text-sm">
                    {letter}
                  </span>
                  <span className="flex-1 text-sm text-foreground leading-relaxed pt-1">{opt}</span>
                  {validated && isCorrect && <CheckCircle2 className="shrink-0 h-5 w-5 text-green-600 mt-1" />}
                  {validated && isSelected && !isCorrect && <XCircle className="shrink-0 h-5 w-5 text-destructive mt-1" />}
                </button>
              );
            })}
          </div>

          {validated && question.explication && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 p-4 text-sm text-foreground leading-relaxed">
              💡 {question.explication}
            </div>
          )}

          {!validated ? (
            <Button className="w-full" disabled={!selectedOption} onClick={handleValidate}>
              Valider ma réponse
            </Button>
          ) : (
            <Button className="w-full" onClick={handleNext}>
              {isLast ? 'Voir mon résultat →' : 'Question suivante →'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quizz;
