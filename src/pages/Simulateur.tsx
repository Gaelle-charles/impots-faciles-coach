import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSimulateurFiscal, defaultFormData, type SimulateurFormData } from "@/hooks/useSimulateurFiscal";
import SimulateurResultat from "@/components/simulateur/SimulateurResultat";
import MesSimulations from "@/components/simulateur/MesSimulations";
import { Minus, Plus, User, Users, Baby } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { toast } from "@/hooks/use-toast";

const NumInput = ({
  label, note, placeholder = "0", value, onChange,
}: {
  label: string; note?: string; placeholder?: string; value: number;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-foreground">{label}</Label>
    <Input
      type="number"
      min={0}
      placeholder={placeholder}
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="tabular-nums"
    />
    {note && <p className="text-xs text-muted-foreground">{note}</p>}
  </div>
);

const Simulateur = () => {
  const navigate = useNavigate();
  const { isLoading: accessLoading, hasSimulateurCompletAccess } = useAccess();
  const [form, setForm] = useState<SimulateurFormData>(defaultFormData);
  const [refreshKey, setRefreshKey] = useState(0);
  const result = useSimulateurFiscal(form);

  useEffect(() => {
    if (accessLoading) return;
    if (!hasSimulateurCompletAccess()) {
      toast({
        title: 'Accès restreint',
        description: 'Le simulateur complet est disponible avec le plan Expert ou Premium',
        variant: 'destructive',
      });
      navigate('/simulateur-de-frais', { replace: true });
    }
  }, [accessLoading, hasSimulateurCompletAccess, navigate]);

  const update = useCallback(<K extends keyof SimulateurFormData>(key: K, value: SimulateurFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = () => setForm(defaultFormData);

  const situationOptions = [
    { value: "celibataire" as const, label: "Célibataire / Divorcé / Veuf", icon: User },
    { value: "marie" as const, label: "Marié ou Pacsé", icon: Users },
    { value: "marie_enfants" as const, label: "Marié/Pacsé + enfants", icon: Baby },
  ];

  if (accessLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96" />
        <div className="flex flex-col lg:flex-row gap-8">
          <Skeleton className="lg:w-[60%] h-96 rounded-lg" />
          <Skeleton className="lg:w-[40%] h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hasSimulateurCompletAccess()) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">🧮 Simulateur d'impôt 2025</h1>
        <p className="mt-2 text-muted-foreground">Estimez votre impôt sur les revenus 2024 en quelques minutes.</p>
      </div>

      {/* Info banner */}
      <div className="rounded-lg bg-yellow-vivid/15 border border-yellow-vivid/30 p-4 text-sm text-foreground">
        <span className="font-semibold">ℹ️ Ce simulateur est un outil pédagogique.</span>{" "}
        Le résultat est une estimation basée sur le barème officiel 2025. Pour votre déclaration réelle, rendez-vous sur{" "}
        <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline font-medium text-primary">
          impots.gouv.fr
        </a>
      </div>

      {/* Two column layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Form */}
        <div className="lg:w-[60%] space-y-4">
          <Accordion type="multiple" defaultValue={["situation", "revenus", "deductions", "reductions"]}>

            {/* Section 1: Situation */}
            <AccordionItem value="situation">
              <AccordionTrigger className="font-heading text-lg font-semibold">
                👨‍👩‍👧 Situation familiale
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {situationOptions.map((opt) => {
                    const Icon = opt.icon;
                    const selected = form.situation === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => update("situation", opt.value)}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center text-sm transition-all ${
                          selected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${selected ? "text-primary" : ""}`} />
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {form.situation !== "celibataire" && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Enfants mineurs ou rattachés</Label>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" onClick={() => update("nbEnfants", Math.max(0, form.nbEnfants - 1))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-heading text-xl font-bold tabular-nums w-8 text-center text-foreground">{form.nbEnfants}</span>
                      <Button variant="outline" size="icon" onClick={() => update("nbEnfants", Math.min(10, form.nbEnfants + 1))}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {form.situation === "celibataire" && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Enfants mineurs ou rattachés</Label>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" onClick={() => update("nbEnfants", Math.max(0, form.nbEnfants - 1))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-heading text-xl font-bold tabular-nums w-8 text-center text-foreground">{form.nbEnfants}</span>
                      <Button variant="outline" size="icon" onClick={() => update("nbEnfants", Math.min(10, form.nbEnfants + 1))}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={form.gardeAlternee}
                      onCheckedChange={(v) => update("gardeAlternee", !!v)}
                    />
                    <Label className="text-sm">Garde alternée (certains enfants)</Label>
                  </div>
                  {form.gardeAlternee && (
                    <NumInput
                      label="Nombre d'enfants en garde alternée"
                      value={form.nbEnfantsGardeAlternee}
                      onChange={(v) => update("nbEnfantsGardeAlternee", Math.min(v, form.nbEnfants))}
                    />
                  )}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={form.parentIsole}
                      onCheckedChange={(v) => update("parentIsole", !!v)}
                    />
                    <Label className="text-sm">Parent isolé (enfant à charge exclusive)</Label>
                  </div>
                </div>

                <Card className="bg-secondary/50 border-border p-3">
                  <p className="font-heading text-sm font-semibold text-foreground">
                    Nombre de parts fiscales : <span className="text-primary">{result.nbParts} parts</span>
                  </p>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Revenus */}
            <AccordionItem value="revenus">
              <AccordionTrigger className="font-heading text-lg font-semibold">
                💰 Revenus
              </AccordionTrigger>
              <AccordionContent className="space-y-5">
                <p className="text-sm text-muted-foreground">Indiquez vos revenus bruts annuels 2024</p>

                <NumInput
                  label="Salaires / Traitements / Pensions de retraite (€)"
                  placeholder="ex: 35 000"
                  value={form.salaires}
                  onChange={(v) => update("salaires", v)}
                  note="L'abattement de 10% sera appliqué automatiquement (min 495€, max 14 171€)"
                />
                <NumInput label="Revenus BIC (micro ou réel) (€)" value={form.bic} onChange={(v) => update("bic", v)} />
                <NumInput label="Revenus BNC (micro ou réel) (€)" value={form.bnc} onChange={(v) => update("bnc", v)} />
                <NumInput label="Revenus fonciers nets (location vide) (€)" value={form.fonciers} onChange={(v) => update("fonciers", v)} />

                <div className="space-y-2">
                  <NumInput label="Intérêts et dividendes (€)" value={form.capitaux} onChange={(v) => update("capitaux", v)} />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={form.optionBareme2OP}
                      onCheckedChange={(v) => update("optionBareme2OP", !!v)}
                    />
                    <Label className="text-sm">Opter pour le barème progressif (case 2OP)</Label>
                  </div>
                </div>

                <NumInput label="Autres revenus imposables (€)" value={form.autresRevenus} onChange={(v) => update("autresRevenus", v)} />
              </AccordionContent>
            </AccordionItem>

            {/* Section 3: Déductions */}
            <AccordionItem value="deductions">
              <AccordionTrigger className="font-heading text-lg font-semibold">
                📝 Déductions et charges
              </AccordionTrigger>
              <AccordionContent className="space-y-5">
                <p className="text-sm text-muted-foreground">Ce que vous pouvez déduire de vos revenus</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={form.fraisReels}
                      onCheckedChange={(v) => update("fraisReels", !!v)}
                    />
                    <Label className="text-sm">Je déclare mes frais réels</Label>
                  </div>
                  {form.fraisReels && (
                    <NumInput
                      label="Montant des frais réels (€)"
                      value={form.montantFraisReels}
                      onChange={(v) => update("montantFraisReels", v)}
                      note="Cochez uniquement si vos frais réels dépassent 10% de votre salaire"
                    />
                  )}
                </div>

                <NumInput
                  label="Pensions alimentaires versées (€)"
                  value={form.pensionsAlimentaires}
                  onChange={(v) => update("pensionsAlimentaires", v)}
                  note="Enfants majeurs non rattachés — plafond 6 674€ par enfant"
                />

                <NumInput
                  label="Versements sur un PER déductibles (€)"
                  value={form.per}
                  onChange={(v) => update("per", v)}
                  note="Plafond : 10% des revenus professionnels, max 35 194€"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Section 4: Réductions & crédits */}
            <AccordionItem value="reductions">
              <AccordionTrigger className="font-heading text-lg font-semibold">
                🎁 Réductions et crédits d'impôt
              </AccordionTrigger>
              <AccordionContent className="space-y-5">
                <p className="text-sm text-muted-foreground">Ce que vous pouvez déduire de votre impôt</p>

                <NumInput
                  label="Frais de garde d'enfant < 6 ans (€)"
                  value={form.gardeEnfant}
                  onChange={(v) => update("gardeEnfant", v)}
                  note="Crédit d'impôt de 50% — plafond 3 500€ par enfant"
                />

                <NumInput
                  label="Dépenses d'emploi à domicile (€)"
                  value={form.emploiDomicile}
                  onChange={(v) => update("emploiDomicile", v)}
                  note="Crédit d'impôt de 50% — plafond 12 000€ (+ 1 500€ par enfant)"
                />

                <NumInput
                  label="Dons à des associations (€)"
                  value={form.dons}
                  onChange={(v) => update("dons", v)}
                  note="Réduction de 66% — 75% pour aide alimentaire/logement — plafond 20% du RNG"
                />

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Frais de scolarité (nombre d'enfants)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Collège</Label>
                      <Input type="number" min={0} placeholder="0" value={form.nbCollege || ""} onChange={(e) => update("nbCollege", Number(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Lycée</Label>
                      <Input type="number" min={0} placeholder="0" value={form.nbLycee || ""} onChange={(e) => update("nbLycee", Number(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Supérieur</Label>
                      <Input type="number" min={0} placeholder="0" value={form.nbSuperieur || ""} onChange={(e) => update("nbSuperieur", Number(e.target.value) || 0)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Réduction : 61€ / 153€ / 183€ par enfant</p>
                </div>

                <NumInput
                  label="Réduction Pinel/Denormandie (€)"
                  value={form.pinel}
                  onChange={(v) => update("pinel", v)}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Mes simulations sauvegardées */}
          <MesSimulations onLoad={(data) => setForm(data)} refreshKey={refreshKey} />
        </div>

        {/* Right: Results */}
        <div className="lg:w-[40%]">
          <SimulateurResultat
            result={result}
            formData={form}
            onReset={handleReset}
            onSimulationSaved={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  );
};

export default Simulateur;
