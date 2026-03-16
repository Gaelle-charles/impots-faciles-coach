import { SimulateurResult } from "@/hooks/useSimulateurFiscal";
import { SimulateurFormData } from "@/hooks/useSimulateurFiscal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, RotateCcw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

interface Props {
  result: SimulateurResult;
  onReset: () => void;
}

export default function SimulateurResultat({ result, onReset }: Props) {
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

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" /> Copier le résumé
          </Button>
          <Button variant="outline" className="flex-1" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
        </div>
      </Card>
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
