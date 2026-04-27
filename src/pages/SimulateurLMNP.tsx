import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Save, RotateCcw, Copy } from "lucide-react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import {
  LMNP_MICRO,
  TAUX_PS_REVENUS,
  calculerImpotBareme,
  fmtEur,
} from "@/lib/baremes-fiscaux-2025";

type TypeLocation = "classique" | "tourisme_classe" | "tourisme_non_classe";

const SimulateurLMNP = () => {
  const { user } = useAuth();
  const [typeLocation, setTypeLocation] = useState<TypeLocation>("classique");
  const [recettesAnnuelles, setRecettesAnnuelles] = useState(15000);
  const [tmi, setTmi] = useState<number>(0.30); // tranche marginale d'imposition
  const [autresRevenus, setAutresRevenus] = useState(36000);
  const [nbParts, setNbParts] = useState(1);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    const config = LMNP_MICRO[typeLocation];
    const eligibleMicro = recettesAnnuelles <= config.plafond;

    let abattement = recettesAnnuelles * config.abattement;
    if (abattement < config.minimum && recettesAnnuelles >= config.minimum) {
      abattement = config.minimum;
    }
    const beneficeImposable = Math.max(0, recettesAnnuelles - abattement);

    // Imposition au barème + PS 17.2%
    const totalImposable = autresRevenus + beneficeImposable;
    const irAvant = calculerImpotBareme(autresRevenus, nbParts).impot;
    const irApres = calculerImpotBareme(totalImposable, nbParts).impot;
    const irMarginal = Math.max(0, irApres - irAvant);
    const ps = beneficeImposable * TAUX_PS_REVENUS;

    return {
      eligibleMicro,
      abattement: Math.round(abattement),
      beneficeImposable: Math.round(beneficeImposable),
      irMarginal: Math.round(irMarginal),
      ps: Math.round(ps),
      total: Math.round(irMarginal + ps),
      tauxEffectif: recettesAnnuelles > 0 ? Math.round(((irMarginal + ps) / recettesAnnuelles) * 1000) / 10 : 0,
    };
  }, [typeLocation, recettesAnnuelles, autresRevenus, nbParts]);

  const reset = () => {
    setTypeLocation("classique"); setRecettesAnnuelles(15000);
    setTmi(0.30); setAutresRevenus(36000); setNbParts(1);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const inputs = { typeLocation, recettesAnnuelles, autresRevenus, nbParts };
    const { error } = await supabase.from("simulations" as any).insert({
      user_id: user.id,
      simulator_id: "lmnp-micro-bic",
      nom: `LMNP — ${fmtEur(recettesAnnuelles)} €`,
      donnees: inputs as any,
      inputs: inputs as any,
      results: result as any,
      impot_net: result.total,
      taux_moyen: result.tauxEffectif,
    });
    setSaving(false);
    if (error) toast.error("Erreur sauvegarde");
    else toast.success("Simulation sauvegardée ✓");
  };

  const copy = () => {
    const text = `LMNP micro-BIC
Type : ${typeLocation}
Recettes : ${fmtEur(recettesAnnuelles)} €
Abattement : ${fmtEur(result.abattement)} €
Bénéfice imposable : ${fmtEur(result.beneficeImposable)} €
Total impôt + PS : ${fmtEur(result.total)} €`;
    navigator.clipboard.writeText(text);
    toast.success("Copié");
  };

  return (
    <SimulateurLayout
      emoji="🛏️"
      title="LMNP au régime micro-BIC"
      subtitle="Estimez l'impôt sur vos revenus de location meublée non professionnelle."
    >
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-[60%] space-y-4">
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Type de location</h2>
            <RadioGroup value={typeLocation} onValueChange={(v) => setTypeLocation(v as TypeLocation)}>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="classique" id="cl" className="mt-1" />
                <div>
                  <Label htmlFor="cl" className="font-medium">Meublé longue durée (classique)</Label>
                  <p className="text-xs text-muted-foreground">Abattement 50% — plafond 77 700 €</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="tourisme_classe" id="tc" className="mt-1" />
                <div>
                  <Label htmlFor="tc" className="font-medium">Meublé de tourisme classé</Label>
                  <p className="text-xs text-muted-foreground">Abattement 50% — plafond 77 700 €</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="tourisme_non_classe" id="tnc" className="mt-1" />
                <div>
                  <Label htmlFor="tnc" className="font-medium">Meublé de tourisme NON classé</Label>
                  <p className="text-xs text-muted-foreground">Abattement 30% — plafond 15 000 € (réforme LF 2025)</p>
                </div>
              </div>
            </RadioGroup>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Vos recettes</h2>
            <div className="space-y-1.5">
              <Label>Recettes locatives annuelles brutes (€)</Label>
              <Input type="number" min={0} value={recettesAnnuelles || ""} onChange={(e) => setRecettesAnnuelles(Number(e.target.value) || 0)} />
              {!result.eligibleMicro && (
                <p className="text-xs text-destructive font-medium">⚠️ Vos recettes dépassent le plafond du micro-BIC. Le régime réel devient obligatoire.</p>
              )}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Votre foyer fiscal</h2>
            <div className="space-y-1.5">
              <Label>Autres revenus annuels imposables (€)</Label>
              <Input type="number" min={0} value={autresRevenus || ""} onChange={(e) => setAutresRevenus(Number(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Salaires nets après abattement, autres revenus</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre de parts fiscales</Label>
              <Input type="number" min={1} step={0.5} value={nbParts} onChange={(e) => setNbParts(Number(e.target.value) || 1)} />
            </div>
          </Card>
        </div>

        <div className="lg:w-[40%]">
          <div className="sticky top-6 space-y-4">
            <Card className="p-6 space-y-5 shadow-lg">
              <h2 className="font-heading text-xl font-bold text-foreground">📊 Imposition LMNP</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Recettes brutes</span><span className="font-bold">{fmtEur(recettesAnnuelles)} €</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Abattement forfaitaire</span><span>- {fmtEur(result.abattement)} €</span></div>
                <hr className="border-border" />
                <div className="flex justify-between"><span>Bénéfice imposable</span><span className="font-bold">{fmtEur(result.beneficeImposable)} €</span></div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>IR additionnel</span><span>{fmtEur(result.irMarginal)} €</span></div>
                <div className="flex justify-between"><span>Prélèvements sociaux (17,2%)</span><span>{fmtEur(result.ps)} €</span></div>
              </div>

              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total à payer</p>
                <p className="font-heading text-3xl font-bold text-destructive">{fmtEur(result.total)} €</p>
                <p className="text-xs text-muted-foreground mt-2">Taux effectif : {result.tauxEffectif}% des recettes</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copy}><Copy className="h-4 w-4 mr-1" />Copier</Button>
                <Button variant="outline" className="flex-1" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
              </div>
              <Button className="w-full" onClick={save} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />{saving ? "..." : "Sauvegarder"}
              </Button>
            </Card>

            <Card className="p-4 text-xs text-muted-foreground">
              💡 Si vos charges réelles (intérêts, amortissement, travaux) dépassent l'abattement forfaitaire, le régime réel peut être plus avantageux. Faites une simulation comparative avec un expert-comptable.
            </Card>
          </div>
        </div>
      </div>
    </SimulateurLayout>
  );
};

export default SimulateurLMNP;
