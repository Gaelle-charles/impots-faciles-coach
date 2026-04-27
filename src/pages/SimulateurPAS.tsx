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
  GRILLE_PAS_NEUTRE_METROPOLE_2025,
  calculerImpotBareme,
  fmtEur,
} from "@/lib/baremes-fiscaux-2025";

type TypeTaux = "neutre" | "personnalise" | "individualise";

const SimulateurPAS = () => {
  const { user } = useAuth();
  const [typeTaux, setTypeTaux] = useState<TypeTaux>("personnalise");
  const [salaireMensuelNet, setSalaireMensuelNet] = useState(2500);
  const [revenuAnnuelImposableFoyer, setRevenuAnnuelImposableFoyer] = useState(36000);
  const [nbParts, setNbParts] = useState(1);
  // Pour individualisé : revenus du conjoint
  const [revenuConjoint, setRevenuConjoint] = useState(20000);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    // Taux neutre : sur la base du salaire mensuel
    const tauxNeutre =
      GRILLE_PAS_NEUTRE_METROPOLE_2025.find(
        (t) => salaireMensuelNet >= t.min && salaireMensuelNet < t.max
      )?.taux ?? 0;

    // Taux personnalisé du foyer (formule simplifiée art. 204 H CGI) :
    // tauxPerso = IR foyer / revenus imposables du foyer
    const { impot: impotFoyer } = calculerImpotBareme(
      revenuAnnuelImposableFoyer,
      nbParts
    );
    const tauxPerso =
      revenuAnnuelImposableFoyer > 0
        ? impotFoyer / revenuAnnuelImposableFoyer
        : 0;

    // Taux individualisé (couples) :
    // chaque conjoint a un taux basé sur sa quote-part de revenus.
    const totalCouple = revenuAnnuelImposableFoyer + revenuConjoint;
    const partA =
      totalCouple > 0 ? revenuAnnuelImposableFoyer / totalCouple : 0.5;
    const partB = 1 - partA;
    const irCoupleSimule = totalCouple > 0
      ? calculerImpotBareme(totalCouple, Math.max(2, nbParts)).impot
      : 0;
    const tauxIndivA = totalCouple > 0 ? (irCoupleSimule * partA) / Math.max(1, revenuAnnuelImposableFoyer) : 0;
    const tauxIndivB = totalCouple > 0 ? (irCoupleSimule * partB) / Math.max(1, revenuConjoint) : 0;

    const tauxApplique =
      typeTaux === "neutre"
        ? tauxNeutre
        : typeTaux === "personnalise"
        ? tauxPerso
        : tauxIndivA;

    const prelevementMensuel = salaireMensuelNet * tauxApplique;
    const prelevementAnnuel = prelevementMensuel * 12;

    return {
      tauxNeutre,
      tauxPerso,
      tauxIndivA,
      tauxIndivB,
      tauxApplique,
      prelevementMensuel,
      prelevementAnnuel,
      irFoyer: impotFoyer,
    };
  }, [typeTaux, salaireMensuelNet, revenuAnnuelImposableFoyer, nbParts, revenuConjoint]);

  const reset = () => {
    setTypeTaux("personnalise");
    setSalaireMensuelNet(2500);
    setRevenuAnnuelImposableFoyer(36000);
    setNbParts(1);
    setRevenuConjoint(20000);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("simulations" as any).insert({
      user_id: user.id,
      simulator_id: "pas",
      nom: `PAS — ${typeTaux}`,
      donnees: { typeTaux, salaireMensuelNet, revenuAnnuelImposableFoyer, nbParts, revenuConjoint } as any,
      inputs: { typeTaux, salaireMensuelNet, revenuAnnuelImposableFoyer, nbParts, revenuConjoint } as any,
      results: { ...result } as any,
      impot_net: Math.round(result.prelevementAnnuel),
      taux_moyen: Math.round(result.tauxApplique * 1000) / 10,
    });
    setSaving(false);
    if (error) toast.error("Erreur sauvegarde");
    else toast.success("Simulation sauvegardée ✓");
  };

  const copy = () => {
    const text = `Simulateur PAS
Type : ${typeTaux}
Salaire net mensuel : ${fmtEur(salaireMensuelNet)} €
Taux appliqué : ${(result.tauxApplique * 100).toFixed(2)}%
Prélèvement mensuel : ${fmtEur(result.prelevementMensuel)} €
Prélèvement annuel : ${fmtEur(result.prelevementAnnuel)} €`;
    navigator.clipboard.writeText(text);
    toast.success("Copié");
  };

  return (
    <SimulateurLayout
      emoji="💼"
      title="Prélèvement à la source"
      subtitle="Estimez votre taux de prélèvement et le montant retenu chaque mois."
    >
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form */}
        <div className="lg:w-[60%] space-y-4">
          <Card className="p-5 space-y-5">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Type de taux PAS
            </h2>
            <RadioGroup value={typeTaux} onValueChange={(v) => setTypeTaux(v as TypeTaux)}>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="personnalise" id="perso" className="mt-1" />
                <div>
                  <Label htmlFor="perso" className="font-medium">Taux personnalisé</Label>
                  <p className="text-xs text-muted-foreground">Calculé sur les revenus du foyer (par défaut)</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="neutre" id="neutre" className="mt-1" />
                <div>
                  <Label htmlFor="neutre" className="font-medium">Taux neutre (non personnalisé)</Label>
                  <p className="text-xs text-muted-foreground">Si vous ne souhaitez pas que votre employeur connaisse votre taux personnalisé</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="individualise" id="indiv" className="mt-1" />
                <div>
                  <Label htmlFor="indiv" className="font-medium">Taux individualisé (couples)</Label>
                  <p className="text-xs text-muted-foreground">Réservé aux couples avec écart de revenus</p>
                </div>
              </div>
            </RadioGroup>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Vos revenus</h2>

            <div className="space-y-1.5">
              <Label>Salaire net mensuel (€)</Label>
              <Input type="number" min={0} value={salaireMensuelNet || ""} onChange={(e) => setSalaireMensuelNet(Number(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Le montant qui sert de base au prélèvement</p>
            </div>

            <div className="space-y-1.5">
              <Label>Revenu annuel imposable du foyer (€)</Label>
              <Input type="number" min={0} value={revenuAnnuelImposableFoyer || ""} onChange={(e) => setRevenuAnnuelImposableFoyer(Number(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Total des revenus nets imposables (vous + conjoint)</p>
            </div>

            <div className="space-y-1.5">
              <Label>Nombre de parts fiscales</Label>
              <Input type="number" min={1} step={0.5} value={nbParts} onChange={(e) => setNbParts(Number(e.target.value) || 1)} />
            </div>

            {typeTaux === "individualise" && (
              <div className="space-y-1.5">
                <Label>Revenu annuel imposable du conjoint (€)</Label>
                <Input type="number" min={0} value={revenuConjoint || ""} onChange={(e) => setRevenuConjoint(Number(e.target.value) || 0)} />
              </div>
            )}
          </Card>
        </div>

        {/* Result */}
        <div className="lg:w-[40%]">
          <div className="sticky top-6 space-y-4">
            <Card className="p-6 space-y-5 shadow-lg">
              <h2 className="font-heading text-xl font-bold text-foreground">📊 Votre PAS</h2>

              <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Taux appliqué</p>
                <p className="font-heading text-4xl font-bold text-primary">
                  {(result.tauxApplique * 100).toFixed(2)}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Prélevé / mois</p>
                  <p className="font-heading font-bold text-foreground">{fmtEur(result.prelevementMensuel)} €</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Prélevé / an</p>
                  <p className="font-heading font-bold text-foreground">{fmtEur(result.prelevementAnnuel)} €</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Taux neutre</span><span>{(result.tauxNeutre * 100).toFixed(2)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Taux personnalisé</span><span>{(result.tauxPerso * 100).toFixed(2)}%</span></div>
                {typeTaux === "individualise" && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Taux indiv. (vous)</span><span>{(result.tauxIndivA * 100).toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Taux indiv. (conjoint)</span><span>{(result.tauxIndivB * 100).toFixed(2)}%</span></div>
                  </>
                )}
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
              💡 Le taux personnalisé vous évite des régularisations en fin d'année. Le taux neutre peut être plus élevé que votre vrai taux mais préserve la confidentialité.
            </Card>
          </div>
        </div>
      </div>
    </SimulateurLayout>
  );
};

export default SimulateurPAS;
