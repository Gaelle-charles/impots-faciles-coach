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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { chargerBaremeIR, type BaremeIR } from "@/lib/calcul-ir";
import {
  comparerScenarios,
  type ProfilCouple,
  type ResultatOptimisationCouple,
} from "@/lib/calcul-optimisation-couple";

const fmtEur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

export default function SimulateurOptimisationCouple() {
  const [bareme, setBareme] = useState<BaremeIR | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [prenom1, setPrenom1] = useState("");
  const [prenom2, setPrenom2] = useState("");
  const [revenu1, setRevenu1] = useState<number>(0);
  const [revenu2, setRevenu2] = useState<number>(0);
  const [nbEnfants, setNbEnfants] = useState<number>(0);
  const [nbEnfantsHandicapes, setNbEnfantsHandicapes] = useState<number>(0);

  const [resultat, setResultat] = useState<ResultatOptimisationCouple | null>(null);

  useEffect(() => {
    let cancelled = false;
    chargerBaremeIR(2025)
      .then((b) => { if (!cancelled) setBareme(b); })
      .catch((err) => { if (!cancelled) setLoadError(err.message ?? "Erreur barème"); });
    return () => { cancelled = true; };
  }, []);

  const labelD1 = prenom1.trim() || "Déclarant 1";
  const labelD2 = prenom2.trim() || "Déclarant 2";

  const handleCalculer = () => {
    if (!bareme) return;
    const profil: ProfilCouple = {
      declarant1: { prenom: prenom1, revenuNetImposable: revenu1 },
      declarant2: { prenom: prenom2, revenuNetImposable: revenu2 },
      nbEnfants,
      nbEnfantsHandicapes,
    };
    setResultat(comparerScenarios(profil, bareme));
  };

  const chartData = useMemo(() => {
    if (!resultat) return [];
    return [
      { name: "Commune", ir: resultat.scenarioCommun.ir.irNet },
      { name: "Séparée", ir: resultat.scenarioSepare.irTotal },
    ];
  }, [resultat]);

  const minIR = resultat
    ? Math.min(resultat.scenarioCommun.ir.irNet, resultat.scenarioSepare.irTotal)
    : 0;

  return (
    <SimulateurLayout
      emoji="💜"
      title="Comparaison fiscale : mariage/PACS vs concubinage"
      subtitle="Comparez l'impôt sur le revenu d'un couple selon le mode de déclaration"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-yellow-vivid/25 text-violet-deep border-yellow-vivid/40">
          Pour information — outil pédagogique
        </Badge>
      </div>

      <Card className="p-5 bg-secondary/40">
        <p className="text-sm text-foreground leading-relaxed">
          Ce simulateur compare votre imposition selon deux scénarios : une déclaration commune
          (mariage ou PACS) et deux déclarations séparées (concubinage déclaré). L'écart dépend
          principalement de l'équilibre des revenus entre les deux personnes et de la présence
          d'enfants. Ce résultat est fourni à titre indicatif et ne constitue pas une
          recommandation de changement de situation matrimoniale.
        </p>
      </Card>

      {loadError && (
        <Card className="p-5 bg-destructive/5 border-destructive/40">
          <p className="text-sm text-destructive">Impossible de charger les données : {loadError}</p>
        </Card>
      )}

      {!loadError && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* ===== FORMULAIRE ===== */}
          <Card className="p-5 space-y-5 h-fit">
            <h2 className="font-heading text-lg font-bold text-foreground">Votre situation</h2>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">Déclarant 1</h3>
              <div className="space-y-1.5">
                <Label htmlFor="prenom1" className="text-sm">Prénom (optionnel)</Label>
                <Input
                  id="prenom1" maxLength={30} value={prenom1}
                  onChange={(e) => setPrenom1(e.target.value)} placeholder="Alex"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revenu1" className="text-sm">Revenu net imposable annuel (€)</Label>
                <Input
                  id="revenu1" type="number" min={0} max={2_000_000} step={100} inputMode="numeric"
                  value={revenu1 || ""}
                  onChange={(e) => setRevenu1(Math.min(2_000_000, Math.max(0, Number(e.target.value) || 0)))}
                  placeholder="60000"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">Déclarant 2</h3>
              <div className="space-y-1.5">
                <Label htmlFor="prenom2" className="text-sm">Prénom (optionnel)</Label>
                <Input
                  id="prenom2" maxLength={30} value={prenom2}
                  onChange={(e) => setPrenom2(e.target.value)} placeholder="Camille"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revenu2" className="text-sm">Revenu net imposable annuel (€)</Label>
                <Input
                  id="revenu2" type="number" min={0} max={2_000_000} step={100} inputMode="numeric"
                  value={revenu2 || ""}
                  onChange={(e) => setRevenu2(Math.min(2_000_000, Math.max(0, Number(e.target.value) || 0)))}
                  placeholder="40000"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">Foyer</h3>
              <div className="space-y-1.5">
                <Label htmlFor="nbEnfants" className="text-sm">Enfants à charge communs</Label>
                <Input
                  id="nbEnfants" type="number" min={0} max={10} step={1} inputMode="numeric"
                  value={nbEnfants}
                  onChange={(e) => {
                    const v = Math.min(10, Math.max(0, Math.floor(Number(e.target.value) || 0)));
                    setNbEnfants(v);
                    if (nbEnfantsHandicapes > v) setNbEnfantsHandicapes(v);
                  }}
                />
              </div>
              {nbEnfants > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="nbH" className="text-sm">Dont enfants en situation de handicap</Label>
                  <Input
                    id="nbH" type="number" min={0} max={nbEnfants} step={1} inputMode="numeric"
                    value={nbEnfantsHandicapes}
                    onChange={(e) => setNbEnfantsHandicapes(Math.min(nbEnfants, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
                  />
                </div>
              )}
            </div>

            <Button onClick={handleCalculer} disabled={!bareme} className="w-full">
              Comparer les deux scénarios
            </Button>
          </Card>

          {/* ===== RÉSULTATS ===== */}
          <div className="space-y-5">
            {!resultat ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Renseignez les informations puis cliquez sur{" "}
                <strong>Comparer les deux scénarios</strong> pour voir le résultat.
              </Card>
            ) : (
              <>
                {/* Bandeau verdict */}
                {resultat.declarationFavorable === "commune" && (
                  <Card className="p-5 bg-gradient-to-br from-primary/10 to-yellow-vivid/15 border-primary/40">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Verdict</p>
                    <p className="font-heading text-xl font-bold text-primary mt-1">
                      Déclaration commune plus avantageuse : économie de {fmtEur(resultat.ecartIR)} par an
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Soit {resultat.ecartPourcentage.toFixed(1).replace(".", ",")} % d'écart avec la déclaration séparée
                    </p>
                  </Card>
                )}
                {resultat.declarationFavorable === "separee" && (
                  <Card className="p-5 bg-gradient-to-br from-orange-100/40 to-orange-200/30 border-orange-300/50 dark:from-orange-900/20 dark:to-orange-800/15 dark:border-orange-700/40">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Verdict</p>
                    <p className="font-heading text-xl font-bold text-foreground mt-1">
                      Déclarations séparées plus avantageuses : écart de {fmtEur(Math.abs(resultat.ecartIR))} par an
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Soit {resultat.ecartPourcentage.toFixed(1).replace(".", ",")} % d'écart avec la déclaration commune
                    </p>
                  </Card>
                )}
                {resultat.declarationFavorable === "equivalent" && (
                  <Card className="p-5 bg-muted/40">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Verdict</p>
                    <p className="font-heading text-xl font-bold text-foreground mt-1">
                      Les deux scénarios sont quasiment équivalents (écart &lt; 50 €)
                    </p>
                  </Card>
                )}

                {/* Comparaison côte à côte */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Commune */}
                  <Card className="p-5 space-y-2">
                    <h3 className="font-heading text-base font-bold text-primary">
                      Déclaration commune (mariage/PACS)
                    </h3>
                    <DetailRow label="Revenu total" value={fmtEur(resultat.scenarioCommun.revenuNetImposableTotal)} />
                    <DetailRow label="Nombre de parts" value={resultat.scenarioCommun.nbParts.toLocaleString("fr-FR")} />
                    <DetailRow label="IR brut avant plafond QF" value={fmtEur(resultat.scenarioCommun.ir.irBrutAvantPlafondQF)} />
                    <DetailRow
                      label="Plafonnement QF"
                      value={
                        resultat.scenarioCommun.ir.plafondQFActif
                          ? `Actif (${fmtEur(resultat.scenarioCommun.ir.reductionQFPlafonnee)} plafonnés)`
                          : "Non actif"
                      }
                    />
                    <DetailRow label="Décote" value={fmtEur(resultat.scenarioCommun.ir.decote)} />
                    <div className="pt-2 mt-2 border-t border-border/40">
                      <p className="text-xs text-muted-foreground">IR net annuel</p>
                      <p className="font-heading text-2xl font-bold text-primary">
                        {fmtEur(resultat.scenarioCommun.ir.irNet)}
                      </p>
                    </div>
                  </Card>

                  {/* Séparée */}
                  <Card className="p-5 space-y-2">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Déclarations séparées (concubinage)
                    </h3>
                    <div className="space-y-1 pb-2 border-b border-border/40">
                      <p className="text-sm font-semibold">{labelD1}</p>
                      <DetailRow label="Revenu" value={fmtEur(revenu1)} small />
                      <DetailRow label="Parts" value={resultat.scenarioSepare.declarant1.ir.nbParts.toLocaleString("fr-FR")} small />
                      <DetailRow label="Enfants rattachés" value={String(resultat.scenarioSepare.declarant1.nbEnfantsRattaches)} small />
                      <DetailRow label="IR net" value={fmtEur(resultat.scenarioSepare.declarant1.ir.irNet)} small />
                    </div>
                    <div className="space-y-1 pb-2 border-b border-border/40">
                      <p className="text-sm font-semibold">{labelD2}</p>
                      <DetailRow label="Revenu" value={fmtEur(revenu2)} small />
                      <DetailRow label="Parts" value={resultat.scenarioSepare.declarant2.ir.nbParts.toLocaleString("fr-FR")} small />
                      <DetailRow label="Enfants rattachés" value={String(resultat.scenarioSepare.declarant2.nbEnfantsRattaches)} small />
                      <DetailRow label="IR net" value={fmtEur(resultat.scenarioSepare.declarant2.ir.irNet)} small />
                    </div>
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground">IR total foyer</p>
                      <p className="font-heading text-2xl font-bold text-foreground">
                        {fmtEur(resultat.scenarioSepare.irTotal)}
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Graphique */}
                <Card className="p-5">
                  <h3 className="font-heading text-base font-bold mb-4">Comparaison visuelle</h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                        <YAxis
                          tickFormatter={(v) => `${(v / 1000).toLocaleString("fr-FR")} k€`}
                          tick={{ fontSize: 11 }}
                        />
                        <RTooltip
                          formatter={(value: number) => [`${Math.round(value).toLocaleString("fr-FR")} €`, "IR net"]}
                        />
                        <Bar dataKey="ir" radius={[6, 6, 0, 0]}>
                          {chartData.map((d, i) => (
                            <Cell
                              key={i}
                              fill={d.ir === minIR ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Détails dépliables */}
                <Card className="p-5">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="comment" className="border-0">
                      <AccordionTrigger className="text-sm font-semibold">
                        Comment ce calcul est-il fait ?
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 text-sm text-foreground leading-relaxed">
                        <p>
                          L'impôt sur le revenu utilise le <strong>quotient familial</strong> : le
                          revenu imposable est divisé par le nombre de parts (2 pour un couple
                          marié/pacsé, +0,5 par enfant pour les 2 premiers, +1 à partir du 3e).
                          L'impôt est calculé sur ce quotient puis multiplié par le nombre de parts.
                        </p>
                        <p>
                          L'avantage lié aux enfants est{" "}
                          <strong>plafonné</strong> à un montant fixé par la loi de finances pour
                          chaque demi-part supplémentaire.
                        </p>
                        <p>
                          Pour la déclaration séparée, le simulateur teste plusieurs répartitions
                          des enfants entre les deux déclarants et retient celle qui minimise
                          l'impôt total.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>

                {/* Encadré pédagogique fixe */}
                <Card className="p-5 bg-secondary/40 border-dashed">
                  <p className="text-sm text-foreground leading-relaxed">
                    Le choix entre mariage/PACS et concubinage repose sur de nombreux facteurs au-delà
                    du seul aspect fiscal : succession, protection du conjoint, droits sociaux,
                    séparation. Ce simulateur ne traite que l'impact sur l'impôt sur le revenu. Pour
                    une décision personnelle, consultez les sources officielles ou un professionnel.
                  </p>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-8 leading-relaxed">
        Calculs effectués selon le barème de l'impôt 2026 (revenus 2025). Cet outil est fourni à titre
        d'information uniquement et ne constitue pas un conseil fiscal. Pour toute situation
        particulière, consultez votre avis d'imposition ou un professionnel. Source : DGFiP.
      </p>
    </SimulateurLayout>
  );
}

function DetailRow({
  label, value, small,
}: { label: string; value: string; small?: boolean }) {
  return (
    <div className={`flex justify-between items-baseline gap-3 ${small ? "text-xs" : "text-sm"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
