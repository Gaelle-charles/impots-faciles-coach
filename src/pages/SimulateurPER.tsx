import { useEffect, useMemo, useState } from "react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { chargerBaremeIR, type BaremeIR, type SituationFamiliale } from "@/lib/calcul-ir";
import {
  chargerPASS,
  determinerAnneePass,
  simulerPER,
  type AnneeVersement,
  type ProfilPER,
  type ResultatPER,
  type StatutPro,
} from "@/lib/calcul-per";

const fmtEur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

export default function SimulateurPER() {
  const [bareme, setBareme] = useState<BaremeIR | null>(null);
  const [pass, setPass] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [anneeVersement, setAnneeVersement] = useState<AnneeVersement>(2025);
  const [statut, setStatut] = useState<StatutPro>("salarie");
  const [revenuPro, setRevenuPro] = useState<number>(0);
  const [versement, setVersement] = useState<number>(0);
  const [situation, setSituation] = useState<SituationFamiliale>("celibataire");
  const [nbEnfants, setNbEnfants] = useState<number>(0);
  const [revenuNetFoyer, setRevenuNetFoyer] = useState<number>(0);

  const [resultat, setResultat] = useState<ResultatPER | null>(null);

  // Charger barème (1 fois)
  useEffect(() => {
    let cancelled = false;
    chargerBaremeIR(2025)
      .then((b) => { if (!cancelled) setBareme(b); })
      .catch((err) => { if (!cancelled) setLoadError(err.message ?? "Erreur barème"); });
    return () => { cancelled = true; };
  }, []);

  // Charger PASS selon statut + année
  const anneePass = useMemo(
    () => determinerAnneePass(statut, anneeVersement),
    [statut, anneeVersement]
  );

  useEffect(() => {
    let cancelled = false;
    setPass(null);
    chargerPASS(anneePass)
      .then((p) => { if (!cancelled) setPass(p); })
      .catch((err) => { if (!cancelled) setLoadError(err.message ?? "Erreur PASS"); });
    return () => { cancelled = true; };
  }, [anneePass]);

  const handleCalculer = () => {
    if (!bareme || !pass) return;
    const profil: ProfilPER = {
      statut,
      anneeVersement,
      revenuPro: statut === "sans_revenu" ? 0 : revenuPro,
      versementSouhaite: versement,
      foyer: { revenuNetImposable: revenuNetFoyer, situation, nbEnfants },
    };
    setResultat(simulerPER(profil, bareme, pass));
  };

  const chartData = useMemo(() => {
    if (!resultat) return [];
    const deductible = resultat.montantDeductible;
    const surplus = resultat.surplusNonDeductible;
    const plafondRestant = Math.max(0, resultat.plafondDeduction - deductible);
    return [
      {
        name: "Votre plafond",
        deductible,
        plafondRestant,
        surplus: 0,
      },
      {
        name: "Votre versement",
        deductible,
        plafondRestant: 0,
        surplus,
      },
    ];
  }, [resultat]);

  const ready = bareme && pass;

  return (
    <SimulateurLayout
      emoji="🐷"
      title="Simulateur PER / Épargne retraite"
      subtitle="Estimez votre plafond de déduction et l'économie d'impôt liée à un versement sur un Plan Épargne Retraite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-yellow-vivid/25 text-violet-deep border-yellow-vivid/40">
          Pour information — outil pédagogique
        </Badge>
      </div>

      {loadError && (
        <Card className="p-5 bg-destructive/5 border-destructive/40">
          <p className="text-sm text-destructive">
            Impossible de charger les données : {loadError}
          </p>
        </Card>
      )}

      {!loadError && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* ===== FORMULAIRE ===== */}
          <Card className="p-5 space-y-4 h-fit">
            <h2 className="font-heading text-lg font-bold text-foreground">Votre situation</h2>

            <div className="space-y-1.5">
              <Label className="text-sm">Année du versement</Label>
              <RadioGroup
                value={String(anneeVersement)}
                onValueChange={(v) => setAnneeVersement(Number(v) as AnneeVersement)}
                className="flex flex-col gap-2"
              >
                <label className="flex items-start gap-2 cursor-pointer">
                  <RadioGroupItem value="2025" id="annee-2025" className="mt-0.5" />
                  <span className="text-sm">
                    <strong>2025</strong> (à déclarer en 2026 — campagne en cours)
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <RadioGroupItem value="2026" id="annee-2026" className="mt-0.5" />
                  <span className="text-sm">
                    <strong>2026</strong> (à déclarer en 2027)
                  </span>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Votre statut professionnel</Label>
              <Select value={statut} onValueChange={(v) => setStatut(v as StatutPro)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salarie">Salarié (CDI, CDD, fonctionnaire)</SelectItem>
                  <SelectItem value="tns">Indépendant (BIC / BNC / gérant majoritaire SARL)</SelectItem>
                  <SelectItem value="sans_revenu">Sans revenu professionnel (retraité, étudiant, demandeur d'emploi)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statut !== "sans_revenu" && (
              <div className="space-y-1.5">
                <Label htmlFor="revenuPro" className="text-sm">
                  {statut === "salarie"
                    ? `Revenus professionnels nets de ${anneeVersement - 1} (€)`
                    : `Bénéfice imposable ${anneeVersement} (€)`}
                </Label>
                <Input
                  id="revenuPro"
                  type="number"
                  min={0}
                  max={2_000_000}
                  step={100}
                  inputMode="numeric"
                  value={revenuPro || ""}
                  onChange={(e) =>
                    setRevenuPro(Math.min(2_000_000, Math.max(0, Number(e.target.value) || 0)))
                  }
                  placeholder={statut === "salarie" ? "60000" : "80000"}
                />
                <p className="text-xs text-muted-foreground">
                  {statut === "salarie"
                    ? `Salaires nets imposables après abattement de 10 %. Pour un versement en ${anneeVersement}, on utilise vos revenus de ${anneeVersement - 1}.`
                    : "BIC, BNC ou rémunération de gérance majoritaire."}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="versement" className="text-sm">
                Versement souhaité sur le PER cette année (€)
              </Label>
              <Input
                id="versement"
                type="number"
                min={0}
                max={200_000}
                step={100}
                inputMode="numeric"
                value={versement || ""}
                onChange={(e) =>
                  setVersement(Math.min(200_000, Math.max(0, Number(e.target.value) || 0)))
                }
                placeholder="5000"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Situation familiale</Label>
              <Select value={situation} onValueChange={(v) => setSituation(v as SituationFamiliale)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="celibataire">Célibataire / divorcé(e) / veuf(ve)</SelectItem>
                  <SelectItem value="couple">Couple (marié ou pacsé)</SelectItem>
                  <SelectItem value="parent_isole">Parent isolé (case T)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enfants" className="text-sm">Nombre d'enfants à charge</Label>
              <Input
                id="enfants" type="number" min={0} max={10} step={1} inputMode="numeric"
                value={nbEnfants}
                onChange={(e) =>
                  setNbEnfants(Math.min(10, Math.max(0, Math.floor(Number(e.target.value) || 0))))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="revenuNetFoyer" className="text-sm">
                Revenu net imposable du foyer (€)
              </Label>
              <Input
                id="revenuNetFoyer"
                type="number"
                min={0}
                max={2_000_000}
                step={100}
                inputMode="numeric"
                value={revenuNetFoyer || ""}
                onChange={(e) =>
                  setRevenuNetFoyer(Math.min(2_000_000, Math.max(0, Number(e.target.value) || 0)))
                }
                placeholder="54000"
              />
              <p className="text-xs text-muted-foreground">
                Total des revenus du foyer après abattements. C'est sur ce montant que sera calculée
                votre économie d'impôt.
              </p>
            </div>

            <Button onClick={handleCalculer} disabled={!ready} className="w-full">
              Calculer mon économie d'impôt
            </Button>
          </Card>

          {/* ===== RÉSULTATS ===== */}
          <div className="space-y-5">
            {!resultat ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Renseignez vos informations puis cliquez sur{" "}
                <strong>Calculer mon économie d'impôt</strong> pour voir vos résultats.
              </Card>
            ) : (
              <>
                {/* Cartes synthétiques */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="p-5 bg-gradient-to-br from-primary/5 to-yellow-vivid/10 border-primary/30">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Votre plafond de déduction
                    </p>
                    <p className="font-heading text-3xl font-bold text-primary mt-1">
                      {fmtEur(resultat.plafondDeduction)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PASS {resultat.anneePassUtilise} retenu : {fmtEur(resultat.passUtilise)}
                    </p>
                  </Card>

                  <Card className="p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Économie d'impôt estimée
                    </p>
                    <p className="font-heading text-3xl font-bold text-foreground mt-1">
                      {fmtEur(resultat.economieImpot)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {resultat.montantDeductible > 0
                        ? `soit ${resultat.tauxEconomieReel.toFixed(1).replace(".", ",")} % de votre versement déductible`
                        : "aucun versement déductible"}
                    </p>
                  </Card>

                  <Card className="p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Montant déductible
                    </p>
                    <p className="font-heading text-3xl font-bold text-foreground mt-1">
                      {fmtEur(resultat.montantDeductible)}
                    </p>
                    {resultat.surplusNonDeductible > 0 ? (
                      <p className="text-xs text-destructive mt-1">
                        Surplus non déductible : {fmtEur(resultat.surplusNonDeductible)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Versement entièrement sous le plafond
                      </p>
                    )}
                  </Card>
                </div>

                {/* Message TMI 0 */}
                {resultat.tmi === 0 && (
                  <Card className="p-5 bg-yellow-vivid/15 border-yellow-vivid/40">
                    <p className="text-sm text-foreground leading-relaxed">
                      <strong>Vous êtes peu ou non imposable</strong> (TMI 0 %). La déduction d'un
                      versement PER n'a donc pas d'effet sur votre impôt cette année. D'autres
                      options existent dans ce cas (PER en mode capitalisation sans déduction,
                      assurance-vie, etc.).
                    </p>
                  </Card>
                )}

                {/* Détails dépliables */}
                <Card className="p-5">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="detail" className="border-0">
                      <AccordionTrigger className="text-sm font-semibold">
                        Comment ce calcul est-il fait ?
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 text-sm text-foreground">
                        <DetailRow label="Formule appliquée" value={resultat.formuleAppliquee} />
                        <DetailRow label={`PASS ${resultat.anneePassUtilise} retenu`} value={fmtEur(resultat.passUtilise)} />
                        <DetailRow label="Plafond minimum (10 % du PASS)" value={fmtEur(resultat.plafondMinimum)} />
                        <DetailRow label="Plafond maximum théorique" value={fmtEur(resultat.plafondMaximum)} />
                        <DetailRow label="Votre plafond personnel" value={fmtEur(resultat.plafondDeduction)} strong />
                        <DetailRow label="Votre versement" value={fmtEur(resultat.versementSouhaite)} />
                        <DetailRow label="Montant déductible" value={fmtEur(resultat.montantDeductible)} />
                        <DetailRow label="Surplus non déductible" value={fmtEur(resultat.surplusNonDeductible)} />
                        <DetailRow label="IR foyer sans versement" value={fmtEur(resultat.irSansPER)} />
                        <DetailRow label="IR foyer avec déduction" value={fmtEur(resultat.irAvecPER)} />
                        <DetailRow label="Économie d'impôt" value={fmtEur(resultat.economieImpot)} strong />
                        <DetailRow label="TMI du foyer" value={`${resultat.tmi} %`} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>

                {/* Graphique versement vs plafond */}
                <Card className="p-5">
                  <h3 className="font-heading text-base font-bold mb-4">
                    Votre versement face à votre plafond
                  </h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          tickFormatter={(v) => `${(v / 1000).toLocaleString("fr-FR")} k€`}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                        <RTooltip
                          formatter={(value: number, name: string) => [
                            `${Math.round(value).toLocaleString("fr-FR")} €`,
                            name,
                          ]}
                        />
                        <Bar dataKey="deductible" stackId="a" name="Déductible" radius={[6, 0, 0, 6]}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill="hsl(var(--primary))" />
                          ))}
                        </Bar>
                        <Bar dataKey="plafondRestant" stackId="a" name="Plafond restant" radius={[0, 6, 6, 0]}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill="hsl(var(--primary) / 0.25)" />
                          ))}
                        </Bar>
                        <Bar dataKey="surplus" stackId="a" name="Surplus non déductible" radius={[0, 6, 6, 0]}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill="hsl(var(--destructive) / 0.7)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs mt-2">
                    <span className="text-success">
                      {fmtEur(resultat.montantDeductible)} déductibles
                    </span>
                    {resultat.surplusNonDeductible > 0 && (
                      <span className="text-destructive">
                        {fmtEur(resultat.surplusNonDeductible)} non déductibles
                      </span>
                    )}
                  </div>
                </Card>

                {/* Section pédagogique */}
                <Card className="p-5 bg-secondary/40">
                  <p className="text-sm text-foreground leading-relaxed">
                    Le <strong>PER</strong> permet de déduire vos versements de votre revenu
                    imposable, dans la limite d'un plafond annuel. L'économie d'impôt dépend de
                    votre <strong>tranche marginale d'imposition (TMI)</strong> : plus elle est
                    élevée, plus la déduction est avantageuse. À l'inverse, si vous êtes peu ou non
                    imposable, la déduction a peu ou pas d'effet — d'autres options existent dans
                    ce cas.
                  </p>
                </Card>

                <Card className="p-4 bg-muted/40 border-dashed">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>À venir :</strong> cette simulation ne tient pas compte du report des
                    plafonds non utilisés des 5 années précédentes, ni de la mutualisation du
                    plafond entre conjoints. Ces fonctionnalités seront ajoutées prochainement.
                  </p>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-8 leading-relaxed">
        Calculs effectués selon le barème de l'impôt 2026 (revenus 2025), les valeurs du PASS
        publiées par la Sécurité Sociale et les articles{" "}
        <strong>163 quatervicies CGI</strong> (salariés) et <strong>154 bis CGI</strong>{" "}
        (indépendants). Cet outil est fourni à titre d'information uniquement et ne constitue pas
        un conseil fiscal. Pour toute situation particulière, consultez votre avis d'imposition ou
        un professionnel. Source : DGFiP.
      </p>
    </SimulateurLayout>
  );
}

function DetailRow({
  label, value, strong,
}: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-3 border-b border-border/40 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-heading font-bold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
