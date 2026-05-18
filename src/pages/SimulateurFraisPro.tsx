import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  Receipt,
  Info,
  Loader2,
  Palmtree,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { useFraisReelsConstants } from "@/hooks/useFraisReelsConstants";
import {
  calculerTotal,
  calculerFraisKilometriques,
  calculerFraisRepas,
  calculerBureauDomicile,
  type TypeVehicule,
  type Motorisation,
  type TypeMateriel,
  type InputsKm,
  type InputsRepas,
  type InputsBureau,
  type InputsBlanchissage,
  type InputsAutresFrais,
  type InputsOutreMer,
  type ArticleMateriel,
  type LignePressing,
} from "@/lib/calculs-frais-reels";

const FISCAL_YEAR = 2025;

const VETEMENTS_PRO = [
  "Blouse",
  "Bleu de travail",
  "Combinaison",
  "Tablier",
  "Veste de cuisine",
  "Pantalon de cuisine",
  "Toque",
  "Uniforme",
  "Robe de magistrat",
  "Tenue médicale (scrub)",
  "Tenue de chantier",
  "Chaussures de sécurité",
  "Gants de travail",
  "Casque / EPI",
  "Autre vêtement professionnel obligatoire",
] as const;

const STEP_TITLES = [
  "Frais kilométriques",
  "Frais de repas hors domicile",
  "Bureau à domicile / télétravail",
  "Vêtements professionnels & blanchissage",
  "Matériel, documentation & logiciels",
  "Autres frais professionnels",
  "Spécificités outre-mer",
];

// ---------- helpers ----------
const NumberInput = ({
  id,
  label,
  value,
  onChange,
  hint,
  integer = false,
  max,
  min = 0,
  step,
  disabled = false,
  warnAbove,
  warningMessage,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  integer?: boolean;
  max?: number;
  min?: number;
  step?: number | string;
  disabled?: boolean;
  warnAbove?: number;
  warningMessage?: string;
}) => {
  const showWarning = warnAbove !== undefined && value > warnAbove && !!warningMessage;
  // Default step : entiers = 1, montants € = 10 (pas de centimes par défaut)
  const effectiveStep = step !== undefined ? step : integer ? "1" : "10";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Input
        id={id}
        type="number"
        step={effectiveStep}
        min={min}
        max={max}
        disabled={disabled}
        inputMode={integer ? "numeric" : "decimal"}
        value={value || ""}
        onChange={(e) => {
          let n = Number(e.target.value) || 0;
          if (max !== undefined) n = Math.min(n, max);
          if (n < min) n = min;
          onChange(n);
        }}
        onBlur={(e) => {
          if (!integer) return;
          const raw = Number(e.target.value);
          if (!Number.isFinite(raw)) return;
          let n = Math.round(raw);
          if (max !== undefined) n = Math.min(n, max);
          if (n < min) n = min;
          if (n !== value) onChange(n);
        }}
        placeholder="0"
        className={showWarning ? "border-orange-400 focus-visible:ring-orange-300" : undefined}
      />
      {showWarning ? (
        <p className="text-xs text-orange-700 flex items-start gap-1">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{warningMessage}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};

const DateInput = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm">{label}</Label>
    <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const PctSlider = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) => {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs text-muted-foreground">
          {min}–{max}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <SliderPrimitive.Root
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) => onChange(clamp(v[0]))}
          className="relative flex flex-1 touch-none select-none items-center h-10 cursor-pointer"
        >
          <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-muted border border-border">
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#2D1B4E] to-[#5B3A9E]" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label={label}
            className="group relative flex h-7 w-12 items-center justify-center rounded-full border-2 border-[#2D1B4E] bg-white shadow-lg ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D1B4E] focus-visible:ring-offset-2 cursor-grab active:cursor-grabbing"
          >
            <span className="flex gap-[3px]">
              <span className="block h-3 w-[2px] rounded bg-[#2D1B4E]/70" />
              <span className="block h-3 w-[2px] rounded bg-[#2D1B4E]/70" />
              <span className="block h-3 w-[2px] rounded bg-[#2D1B4E]/70" />
            </span>
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
        <div className="relative shrink-0">
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(clamp(n));
            }}
            className="h-9 w-20 rounded-md border-2 border-[#2D1B4E]/30 bg-background pl-2 pr-6 text-right text-sm font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D1B4E]"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
      </div>
      <p className="text-[11px] italic text-muted-foreground flex items-center gap-1">
        <span aria-hidden>↔</span> Faites glisser la poignée ou saisissez une valeur ({pct.toFixed(0)}% de la plage)
      </p>
    </div>
  );
};

// ---------- main component ----------
export default function SimulateurFraisPro() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const { constants, loading: constantsLoading, error: constantsError } = useFraisReelsConstants(FISCAL_YEAR);

  // ----- state -----
  const [inputsKm, setInputsKm] = useState<InputsKm>({
    typeVehicule: "voiture",
    cv: 5,
    motorisation: "thermique",
    distanceAllerSimple: 0,
    justificationEloignement: false,
    nbAllerRetourParJour: 1,
    nbJoursTravailles: 218,
    kmMissionPro: 0,
    peagesAnnuel: 0,
    parkingAnnuel: 0,
    indemnitesKmEmployeur: 0,
  });

  const [inputsRepas, setInputsRepas] = useState<InputsRepas>({
    nbRepasSansJustifParJour: 0,
    nbRepasAvecJustifParJour: 0,
    coutMoyenRepasJustifie: 0,
    nbJoursRepas: 218,
    nbTicketsRestoAnnee: 0,
    valeurFacialeTicket: 8,
    partEmployeurPct: 50,
    indemnitesRepasHorsTR: 0,
  });

  const [inputsBureau, setInputsBureau] = useState<InputsBureau>({
    surfaceBureauM2: 0,
    surfaceLogementM2: 0,
    loyerOuInteretsEmprunt: 0,
    chargesCoproAnnuelles: 0,
    electriciteChauffageAnnuel: 0,
    internetAnnuel: 0,
    internetUsageProPct: 0,
    assuranceHabitationAnnuelle: 0,
    taxeFonciereAnnuelle: 0,
    indemniteTeletravailEmployeur: 0,
  });

  const [modeBlanchissage, setModeBlanchissage] = useState<"factures" | "domicile">("factures");
  const [totalFacturesPressing, setTotalFacturesPressing] = useState(0);
  const [lingeLignes, setLingeLignes] = useState<(LignePressing & { vetement: string })[]>([]);

  const [articles, setArticles] = useState<(ArticleMateriel & { description: string })[]>([]);

  const [inputsAutresFrais, setInputsAutresFrais] = useState<InputsAutresFrais>({
    telephoneAnnuel: 0,
    telephoneUsageProPct: 100,
    internetAnnuel: 0,
    internetUsageProPct: 0,
    fraisBancairesProServ: 0,
    formationPro: 0,
    cotisationsSyndicales: 0,
    cotisationsProObligatoires: 0,
    doubleResidence: 0,
    demenagementPro: 0,
    fraisRechercheEmploi: 0,
    interetsEmpruntResidence: 0,
    autresFraisJustifies: 0,
  });

  const [inputsOutreMer, setInputsOutreMer] = useState<InputsOutreMer>({
    fraisInterIles: 0,
    fraisVoyagesDromMetropolePro: 0,
  });

  const [salaireNetImposable, setSalaireNetImposable] = useState(0);

  // Nombre de jours travaillés dans l'année (centralisé, utilisé par km + repas)
  const [joursTravaillesAnnee, setJoursTravaillesAnnee] = useState(218);

  // Inputs effectifs (avec la valeur centralisée de jours travaillés)
  const kmInputs = useMemo<InputsKm>(
    () => ({ ...inputsKm, nbJoursTravailles: joursTravaillesAnnee }),
    [inputsKm, joursTravaillesAnnee],
  );
  const repasInputs = useMemo<InputsRepas>(
    () => ({ ...inputsRepas, nbJoursRepas: joursTravaillesAnnee }),
    [inputsRepas, joursTravaillesAnnee],
  );

  // Internet déjà saisi à l'étape Bureau ?
  const internetDejaBureau = inputsBureau.internetAnnuel > 0 && inputsBureau.internetUsageProPct > 0;

  // Surface bureau invalide (> surface logement) : on force la déduction bureau à 0
  const bureauInvalid =
    inputsBureau.surfaceLogementM2 > 0 &&
    inputsBureau.surfaceBureauM2 > inputsBureau.surfaceLogementM2;
  const bureauInputs = useMemo<InputsBureau>(
    () =>
      bureauInvalid
        ? { ...inputsBureau, surfaceBureauM2: 0, surfaceLogementM2: 0, internetAnnuel: 0, indemniteTeletravailEmployeur: 0 }
        : inputsBureau,
    [inputsBureau, bureauInvalid],
  );

  // ----- calculation -----
  const inputsBlanchissage: InputsBlanchissage = {
    modeCalcul: modeBlanchissage,
    totalFactures: totalFacturesPressing,
    lignes: lingeLignes,
  };

  const result = useMemo(() => {
    if (!constants) return null;
    try {
      return calculerTotal(
        {
          km: kmInputs,
          repas: repasInputs,
          bureau: bureauInputs,
          blanchissage: inputsBlanchissage,
          materiel: articles,
          autresFrais: inputsAutresFrais,
          outreMer: inputsOutreMer,
          salaireNetImposable: salaireNetImposable ?? 0,
        },
        constants,
      );
    } catch {
      return null;
    }
  }, [
    constants,
    kmInputs,
    repasInputs,
    bureauInputs,
    inputsBlanchissage,
    articles,
    inputsAutresFrais,
    inputsOutreMer,
    salaireNetImposable,
  ]);

  // ----- helpers -----
  const setKm = <K extends keyof InputsKm>(k: K, v: InputsKm[K]) =>
    setInputsKm((s) => ({ ...s, [k]: v }));
  const setRepas = <K extends keyof InputsRepas>(k: K, v: InputsRepas[K]) =>
    setInputsRepas((s) => ({ ...s, [k]: v }));
  const setBureau = <K extends keyof InputsBureau>(k: K, v: InputsBureau[K]) =>
    setInputsBureau((s) => ({ ...s, [k]: v }));
  const setAutres = <K extends keyof InputsAutresFrais>(k: K, v: InputsAutresFrais[K]) =>
    setInputsAutresFrais((s) => ({ ...s, [k]: v }));
  const setOM = <K extends keyof InputsOutreMer>(k: K, v: InputsOutreMer[K]) =>
    setInputsOutreMer((s) => ({ ...s, [k]: v }));

  const handleReset = () => {
    setActiveStep(0);
    setInputsKm({
      typeVehicule: "voiture", cv: 5, motorisation: "thermique",
      distanceAllerSimple: 0, justificationEloignement: false,
      nbAllerRetourParJour: 1, nbJoursTravailles: 218, kmMissionPro: 0,
      peagesAnnuel: 0, parkingAnnuel: 0, indemnitesKmEmployeur: 0,
    });
    setInputsRepas({
      nbRepasSansJustifParJour: 0, nbRepasAvecJustifParJour: 0,
      coutMoyenRepasJustifie: 0, nbJoursRepas: 218,
      nbTicketsRestoAnnee: 0, valeurFacialeTicket: 8, partEmployeurPct: 50,
      indemnitesRepasHorsTR: 0,
    });
    setInputsBureau({
      surfaceBureauM2: 0, surfaceLogementM2: 0, loyerOuInteretsEmprunt: 0,
      chargesCoproAnnuelles: 0, electriciteChauffageAnnuel: 0,
      internetAnnuel: 0, internetUsageProPct: 0,
      assuranceHabitationAnnuelle: 0, taxeFonciereAnnuelle: 0,
      indemniteTeletravailEmployeur: 0,
    });
    setModeBlanchissage("factures");
    setTotalFacturesPressing(0);
    setLingeLignes([]);
    setArticles([]);
    setInputsAutresFrais({
      telephoneAnnuel: 0, telephoneUsageProPct: 100, internetAnnuel: 0, internetUsageProPct: 0,
      fraisBancairesProServ: 0, formationPro: 0, cotisationsSyndicales: 0,
      cotisationsProObligatoires: 0, doubleResidence: 0, demenagementPro: 0,
      fraisRechercheEmploi: 0, interetsEmpruntResidence: 0, autresFraisJustifies: 0,
    });
    setInputsOutreMer({ fraisInterIles: 0, fraisVoyagesDromMetropolePro: 0 });
    setSalaireNetImposable(0);
    setJoursTravaillesAnnee(218);
  };

  const handleNext = () => {
    if (activeStep < STEP_TITLES.length - 1) setActiveStep(activeStep + 1);
  };
  const handleBack = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  };

  // articles helpers
  const addArticle = () =>
    setArticles((a) => [
      ...a,
      { description: "", type: "ordinateur" as TypeMateriel, prixTTC: 0, dateAchat: "", usageProPct: 100 },
    ]);
  const removeArticle = (i: number) => setArticles((a) => a.filter((_, idx) => idx !== i));
  const updateArticle = (i: number, patch: Partial<(typeof articles)[number]>) =>
    setArticles((a) => a.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  // linge helpers
  const addLigne = () =>
    setLingeLignes((l) => [...l, { vetement: "", nbPieces: 0, tarifPressing: 0, nbLavagesAnnuel: 0 }]);
  const removeLigne = (i: number) => setLingeLignes((l) => l.filter((_, idx) => idx !== i));
  const updateLigne = (i: number, patch: Partial<(typeof lingeLignes)[number]>) =>
    setLingeLignes((l) => l.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  // ----- aside breakdown -----
  const totalArrondi = result ? Math.round(result.totalFraisReels) : 0;

  type SubLine = { label: string; value: number; variant?: "muted" | "subtotal" | "final" | "negative"; note?: string };
  type Section = { key: string; label: string; value: number; sub?: SubLine[] };

  const kmBreakdown = useMemo(() => {
    if (!constants) return null;
    try {
      const km = calculerFraisKilometriques(kmInputs, constants);
      const { bareme, peages, parking, remboursements } = km.details;
      const sousTotal = bareme + peages + parking;
      return {
        sousTotal,
        indemnites: remboursements,
        excedent: Math.max(0, remboursements - sousTotal),
        depasse: remboursements > sousTotal && sousTotal > 0,
        netZeroParDepassement: km.total === 0 && remboursements > 0 && remboursements >= sousTotal,
      };
    } catch {
      return null;
    }
  }, [kmInputs, constants]);

  const sections: Section[] = useMemo(() => {
    if (!result || !constants) return [];
    const out: Section[] = [];

    // --- KM ---
    try {
      const km = calculerFraisKilometriques(kmInputs, constants);
      const { bareme, peages, parking, remboursements } = km.details;
      const hasExtras = peages > 0 || parking > 0 || remboursements > 0;
      if (hasExtras) {
        const sub: SubLine[] = [
          { label: "Barème kilométrique", value: Math.round(bareme) },
        ];
        if (peages > 0) sub.push({ label: "Péages", value: Math.round(peages) });
        if (parking > 0) sub.push({ label: "Parking", value: Math.round(parking) });
        sub.push({
          label: "Sous-total",
          value: Math.round(bareme + peages + parking),
          variant: "subtotal",
        });
        if (remboursements > 0)
          sub.push({ label: "Indemnités employeur", value: -Math.round(remboursements), variant: "negative" });
        sub.push({
          label: "Net kilométrique",
          value: Math.round(km.total),
          variant: "final",
          note: km.total === 0 && remboursements >= bareme + peages + parking && remboursements > 0
            ? "Indemnités supérieures aux frais → rien à déduire (excédent à déclarer en revenus)"
            : undefined,
        });
        out.push({ key: "km", label: "Frais kilométriques", value: Math.round(km.total), sub });
      } else if (km.total > 0) {
        out.push({ key: "km", label: "Frais kilométriques", value: Math.round(km.total) });
      }
    } catch { /* ignore */ }

    // --- Repas ---
    try {
      const repas = calculerFraisRepas(repasInputs, constants);
      const { deductionSansJustif, deductionAvecJustif, partEmployeurTR, indemnitesRepas } = repas.details;
      const brut = deductionSansJustif + deductionAvecJustif;
      const hasDetails = partEmployeurTR > 0 || indemnitesRepas > 0;
      if (hasDetails && brut > 0) {
        const sub: SubLine[] = [
          { label: "Déduction repas", value: Math.round(brut) },
          { label: "Sous-total", value: Math.round(brut), variant: "subtotal" },
        ];
        if (partEmployeurTR > 0)
          sub.push({ label: "Part employeur tickets-resto", value: -Math.round(partEmployeurTR), variant: "negative" });
        if (indemnitesRepas > 0)
          sub.push({ label: "Indemnités repas employeur", value: -Math.round(indemnitesRepas), variant: "negative" });
        sub.push({ label: "Net repas", value: Math.round(repas.total), variant: "final" });
        out.push({ key: "repas", label: "Repas hors domicile", value: Math.round(repas.total), sub });
      } else if (repas.total > 0) {
        out.push({ key: "repas", label: "Repas hors domicile", value: Math.round(repas.total) });
      }
    } catch { /* ignore */ }

    // --- Bureau ---
    try {
      if (bureauInvalid) {
        out.push({
          key: "bureau",
          label: "Bureau à domicile",
          value: 0,
          sub: [{ label: "Surface bureau invalide → 0 € déductible", value: 0, variant: "muted" }],
        });
      } else {
        const bureau = calculerBureauDomicile(bureauInputs);
        const { deductionBrute, indemniteSoustraite } = bureau.details;
        if (indemniteSoustraite > 0 && deductionBrute > 0) {
          const sub: SubLine[] = [
            { label: "Quote-part charges + internet", value: Math.round(deductionBrute) },
            { label: "Sous-total", value: Math.round(deductionBrute), variant: "subtotal" },
            { label: "Indemnité télétravail employeur", value: -Math.round(indemniteSoustraite), variant: "negative" },
            { label: "Net bureau", value: Math.round(bureau.total), variant: "final" },
          ];
          out.push({ key: "bureau", label: "Bureau à domicile", value: Math.round(bureau.total), sub });
        } else if (bureau.total > 0) {
          out.push({ key: "bureau", label: "Bureau à domicile", value: Math.round(bureau.total) });
        }
      }
    } catch { /* ignore */ }

    // --- Other simple sections ---
    const simple: Array<[string, string, number]> = [
      ["blanchissage", "Vêtements & blanchissage", Math.round(result.breakdown.blanchissage)],
      ["materiel", "Matériel & logiciels", Math.round(result.breakdown.materiel)],
      ["autresFrais", "Autres frais pro", Math.round(result.breakdown.autresFrais)],
      ["outreMer", "Outre-mer", Math.round(result.breakdown.outreMer)],
    ];
    for (const [key, label, value] of simple) {
      if (value > 0) out.push({ key, label, value });
    }

    return out;
  }, [result, constants, kmInputs, repasInputs, inputsBureau, bureauInputs, bureauInvalid]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground">
          Simulateur de <em className="accent-serif">frais réels</em>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Calculez vos frais réels selon les barèmes officiels DGFiP. Revenus {FISCAL_YEAR}, déclaration 2026.
        </p>
      </div>

      <div className="rounded-lg bg-yellow-vivid/15 border border-yellow-vivid/30 p-4 text-sm text-foreground">
        <span className="font-semibold">⚠️ Estimation pédagogique.</span>{" "}
        Non opposable à la DGFIP. Pour votre déclaration officielle, rendez-vous sur impots.gouv.fr ou consultez un professionnel du chiffre.
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

      {!constantsLoading && constants && (
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* ----- ASIDE ----- */}
        <aside className="lg:sticky lg:top-6 self-start space-y-4">
          <Card className="border-2 border-[#2D1B4E]/30 bg-[#FFF8E7] rounded-2xl shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg text-[#2D1B4E]">
                Estimation en cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="salaireNet" className="text-sm text-[#2D1B4E]">
                  Salaire net imposable annuel (optionnel)
                </Label>
                <Input
                  id="salaireNet"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={salaireNetImposable || ""}
                  onChange={(e) => setSalaireNetImposable(Number(e.target.value) || 0)}
                  placeholder="Ex: 30000"
                  className="bg-white"
                />
                <p className="text-[11px] text-foreground/60">
                  Pour comparer avec l'abattement automatique de 10%.
                </p>
              </div>

              <div className="rounded-xl bg-[#2D1B4E] text-white text-center px-4 py-6 shadow-inner">
                <p className="text-xs sm:text-sm text-white/80">
                  Total net déductible :
                </p>
                <p className="font-heading text-3xl sm:text-4xl font-extrabold text-[#F9E900] mt-2">
                  {totalArrondi} €
                </p>
              </div>

              {sections.length > 0 ? (
                <div className="rounded-lg border border-[#2D1B4E]/20 overflow-hidden bg-white">
                  <table className="w-full text-xs sm:text-sm">
                    <tbody>
                      {sections.map((s) => {
                        if (!s.sub || s.sub.length === 0) {
                          return (
                            <tr key={s.key} className="border-t border-border first:border-t-0">
                              <td className="px-3 py-2 text-foreground/80">{s.label}</td>
                              <td className="px-3 py-2 text-right font-medium tabular-nums">{s.value} €</td>
                            </tr>
                          );
                        }
                        return (
                          <Fragment key={s.key}>
                            <tr className="border-t border-border first:border-t-0 bg-[#2D1B4E]/5">
                              <td colSpan={2} className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide font-semibold text-[#2D1B4E]">
                                {s.label}
                              </td>
                            </tr>
                            {s.sub.map((line, i) => {
                              const cls =
                                line.variant === "final"
                                  ? "font-bold text-[#2D1B4E]"
                                  : line.variant === "subtotal"
                                  ? "font-semibold text-foreground"
                                : line.variant === "negative"
                                  ? "text-muted-foreground"
                                : line.variant === "muted"
                                  ? "italic text-muted-foreground"
                                  : "text-foreground/80";
                              return (
                                <Fragment key={i}>
                                  <tr className="bg-[#2D1B4E]/5">
                                    <td className={`px-3 py-1 pl-5 ${cls}`}>{line.label}</td>
                                    <td className={`px-3 py-1 text-right tabular-nums ${cls}`}>
                                      {line.value < 0 ? `– ${Math.abs(line.value)}` : line.value} €
                                    </td>
                                  </tr>
                                  {line.note && (
                                    <tr className="bg-[#2D1B4E]/5">
                                      <td colSpan={2} className="px-3 pb-2 pl-5 text-[11px] italic text-muted-foreground">
                                        {line.note}
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                      <tr className="border-t-2 border-[#2D1B4E] bg-[#F9E900]/30 font-bold">
                        <td className="px-3 py-2 text-[#2D1B4E]">TOTAL</td>
                        <td className="px-3 py-2 text-right text-[#2D1B4E] tabular-nums">{totalArrondi} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center italic">
                  Remplissez les étapes pour voir le détail apparaître ici.
                </p>
              )}

              {result && salaireNetImposable > 0 && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    result.verdict === "frais_reels_avantageux"
                      ? "border-green-300 bg-green-50 text-green-900"
                      : "border-blue-200 bg-blue-50 text-blue-900"
                  }`}
                >
                  <p className="font-medium">
                    Abattement 10% : {Math.round(result.abattement10)} €
                  </p>
                  {result.verdict === "frais_reels_avantageux" ? (
                    <p className="mt-1">
                      ✅ Les frais réels seraient plus avantageux de{" "}
                      <strong>{Math.round(result.difference)} €</strong>.
                    </p>
                  ) : (
                    <p className="mt-1">
                      ℹ️ L'abattement automatique de 10% reste plus avantageux
                      ({Math.round(-result.difference)} € d'écart).
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-foreground/70">
                Cette somme se déduit de votre revenu imposable, pas directement de votre impôt.
                L'économie réelle dépend de votre TMI.
              </p>

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
            </CardContent>
          </Card>
        </aside>

        {/* ----- STEPS ----- */}
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
                  >
                    {isDone ? <Check className="h-5 w-5" /> : idx + 1}
                  </div>
                  <CardTitle className="text-sm sm:text-base font-semibold flex-1">
                    {title}
                  </CardTitle>
                </CardHeader>

                {isActive && (
                  <CardContent className="space-y-5">
                    {/* ===== STEP 1: KM ===== */}
                    {idx === 0 && (
                      <div className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Le barème couvre la dépréciation du véhicule, l'entretien, le carburant, l'assurance et les pneus.
                            Les péages et le parking sont déductibles en plus, sur justificatifs.
                            Les indemnités déjà versées par votre employeur sont automatiquement soustraites.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-1.5">
                          <Label className="text-sm">Type de véhicule</Label>
                          <Select
                            value={inputsKm.typeVehicule}
                            onValueChange={(v) => setKm("typeVehicule", v as TypeVehicule)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="voiture">Voiture</SelectItem>
                              <SelectItem value="motocyclette">Motocyclette ({">"}50 cm³)</SelectItem>
                              <SelectItem value="cyclomoteur">Cyclomoteur (≤50 cm³)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <NumberInput
                          id="cv"
                          label="Puissance fiscale (CV)"
                          hint="Sur votre carte grise, case P.6"
                          value={inputsKm.cv}
                          onChange={(v) => setKm("cv", Math.max(1, v))}
                          integer
                          min={3}
                          max={20}
                        />
                        {inputsKm.typeVehicule === "voiture" && inputsKm.cv > 7 && (
                          <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">Plafonné à 7 CV pour le calcul.</AlertDescription>
                          </Alert>
                        )}
                        {inputsKm.typeVehicule !== "voiture" && inputsKm.cv > 5 && (
                          <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">Plafonné à 5 CV pour le calcul.</AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-2">
                          <Label className="text-sm">Motorisation</Label>
                          <RadioGroup
                            value={inputsKm.motorisation}
                            onValueChange={(v) => setKm("motorisation", v as Motorisation)}
                            className="flex flex-col sm:flex-row gap-3"
                          >
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="thermique" />
                              Thermique / Hybride
                            </Label>
                            <Label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="electrique" />
                              100% Électrique
                            </Label>
                          </RadioGroup>
                          {inputsKm.motorisation === "electrique" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">
                              <Zap className="h-3 w-3" /> +20% sur le barème
                            </span>
                          )}
                        </div>

                        <NumberInput
                          id="distanceAller"
                          label="Distance domicile-travail aller simple (km)"
                          value={inputsKm.distanceAllerSimple}
                          onChange={(v) => setKm("distanceAllerSimple", v)}
                          integer
                          max={200}
                          warnAbove={200}
                          warningMessage="Distance inhabituellement élevée, vérifiez la valeur."
                        />
                        {inputsKm.distanceAllerSimple > 40 && (
                          <div className="space-y-2">
                            <Label className="flex items-start gap-2 cursor-pointer text-sm">
                              <Checkbox
                                checked={inputsKm.justificationEloignement}
                                onCheckedChange={(c) => setKm("justificationEloignement", Boolean(c))}
                              />
                              <span>
                                Je peux justifier d'une distance supérieure à 40 km (mutation, contraintes familiales, état de santé)
                              </span>
                            </Label>
                            {!inputsKm.justificationEloignement && (
                              <Alert className="bg-yellow-50 border-yellow-300 text-yellow-900">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  La déduction sera limitée à 40 km par défaut.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}

                        <NumberInput
                          id="nbAR"
                          label="Nombre d'allers-retours par jour"
                          value={inputsKm.nbAllerRetourParJour}
                          onChange={(v) => setKm("nbAllerRetourParJour", Math.max(1, v))}
                          integer
                          min={1}
                          max={4}
                        />
                        <NumberInput
                          id="nbJoursTrav"
                          label="Nombre de jours travaillés dans l'année"
                          hint="Valeur partagée avec l'étape Repas. En général entre 210 et 230 jours."
                          value={joursTravaillesAnnee}
                          onChange={(v) => setJoursTravaillesAnnee(Math.max(1, Math.min(260, v)))}
                          integer
                          min={1}
                          max={260}
                          warnAbove={250}
                          warningMessage="Maximum 250 jours travaillés en moyenne par an, vérifiez."
                        />
                        <NumberInput
                          id="kmMission"
                          label="Kilomètres parcourus en missions professionnelles"
                          hint="Km hors trajet domicile-travail (visites clients, déplacements pro)."
                          value={inputsKm.kmMissionPro}
                          onChange={(v) => setKm("kmMissionPro", v)}
                          integer
                          step={10}
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                          <NumberInput
                            id="peages"
                            label="Péages annuels (€)"
                            value={inputsKm.peagesAnnuel}
                            onChange={(v) => setKm("peagesAnnuel", v)}
                            warnAbove={5000}
                            warningMessage="Montant élevé, vérifiez."
                          />
                          <NumberInput
                            id="parking"
                            label="Parking annuel (€)"
                            value={inputsKm.parkingAnnuel}
                            onChange={(v) => setKm("parkingAnnuel", v)}
                            warnAbove={3000}
                            warningMessage="Montant élevé, vérifiez."
                          />
                        </div>
                        <NumberInput
                          id="indKm"
                          label="Indemnités kilométriques perçues de l'employeur (€)"
                          hint="Sera soustrait du total pour éviter une double déduction."
                          value={inputsKm.indemnitesKmEmployeur}
                          onChange={(v) => setKm("indemnitesKmEmployeur", v)}
                          warnAbove={10000}
                          warningMessage="Montant élevé, vérifiez."
                        />
                        {kmBreakdown?.depasse && (
                          <Alert className="bg-orange-50 border-orange-300 text-orange-900">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              ⚠️ Le montant d'indemnités saisi ({Math.round(kmBreakdown.indemnites).toLocaleString("fr-FR")} €) dépasse vos frais kilométriques calculés ({Math.round(kmBreakdown.sousTotal).toLocaleString("fr-FR")} €). Vérifiez le montant : si votre employeur vous a versé plus que le barème, l'excédent ({Math.round(kmBreakdown.excedent).toLocaleString("fr-FR")} €) doit être déclaré en revenus imposables dans la case 1AJ.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* ===== STEP 2: REPAS ===== */}
                    {idx === 1 && (
                      <div className="space-y-4">
                        <NumberInput
                          id="nbRepasSansJustif"
                          label="Nombre de repas sans justificatif par jour"
                          hint="Forfait de 5,45 € par repas (suppose une preuve d'éloignement entre domicile et lieu de travail)."
                          value={inputsRepas.nbRepasSansJustifParJour}
                          onChange={(v) => setRepas("nbRepasSansJustifParJour", v)}
                          integer
                          max={3}
                        />
                        <NumberInput
                          id="nbRepasAvecJustif"
                          label="Nombre de repas AVEC justificatif par jour"
                          hint="Repas dont vous avez gardé les tickets/factures."
                          value={inputsRepas.nbRepasAvecJustifParJour}
                          onChange={(v) => setRepas("nbRepasAvecJustifParJour", v)}
                          integer
                          max={3}
                        />
                        <NumberInput
                          id="coutMoyenRepas"
                          label="Coût moyen d'un repas avec justificatif (€)"
                          value={inputsRepas.coutMoyenRepasJustifie}
                          onChange={(v) => setRepas("coutMoyenRepasJustifie", v)}
                          step={0.5}
                          max={50}
                        />
                        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                Jours travaillés dans l'année :{" "}
                                <span className="tabular-nums">{joursTravaillesAnnee}</span>
                              </p>
                              <p className="text-xs text-muted-foreground italic">
                                Modifiable à l'étape Kilométrage
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() => setActiveStep(0)}
                            >
                              Modifier
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
                          <p className="font-medium text-sm">Indemnisation employeur</p>
                          <NumberInput
                            id="nbTR"
                            label="Nombre de tickets-restaurant utilisés dans l'année"
                            value={inputsRepas.nbTicketsRestoAnnee}
                            onChange={(v) => setRepas("nbTicketsRestoAnnee", v)}
                            integer
                          />
                          <NumberInput
                            id="valTR"
                            label="Valeur faciale d'un ticket (€)"
                            value={inputsRepas.valeurFacialeTicket}
                            onChange={(v) => setRepas("valeurFacialeTicket", v)}
                          />
                          <div className="space-y-1">
                            <PctSlider
                              label="Part employeur"
                              value={inputsRepas.partEmployeurPct}
                              onChange={(v) => setRepas("partEmployeurPct", v)}
                              min={50}
                              max={60}
                            />
                            <p className="text-xs text-muted-foreground">
                              Légalement entre 50 % et 60 %. Voir la mention sur votre bulletin de paie ou le règlement intérieur.
                            </p>
                          </div>
                          <NumberInput
                            id="indRepas"
                            label="Indemnités repas hors tickets (€)"
                            hint="Panier-repas ou autres indemnités directes."
                            value={inputsRepas.indemnitesRepasHorsTR}
                            onChange={(v) => setRepas("indemnitesRepasHorsTR", v)}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Barème {FISCAL_YEAR} : valeur du repas au foyer {constants.repas_valeur_foyer ?? 5.45} €,
                          plafond {constants.repas_plafond_jour ?? 21.10} € par repas.
                        </p>
                      </div>
                    )}

                    {/* ===== STEP 3: BUREAU ===== */}
                    {idx === 2 && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Section optionnelle. Pour les contribuables qui exercent en télétravail ou utilisent une partie de leur logement comme bureau professionnel.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <NumberInput
                            id="surfBureau"
                            label="Surface du bureau (m²)"
                            value={inputsBureau.surfaceBureauM2}
                            onChange={(v) => setBureau("surfaceBureauM2", v)}
                          />
                          <NumberInput
                            id="surfLog"
                            label="Surface totale du logement (m²)"
                            value={inputsBureau.surfaceLogementM2}
                            onChange={(v) => setBureau("surfaceLogementM2", v)}
                          />
                        </div>
                        {inputsBureau.surfaceBureauM2 > inputsBureau.surfaceLogementM2 && inputsBureau.surfaceLogementM2 > 0 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              La surface du bureau ne peut pas excéder la surface du logement.
                            </AlertDescription>
                          </Alert>
                        )}
                        <NumberInput
                          id="loyer"
                          label="Loyer annuel ou intérêts d'emprunt (€)"
                          value={inputsBureau.loyerOuInteretsEmprunt}
                          onChange={(v) => setBureau("loyerOuInteretsEmprunt", v)}
                        />
                        <NumberInput
                          id="copro"
                          label="Charges de copropriété annuelles (€)"
                          value={inputsBureau.chargesCoproAnnuelles}
                          onChange={(v) => setBureau("chargesCoproAnnuelles", v)}
                        />
                        <NumberInput
                          id="elec"
                          label="Électricité + chauffage annuel (€)"
                          value={inputsBureau.electriciteChauffageAnnuel}
                          onChange={(v) => setBureau("electriciteChauffageAnnuel", v)}
                        />
                        <NumberInput
                          id="assur"
                          label="Assurance habitation annuelle (€)"
                          value={inputsBureau.assuranceHabitationAnnuelle}
                          onChange={(v) => setBureau("assuranceHabitationAnnuelle", v)}
                        />
                        <NumberInput
                          id="taxefonc"
                          label="Taxe foncière annuelle (€)"
                          value={inputsBureau.taxeFonciereAnnuelle}
                          onChange={(v) => setBureau("taxeFonciereAnnuelle", v)}
                        />
                        <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
                          <p className="font-medium text-sm">Internet (si utilisé pour le travail)</p>
                          <NumberInput
                            id="netBureau"
                            label="Internet annuel (€)"
                            value={inputsBureau.internetAnnuel}
                            onChange={(v) => setBureau("internetAnnuel", v)}
                          />
                          <PctSlider
                            label="Usage professionnel internet"
                            value={inputsBureau.internetUsageProPct}
                            onChange={(v) => setBureau("internetUsageProPct", v)}
                          />
                        </div>
                        <NumberInput
                          id="indTT"
                          label="Indemnité télétravail employeur (€)"
                          hint="Forfait 2,70 €/jour ou 626,90 €/an."
                          value={inputsBureau.indemniteTeletravailEmployeur}
                          onChange={(v) => setBureau("indemniteTeletravailEmployeur", v)}
                        />
                        {result?.breakdown && (
                          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm space-y-1">
                            <p>
                              <span className="text-muted-foreground">Quote-part bureau : </span>
                              <span className="font-semibold text-foreground">
                                {(inputsBureau.surfaceLogementM2 > 0
                                  ? Math.min(100, (inputsBureau.surfaceBureauM2 / inputsBureau.surfaceLogementM2) * 100)
                                  : 0
                                ).toFixed(1)}{" "}
                                %
                              </span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Montant déductible : </span>
                              <span className="font-semibold text-foreground">
                                {Math.round(result.breakdown.bureau)} €
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ===== STEP 4: BLANCHISSAGE ===== */}
                    {idx === 3 && (
                      <div className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Uniquement les vêtements professionnels obligatoires : uniformes, blouses, robes d'avocat, tenues de chantier, EPI.
                            Pas les costumes ni les chemises de ville, même portés au bureau.
                          </AlertDescription>
                        </Alert>

                        <RadioGroup
                          value={modeBlanchissage}
                          onValueChange={(v) => setModeBlanchissage(v as "factures" | "domicile")}
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

                        {modeBlanchissage === "factures" ? (
                          <NumberInput
                            id="totalFactures"
                            label="Total annuel des factures (€)"
                            value={totalFacturesPressing}
                            onChange={setTotalFacturesPressing}
                          />
                        ) : (
                          <div className="space-y-3">
                            {lingeLignes.length === 0 && (
                              <p className="text-sm text-muted-foreground italic">
                                Aucune ligne. Ajoutez vos vêtements professionnels.
                              </p>
                            )}
                            {lingeLignes.map((ligne, i) => (
                              <div key={i} className="space-y-2 rounded-md border border-border p-3">
                                <div className="grid gap-3 sm:grid-cols-[1fr_90px_140px_120px_auto] items-end">
                                  <div className="space-y-1.5">
                                    <Label htmlFor={`vet-${i}`}>Vêtement</Label>
                                    <Select
                                      value={ligne.vetement}
                                      onValueChange={(v) => updateLigne(i, { vetement: v })}
                                    >
                                      <SelectTrigger id={`vet-${i}`}>
                                        <SelectValue placeholder="Choisir…" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {VETEMENTS_PRO.map((v) => (
                                          <SelectItem key={v} value={v}>{v}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor={`np-${i}`}>Pièces</Label>
                                    <Input
                                      id={`np-${i}`}
                                      type="number"
                                      min={0}
                                      value={ligne.nbPieces || ""}
                                      onChange={(e) =>
                                        updateLigne(i, { nbPieces: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor={`tar-${i}`}>Tarif pressing (€)</Label>
                                    <Input
                                      id={`tar-${i}`}
                                      type="number"
                                      step="0.01"
                                      min={0}
                                      value={ligne.tarifPressing || ""}
                                      onChange={(e) =>
                                        updateLigne(i, { tarifPressing: Number(e.target.value) || 0 })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor={`lav-${i}`}>Lavages / an</Label>
                                    <Input
                                      id={`lav-${i}`}
                                      type="number"
                                      min={0}
                                      value={ligne.nbLavagesAnnuel || ""}
                                      onChange={(e) =>
                                        updateLigne(i, { nbLavagesAnnuel: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                                      }
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeLigne(i)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Décote automatique de {constants.blanchissage_decote_domicile ?? 30}% appliquée au lavage à domicile.
                                </p>
                              </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addLigne}>
                              <Plus className="h-4 w-4" />
                              Ajouter une ligne
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ===== STEP 5: MATÉRIEL ===== */}
                    {idx === 4 && (
                      <div className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Pour information : tout matériel ≥ 500 € (en valeur usage pro) doit être amorti sur sa durée d'usage
                            (3 ans pour informatique, 10 ans pour mobilier, 5 ans pour autres). En dessous, déduction immédiate.
                          </AlertDescription>
                        </Alert>

                        {articles.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">Aucun article ajouté.</p>
                        )}

                        {articles.map((article, i) => {
                          const seuil = constants.materiel_seuil_amortissement ?? 500;
                          const dureeOrdi = constants.materiel_duree_ordinateur ?? 3;
                          const dureeMobilier = constants.materiel_duree_mobilier ?? 10;
                          const dureeAutre = constants.materiel_duree_autre ?? 5;
                          const usage = article.usageProPct / 100;
                          const prixAjuste = article.prixTTC * usage;
                          const estAmorti = prixAjuste >= seuil;
                          const duree =
                            article.type === "ordinateur" || article.type === "smartphone"
                              ? dureeOrdi
                              : article.type === "mobilier"
                              ? dureeMobilier
                              : dureeAutre;
                          const deductionAnnee = estAmorti ? prixAjuste / duree : prixAjuste;

                          return (
                            <div key={i} className="space-y-3 rounded-md border border-border p-4">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label htmlFor={`desc-${i}`}>Description</Label>
                                  <Input
                                    id={`desc-${i}`}
                                    value={article.description}
                                    onChange={(e) => updateArticle(i, { description: e.target.value })}
                                    placeholder="Ex : ordinateur portable"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`type-${i}`}>Type</Label>
                                  <Select
                                    value={article.type}
                                    onValueChange={(v) => updateArticle(i, { type: v as TypeMateriel })}
                                  >
                                    <SelectTrigger id={`type-${i}`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ordinateur">Ordinateur</SelectItem>
                                      <SelectItem value="smartphone">Smartphone</SelectItem>
                                      <SelectItem value="mobilier">Mobilier</SelectItem>
                                      <SelectItem value="logiciel">Logiciel</SelectItem>
                                      <SelectItem value="documentation">Documentation</SelectItem>
                                      <SelectItem value="outillage">Outillage</SelectItem>
                                      <SelectItem value="autre">Autre</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <NumberInput
                                  id={`prix-${i}`}
                                  label="Prix TTC (€)"
                                  value={article.prixTTC}
                                  onChange={(v) => updateArticle(i, { prixTTC: v })}
                                />
                                <DateInput
                                  id={`date-${i}`}
                                  label="Date d'achat"
                                  value={article.dateAchat}
                                  onChange={(v) => updateArticle(i, { dateAchat: v })}
                                />
                              </div>
                              <PctSlider
                                label="Usage professionnel"
                                value={article.usageProPct}
                                onChange={(v) => updateArticle(i, { usageProPct: v })}
                              />
                              {article.prixTTC > 0 && (
                                <p className="text-xs text-foreground bg-muted/40 rounded px-3 py-2">
                                  {estAmorti
                                    ? `Cet article s'amortit sur ${duree} ans → ${deductionAnnee.toFixed(2)} € déductibles cette année.`
                                    : `Déduction immédiate : ${deductionAnnee.toFixed(2)} €.`}
                                </p>
                              )}
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
                          );
                        })}
                        <Button type="button" variant="outline" onClick={addArticle}>
                          <Plus className="h-4 w-4" />
                          Ajouter un article
                        </Button>
                      </div>
                    )}

                    {/* ===== STEP 6: AUTRES ===== */}
                    {idx === 5 && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Tous les champs sont facultatifs. Pour information : pour les frais à usage mixte,
                          n'indiquer que la quote-part professionnelle.
                        </p>

                        <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
                          <p className="font-medium text-sm">Téléphone</p>
                          <NumberInput
                            id="tel"
                            label="Téléphone annuel (€)"
                            value={inputsAutresFrais.telephoneAnnuel}
                            onChange={(v) => setAutres("telephoneAnnuel", v)}
                          />
                          <PctSlider
                            label="Usage professionnel téléphone"
                            value={inputsAutresFrais.telephoneUsageProPct}
                            onChange={(v) => setAutres("telephoneUsageProPct", v)}
                          />
                        </div>

                        <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
                          <p className="font-medium text-sm">Internet</p>
                          {internetDejaBureau && (
                            <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                              <Info className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                Internet déjà saisi à l'étape Bureau. Saisie désactivée ici pour éviter une double déduction.
                              </AlertDescription>
                            </Alert>
                          )}
                          <NumberInput
                            id="net"
                            label="Internet annuel (€)"
                            value={inputsAutresFrais.internetAnnuel}
                            onChange={(v) => setAutres("internetAnnuel", v)}
                            disabled={internetDejaBureau}
                          />
                          <PctSlider
                            label="Usage professionnel internet"
                            value={inputsAutresFrais.internetUsageProPct}
                            onChange={(v) => setAutres("internetUsageProPct", v)}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <NumberInput
                            id="bnk"
                            label="Frais bancaires compte pro (€)"
                            value={inputsAutresFrais.fraisBancairesProServ}
                            onChange={(v) => setAutres("fraisBancairesProServ", v)}
                          />
                          <NumberInput
                            id="form"
                            label="Formation professionnelle (€)"
                            value={inputsAutresFrais.formationPro}
                            onChange={(v) => setAutres("formationPro", v)}
                          />
                          <NumberInput
                            id="synd"
                            label="Cotisations syndicales (€)"
                            value={inputsAutresFrais.cotisationsSyndicales}
                            onChange={(v) => setAutres("cotisationsSyndicales", v)}
                          />
                          <NumberInput
                            id="ordre"
                            label="Cotisations pro obligatoires (€)"
                            hint="Ordres professionnels, etc."
                            value={inputsAutresFrais.cotisationsProObligatoires}
                            onChange={(v) => setAutres("cotisationsProObligatoires", v)}
                          />
                          <NumberInput
                            id="dr"
                            label="Double résidence (€)"
                            value={inputsAutresFrais.doubleResidence}
                            onChange={(v) => setAutres("doubleResidence", v)}
                          />
                          <NumberInput
                            id="demnt"
                            label="Déménagement professionnel (€)"
                            value={inputsAutresFrais.demenagementPro}
                            onChange={(v) => setAutres("demenagementPro", v)}
                          />
                          <NumberInput
                            id="rech"
                            label="Frais de recherche d'emploi (€)"
                            value={inputsAutresFrais.fraisRechercheEmploi}
                            onChange={(v) => setAutres("fraisRechercheEmploi", v)}
                          />
                          <NumberInput
                            id="empr"
                            label="Intérêts d'emprunt résidence (€)"
                            value={inputsAutresFrais.interetsEmpruntResidence}
                            onChange={(v) => setAutres("interetsEmpruntResidence", v)}
                          />
                          <NumberInput
                            id="autres"
                            label="Autres frais justifiés (€)"
                            value={inputsAutresFrais.autresFraisJustifies}
                            onChange={(v) => setAutres("autresFraisJustifies", v)}
                          />
                        </div>

                        {inputsAutresFrais.cotisationsSyndicales > 0 && (
                          <Alert className="bg-yellow-50 border-yellow-300 text-yellow-900">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Si vous déduisez ici, vous perdez le crédit d'impôt de 66% sur ces cotisations.
                              Vérifiez quel régime est plus favorable pour votre situation.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* ===== STEP 7: OUTRE-MER ===== */}
                    {idx === 6 && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <Palmtree className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>
                            Pour les contribuables résidant en Guadeloupe, Martinique, Guyane,
                            La Réunion ou Mayotte. Section optionnelle.
                          </span>
                        </p>
                        <Alert className="bg-blue-50 border-blue-200 text-blue-900">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Pour information : la réfaction DROM ({constants.refaction_drom_zone1 ?? 30}% / {constants.refaction_drom_zone2 ?? 40}%)
                            s'applique sur l'impôt brut, pas sur les frais réels. Utilisez ensuite le simulateur IR Barème.
                          </AlertDescription>
                        </Alert>
                        <NumberInput
                          id="interIles"
                          label="Frais inter-îles ou inter-territoires professionnels (€)"
                          hint="Billets d'avion, bateau, pour activité professionnelle. Sur justificatifs."
                          value={inputsOutreMer.fraisInterIles}
                          onChange={(v) => setOM("fraisInterIles", v)}
                        />
                        <NumberInput
                          id="dromMet"
                          label="Frais voyages DROM ↔ métropole pour activité pro (€)"
                          value={inputsOutreMer.fraisVoyagesDromMetropolePro}
                          onChange={(v) => setOM("fraisVoyagesDromMetropolePro", v)}
                        />
                      </div>
                    )}

                    {/* nav */}
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
                          onClick={() => setActiveStep(0)}
                          className="w-full sm:w-auto bg-[#F9A825] hover:bg-[#F57F17] text-[#2D1B4E] font-bold"
                        >
                          <Receipt className="h-4 w-4" />
                          Voir le récap
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          disabled={idx === 2 && bureauInvalid}
                          className="w-full sm:w-auto bg-[#2D1B4E] hover:bg-[#3d2466] text-white"
                        >
                          Suivant
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
      )}

      <footer className="mt-8 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        Estimation pédagogique basée sur les barèmes officiels DGFiP 2026 (revenus 2025).
        Cette estimation ne constitue pas un calcul officiel d'impôt et ne se substitue pas à votre déclaration.
        En cas de doute, contactez votre service des impôts.
      </footer>
    </div>
  );
}
