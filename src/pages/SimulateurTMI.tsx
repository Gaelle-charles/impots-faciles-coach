import { useEffect, useMemo, useState } from "react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  chargerBaremeIR,
  calculerIR,
  detaillerImpositionParTranche,
  type BaremeIR,
  type FoyerFiscal,
  type ResultatIR,
  type SituationFamiliale,
  type DetailTrancheImpot,
} from "@/lib/calcul-ir";

const fmtEur = (n: number) =>
  Math.round(n).toLocaleString("fr-FR") + " €";

export default function SimulateurTMI() {
  const [bareme, setBareme] = useState<BaremeIR | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [revenu, setRevenu] = useState<number>(0);
  const [situation, setSituation] = useState<SituationFamiliale>("celibataire");
  const [nbEnfants, setNbEnfants] = useState<number>(0);

  const [resultat, setResultat] = useState<ResultatIR | null>(null);
  const [detailTranches, setDetailTranches] = useState<DetailTrancheImpot[]>([]);

  useEffect(() => {
    let cancelled = false;
    chargerBaremeIR(2025)
      .then((b) => {
        if (!cancelled) setBareme(b);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message ?? "Erreur de chargement");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCalculer = () => {
    if (!bareme) return;
    const foyer: FoyerFiscal = {
      revenuNetImposable: revenu,
      situation,
      nbEnfants,
    };
    setResultat(calculerIR(foyer, bareme));
    setDetailTranches(detaillerImpositionParTranche(foyer, bareme));
  };

  const tmiAtteinte = resultat?.tmi ?? 0;

  const chartData = useMemo(
    () =>
      detailTranches.map((t) => ({
        name: `${t.taux} %`,
        ordre: t.ordre,
        taux: t.taux,
        revenuImpose: Math.round(t.revenuImpose),
        impot: Math.round(t.impot),
        traversee: t.revenuImpose > 0,
        estTMI: t.taux === tmiAtteinte && t.revenuImpose > 0,
      })),
    [detailTranches, tmiAtteinte]
  );

  return (
    <SimulateurLayout
      emoji="📊"
      title="Simulateur TMI vs taux effectif"
      subtitle="Comprenez la différence entre votre tranche marginale d'imposition et votre taux moyen d'imposition"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-yellow-vivid/25 text-violet-deep border-yellow-vivid/40">
          Pour information — outil pédagogique
        </Badge>
      </div>

      {loadError && (
        <Card className="p-5 bg-destructive/5 border-destructive/40">
          <p className="text-sm text-destructive">
            Impossible de charger le barème : {loadError}
          </p>
        </Card>
      )}

      {!loadError && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* ===== FORMULAIRE ===== */}
          <Card className="p-5 space-y-4 h-fit">
            <h2 className="font-heading text-lg font-bold text-foreground">Votre situation</h2>

            <div className="space-y-1.5">
              <Label htmlFor="revenu" className="text-sm">
                Revenu net imposable annuel (€)
              </Label>
              <Input
                id="revenu"
                type="number"
                min={0}
                max={1_000_000}
                step={100}
                inputMode="numeric"
                value={revenu || ""}
                onChange={(e) =>
                  setRevenu(Math.min(1_000_000, Math.max(0, Number(e.target.value) || 0)))
                }
                placeholder="30000"
              />
              <p className="text-xs text-muted-foreground">
                Total de vos revenus après abattements (10 % salaires, frais réels, etc.)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Situation familiale</Label>
              <Select value={situation} onValueChange={(v) => setSituation(v as SituationFamiliale)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celibataire">Célibataire / divorcé(e) / veuf(ve)</SelectItem>
                  <SelectItem value="couple">Couple (marié ou pacsé)</SelectItem>
                  <SelectItem value="parent_isole">Parent isolé (case T)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enfants" className="text-sm">
                Nombre d'enfants à charge
              </Label>
              <Input
                id="enfants"
                type="number"
                min={0}
                max={10}
                step={1}
                inputMode="numeric"
                value={nbEnfants}
                onChange={(e) =>
                  setNbEnfants(Math.min(10, Math.max(0, Math.floor(Number(e.target.value) || 0))))
                }
              />
            </div>

            <Button onClick={handleCalculer} disabled={!bareme} className="w-full">
              Calculer mon impôt
            </Button>
          </Card>

          {/* ===== RÉSULTATS ===== */}
          <div className="space-y-5">
            {!resultat ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Renseignez vos informations puis cliquez sur <strong>Calculer mon impôt</strong> pour
                voir vos résultats.
              </Card>
            ) : (
              <>
                {/* Cartes synthétiques */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="p-5 bg-gradient-to-br from-primary/5 to-yellow-vivid/10 border-primary/30">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Impôt net annuel
                    </p>
                    <p className="font-heading text-3xl font-bold text-primary mt-1">
                      {fmtEur(resultat.irNet)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      soit {fmtEur(resultat.irNet / 12)} par mois
                    </p>
                  </Card>

                  <Card className="p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      TMI (taux marginal)
                    </p>
                    <div className="mt-2">
                      <Badge className="bg-primary text-primary-foreground text-base px-3 py-1">
                        {resultat.tmi} %
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Taux appliqué à votre dernier euro
                    </p>
                  </Card>

                  <Card className="p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Taux moyen
                    </p>
                    <p className="font-heading text-3xl font-bold text-foreground mt-1">
                      {resultat.tauxMoyen.toFixed(2).replace(".", ",")} %
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Impôt / revenu total
                    </p>
                  </Card>
                </div>

                {/* Détails dépliables */}
                <Card className="p-5">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="detail" className="border-0">
                      <AccordionTrigger className="text-sm font-semibold">
                        Comment ce calcul est-il fait ?
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 text-sm text-foreground">
                        <DetailRow label="Nombre de parts du foyer" value={`${resultat.nbParts.toFixed(2)} parts`} />
                        <DetailRow label="IR brut avant plafonnement QF" value={fmtEur(resultat.irBrutAvantPlafondQF)} />
                        <DetailRow label="Réduction QF (avant plafond)" value={fmtEur(resultat.reductionQF)} />
                        <DetailRow
                          label="Réduction QF appliquée"
                          value={
                            resultat.plafondQFActif
                              ? `${fmtEur(resultat.reductionQFPlafonnee)} (plafonnée)`
                              : fmtEur(resultat.reductionQFPlafonnee)
                          }
                        />
                        <DetailRow label="IR brut après plafonnement" value={fmtEur(resultat.irBrutApresPlafondQF)} />
                        <DetailRow label="Décote" value={fmtEur(resultat.decote)} />
                        <DetailRow label="IR net final" value={fmtEur(resultat.irNet)} strong />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>

                {/* Graphique tranches */}
                <Card className="p-5">
                  <h3 className="font-heading text-base font-bold mb-4">
                    Répartition de votre revenu par tranche
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toLocaleString("fr-FR")} k€`} tick={{ fontSize: 11 }} />
                        <RTooltip
                          formatter={(value: number, _name, props) => [
                            `${Math.round(value).toLocaleString("fr-FR")} €`,
                            `Tranche ${props.payload.ordre} (${props.payload.taux} %)`,
                          ]}
                          labelFormatter={() => ""}
                        />
                        <Bar dataKey="revenuImpose" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={
                                !entry.traversee
                                  ? "hsl(var(--muted))"
                                  : entry.estTMI
                                  ? "hsl(var(--primary))"
                                  : "hsl(var(--primary) / 0.6)"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Section pédagogique */}
                <Card className="p-5 bg-secondary/40">
                  <p className="text-sm text-foreground leading-relaxed">
                    Le <strong>taux marginal (TMI)</strong> est le taux appliqué à votre dernier
                    euro gagné. Le <strong>taux moyen</strong> correspond à ce que représente
                    réellement votre impôt par rapport à l'ensemble de votre revenu. Ces deux taux
                    sont souvent confondus mais désignent des réalités différentes.
                  </p>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-8 leading-relaxed">
        Calculs effectués selon le barème de l'impôt 2026 (revenus 2025) fixé par la loi de finances
        pour 2026. Cet outil est fourni à titre d'information uniquement et ne constitue pas un
        conseil fiscal. Pour toute situation particulière, consultez votre avis d'imposition ou un
        professionnel. Source : DGFiP.
      </p>
    </SimulateurLayout>
  );
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-3 border-b border-border/40 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-heading font-bold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
