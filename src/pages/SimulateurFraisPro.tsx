import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Plus, Trash2 } from "lucide-react";

type Article = { description: string; prix: number };

type FormState = {
  // étape 1
  nbRepasInf: number;
  nbRepasSup: number;
  montantRepasSup: number;
  // étape 2
  kgSemaine: number;
  nbSemaines: number;
  // étape 4
  surfaceBureau: number;
  surfaceLogement: number;
  chargesAnnuelles: number;
  // étape 5
  fraisAstreinte: number;
  nbJoursAstreinte: number;
  indemAstreinte: number;
  // étape 6
  tel: number;
  doubleResidence: number;
  demenagementPro: number;
  interetsEmprunt: number;
  cotisations: number;
  forfaitInternet: number;
  fraisBancaire: number;
  achatLogiciel: number;
  autresFrais: number;
  // étape 7
  distance: number;
  surcout: number;
  interile: number;
  internetMobile: number;
};

const STEP6_FIELDS: { name: keyof FormState; label: string }[] = [
  { name: "tel", label: "Frais de téléphone professionnel (€/an)" },
  { name: "doubleResidence", label: "Double résidence (€/an)" },
  { name: "demenagementPro", label: "Déménagement professionnel (€)" },
  { name: "interetsEmprunt", label: "Intérêts d'emprunt professionnels (€/an)" },
  { name: "cotisations", label: "Cotisations professionnelles (€/an)" },
  { name: "forfaitInternet", label: "Forfait internet (€/an)" },
  { name: "fraisBancaire", label: "Frais bancaires professionnels (€/an)" },
  { name: "achatLogiciel", label: "Achat de logiciels (€)" },
  { name: "autresFrais", label: "Autres frais (€)" },
];

const STEP7_FIELDS: { name: keyof FormState; label: string }[] = [
  { name: "distance", label: "Kilométrage domicile-travail (km/an)" },
  { name: "surcout", label: "Surcoût de la vie en DOM (€/an)" },
  { name: "interile", label: "Indemnité d'interîle reçue (€/an)" },
  { name: "internetMobile", label: "Forfait internet + mobile (€/an)" },
];

const BAREME_REPAS = 5.35;
const BAREME_BLANCHISSEMENT = 0.65;

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
    kgSemaine: 0,
    nbSemaines: 0,
    surfaceBureau: 0,
    surfaceLogement: 0,
    chargesAnnuelles: 0,
    fraisAstreinte: 49,
    nbJoursAstreinte: 0,
    indemAstreinte: 0,
    tel: 0,
    doubleResidence: 0,
    demenagementPro: 0,
    interetsEmprunt: 0,
    cotisations: 0,
    forfaitInternet: 0,
    fraisBancaire: 0,
    achatLogiciel: 0,
    autresFrais: 0,
    distance: 0,
    surcout: 0,
    interile: 0,
    internetMobile: 0,
  });

  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const addArticle = () =>
    setArticles((a) => [...a, { description: "", prix: 0 }]);
  const removeArticle = (i: number) =>
    setArticles((a) => a.filter((_, idx) => idx !== i));
  const updateArticle = (i: number, patch: Partial<Article>) =>
    setArticles((a) => a.map((art, idx) => (idx === i ? { ...art, ...patch } : art)));

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
    if (activeStep === 0) {
      if (!(form.nbRepasInf > 0) || !(form.nbRepasSup > 0)) {
        setStep1Error("Veuillez renseigner le nombre de repas.");
        return;
      }
      setStep1Error(null);
      const totalRepasInf = form.nbRepasInf * BAREME_REPAS;
      const repasTotalStep1 = form.nbRepasSup * BAREME_REPAS;
      const totalRepasSup = form.montantRepasSup - repasTotalStep1;
      const totalRepas = totalRepasSup + totalRepasInf;
      setSections((s) => ({ ...s, sectionA: totalRepas }));
    }
    if (activeStep === 1) {
      if (!(form.kgSemaine > 0) || !(form.nbSemaines > 0)) {
        setStep2Error("Veuillez renseigner le linge et les semaines travaillées.");
        return;
      }
      setStep2Error(null);
      setSections((s) => ({
        ...s,
        sectionB: form.kgSemaine * form.nbSemaines * BAREME_BLANCHISSEMENT,
      }));
    }
    if (activeStep === 2) {
      const sectionC = articles.reduce((sum, item) => sum + (item.prix || 0), 0);
      setSections((s) => ({ ...s, sectionC }));
    }
    if (activeStep === 3) {
      setSections((s) => ({ ...s, sectionD: sectionDLive }));
    }
    if (activeStep === 4) {
      const fraisBruts = form.fraisAstreinte * form.nbJoursAstreinte;
      const sectionE = Math.max(0, fraisBruts - form.indemAstreinte);
      setSections((s) => ({ ...s, sectionE }));
    }
    if (activeStep === 5) {
      const sectionF = STEP6_FIELDS.reduce(
        (sum, f) => sum + (parseFloat(String(form[f.name])) || 0),
        0,
      );
      setSections((s) => ({ ...s, sectionF }));
    }
    if (activeStep === 6) {
      const sectionG = STEP7_FIELDS.reduce(
        (sum, f) => sum + (parseFloat(String(form[f.name])) || 0),
        0,
      );
      setSections((s) => ({ ...s, sectionG }));
    }
    if (activeStep < STEP_TITLES.length - 1) {
      setActiveStep(activeStep + 1);
      setShowResults(false);
    } else {
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
                  ) : idx === 0 ? (
                    <div className="space-y-4">
                      <NumberInput
                        id="nbRepasInf"
                        label="Nombre de repas par semaine inférieurs ou égaux à 5,35 €"
                        value={form.nbRepasInf}
                        onChange={(v) => setField("nbRepasInf", v)}
                      />
                      <NumberInput
                        id="nbRepasSup"
                        label="Nombre de repas par semaine supérieurs à 5,35 €"
                        value={form.nbRepasSup}
                        onChange={(v) => setField("nbRepasSup", v)}
                      />
                      <NumberInput
                        id="montantRepasSup"
                        label="Montant moyen par repas supérieur à 5,35 € (en €)"
                        value={form.montantRepasSup}
                        onChange={(v) => setField("montantRepasSup", v)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Barème fiscal : 5,35 € par repas
                      </p>
                      {step1Error && (
                        <p className="text-sm text-destructive">{step1Error}</p>
                      )}
                    </div>
                  ) : idx === 1 ? (
                    <div className="space-y-4">
                      <NumberInput
                        id="kgSemaine"
                        label="Nombre de kg de linge professionnel par semaine"
                        value={form.kgSemaine}
                        onChange={(v) => setField("kgSemaine", v)}
                      />
                      <NumberInput
                        id="nbSemaines"
                        label="Nombre de semaines travaillées dans l'année"
                        value={form.nbSemaines}
                        onChange={(v) => setField("nbSemaines", v)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Barème fiscal : 0,65 € par kg de linge
                      </p>
                      {step2Error && (
                        <p className="text-sm text-destructive">{step2Error}</p>
                      )}
                    </div>
                  ) : idx === 2 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Section optionnelle. Ajoutez vos achats de matériel et documentation professionnels.
                      </p>
                      {articles.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          Aucun article ajouté.
                        </p>
                      )}
                      {articles.map((article, i) => (
                        <div
                          key={i}
                          className="grid gap-3 sm:grid-cols-[1fr_140px_auto] items-end rounded-md border border-border p-3"
                        >
                          <div className="space-y-1.5">
                            <Label htmlFor={`desc-${i}`}>Description du matériel</Label>
                            <Input
                              id={`desc-${i}`}
                              value={article.description}
                              onChange={(e) =>
                                updateArticle(i, { description: e.target.value })
                              }
                              placeholder="Ex : ordinateur portable"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`prix-${i}`}>Prix (€)</Label>
                            <Input
                              id={`prix-${i}`}
                              type="number"
                              step="0.01"
                              min={0}
                              inputMode="decimal"
                              value={article.prix || ""}
                              onChange={(e) =>
                                updateArticle(i, { prix: Number(e.target.value) || 0 })
                              }
                              placeholder="0"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeArticle(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addArticle}>
                        <Plus className="h-4 w-4" />
                        Ajouter un article
                      </Button>
                    </div>
                  ) : idx === 4 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Cette section est optionnelle.
                      </p>
                      <NumberInput
                        id="fraisAstreinte"
                        label="Frais d'astreinte (€ par jour)"
                        value={form.fraisAstreinte}
                        onChange={(v) => setField("fraisAstreinte", v)}
                      />
                      <NumberInput
                        id="nbJoursAstreinte"
                        label="Nombre de jours d'astreinte dans l'année"
                        value={form.nbJoursAstreinte}
                        onChange={(v) => setField("nbJoursAstreinte", v)}
                      />
                      <NumberInput
                        id="indemAstreinte"
                        label="Indemnité d'astreinte reçue de l'employeur (€)"
                        value={form.indemAstreinte}
                        onChange={(v) => setField("indemAstreinte", v)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Frais nets déductibles = (frais journalier × nombre de jours) − indemnité reçue
                      </p>
                    </div>
                  ) : idx === 5 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Cette section est optionnelle. Tous les champs sont facultatifs.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {STEP6_FIELDS.map((f) => (
                          <NumberInput
                            key={f.name}
                            id={f.name}
                            label={f.label}
                            value={form[f.name] as number}
                            onChange={(v) => setField(f.name, v as never)}
                          />
                        ))}
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
