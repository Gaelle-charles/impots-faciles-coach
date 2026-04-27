import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Save, RotateCcw, Copy } from "lucide-react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import {
  abattementPVImmoIR,
  abattementPVImmoPS,
  TAUX_IR_PV_IMMO,
  TAUX_PS_PV_IMMO,
  fmtEur,
} from "@/lib/baremes-fiscaux-2025";

const SimulateurPlusValueImmo = () => {
  const { user } = useAuth();
  const [prixVente, setPrixVente] = useState(300000);
  const [fraisVente, setFraisVente] = useState(5000);
  const [prixAchat, setPrixAchat] = useState(200000);
  const [fraisAchat, setFraisAchat] = useState(15000); // forfait 7.5% possible
  const [travaux, setTravaux] = useState(0); // forfait 15% possible si > 5 ans
  const [forfait75, setForfait75] = useState(false);
  const [forfait15Travaux, setForfait15Travaux] = useState(false);
  const [anneesDetention, setAnneesDetention] = useState(10);
  const [residencePrincipale, setResidencePrincipale] = useState(false);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    if (residencePrincipale) {
      return {
        plusValueBrute: 0,
        abatIR: 0,
        abatPS: 0,
        baseIR: 0,
        basePS: 0,
        impotIR: 0,
        prelevementsSociaux: 0,
        surtaxe: 0,
        total: 0,
        exoneration: true,
      };
    }

    const fraisAchatEffectif = forfait75 ? prixAchat * 0.075 : fraisAchat;
    const travauxEffectif =
      forfait15Travaux && anneesDetention >= 5 ? prixAchat * 0.15 : travaux;
    const prixAchatTotal = prixAchat + fraisAchatEffectif + travauxEffectif;
    const prixVenteNet = prixVente - fraisVente;
    const plusValueBrute = Math.max(0, prixVenteNet - prixAchatTotal);

    const abatIR = abattementPVImmoIR(anneesDetention);
    const abatPS = abattementPVImmoPS(anneesDetention);
    const baseIR = plusValueBrute * (1 - abatIR);
    const basePS = plusValueBrute * (1 - abatPS);

    const impotIR = baseIR * TAUX_IR_PV_IMMO;
    const prelevementsSociaux = basePS * TAUX_PS_PV_IMMO;

    // Surtaxe progressive sur les PV > 50 000 € (article 1609 nonies G)
    let surtaxe = 0;
    if (baseIR > 50_000) {
      // Barème simplifié
      if (baseIR <= 100_000) surtaxe = baseIR * 0.02;
      else if (baseIR <= 150_000) surtaxe = baseIR * 0.03;
      else if (baseIR <= 200_000) surtaxe = baseIR * 0.04;
      else if (baseIR <= 250_000) surtaxe = baseIR * 0.05;
      else surtaxe = baseIR * 0.06;
    }

    const total = impotIR + prelevementsSociaux + surtaxe;

    return {
      plusValueBrute: Math.round(plusValueBrute),
      abatIR: Math.round(abatIR * 100),
      abatPS: Math.round(abatPS * 100),
      baseIR: Math.round(baseIR),
      basePS: Math.round(basePS),
      impotIR: Math.round(impotIR),
      prelevementsSociaux: Math.round(prelevementsSociaux),
      surtaxe: Math.round(surtaxe),
      total: Math.round(total),
      exoneration: false,
    };
  }, [prixVente, fraisVente, prixAchat, fraisAchat, travaux, forfait75, forfait15Travaux, anneesDetention, residencePrincipale]);

  const reset = () => {
    setPrixVente(300000); setFraisVente(5000); setPrixAchat(200000);
    setFraisAchat(15000); setTravaux(0); setForfait75(false);
    setForfait15Travaux(false); setAnneesDetention(10); setResidencePrincipale(false);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const inputs = { prixVente, fraisVente, prixAchat, fraisAchat, travaux, forfait75, forfait15Travaux, anneesDetention, residencePrincipale };
    const { error } = await supabase.from("simulations" as any).insert({
      user_id: user.id,
      simulator_id: "plus-value-immo",
      nom: `PV immo — ${fmtEur(prixVente)} €`,
      donnees: inputs as any,
      inputs: inputs as any,
      results: result as any,
      impot_net: result.total,
      taux_moyen: result.plusValueBrute > 0 ? Math.round((result.total / result.plusValueBrute) * 1000) / 10 : 0,
    });
    setSaving(false);
    if (error) toast.error("Erreur sauvegarde");
    else toast.success("Simulation sauvegardée ✓");
  };

  const copy = () => {
    const text = `Plus-value immobilière
Prix vente : ${fmtEur(prixVente)} € | Achat : ${fmtEur(prixAchat)} €
Détention : ${anneesDetention} ans
Plus-value brute : ${fmtEur(result.plusValueBrute)} €
Impôt total : ${fmtEur(result.total)} €`;
    navigator.clipboard.writeText(text);
    toast.success("Copié");
  };

  return (
    <SimulateurLayout
      emoji="🏠"
      title="Plus-value immobilière"
      subtitle="Calculez l'impôt sur la cession d'un bien immobilier (résidence secondaire, locatif)."
    >
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-[60%] space-y-4">
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Le bien</h2>
            <div className="flex items-center gap-2">
              <Checkbox checked={residencePrincipale} onCheckedChange={(v) => setResidencePrincipale(!!v)} id="rp" />
              <Label htmlFor="rp" className="text-sm">C'est ma résidence principale (exonération totale)</Label>
            </div>
          </Card>

          {!residencePrincipale && (
            <>
              <Card className="p-5 space-y-4">
                <h2 className="font-heading text-lg font-bold text-foreground">Vente</h2>
                <div className="space-y-1.5">
                  <Label>Prix de vente (€)</Label>
                  <Input type="number" min={0} value={prixVente || ""} onChange={(e) => setPrixVente(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Frais de vente (diagnostics, mainlevée…) (€)</Label>
                  <Input type="number" min={0} value={fraisVente || ""} onChange={(e) => setFraisVente(Number(e.target.value) || 0)} />
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h2 className="font-heading text-lg font-bold text-foreground">Achat</h2>
                <div className="space-y-1.5">
                  <Label>Prix d'achat (€)</Label>
                  <Input type="number" min={0} value={prixAchat || ""} onChange={(e) => setPrixAchat(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={forfait75} onCheckedChange={(v) => setForfait75(!!v)} id="f75" />
                    <Label htmlFor="f75" className="text-sm">Appliquer le forfait frais d'acquisition 7,5%</Label>
                  </div>
                  {!forfait75 && (
                    <div className="space-y-1.5">
                      <Label>Frais d'acquisition réels (notaire, agence) (€)</Label>
                      <Input type="number" min={0} value={fraisAchat || ""} onChange={(e) => setFraisAchat(Number(e.target.value) || 0)} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={forfait15Travaux} onCheckedChange={(v) => setForfait15Travaux(!!v)} id="f15" disabled={anneesDetention < 5} />
                    <Label htmlFor="f15" className="text-sm">Appliquer le forfait travaux 15% (≥ 5 ans de détention)</Label>
                  </div>
                  {!forfait15Travaux && (
                    <div className="space-y-1.5">
                      <Label>Travaux justifiés (€)</Label>
                      <Input type="number" min={0} value={travaux || ""} onChange={(e) => setTravaux(Number(e.target.value) || 0)} />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Durée de détention (années)</Label>
                  <Input type="number" min={0} max={50} value={anneesDetention || ""} onChange={(e) => setAnneesDetention(Number(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground">Exonération IR à 22 ans, PS à 30 ans</p>
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="lg:w-[40%]">
          <div className="sticky top-6 space-y-4">
            <Card className="p-6 space-y-5 shadow-lg">
              <h2 className="font-heading text-xl font-bold text-foreground">📊 Imposition</h2>

              {result.exoneration ? (
                <div className="rounded-xl bg-green-50 border border-green-300 p-4 text-center">
                  <p className="font-heading text-2xl font-bold text-green-700">Exonération totale</p>
                  <p className="text-sm text-muted-foreground mt-2">La résidence principale n'est pas imposée.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Plus-value brute</span><span className="font-bold">{fmtEur(result.plusValueBrute)} €</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Abattement IR ({result.abatIR}%)</span><span>{fmtEur(result.plusValueBrute - result.baseIR)} €</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Abattement PS ({result.abatPS}%)</span><span>{fmtEur(result.plusValueBrute - result.basePS)} €</span></div>
                    <hr className="border-border" />
                    <div className="flex justify-between"><span>Base IR</span><span>{fmtEur(result.baseIR)} €</span></div>
                    <div className="flex justify-between"><span>Base PS</span><span>{fmtEur(result.basePS)} €</span></div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Impôt sur le revenu (19%)</span><span>{fmtEur(result.impotIR)} €</span></div>
                    <div className="flex justify-between"><span>Prélèvements sociaux (17,2%)</span><span>{fmtEur(result.prelevementsSociaux)} €</span></div>
                    {result.surtaxe > 0 && (
                      <div className="flex justify-between text-orange-600"><span>Surtaxe PV {">"} 50 k€</span><span>{fmtEur(result.surtaxe)} €</span></div>
                    )}
                  </div>

                  <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total à payer</p>
                    <p className="font-heading text-3xl font-bold text-destructive">{fmtEur(result.total)} €</p>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copy}><Copy className="h-4 w-4 mr-1" />Copier</Button>
                <Button variant="outline" className="flex-1" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
              </div>
              <Button className="w-full" onClick={save} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />{saving ? "..." : "Sauvegarder"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </SimulateurLayout>
  );
};

export default SimulateurPlusValueImmo;
