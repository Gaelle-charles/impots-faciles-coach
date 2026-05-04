import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronDown, Plus, Trash2, RefreshCw, Receipt, Info, Loader2, Palmtree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FISCAL_YEAR = 2025;

type Article = { description: string; prix: number };
type LingeLigne = {
  vetement: string;
  nbPieces: number;
  tarifPressing: number;
  nbLavages: number;
};

type FormState = {
  // étape 1 — repas (refonte)
  nbRepasSansJustif: number;
  nbRepasAvecJustif: number;
  coutMoyenRepas: number;
  nbSemainesRepas: number;
  // étape 2 — blanchissement (refonte)
  modeBlanchissement: "factures" | "domicile";
  totalFacturesPressing: number;
  // étape 4 — bureau
  surfaceBureau: number;
  surfaceLogement: number;
  chargesAnnuelles: number;
  // étape 5 — frais divers (ex-6)
  tel: number;
  doubleResidence: number;
  demenagementPro: number;
  interetsEmprunt: number;
  cotisations: number;
  forfaitInternet: number;
  fraisBancaire: number;
  achatLogiciel: number;
  autresFrais: number;
  // étape 6 — frais kilométriques (ex-7, refonte)
  typeVehicule: "thermique" | "electrique";
  puissanceCV: 3 | 4 | 5 | 6 | 7;
  distanceAller: number;
  nbJoursTravailles: number;
  // étape 7 — spécificités outre-mer
  fraisInterIles: number;
};

const STEP5_FIELDS: { name: keyof FormState; label: string; hint?: string }[] = [
  { name: "tel", label: "Frais de téléphone professionnel (€/an)", hint: "Quote-part professionnelle de votre forfait mobile." },
  { name: "doubleResidence", label: "Double résidence (€/an)", hint: "Loyer + charges d'un second logement pour raison professionnelle." },
  { name: "demenagementPro", label: "Déménagement professionnel (€)", hint: "Frais réels engagés lors d'un déménagement imposé par l'employeur." },
  { name: "interetsEmprunt", label: "Intérêts d'emprunt professionnels (€/an)", hint: "Intérêts payés sur un prêt servant à acquérir un bien professionnel." },
  { name: "cotisations", label: "Cotisations professionnelles (€/an)", hint: "Cotisations syndicales, ordres professionnels, etc." },
  { name: "forfaitInternet", label: "Forfait internet (€/an)", hint: "Quote-part professionnelle de votre abonnement internet." },
  { name: "fraisBancaire", label: "Frais bancaires professionnels (€/an)", hint: "Frais d'un compte dédié à l'activité professionnelle." },
  { name: "achatLogiciel", label: "Achat de logiciels (€)", hint: "Logiciels nécessaires à l'exercice de votre activité." },
  { name: "autresFrais", label: "Autres frais (€)", hint: "Tout autre frais professionnel justifiable." },
];

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
  "Frais divers souvent oubliés",
  "Frais kilométriques",
  "Spécificités outre-mer",
];

type Constants = {
  repas_valeur_foyer: number;
  repas_plafond_jour: number;
  blanchissage_decote_domicile: number;
  km_voiture_3cv_seuil1: number;
  km_voiture_4cv_seuil1: number;
  km_voiture_5cv_seuil1: number;
  km_voiture_6cv_seuil1: number;
  km_voiture_7cv_seuil1: number;
  km_majoration_electrique: number;
  refaction_drom_zone1: number;
  refaction_drom_zone2: number;
};

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
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const [constants, setConstants] = useState<Constants | null>(null);
  const [constantsLoading, setConstantsLoading] = useState(true);
  const [constantsError, setConstantsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setConstantsLoading(true);
      const { data, error } = await (supabase as any)
        .from("simulator_constants")
        .select("constant_key, value, unit")
        .eq("simulator_key", "frais_reels")
        .eq("fiscal_year", FISCAL_YEAR);
      if (cancelled) return;
      if (error || !data) {
        setConstantsError("Impossible de charger les barèmes officiels. Veuillez réessayer plus tard.");
        setConstantsLoading(false);
        return;
      }
      const obj: Record<string, number> = {};
      for (const row of data as Array<{ constant_key: string; value: number | string }>) {
        obj[row.constant_key] = Number(row.value);
      }
      setConstants(obj as unknown as Constants);
      setConstantsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const initialForm: FormState = {
    nbRepasSansJustif: 0,
    nbRepasAvecJustif: 0,
    coutMoyenRepas: 0,
    nbSemainesRepas: 47,
    modeBlanchissement: "factures",
    totalFacturesPressing: 0,
    surfaceBureau: 0,
    surfaceLogement: 0,
    chargesAnnuelles: 0,
    tel: 0,
    doubleResidence: 0,
    demenagementPro: 0,
    interetsEmprunt: 0,
    cotisations: 0,
    forfaitInternet: 0,
    fraisBancaire: 0,
    achatLogiciel: 0,
    autresFrais: 0,
    typeVehicule: "thermique",
    puissanceCV: 5,
    distanceAller: 0,
    nbJoursTravailles: 220,
    fraisInterIles: 0,
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
  const [articles, setArticles] = useState<Article[]>([]);
  const [lingeLignes, setLingeLignes] = useState<LingeLigne[]>([]);
  const [sections, setSections] = useState<Sections>(initialSections);

  const addArticle = () => setArticles((a) => [...a, { description: "", prix: 0 }]);
  const removeArticle = (i: number) => setArticles((a) => a.filter((_, idx) => idx !== i));
  const updateArticle = (i: number, patch: Partial<Article>) =>
    setArticles((a) => a.map((art, idx) => (idx === i ? { ...art, ...patch } : art)));

  const addLigneLinge = () =>
    setLingeLignes((l) => [...l, { vetement: "", nbPieces: 0, tarifPressing: 0, nbLavages: 0 }]);
  const removeLigneLinge = (i: number) =>
    setLingeLignes((l) => l.filter((_, idx) => idx !== i));
  const updateLigneLinge = (i: number, patch: Partial<LingeLigne>) =>
    setLingeLignes((l) => l.map((ln, idx) => (idx === i ? { ...ln, ...patch } : ln)));

  const handleReset = () => {
    setForm(initialForm);
    setSections(initialSections);
    setArticles([]);
    setLingeLignes([]);
    setShowResults(false);
    setActiveStep(0);
  };

  const { quotePart, sectionDLive } = useMemo(() => {
    const qp = form.surfaceLogement > 0 ? form.surfaceBureau / form.surfaceLogement : 0;
    const d = qp * form.chargesAnnuelles;
    return { quotePart: qp, sectionDLive: d };
  }, [form.surfaceBureau, form.surfaceLogement, form.chargesAnnuelles]);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const computeSectionA = (c: Constants) => {
    const valeurFoyer = c.repas_valeur_foyer;
    const plafond = c.repas_plafond_jour;
    const deductionMax = plafond - valeurFoyer;
    const dedSansJustif = form.nbRepasSansJustif * form.nbSemainesRepas * valeurFoyer;
    const dedParRepasAvecJustif = Math.max(
      0,
      Math.min(form.coutMoyenRepas - valeurFoyer, deductionMax),
    );
    const dedAvecJustif = dedParRepasAvecJustif * form.nbRepasAvecJustif * form.nbSemainesRepas;
    return dedSansJustif + dedAvecJustif;
  };

  const computeSectionB = (c: Constants) => {
    if (form.modeBlanchissement === "factures") {
      return parseFloat(String(form.totalFacturesPressing)) || 0;
    }
    const decote = 1 - c.blanchissage_decote_domicile / 100;
    return lingeLignes.reduce(
      (sum, l) => sum + l.nbPieces * l.tarifPressing * l.nbLavages * decote,
      0,
    );
  };

  const computeSectionF = (c: Constants) => {
    const distanceAnnuelle = form.distanceAller * 2 * form.nbJoursTravailles;
    const cvKey = form.puissanceCV >= 7 ? 7 : form.puissanceCV;
    const coefficient = c[`km_voiture_${cvKey}cv_seuil1` as keyof Constants];
    let val = distanceAnnuelle * coefficient;
    if (form.typeVehicule === "electrique") {
      val = val * (1 + c.km_majoration_electrique / 100);
    }
    return val;
  };

  const handleNext = () => {
    if (!constants) return;
    if (activeStep === 0) {
      setSections((s) => ({ ...s, sectionA: computeSectionA(constants) }));
    }
    if (activeStep === 1) {
      setSections((s) => ({ ...s, sectionB: computeSectionB(constants) }));
    }
    if (activeStep === 2) {
      const sectionC = articles.reduce((sum, item) => sum + (item.prix || 0), 0);
      setSections((s) => ({ ...s, sectionC }));
    }
    if (activeStep === 3) {
      setSections((s) => ({ ...s, sectionD: sectionDLive }));
    }
    if (activeStep === 4) {
      const sectionE = STEP5_FIELDS.reduce(
        (sum, f) => sum + (parseFloat(String(form[f.name])) || 0),
        0,
      );
      setSections((s) => ({ ...s, sectionE }));
    }
    if (activeStep === 5) {
      setSections((s) => ({ ...s, sectionF: computeSectionF(constants) }));
    }
    if (activeStep === 6) {
      setSections((s) => ({ ...s, sectionG: parseFloat(String(form.fraisInterIles)) || 0 }));
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
                Estimez vos frais réels professionnels — outil pédagogique
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8 space-y-6">
        <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            Cet outil estime à titre pédagogique le montant de vos frais réels. Il ne se substitue
            pas à votre déclaration officielle sur impots.gouv.fr ni à l'avis d'un professionnel
            du chiffre. Les barèmes utilisés sont ceux applicables aux revenus {FISCAL_YEAR}.
          </p>
        </div>


        {constantsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des barèmes officiels…
          </div>
        )}
        {constantsError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {constantsError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="lg:sticky lg:top-6 self-start space-y-4">
            {(() => {
              const rows: { label: string; value: number }[] = [
                { label: "Frais de repas hors domicile", value: Math.round(sections.sectionA) },
                { label: "Frais de blanchissement", value: Math.round(sections.sectionB) },
                { label: "Matériel professionnel", value: Math.round(sections.sectionC) },
                { label: "Bureau à domicile", value: Math.round(sections.sectionD) },
                { label: "Frais divers", value: Math.round(sections.sectionE) },
                { label: "Frais kilométriques", value: Math.round(sections.sectionF) },
                { label: "Frais inter-îles / inter-territoires (DROM)", value: Math.round(sections.sectionG) },
              ];
              const nonZero = rows.filter((r) => r.value > 0);
              return (
                <Card className="border-2 border-[#2D1B4E]/30 bg-[#FFF8E7] rounded-2xl shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg text-[#2D1B4E]">
                      {showResults ? "Résultat de votre simulation" : "Estimation en cours"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl bg-[#2D1B4E] text-white text-center px-4 py-6 shadow-inner">
                      <p className="text-xs sm:text-sm text-white/80">
                        Total estimé de vos frais réels :
                      </p>
                      <p className="font-heading text-3xl sm:text-4xl font-extrabold text-[#F9E900] mt-2">
                        {totalArrondi} €
                      </p>
                    </div>

                    {nonZero.length > 0 ? (
                      <div className="rounded-lg border border-[#2D1B4E]/20 overflow-hidden bg-white">
                        <table className="w-full text-xs sm:text-sm">
                          <tbody>
                            {nonZero.map((r) => (
                              <tr key={r.label} className="border-t border-border first:border-t-0">
                                <td className="px-3 py-2 text-foreground/80">{r.label}</td>
                                <td className="px-3 py-2 text-right font-medium tabular-nums">{r.value} €</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-[#2D1B4E] bg-[#F9E900]/30 font-bold">
                              <td className="px-3 py-2 text-[#2D1B4E]">TOTAL</td>
                              <td className="px-3 py-2 text-right text-[#2D1B4E] tabular-nums">{totalArrondi} €</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center italic">
                        Remplissez les étapes à droite pour voir le détail apparaître ici.
                      </p>
                    )}

                    <p className="text-xs text-foreground/70">
                      Cette somme se déduit de votre revenu imposable, pas directement de votre impôt.
                      L'économie réelle dépend de votre TMI.
                    </p>

                    {sections.sectionG > 0 && (
                      <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                        <p>
                          Vous résidez en outre-mer ? Pour estimer votre impôt final tenant compte
                          de la réfaction DROM ({constants?.refaction_drom_zone1 ?? 30}% ou {constants?.refaction_drom_zone2 ?? 40}%
                          selon votre territoire), utilisez ensuite le simulateur IR Barème.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/simulateur/ir-bareme")}
                          className="self-start border-blue-300 text-blue-900 hover:bg-blue-100"
                        >
                          → Simulateur IR Barème
                        </Button>
                      </div>
                    )}

                    {showResults && (
                      <div className="flex flex-col gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/simulateur/ir-bareme")}
                          className="border-[#2D1B4E] text-[#2D1B4E] hover:bg-[#2D1B4E] hover:text-white"
                        >
                          → Estimer mon impôt (IR Barème)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReset}
                          className="border-[#2D1B4E] text-[#2D1B4E] hover:bg-[#2D1B4E] hover:text-white"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Recommencer
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </aside>

          <div className="space-y-3 min-w-0">
          {STEP_TITLES.map((title, idx) => {
            const isActive = idx === activeStep;
            const isDone = idx < activeStep;
            return (
              <Card
                key={idx}
                className={`transition-shadow ${
                  isActive ? "border-[#2D1B4E] shadow-md" : "border-border hover:shadow-sm"
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
                    {idx === 0 ? (
                      <div className="space-y-4">
                        <NumberInput
                          id="nbRepasSansJustif"
                          label="Nombre de repas par semaine pris à l'extérieur SANS justificatif (cantine d'entreprise par ex.)"
                          hint="Repas sans facture conservée."
                          value={form.nbRepasSansJustif}
                          onChange={(v) => setField("nbRepasSansJustif", v)}
                        />
                        <NumberInput
                          id="nbRepasAvecJustif"
                          label="Nombre de repas par semaine pris à l'extérieur AVEC justificatif (factures conservées)"
                          hint="Repas dont vous avez gardé les tickets."
                          value={form.nbRepasAvecJustif}
                          onChange={(v) => setField("nbRepasAvecJustif", v)}
                        />
                        <NumberInput
                          id="coutMoyenRepas"
                          label="Coût moyen d'un repas avec justificatif (€)"
                          value={form.coutMoyenRepas}
                          onChange={(v) => setField("coutMoyenRepas", v)}
                        />
                        <NumberInput
                          id="nbSemainesRepas"
                          label="Nombre de semaines travaillées dans l'année"
                          hint="En général entre 44 et 47 semaines."
                          value={form.nbSemainesRepas}
                          onChange={(v) => setField("nbSemainesRepas", v)}
                        />
                        {constants && (
                          <p className="text-xs text-muted-foreground">
                            Barème {FISCAL_YEAR} : valeur du repas au foyer {constants.repas_valeur_foyer} €,
                            plafond {constants.repas_plafond_jour} €. Source : impots.gouv.fr.
                          </p>
                        )}
                      </div>
                    ) : idx === 1 ? (
                      <div className="space-y-4">
                        <RadioGroup
                          value={form.modeBlanchissement}
                          onValueChange={(v) =>
                            setField("modeBlanchissement", v as "factures" | "domicile")
                          }
                          className="space-y-2"
                        >
                          <Label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="factures" />
                            J'ai des factures de pressing
                          </Label>
                          <Label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="domicile" />
                            Je lave mon linge professionnel à domicile
                          </Label>
                        </RadioGroup>

                        {form.modeBlanchissement === "factures" ? (
                          <NumberInput
                            id="totalFacturesPressing"
                            label="Total annuel des factures (€)"
                            value={form.totalFacturesPressing}
                            onChange={(v) => setField("totalFacturesPressing", v)}
                          />
                        ) : (
                          <div className="space-y-3">
                            {lingeLignes.length === 0 && (
                              <p className="text-sm text-muted-foreground italic">
                                Aucune ligne. Ajoutez vos vêtements professionnels.
                              </p>
                            )}
                            {lingeLignes.map((ligne, i) => (
                              <div
                                key={i}
                                className="grid gap-3 sm:grid-cols-[1fr_100px_120px_120px_auto] items-end rounded-md border border-border p-3"
                              >
                                <div className="space-y-1.5">
                                  <Label htmlFor={`vet-${i}`}>Vêtement</Label>
                                  <Input
                                    id={`vet-${i}`}
                                    value={ligne.vetement}
                                    onChange={(e) => updateLigneLinge(i, { vetement: e.target.value })}
                                    placeholder="Ex : Blouse"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`nbp-${i}`}>Pièces</Label>
                                  <Input
                                    id={`nbp-${i}`}
                                    type="number"
                                    min={0}
                                    value={ligne.nbPieces || ""}
                                    onChange={(e) =>
                                      updateLigneLinge(i, { nbPieces: Number(e.target.value) || 0 })
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`tar-${i}`}>Tarif pressing de référence (€)</Label>
                                  <Input
                                    id={`tar-${i}`}
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={ligne.tarifPressing || ""}
                                    onChange={(e) =>
                                      updateLigneLinge(i, { tarifPressing: Number(e.target.value) || 0 })
                                    }
                                  />
                                  <p className="text-[11px] text-muted-foreground">
                                    Tarif pressing local utilisé comme base ; une décote de{" "}
                                    {constants?.blanchissage_decote_domicile ?? 30}% est
                                    automatiquement appliquée pour le lavage à domicile.
                                  </p>
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`lav-${i}`}>Lavages à domicile / an</Label>
                                  <Input
                                    id={`lav-${i}`}
                                    type="number"
                                    min={0}
                                    value={ligne.nbLavages || ""}
                                    onChange={(e) =>
                                      updateLigneLinge(i, { nbLavages: Number(e.target.value) || 0 })
                                    }
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeLigneLinge(i)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addLigneLinge}>
                              <Plus className="h-4 w-4" />
                              Ajouter une ligne
                            </Button>

                            {constants && lingeLignes.some((l) => l.nbPieces > 0 && l.tarifPressing > 0 && l.nbLavages > 0) && (
                              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                                <p className="text-sm font-medium">Récapitulatif détaillé</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b text-left text-muted-foreground">
                                        <th className="py-2 pr-2 font-medium">Vêtement</th>
                                        <th className="py-2 px-2 font-medium text-right">Base pressing</th>
                                        <th className="py-2 px-2 font-medium text-right">Décote</th>
                                        <th className="py-2 pl-2 font-medium text-right">Lavage à domicile</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lingeLignes.map((l, i) => {
                                        if (!l.nbPieces || !l.tarifPressing || !l.nbLavages) return null;
                                        const base = l.nbPieces * l.tarifPressing * l.nbLavages;
                                        const decotePct = constants.blanchissage_decote_domicile;
                                        const decoteMontant = base * (decotePct / 100);
                                        const final = base - decoteMontant;
                                        return (
                                          <tr key={i} className="border-b last:border-0">
                                            <td className="py-2 pr-2">
                                              {l.vetement || `Ligne ${i + 1}`}
                                              <span className="block text-[10px] text-muted-foreground">
                                                {l.nbPieces} × {l.tarifPressing.toFixed(2)} € × {l.nbLavages} lavages
                                              </span>
                                            </td>
                                            <td className="py-2 px-2 text-right tabular-nums">{base.toFixed(2)} €</td>
                                            <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                              −{decotePct}% (−{decoteMontant.toFixed(2)} €)
                                            </td>
                                            <td className="py-2 pl-2 text-right tabular-nums font-medium">
                                              {final.toFixed(2)} €
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr>
                                        <td colSpan={3} className="py-2 pr-2 text-right font-medium">
                                          Total déductible
                                        </td>
                                        <td className="py-2 pl-2 text-right tabular-nums font-semibold">
                                          {lingeLignes
                                            .reduce(
                                              (s, l) =>
                                                s +
                                                l.nbPieces *
                                                  l.tarifPressing *
                                                  l.nbLavages *
                                                  (1 - constants.blanchissage_decote_domicile / 100),
                                              0,
                                            )
                                            .toFixed(2)}{" "}
                                          €
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {constants && (
                          <p className="text-xs text-muted-foreground">
                            L'administration admet une évaluation forfaitaire basée sur les tarifs
                            pressing minorés de {constants.blanchissage_decote_domicile}% pour le
                            lavage à domicile. Conserver un devis pressing de référence en cas de
                            contrôle.
                          </p>
                        )}
                      </div>
                    ) : idx === 2 ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Section optionnelle. Ajoutez vos achats de matériel et documentation
                          professionnels.
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
                                onChange={(e) => updateArticle(i, { description: e.target.value })}
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
                    ) : idx === 3 ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Cette section est optionnelle.</p>
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
                            <span className="text-muted-foreground">Quote-part bureau : </span>
                            <span className="font-semibold text-foreground">
                              {(quotePart * 100).toFixed(1)} %
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Montant déductible : </span>
                            <span className="font-semibold text-foreground">
                              {sectionDLive.toFixed(2)} €
                            </span>
                          </p>
                        </div>
                      </div>
                    ) : idx === 4 ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Cette section est optionnelle. Tous les champs sont facultatifs.
                        </p>
                        <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                          <Info className="h-4 w-4 shrink-0 mt-0.5" />
                          <p>
                            Pour les frais à usage mixte (téléphone, internet, électricité),
                            n'indiquer que la quote-part professionnelle. Exemple : forfait internet
                            annuel 360 € utilisé à 50% pour le travail → indiquer 180 €.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {STEP5_FIELDS.map((f) => (
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
                    ) : idx === 5 ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Type de véhicule</Label>
                          <RadioGroup
                            value={form.typeVehicule}
                            onValueChange={(v) =>
                              setField("typeVehicule", v as "thermique" | "electrique")
                            }
                            className="flex flex-col sm:flex-row gap-3"
                          >
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="thermique" />
                              Voiture thermique/hybride
                            </Label>
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="electrique" />
                              Voiture 100% électrique
                            </Label>
                          </RadioGroup>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="puissanceCV" className="text-sm">
                            Puissance fiscale (CV)
                          </Label>
                          <Select
                            value={String(form.puissanceCV)}
                            onValueChange={(v) =>
                              setField("puissanceCV", Number(v) as FormState["puissanceCV"])
                            }
                          >
                            <SelectTrigger id="puissanceCV">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3 CV</SelectItem>
                              <SelectItem value="4">4 CV</SelectItem>
                              <SelectItem value="5">5 CV</SelectItem>
                              <SelectItem value="6">6 CV</SelectItem>
                              <SelectItem value="7">7 CV et +</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <NumberInput
                          id="distanceAller"
                          label="Distance domicile-travail aller simple (km)"
                          value={form.distanceAller}
                          onChange={(v) => setField("distanceAller", v)}
                        />
                        <NumberInput
                          id="nbJoursTravailles"
                          label="Nombre de jours travaillés dans l'année"
                          value={form.nbJoursTravailles}
                          onChange={(v) => setField("nbJoursTravailles", v)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Barème kilométrique {FISCAL_YEAR} (non revalorisé depuis 2023, simplifié
                          pour la tranche 0-5 000 km). Pour un calcul précis avec 3 tranches, voir
                          le simulateur officiel sur impots.gouv.fr.
                        </p>
                      </div>
                    ) : null}

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
                          disabled={!constants || !!constantsError}
                          className="w-full sm:w-auto bg-[#F9A825] hover:bg-[#F57F17] text-[#2D1B4E] font-bold"
                        >
                          <Receipt className="h-4 w-4" />
                          Calculer
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          disabled={!constants || !!constantsError}
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
        </div>
      </div>
    </div>
  );
}
