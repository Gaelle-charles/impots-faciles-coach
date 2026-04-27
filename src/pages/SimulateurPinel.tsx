import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Save, RotateCcw, Copy, AlertTriangle } from "lucide-react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import {
  TAUX_PINEL_2024,
  PINEL_PLAFOND_INVEST,
  fmtEur,
} from "@/lib/baremes-fiscaux-2025";

type TypePinel = "classique" | "plus";
type Duree = 6 | 9 | 12;

const SimulateurPinel = () => {
  const { user } = useAuth();
  const [typePinel, setTypePinel] = useState<TypePinel>("classique");
  const [duree, setDuree] = useState<Duree>(9);
  const [montantInvest, setMontantInvest] = useState(200000);
  const [surface, setSurface] = useState(40);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    // Plafond global 300 000 € par an
    const baseInvest = Math.min(montantInvest, PINEL_PLAFOND_INVEST);
    // Plafond 5500 €/m²
    const plafondSurface = surface * 5500;
    const baseRetenue = Math.min(baseInvest, plafondSurface);

    const tauxTotal = TAUX_PINEL_2024[typePinel][duree];
    const reductionTotale = baseRetenue * tauxTotal;
    const reductionAnnuelle = reductionTotale / duree;

    return {
      baseRetenue: Math.round(baseRetenue),
      tauxTotal: tauxTotal * 100,
      reductionTotale: Math.round(reductionTotale),
      reductionAnnuelle: Math.round(reductionAnnuelle),
      depasseInvest: montantInvest > PINEL_PLAFOND_INVEST,
      depasseSurface: baseInvest > plafondSurface,
    };
  }, [typePinel, duree, montantInvest, surface]);

  const reset = () => {
    setTypePinel("classique"); setDuree(9);
    setMontantInvest(200000); setSurface(40);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const inputs = { typePinel, duree, montantInvest, surface };
    const { error } = await supabase.from("simulations" as any).insert({
      user_id: user.id,
      simulator_id: "pinel",
      nom: `Pinel ${typePinel} ${duree} ans`,
      donnees: inputs as any,
      inputs: inputs as any,
      results: result as any,
      impot_net: -result.reductionTotale,
      taux_moyen: result.tauxTotal,
    });
    setSaving(false);
    if (error) toast.error("Erreur sauvegarde");
    else toast.success("Simulation sauvegardée ✓");
  };

  const copy = () => {
    const text = `Pinel ${typePinel} - ${duree} ans
Investissement : ${fmtEur(montantInvest)} €
Base retenue : ${fmtEur(result.baseRetenue)} €
Réduction totale : ${fmtEur(result.reductionTotale)} €
Réduction annuelle : ${fmtEur(result.reductionAnnuelle)} €`;
    navigator.clipboard.writeText(text);
    toast.success("Copié");
  };

  return (
    <SimulateurLayout
      emoji="🏗️"
      title="Pinel / Pinel+"
      subtitle="Estimez la réduction d'impôt liée à votre investissement Pinel."
    >
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-[60%] space-y-4">
          <Card className="p-5 bg-orange-50 border-orange-200">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">Dispositif Pinel terminé au 31/12/2024</p>
                <p className="text-muted-foreground mt-1">
                  Aucun nouvel investissement éligible depuis 2025. Ce simulateur sert à estimer
                  les réductions des engagements pris avant cette date. Taux 2024 (dernière année du dispositif).
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Type de Pinel</h2>
            <RadioGroup value={typePinel} onValueChange={(v) => setTypePinel(v as TypePinel)}>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="classique" id="cl" className="mt-1" />
                <div>
                  <Label htmlFor="cl" className="font-medium">Pinel classique</Label>
                  <p className="text-xs text-muted-foreground">Zones tendues (A, A bis, B1) — taux 9% / 12% / 14%</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="plus" id="pl" className="mt-1" />
                <div>
                  <Label htmlFor="pl" className="font-medium">Pinel+ (super Pinel)</Label>
                  <p className="text-xs text-muted-foreground">Critères qualité + quartiers prioritaires — taux 12% / 18% / 21%</p>
                </div>
              </div>
            </RadioGroup>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Durée d'engagement</h2>
            <RadioGroup value={String(duree)} onValueChange={(v) => setDuree(Number(v) as Duree)}>
              <div className="grid grid-cols-3 gap-3">
                {[6, 9, 12].map((d) => (
                  <div key={d} className="flex items-center gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value={String(d)} id={`d${d}`} />
                    <Label htmlFor={`d${d}`} className="font-medium">{d} ans</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Le bien</h2>
            <div className="space-y-1.5">
              <Label>Montant de l'investissement (€)</Label>
              <Input type="number" min={0} value={montantInvest || ""} onChange={(e) => setMontantInvest(Number(e.target.value) || 0)} />
              {result.depasseInvest && (
                <p className="text-xs text-orange-600">Plafond global de 300 000 €/an appliqué</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Surface du logement (m²)</Label>
              <Input type="number" min={0} value={surface || ""} onChange={(e) => setSurface(Number(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Plafond 5 500 €/m² (loi)</p>
              {result.depasseSurface && (
                <p className="text-xs text-orange-600">Plafond surface (5 500 €/m²) appliqué</p>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:w-[40%]">
          <div className="sticky top-6 space-y-4">
            <Card className="p-6 space-y-5 shadow-lg">
              <h2 className="font-heading text-xl font-bold text-foreground">📊 Réduction d'impôt</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Base retenue</span><span className="font-bold">{fmtEur(result.baseRetenue)} €</span></div>
                <div className="flex justify-between"><span>Taux total</span><span>{result.tauxTotal}%</span></div>
                <div className="flex justify-between"><span>Durée</span><span>{duree} ans</span></div>
              </div>

              <div className="rounded-xl bg-green-50 border border-green-300 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Réduction totale d'impôt</p>
                <p className="font-heading text-3xl font-bold text-green-700">{fmtEur(result.reductionTotale)} €</p>
                <p className="text-sm text-muted-foreground mt-2">soit <span className="font-bold text-foreground">{fmtEur(result.reductionAnnuelle)} €</span> par an pendant {duree} ans</p>
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
              💡 La réduction Pinel entre dans le plafonnement global des niches fiscales (10 000 €/an, hors outre-mer). Vérifiez que vous ne dépassez pas ce plafond avec vos autres avantages fiscaux.
            </Card>
          </div>
        </div>
      </div>
    </SimulateurLayout>
  );
};

export default SimulateurPinel;
