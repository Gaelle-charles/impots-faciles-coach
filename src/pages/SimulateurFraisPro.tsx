import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown, Plus, Trash2, RefreshCw, Receipt } from "lucide-react";

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

const STEP6_FIELDS: { name: keyof FormState; label: string; hint?: string }[] = [
  { name: "tel", label: "Frais de téléphone professionnel (€/an)", hint: "Part professionnelle de votre forfait mobile." },
  { name: "doubleResidence", label: "Double résidence (€/an)", hint: "Loyer + charges d'un second logement pour raison professionnelle." },
  { name: "demenagementPro", label: "Déménagement professionnel (€)", hint: "Frais réels engagés lors d'un déménagement imposé par l'employeur." },
  { name: "interetsEmprunt", label: "Intérêts d'emprunt professionnels (€/an)", hint: "Intérêts payés sur un prêt servant à acquérir un bien professionnel." },
  { name: "cotisations", label: "Cotisations professionnelles (€/an)", hint: "Cotisations syndicales, ordres professionnels, etc." },
  { name: "forfaitInternet", label: "Forfait internet (€/an)", hint: "Quote-part d'usage professionnel de votre abonnement internet." },
  { name: "fraisBancaire", label: "Frais bancaires professionnels (€/an)", hint: "Frais d'un compte dédié à l'activité professionnelle." },
  { name: "achatLogiciel", label: "Achat de logiciels (€)", hint: "Logiciels nécessaires à l'exercice de votre activité." },
  { name: "autresFrais", label: "Autres frais (€)", hint: "Tout autre frais professionnel justifiable." },
];

const STEP7_FIELDS: { name: keyof FormState; label: string; hint?: string }[] = [
  { name: "distance", label: "Kilométrage domicile-travail (km/an)", hint: "Distance annuelle parcourue entre votre domicile et votre lieu de travail." },
  { name: "surcout", label: "Surcoût de la vie en DOM (€/an)", hint: "Différentiel de coût de la vie estimé en outre-mer." },
  { name: "interile", label: "Indemnité d'interîle reçue (€/an)", hint: "Indemnité versée pour vos déplacements entre îles." },
  { name: "internetMobile", label: "Forfait internet + mobile (€/an)", hint: "Coût annuel de vos forfaits télécoms professionnels." },
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
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm">{label}</Label>
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
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

export default function SimulateurFraisPro() {
  const [activeStep, setActiveStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const initialForm: FormState = {
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
  };
  const initialSections: Sections = {
    sectionA: 0,
    sectionB: 0,
    sectionC: 0,
    sectionD: 0,
    sectionE: 0,
    sectionF: 0,
    sectionG: 0,
  };

  const [form, setForm] = useState<FormState>(initialForm);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  const addArticle = () =>
    setArticles((a) => [...a, { description: "", prix: 0 }]);
  const removeArticle = (i: number) =>
    setArticles((a) => a.filter((_, idx) => idx !== i));
  const updateArticle = (i: number, patch: Partial<Article>) =>
    setArticles((a) => a.map((art, idx) => (idx === i ? { ...art, ...patch } : art)));

  const [sections, setSections] = useState<Sections>(initialSections);

  const handleReset = () => {
    setForm(initialForm);
    setSections(initialSections);
    setArticles([]);
    setStep1Error(null);
    setStep2Error(null);
    setShowResults(false);
    setActiveStep(0);
  };

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
  const totalArrondi = Math.round(total);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-[#2D1B4E] text-white">
        <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl" aria-hidden>🧾</span>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                Simulateur de frais
              </h1>
              <p className="text-sm sm:text-base text-white/80 mt-1">
                Estimez facilement vos frais professionnels déductibles des impôts
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-6">
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
              className={`transition-shadow ${
                isActive
                  ? "border-[#2D1B4E] shadow-md"
                  : "border-border hover:shadow-sm"
              }`}
            >
              <CardHeader
                className="cursor-pointer flex-row items-center gap-3 space-y-0 py-4"
                onClick={() => setActiveStep(idx)}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    isDone
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-[#2D1B4E] text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                  aria-label={`Étape ${idx + 1}`}
                >
                  {isDone ? <Check className="h-5 w-5" /> : idx + 1}
                </div>
                <CardTitle className="text-sm sm:text-base font-semibold flex-1">
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
                        hint="Surface du local utilisé exclusivement comme bureau."
                        value={form.surfaceBureau}
                        onChange={(v) => setField("surfaceBureau", v)}
                      />
                      <NumberInput
                        id="surfaceLogement"
                        label="Surface totale du logement (m²)"
                        hint="Surface totale habitable de votre logement."
                        value={form.surfaceLogement}
                        onChange={(v) => setField("surfaceLogement", v)}
                      />
                      <NumberInput
                        id="chargesAnnuelles"
                        label="Charges annuelles du logement — loyer + charges (€)"
                        hint="Loyer annuel + charges (eau, électricité, chauffage…)."
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
                        hint="Repas dont vous estimez le coût ≤ au barème fiscal."
                        value={form.nbRepasInf}
                        onChange={(v) => setField("nbRepasInf", v)}
                      />
                      <NumberInput
                        id="nbRepasSup"
                        label="Nombre de repas par semaine supérieurs à 5,35 €"
                        hint="Repas dont le coût dépasse le barème."
                        value={form.nbRepasSup}
                        onChange={(v) => setField("nbRepasSup", v)}
                      />
                      <NumberInput
                        id="montantRepasSup"
                        label="Montant moyen par repas supérieur à 5,35 € (en €)"
                        hint="Coût moyen total payé pour ces repas plus chers."
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
                        hint="Poids hebdomadaire de votre linge de travail nettoyé."
                        value={form.kgSemaine}
                        onChange={(v) => setField("kgSemaine", v)}
                      />
                      <NumberInput
                        id="nbSemaines"
                        label="Nombre de semaines travaillées dans l'année"
                        hint="Hors congés payés. En général entre 44 et 47 semaines."
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
                        hint="Forfait journalier admis par l'administration (par défaut 49 €)."
                        value={form.fraisAstreinte}
                        onChange={(v) => setField("fraisAstreinte", v)}
                      />
                      <NumberInput
                        id="nbJoursAstreinte"
                        label="Nombre de jours d'astreinte dans l'année"
                        hint="Total de jours d'astreinte effectués sur l'année."
                        value={form.nbJoursAstreinte}
                        onChange={(v) => setField("nbJoursAstreinte", v)}
                      />
                      <NumberInput
                        id="indemAstreinte"
                        label="Indemnité d'astreinte reçue de l'employeur (€)"
                        hint="Montant total versé par l'employeur pour ces astreintes."
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
                            hint={f.hint}
                            value={form[f.name] as number}
                            onChange={(v) => setField(f.name, v as never)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : idx === 6 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Cette section concerne les salariés résidant dans les départements et régions d'outre-mer.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {STEP7_FIELDS.map((f) => (
                          <NumberInput
                            key={f.name}
                            id={f.name}
                            label={f.label}
                            hint={f.hint}
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

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
                    {idx > 0 ? (
                      <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
                        Retour
                      </Button>
                    ) : (
                      <span className="hidden sm:block" />
                    )}
                    {idx === STEP_TITLES.length - 1 ? (
                      <Button
                        onClick={handleNext}
                        className="w-full sm:w-auto bg-[#F9A825] hover:bg-[#F57F17] text-[#2D1B4E] font-bold"
                      >
                        <Receipt className="h-4 w-4" />
                        Calculer
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        className="w-full sm:w-auto bg-[#2D1B4E] hover:bg-[#3d2466] text-white"
                      >
                        {idx === 0 ? "Commencer" : "Suivant"}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {showResults && (() => {
        const rows: { label: string; value: number }[] = [
          { label: "Frais de repas hors domicile", value: Math.round(sections.sectionA) },
          { label: "Frais de blanchissement", value: Math.round(sections.sectionB) },
          { label: "Matériel professionnel", value: Math.round(sections.sectionC) },
          { label: "Bureau à domicile", value: Math.round(sections.sectionD) },
          { label: "Frais d'astreinte", value: Math.round(sections.sectionE) },
          { label: "Frais divers", value: Math.round(sections.sectionF) },
          { label: "Spécificités DOM", value: Math.round(sections.sectionG) },
        ].filter((r) => r.value > 0);

        return (
          <Card className="border-2 border-[#2D1B4E]/30 bg-[#FFF8E7] rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl text-[#2D1B4E]">
                Résultat de votre simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl bg-[#2D1B4E] text-white text-center px-4 py-8 shadow-inner">
                <p className="text-sm sm:text-base text-white/80">
                  Vos frais réels professionnels pour votre déclaration d'impôt s'élèvent à :
                </p>
                <p className="font-heading text-4xl sm:text-6xl font-extrabold text-[#F9E900] mt-3">
                  {totalArrondi} €
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-[#2D1B4E]">
                  Détails de votre simulation :
                </h3>
                <div className="rounded-lg border border-[#2D1B4E]/20 overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-[#2D1B4E]/10">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-[#2D1B4E]">Catégorie</th>
                        <th className="text-right px-4 py-2 font-semibold text-[#2D1B4E]">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.label} className="border-t border-border">
                          <td className="px-4 py-2">{r.label}</td>
                          <td className="px-4 py-2 text-right font-medium">{r.value} €</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-[#2D1B4E] bg-[#F9E900]/30 font-bold">
                        <td className="px-4 py-3 text-[#2D1B4E]">TOTAL</td>
                        <td className="px-4 py-3 text-right text-[#2D1B4E]">{totalArrondi} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-[#2D1B4E] text-[#2D1B4E] hover:bg-[#2D1B4E] hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recommencer la simulation
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}
      </div>
    </div>
  );
}
