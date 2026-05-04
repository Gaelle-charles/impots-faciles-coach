import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

type FormState = {
  // étape 1
  nbRepasInf: number;
  nbRepasSup: number;
  montantRepasSup: number;
  // étape 4
  surfaceBureau: number;
  surfaceLogement: number;
  chargesAnnuelles: number;
};

const BAREME_REPAS = 5.35;

type Sections = {
  sectionA: number;
  sectionB: number;
  sectionC: number;
  sectionD: number;
  sectionE: number;
  sectionF: number;
  sectionG: number;
};

const STEP_TITLES = [
  "Frais de repas hors domicile",
  "Frais de blanchissement",
  "Matériel professionnel & documentation",
  "Bureau à domicile",
  "Frais d'astreinte",
  "Frais divers souvent oubliés",
  "Spécificités DOM (Guadeloupe, Martinique, Guyane, Réunion, Mayotte)",
];

const NumberInput = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="number"
      step="0.01"
      min={0}
      inputMode="decimal"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder="0"
    />
  </div>
);

export default function SimulateurFraisPro() {
  const [activeStep, setActiveStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const [form, setForm] = useState<FormState>({
    nbRepasInf: 0,
    nbRepasSup: 0,
    montantRepasSup: 0,
    surfaceBureau: 0,
    surfaceLogement: 0,
    chargesAnnuelles: 0,
  });

  const [step1Error, setStep1Error] = useState<string | null>(null);

  const [sections, setSections] = useState<Sections>({
    sectionA: 0,
    sectionB: 0,
    sectionC: 0,
    sectionD: 0,
    sectionE: 0,
    sectionF: 0,
    sectionG: 0,
  });

  // Calcul temps réel pour l'étape 4
  const { quotePart, sectionDLive } = useMemo(() => {
    const qp =
      form.surfaceLogement > 0 ? form.surfaceBureau / form.surfaceLogement : 0;
    const d = qp * form.chargesAnnuelles;
    return { quotePart: qp, sectionDLive: d };
  }, [form.surfaceBureau, form.surfaceLogement, form.chargesAnnuelles]);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleNext = () => {
    // À la sortie de l'étape 4, on stocke sectionD
    if (activeStep === 3) {
      setSections((s) => ({ ...s, sectionD: sectionDLive }));
    }
    if (activeStep < STEP_TITLES.length - 1) {
      setActiveStep(activeStep + 1);
      setShowResults(false);
    } else {
      // Calculer (dernière étape)
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
    setShowResults(false);
  };

  const total = Object.values(sections).reduce((a, b) => a + b, 0);

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 space-y-8">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Simulateur de frais
        </h1>
        <p className="text-muted-foreground">
          Estimez facilement vos frais professionnels déductibles des impôts
        </p>
      </header>

      <p className="text-sm text-foreground/80">
        Cet outil vous permet de calculer vos frais réels professionnels pour
        votre déclaration d'impôts. Remplissez les informations ci-dessous pour
        obtenir une estimation de vos frais déductibles.
      </p>

      <div className="space-y-3">
        {STEP_TITLES.map((title, idx) => {
          const isActive = idx === activeStep;
          const isDone = idx < activeStep;
          return (
            <Card
              key={idx}
              className={isActive ? "border-primary" : "border-border"}
            >
              <CardHeader
                className="cursor-pointer flex-row items-center gap-3 space-y-0 py-4"
                onClick={() => setActiveStep(idx)}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <CardTitle className="text-base font-semibold">
                  {title}
                </CardTitle>
              </CardHeader>

              {isActive && (
                <CardContent className="space-y-5">
                  {idx === 3 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Cette section est optionnelle.
                      </p>

                      <NumberInput
                        id="surfaceBureau"
                        label="Surface du bureau professionnel (m²)"
                        value={form.surfaceBureau}
                        onChange={(v) => setField("surfaceBureau", v)}
                      />
                      <NumberInput
                        id="surfaceLogement"
                        label="Surface totale du logement (m²)"
                        value={form.surfaceLogement}
                        onChange={(v) => setField("surfaceLogement", v)}
                      />
                      <NumberInput
                        id="chargesAnnuelles"
                        label="Charges annuelles du logement — loyer + charges (€)"
                        value={form.chargesAnnuelles}
                        onChange={(v) => setField("chargesAnnuelles", v)}
                      />

                      <div className="rounded-md border border-border bg-muted/40 p-4 text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">
                            Quote-part bureau :{" "}
                          </span>
                          <span className="font-semibold text-foreground">
                            {(quotePart * 100).toFixed(1)} %
                          </span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">
                            Montant déductible :{" "}
                          </span>
                          <span className="font-semibold text-foreground">
                            {sectionDLive.toFixed(2)} €
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Contenu à compléter pour cette étape.
                    </p>
                  )}

                  <div className="flex justify-between gap-3 pt-2">
                    {idx > 0 ? (
                      <Button variant="outline" onClick={handleBack}>
                        Retour
                      </Button>
                    ) : (
                      <span />
                    )}
                    <Button onClick={handleNext}>
                      {idx === 0
                        ? "Commencer"
                        : idx === STEP_TITLES.length - 1
                        ? "Calculer"
                        : "Suivant"}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {showResults && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Bureau à domicile (section D)
              </span>
              <span className="font-medium">
                {sections.sectionD.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2 font-bold">
              <span>Total estimé</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
