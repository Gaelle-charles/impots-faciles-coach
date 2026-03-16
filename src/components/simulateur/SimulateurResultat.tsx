import { useState } from "react";
import { SimulateurResult, SimulateurFormData } from "@/hooks/useSimulateurFiscal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, RotateCcw, ArrowRight, Save, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

interface Props {
  result: SimulateurResult;
  formData: SimulateurFormData;
  onReset: () => void;
  onSimulationSaved?: () => void;
}

export default function SimulateurResultat({ result, formData, onReset, onSimulationSaved }: Props) {
  const { user } = useAuth();
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("Estimation 2024");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("simulations" as any).insert({
      user_id: user.id,
      nom: saveName,
      donnees: formData as any,
      impot_net: result.impotNet,
      taux_moyen: result.tauxMoyen,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Simulation sauvegardée ✓");
      setSaveOpen(false);
      onSimulationSaved?.();
    }
  };


  const handleExportPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("fr-FR");

    // Title
    doc.setFontSize(18);
    doc.text("Estimation impot 2025", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Revenus 2024 - Genere le ${date}`, 14, 27);
    doc.text("Impots Facile - Outil pedagogique", 14, 32);

    // Revenue section
    doc.setTextColor(0);
    doc.setFontSize(13);
    doc.text("Synthese des revenus", 14, 44);

    autoTable(doc, {
      startY: 48,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      body: [
        ["Revenu brut total", `${fmt(result.revenuBrut)} EUR`],
        ["Abattement(s)", `- ${fmt(result.abattements)} EUR`],
        ["Deductions", `- ${fmt(result.deductions)} EUR`],
        ["Revenu net imposable", `${fmt(result.revenuNetImposable)} EUR`],
        ["Nombre de parts", `${result.nbParts}`],
        ["Quotient familial", `${fmt(result.quotientFamilial)} EUR`],
      ],
    });

    // Tranches table
    const afterRevenu = (doc as any).lastAutoTable?.finalY ?? 100;
    doc.setFontSize(13);
    doc.text("Detail par tranche", 14, afterRevenu + 10);

    autoTable(doc, {
      startY: afterRevenu + 14,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      head: [["Tranche", "Taux", "Montant impose", "Impot"]],
      body: result.tranches.map((t) => [
        t.label,
        `${Math.round(t.taux * 100)}%`,
        `${fmt(t.montantImpose)} EUR`,
        `${fmt(t.impot)} EUR`,
      ]),
    });

    // Result section
    const afterTranches = (doc as any).lastAutoTable?.finalY ?? 160;
    doc.setFontSize(13);
    doc.text("Resultat", 14, afterTranches + 10);

    autoTable(doc, {
      startY: afterTranches + 14,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      body: [
        ["Impot brut", `${fmt(result.impotBrut)} EUR`],
        ...(result.reductions > 0 ? [["Reductions d'impot", `- ${fmt(result.reductions)} EUR`]] : []),
        ...(result.credits > 0 ? [["Credits d'impot", `- ${fmt(result.credits)} EUR`]] : []),
        ["Impot net estime", `${fmt(result.impotNet)} EUR`],
        ...(result.remboursement > 0 ? [["Remboursement estime", `${fmt(result.remboursement)} EUR`]] : []),
        ...(result.pfuMontant > 0 ? [["PFU (flat tax 30%)", `${fmt(result.pfuMontant)} EUR`]] : []),
        ["Taux moyen", `${result.tauxMoyen}%`],
        ["Taux marginal", `${result.tauxMarginal}%`],
        ["Taux de prelevement estime", `${result.tauxPrelevement}%`],
      ],
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Ce document est une estimation pedagogique. Pour votre declaration reelle, rendez-vous sur impots.gouv.fr",
      14,
      pageHeight - 10
    );

    doc.save(`simulation-impot-${date.replace(/\//g, "-")}.pdf`);
    toast.success("PDF téléchargé ✓");
  };

  const handleCopy = () => {
    const text = `Estimation impôt 2025 (revenus 2024)
Revenu brut : ${fmt(result.revenuBrut)} €
Abattements : -${fmt(result.abattements)} €
Déductions : -${fmt(result.deductions)} €
Revenu net imposable : ${fmt(result.revenuNetImposable)} €
Parts fiscales : ${result.nbParts}
Quotient familial : ${fmt(result.quotientFamilial)} €
Impôt brut : ${fmt(result.impotBrut)} €
Réductions : -${fmt(result.reductions)} €
Crédits : -${fmt(result.credits)} €
Impôt net estimé : ${fmt(result.impotNet)} €
Taux moyen : ${result.tauxMoyen}%
Taux marginal : ${result.tauxMarginal}%
Taux de prélèvement : ${result.tauxPrelevement}%${result.pfuMontant > 0 ? `\nPFU (flat tax) : ${fmt(result.pfuMontant)} €` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Résumé copié dans le presse-papier");
  };

  return (
    <div className="sticky top-6 space-y-4">
      <Card className="bg-background border border-border shadow-lg rounded-xl p-6 space-y-5">
        <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
          📊 Estimation de votre impôt
        </h2>

        {/* Revenue summary */}
        <div className="space-y-2 text-sm">
          <Row label="Revenu brut total" value={`${fmt(result.revenuBrut)} €`} />
          <Row label="Abattement(s) appliqué(s)" value={`- ${fmt(result.abattements)} €`} muted />
          <Row label="Déductions" value={`- ${fmt(result.deductions)} €`} muted />
          <hr className="border-border" />
          <Row label="Revenu net imposable" value={`${fmt(result.revenuNetImposable)} €`} bold />
          <Row label="Nombre de parts" value={`${result.nbParts} parts`} />
          <Row label="Quotient familial" value={`${fmt(result.quotientFamilial)} €`} />
        </div>

        {/* Tranches */}
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground mb-2">Détail par tranche</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="text-xs">Tranche</TableHead>
                  <TableHead className="text-xs text-right">Taux</TableHead>
                  <TableHead className="text-xs text-right">Imposé</TableHead>
                  <TableHead className="text-xs text-right">Impôt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.tranches.map((t, i) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="py-1.5">{t.label}</TableCell>
                    <TableCell className="py-1.5 text-right">{Math.round(t.taux * 100)}%</TableCell>
                    <TableCell className="py-1.5 text-right">{fmt(t.montantImpose)} €</TableCell>
                    <TableCell className="py-1.5 text-right font-medium">{fmt(t.impot)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <Row label="Impôt brut" value={`${fmt(result.impotBrut)} €`} bold />

        {/* Réductions & crédits */}
        {(result.reductions > 0 || result.credits > 0) && (
          <div className="space-y-1 text-sm">
            {result.reductions > 0 && (
              <Row label="Réductions d'impôt" value={`- ${fmt(result.reductions)} €`} muted />
            )}
            {result.credits > 0 && (
              <Row label="Crédits d'impôt" value={`- ${fmt(result.credits)} €`} muted />
            )}
          </div>
        )}

        {result.pfuMontant > 0 && (
          <div className="text-sm p-3 rounded-lg bg-secondary">
            <Row label="PFU (flat tax 30%)" value={`${fmt(result.pfuMontant)} €`} />
            <p className="text-xs text-muted-foreground mt-1">Prélevé séparément sur vos revenus de capitaux</p>
          </div>
        )}

        <hr className="border-border" />

        {/* Final result */}
        <div
          className={`rounded-xl p-4 text-center ${
            result.impotNet > 0
              ? "bg-destructive/10 border border-destructive/30"
              : "bg-green-50 border border-green-300"
          }`}
        >
          <p className="text-sm text-muted-foreground mb-1">Impôt net estimé</p>
          <p
            className={`font-heading text-3xl font-bold ${
              result.impotNet > 0 ? "text-destructive" : "text-green-600"
            }`}
          >
            {fmt(result.impotNet)} €
          </p>
          {result.remboursement > 0 && (
            <p className="text-green-600 font-medium mt-2 text-sm">
              💰 Vous seriez remboursé de {fmt(result.remboursement)} €
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-muted-foreground text-xs">Taux moyen</p>
            <p className="font-heading font-bold text-foreground">{result.tauxMoyen}%</p>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-muted-foreground text-xs">Taux marginal</p>
            <p className="font-heading font-bold text-foreground">{result.tauxMarginal}%</p>
          </div>
        </div>

        <div className="bg-secondary rounded-lg p-3 text-center text-sm">
          <p className="text-muted-foreground text-xs">Taux de prélèvement estimé</p>
          <p className="font-heading font-bold text-foreground text-lg">{result.tauxPrelevement}%</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1" /> Copier
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" className="flex-1" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
          <Button className="w-full" onClick={() => setSaveOpen(true)}>
            <Save className="h-4 w-4 mr-1" /> 💾 Sauvegarder cette simulation
          </Button>
        </div>

        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sauvegarder la simulation</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nom de la simulation</label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="ex: Estimation 2024"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !saveName.trim()}>
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      {/* Bloc pédagogique */}
      {(result.revenuBrut > 0 || result.impotNet > 0 || result.remboursement > 0) && (
        <Card className="bg-background border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-heading text-base font-bold text-foreground">💡 Ce que ça signifie pour toi</h3>
          <div className="text-sm text-muted-foreground space-y-2">
            {result.remboursement > 0 && (
              <p>🎉 Vous devriez recevoir un remboursement de l'État. Vérifiez bien que vous avez déclaré tous vos crédits d'impôt.</p>
            )}
            {result.impotNet === 0 && result.remboursement === 0 && result.revenuBrut > 0 && (
              <p>Vous n'êtes pas imposable. Pensez quand même à déclarer vos crédits d'impôt (garde d'enfant, emploi à domicile) — vous pouvez être remboursé !</p>
            )}
            {result.tauxMarginal === 11 && (
              <p>Tu es dans la 2ème tranche d'imposition. Pense à vérifier si tes frais réels dépassent 10% de ton salaire — si oui, les déclarer peut réduire ton impôt.</p>
            )}
            {result.tauxMarginal === 30 && (
              <p>Tu es dans la 3ème tranche. Les versements sur un PER peuvent réduire ton revenu imposable et te faire descendre dans une tranche inférieure.</p>
            )}
          </div>
        </Card>
      )}

      {/* Bloc modules suggérés */}
      {(formData.fraisReels || result.credits > 0 || formData.fonciers > 0) && (
        <Card className="bg-secondary/50 border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-heading text-base font-bold text-foreground">📚 Pour aller plus loin</h3>
          <div className="text-sm space-y-2">
            {formData.fraisReels && (
              <Link to="/module/module-4" className="flex items-center gap-2 text-primary hover:underline font-medium">
                Revoir le Module 4 : Frais déductibles <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {result.credits > 0 && (
              <Link to="/module/module-5" className="flex items-center gap-2 text-primary hover:underline font-medium">
                Revoir le Module 5 : Crédits d'impôt <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {formData.fonciers > 0 && (
              <Link to="/module/module-3" className="flex items-center gap-2 text-primary hover:underline font-medium">
                Revoir le Module 3 : Revenus à déclarer <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={`${bold ? "font-bold text-foreground" : ""} ${muted ? "text-muted-foreground" : "text-foreground"} tabular-nums`}>
        {value}
      </span>
    </div>
  );
}
