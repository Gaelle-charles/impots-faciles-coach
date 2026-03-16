import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle } from 'lucide-react';

const MOCK_MODULE_TITLE = "Les bases de l'impôt sur le revenu";

const MOCK_QUESTIONS = [
  {
    id: '1',
    question: "Quel est le barème progressif de l'impôt sur le revenu en France ?",
    options: [
      "Un taux unique de 30 % appliqué à tous les revenus",
      "Des tranches de revenus avec des taux croissants (0 %, 11 %, 30 %, 41 %, 45 %)",
      "Un taux fixe déterminé par la commune de résidence",
    ],
    bonne_reponse: "Des tranches de revenus avec des taux croissants (0 %, 11 %, 30 %, 41 %, 45 %)",
    explication:
      "L'impôt sur le revenu en France utilise un barème progressif par tranches. Chaque tranche de revenu est imposée à un taux différent, de 0 % pour les revenus les plus bas à 45 % pour les plus élevés.",
  },
  {
    id: '2',
    question: "Qu'est-ce que le quotient familial ?",
    options: [
      "Le nombre d'enfants divisé par le revenu brut",
      "Un mécanisme qui divise le revenu imposable par le nombre de parts fiscales du foyer",
      "Une aide financière versée par la CAF",
    ],
    bonne_reponse: "Un mécanisme qui divise le revenu imposable par le nombre de parts fiscales du foyer",
    explication:
      "Le quotient familial divise le revenu imposable par le nombre de parts du foyer (adultes + enfants). Cela permet de réduire l'impôt pour les familles nombreuses en tenant compte de leurs charges.",
  },
  {
    id: '3',
    question: "À quelle date limite faut-il généralement déclarer ses revenus en ligne ?",
    options: [
      "Le 31 décembre de l'année en cours",
      "Fin mai ou début juin, selon le département",
      "Le 1er janvier de l'année suivante",
    ],
    bonne_reponse: "Fin mai ou début juin, selon le département",
    explication:
      "La date limite de déclaration en ligne varie selon le département de résidence, généralement entre fin mai et début juin. Les dates exactes sont communiquées chaque année par l'administration fiscale.",
  },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const Quizz = () => {
  const { id: slug } = useParams();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = MOCK_QUESTIONS.length;
  const question = MOCK_QUESTIONS[currentIndex];
  const progressPercent = ((currentIndex + (validated ? 1 : 0)) / total) * 100;
  const isLast = currentIndex === total - 1;

  const handleValidate = () => {
    if (!selectedOption) return;
    setValidated(true);
    if (selectedOption === question.bonne_reponse) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setValidated(false);
  };

  if (finished) {
    const pct = Math.round((score / total) * 100);
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="w-full max-w-[700px] text-center space-y-6">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Résultat du quiz 🎯
          </h1>
          <p className="text-5xl font-heading font-bold text-primary">{pct}%</p>
          <p className="text-lg text-muted-foreground">
            Tu as obtenu {score}/{total} bonnes réponses.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate(`/module/${slug}`)}>
              ← Revenir au module
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Retour au dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto w-full max-w-[700px] space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate(`/module/${slug}`)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Revenir au module
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Quiz — {MOCK_MODULE_TITLE}
          </h1>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} / {total}
          </p>
        </div>

        {/* Progress */}
        <Progress value={progressPercent} className="h-2" />

        {/* Question card */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="font-heading text-xl font-semibold text-foreground leading-snug">
            {question.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((opt, i) => {
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
                  optClasses +=
                    ' border-border hover:border-primary/40 hover:bg-primary/5';
                }
              }

              return (
                <button
                  key={i}
                  className={optClasses}
                  onClick={() => {
                    if (!validated) setSelectedOption(opt);
                  }}
                  disabled={validated}
                >
                  {/* Letter badge */}
                  <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 font-heading font-bold text-primary text-sm">
                    {letter}
                  </span>

                  <span className="flex-1 text-sm text-foreground leading-relaxed pt-1">
                    {opt}
                  </span>

                  {/* Result icon */}
                  {validated && isCorrect && (
                    <CheckCircle2 className="shrink-0 h-5 w-5 text-green-600 mt-1" />
                  )}
                  {validated && isSelected && !isCorrect && (
                    <XCircle className="shrink-0 h-5 w-5 text-destructive mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {validated && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 p-4 text-sm text-foreground leading-relaxed">
              💡 {question.explication}
            </div>
          )}

          {/* Action button */}
          {!validated ? (
            <Button
              className="w-full"
              disabled={!selectedOption}
              onClick={handleValidate}
            >
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
