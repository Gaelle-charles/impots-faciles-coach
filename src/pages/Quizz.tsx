import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Lock, AlertTriangle, Trophy, Download } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { downloadCertificatPdf, type CertificatData } from '@/lib/certificat-pdf';

type QuizzRow = Tables<'quizz'>;
type ResultatRow = Tables<'resultat_quiz'>;

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const PASS_THRESHOLD = 70;
const MAX_ATTEMPTS = 3;

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
  const [allAttempts, setAllAttempts] = useState<ResultatRow[]>([]);
  const [certificat, setCertificat] = useState<CertificatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        .order('ordre', { ascending: true }),
      supabase
        .from('resultat_quiz')
        .select('*')
        .eq('module_id', mod.id)
        .eq('user_id', user.id)
        .order('tentative_numero', { ascending: true }),
    ]);

    if (qRes.error) { setError('Erreur lors du chargement des questions.'); setLoading(false); return; }

    setQuestions(qRes.data ?? []);
    setAllAttempts(rRes.data ?? []);
    setLoading(false);
  }, [slug, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Récupère le certificat dès qu'il existe (créé par trigger DB après réussite)
  useEffect(() => {
    if (!user || !moduleId) return;
    supabase
      .from('certificats')
      .select('numero, prenom, nom, module_titre, pourcentage, score, score_max, date_obtention')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle()
      .then(({ data }) => setCertificat(data as CertificatData | null));
  }, [user, moduleId, allAttempts.length]);

  const total = questions.length;
  const question = questions[currentIndex];
  const isLast = currentIndex === total - 1;
  const progressPercent = total > 0 ? ((currentIndex + (validated ? 1 : 0)) / total) * 100 : 0;

  const attemptsUsed = allAttempts.length;
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed);
  const bestScore = allAttempts.length > 0
    ? Math.max(...allAttempts.map(a => Math.round(Number(a.pourcentage))))
    : 0;
  const hasPassed = bestScore >= PASS_THRESHOLD;
  const noMoreAttempts = attemptsUsed >= MAX_ATTEMPTS && !hasPassed;
  const currentAttemptNumber = attemptsUsed + 1; // si on lance une nouvelle tentative

  const handleValidate = () => {
    if (!selectedOption || !question) return;
    const correct = selectedOption === question.bonne_reponse;
    setValidated(true);
    if (correct) setScore((s) => s + 1);
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
    const computedScore = score;
    setFinalScore(computedScore);
    setFinished(true);
    setSubmitError(null);

    if (!moduleId || !user) return;
    setSubmitting(true);
    const pct = Math.round((computedScore / total) * 100);
    const { error: insertErr } = await supabase.from('resultat_quiz').insert({
      module_id: moduleId,
      user_id: user.id,
      score: computedScore,
      score_max: total,
      pourcentage: pct,
      // tentative_numero auto-attribué par le trigger
    });
    setSubmitting(false);

    if (insertErr) {
      setSubmitError(insertErr.message || 'Impossible d’enregistrer le résultat.');
    } else {
      // Refresh attempts pour avoir le bon numéro / état à jour
      const { data } = await supabase
        .from('resultat_quiz')
        .select('*')
        .eq('module_id', moduleId)
        .eq('user_id', user.id)
        .order('tentative_numero', { ascending: true });
      setAllAttempts(data ?? []);
    }
  };

  const handleRestart = () => {
    if (noMoreAttempts) return;
    setStarted(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setValidated(false);
    setScore(0);
    setFinalScore(0);
    setFinished(false);
    setSubmitError(null);
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

  // --- Mode aperçu admin orga ---
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

  // --- Écran d'accueil : tentatives déjà passées ---
  if (!started && !finished && allAttempts.length > 0) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[700px] text-center space-y-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Quiz — {moduleTitle}
          </h1>

          {hasPassed && (
            <div className="rounded-xl border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20 p-6 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-green-600" />
                <Badge className="bg-green-600 text-white text-sm px-3 py-1">Module validé</Badge>
              </div>
              <p className="text-lg text-foreground">
                Meilleur score : <span className="font-bold text-green-700 dark:text-green-400">{bestScore}%</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Tu as réussi ce quiz ! ({attemptsUsed}/{MAX_ATTEMPTS} tentative{attemptsUsed > 1 ? 's' : ''} utilisée{attemptsUsed > 1 ? 's' : ''})
              </p>
              {certificat && (
                <Button
                  onClick={() => downloadCertificatPdf(certificat)}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4" /> Télécharger mon certificat (PDF)
                </Button>
              )}
            </div>
          )}

          {!hasPassed && noMoreAttempts && (
            <div className="rounded-xl border-2 border-destructive/50 bg-red-50 dark:bg-red-950/20 p-6 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <Badge variant="destructive" className="text-sm px-3 py-1">Tentatives épuisées</Badge>
              </div>
              <p className="text-lg text-foreground">
                Meilleur score : <span className="font-bold text-destructive">{bestScore}%</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Vous avez utilisé vos 3 tentatives. Le certificat ne peut être obtenu pour ce module.
              </p>
            </div>
          )}

          {!hasPassed && !noMoreAttempts && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <p className="text-lg text-foreground">
                Meilleur score : <span className="font-bold text-primary">{bestScore}%</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Tentatives utilisées : <strong>{attemptsUsed}/{MAX_ATTEMPTS}</strong>
                {' • '}Seuil de réussite : <strong>{PASS_THRESHOLD}%</strong>
              </p>
              <p className="text-sm italic text-muted-foreground">
                {getResultMessage(bestScore, moduleTexts)}
              </p>
            </div>
          )}

          {/* Historique des tentatives */}
          <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Historique
            </p>
            {allAttempts.map(a => {
              const pct = Math.round(Number(a.pourcentage));
              const ok = pct >= PASS_THRESHOLD;
              return (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tentative {a.tentative_numero} — {new Date(a.date_quiz).toLocaleDateString('fr-FR')}
                  </span>
                  <Badge
                    className={ok
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                  >
                    {pct}% {ok ? '✓' : '✗'}
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {!noMoreAttempts && (
              <Button onClick={handleRestart}>
                {hasPassed
                  ? `Repasser le quiz (tentative ${currentAttemptNumber}/${MAX_ATTEMPTS})`
                  : `Nouvelle tentative (${currentAttemptNumber}/${MAX_ATTEMPTS})`}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Retour au dashboard</Button>
          </div>

          <LegalDisclaimer />
        </div>
      </div>
    );
  }

  // --- Première fois : pas encore commencé, lancer auto ---
  if (!started && !finished && allAttempts.length === 0) {
    setStarted(true);
    return null;
  }

  // --- Finished ---
  if (finished) {
    const pct = total > 0 ? Math.round((finalScore / total) * 100) : 0;
    const passed = pct >= PASS_THRESHOLD;
    const attemptNum = allAttempts.length > 0
      ? allAttempts[allAttempts.length - 1].tentative_numero
      : currentAttemptNumber;

    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[700px] text-center space-y-6">
          <h1 className="font-heading text-3xl font-bold text-foreground">Résultat du quiz 🎯</h1>

          <div className="space-y-2">
            <p className={`text-5xl font-heading font-bold ${passed ? 'text-green-600' : 'text-primary'}`}>{pct}%</p>
            <p className="text-lg text-muted-foreground">
              {finalScore}/{total} bonnes réponses
            </p>
            <p className="text-sm text-muted-foreground">
              Tentative {attemptNum}/{MAX_ATTEMPTS}
            </p>
          </div>

          {passed ? (
            <div className="rounded-lg border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20 p-4 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-green-600" />
                <span className="font-heading font-bold text-green-700 dark:text-green-400">
                  Module validé !
                </span>
              </div>
              {certificat && (
                <Button
                  onClick={() => downloadCertificatPdf(certificat)}
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4" /> Télécharger mon certificat (PDF)
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Seuil de réussite : <strong>{PASS_THRESHOLD}%</strong> — il te manque {Math.max(0, PASS_THRESHOLD - pct)} points pour valider.
            </div>
          )}

          <p className="text-base text-foreground">
            {getResultMessage(pct, moduleTexts)}
          </p>

          {submitting && (
            <p className="text-xs text-muted-foreground">Enregistrement en cours…</p>
          )}
          {submitError && (
            <p className="text-xs text-destructive">⚠️ {submitError}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate(`/module/${slug}`)}>← Revenir au module</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Retour au dashboard</Button>
          </div>

          <LegalDisclaimer />
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

        <div className="text-center space-y-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Quiz — {moduleTitle}
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              Tentative {currentAttemptNumber}/{MAX_ATTEMPTS}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} / {total}
            </span>
          </div>
        </div>

        <Progress value={progressPercent} className="h-2" />

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="font-heading text-xl font-semibold text-foreground leading-snug">
            {question.question}
          </h3>

          <div className="space-y-3">
            {(question.options ?? []).map((opt, i) => {
              const letter = LETTERS[i] ?? '?';
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

        <LegalDisclaimer />
      </div>
    </div>
  );
};

// ─── Disclaimer pédagogique (E) ───
function LegalDisclaimer() {
  return (
    <div className="rounded-lg border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-left">
      <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
        <strong>⚠️ Mention légale.</strong> Ce quiz est pédagogique. Il atteste de votre apprentissage du parcours
        Impôts Facile mais ne constitue pas une certification professionnelle au sens du RNCP.
        Pour toute question fiscale engageant votre responsabilité, consultez un expert-comptable
        inscrit à l'Ordre.
      </p>
    </div>
  );
}

export default Quizz;
