import { useEffect, useMemo, useState } from "react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  chargerConstantesPlusValues,
  simulerPlusValues,
  type ConstantesPlusValues,
  type ProfilPlusValues,
  type RegimeAbattement,
  type ResultatPlusValues,
} from "@/lib/calcul-plus-values";

const fmtEur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

export default function SimulateurPlusValues() {
  const [bareme, setBareme] = useState<BaremeIR | null>(null);
  const [constantes, setConstantes] = useState<ConstantesPlusValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [plusValues, setPlusValues] = useState<number>(0);
  const [moinsValuesAnnee, setMoinsValuesAnnee] = useState<number>(0);
  const [moinsValuesReportables, setMoinsValuesReportables] = useState<number>(0);

  const [acquisAvant2018, setAcquisAvant2018] = useState<"oui" | "non">("non");
  const [regime, setRegime] = useState<RegimeAbattement>("droit_commun");
  const [duree, setDuree] = useState<string>("4_a_8_ans");

  const [revenuFoyer, setRevenuFoyer] = useState<number>(0);
  const [situation, setSituation] = useState<SituationFamiliale>("celibataire");
  const [nbEnfants, setNbEnfants] = useState<number>(0);

  const [resultat, setResultat] = useState<ResultatPlusValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([chargerBaremeIR(2025), chargerConstantesPlusValues(2025)])
      .then(([b, c]) => {
        if (!cancelled) {
          setBareme(b);
          setConstantes(c);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message ?? "Erreur chargement");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dureeOptions = useMemo(() => {
    if (regime === "renforce_pme") {
      return [
        { value: "moins_1_an", label: "Moins d'1 an" },
        { value: "1_a_4_ans", label: "1 à 4 ans (abattement 50 %)" },
        { value: "4_a_8_ans", label: "4 à 8 ans (abattement 65 %)" },
        { value: "8_ans_et_plus", label: "8 ans et plus (abattement 85 %)" },
      ];
    }
    return [
      { value: "moins_2_ans", label: "Moins de 2 ans" },
      { value: "2_a_4_ans", label: "2 à 4 ans (abattement 50 %)" },
      { value: "4_a_8_ans", label: "4 à 8 ans (abattement 50 %)" },
      { value: "8_ans_et_plus", label: "8 ans et plus (abattement 65 %)" },
    ];
  }, [regime]);

  useEffect(() => {
    // Reset duree on regime change to a valid value
    if (regime === "renforce_pme" && duree === "moins_2_ans") setDuree("moins_1_an");
    if (regime !== "renforce_pme" && duree === "moins_1_an") setDuree("moins_2_ans");
  }, [regime, duree]);

  const handleCalculer = () => {
    if (!bareme || !constantes) return;
    const profil: ProfilPlusValues = {
      plusValuesAnnee: plusValues,
      moinsValuesAnnee,
      moinsValuesReportables,
      titresAvant2018: acquisAvant2018 === "oui",
      regimeAbattement: acquisAvant2018 === "oui" ? regime : "aucun",
      dureeDetention: duree as ProfilPlusValues["dureeDetention"],
      foyer: {
        revenuNetImposable: revenuFoyer,
        situation,
        nbEnfants,
      },
    };
    setResultat(simulerPlusValues(profil, bareme, constantes));
  };

  const chartData = useMemo(() => {
    if (!resultat) return [];
    return [
      { name: "PFU", impot: Math.round(resultat.pfu.impotTotal) },
      { name: "Barème", impot: Math.round(resultat.bareme.impotTotal) },
    ];
  }, [resultat]);

  const minImpot = resultat
    ? Math.min(resultat.pfu.impotTotal, resultat.bareme.impotTotal)
    : 0;

  return (
    <SimulateurLayout
      title="Simulateur Plus-values mobilières"
      subtitle="Comparez PFU (flat tax 31,4 %) vs option barème IR avec abattement pour durée de détention"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Pour information — outil pédagogique</Badge>
          <Badge variant="outline">Expert</Badge>
        </div>

        <Card className="p-5 bg-primary/5 border-primary/20">
          <p className="text-sm leading-relaxed">
            Ce simulateur compare l'imposition de votre plus-value mobilière
            (actions, fonds, obligations, cryptos) selon deux régimes : le PFU
            (flat tax à 31,4 %) et l'option pour le barème progressif de l'IR.
            Pour les titres acquis avant le 1<sup>er</sup> janvier 2018,
            l'option barème ouvre droit à un abattement pour durée de détention
            qui peut rendre ce régime plus avantageux. Important : la flat tax
            est passée de 30 % à 31,4 % au 1<sup>er</sup> janvier 2026 (hausse
            de la CSG).
          </p>
        </Card>

        {loadError && (
          <Card className="p-4 border-destructive bg-destructive/5 text-destructive text-sm">
            {loadError}
          </Card>
        )}

        {/* FORM */}
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Vos plus-values et moins-values</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Plus-values réalisées cette année (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={plusValues || ""}
                  onChange={(e) => setPlusValues(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Moins-values de l'année (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={moinsValuesAnnee || ""}
                  onChange={(e) => setMoinsValuesAnnee(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pertes sur cessions de titres dans l'année. Imputées en priorité sur les plus-values.
                </p>
              </div>
              <div>
                <Label>Moins-values reportables (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={moinsValuesReportables || ""}
                  onChange={(e) => setMoinsValuesReportables(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pertes accumulées sur les 10 dernières années non encore utilisées.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Caractéristiques des titres cédés</h3>
            <div>
              <Label>Date d'acquisition des titres</Label>
              <RadioGroup
                value={acquisAvant2018}
                onValueChange={(v) => setAcquisAvant2018(v as "oui" | "non")}
                className="mt-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="non" id="post2018" />
                  <Label htmlFor="post2018" className="font-normal cursor-pointer">
                    Acquis APRÈS le 1<sup>er</sup> janvier 2018
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="oui" id="pre2018" />
                  <Label htmlFor="pre2018" className="font-normal cursor-pointer">
                    Acquis AVANT le 1<sup>er</sup> janvier 2018
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {acquisAvant2018 === "oui" && (
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div>
                  <Label>Régime d'abattement</Label>
                  <RadioGroup
                    value={regime}
                    onValueChange={(v) => setRegime(v as RegimeAbattement)}
                    className="mt-2"
                  >
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="aucun" id="aucun" className="mt-1" />
                      <Label htmlFor="aucun" className="font-normal cursor-pointer">
                        Aucun abattement
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="droit_commun" id="dc" className="mt-1" />
                      <Label htmlFor="dc" className="font-normal cursor-pointer">
                        Abattement de droit commun (cas général)
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="renforce_pme" id="renforce" className="mt-1" />
                      <Label htmlFor="renforce" className="font-normal cursor-pointer">
                        Abattement renforcé PME (PME &lt; 10 ans à la souscription, IS, siège EEE)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Durée de détention</Label>
                  <Select value={duree} onValueChange={setDuree}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dureeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Votre foyer fiscal</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Revenu net imposable hors PV (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={revenuFoyer || ""}
                  onChange={(e) => setRevenuFoyer(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sert à déterminer votre tranche marginale d'imposition.
                </p>
              </div>
              <div>
                <Label>Situation familiale</Label>
                <Select value={situation} onValueChange={(v) => setSituation(v as SituationFamiliale)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celibataire">Célibataire</SelectItem>
                    <SelectItem value="couple">Couple (marié/PACS)</SelectItem>
                    <SelectItem value="parent_isole">Parent isolé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Enfants à charge</Label>
                <Input
                  type="number"
                  min={0}
                  value={nbEnfants || ""}
                  onChange={(e) => setNbEnfants(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleCalculer}
            disabled={!bareme || !constantes}
            className="w-full md:w-auto"
          >
            Comparer PFU et barème
          </Button>
        </Card>

        {/* RESULTS */}
        {resultat && (
          <div className="space-y-6">
            <Card
              className={`p-5 border-2 ${
                resultat.regimeFavorable === "pfu"
                  ? "border-primary bg-primary/5"
                  : resultat.regimeFavorable === "bareme"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-muted/30"
              }`}
            >
              <p className="font-semibold text-lg">
                {resultat.regimeFavorable === "pfu" &&
                  `Le PFU est plus avantageux : écart de ${fmtEur(Math.abs(resultat.ecart))}`}
                {resultat.regimeFavorable === "bareme" &&
                  `L'option barème est plus avantageuse : écart de ${fmtEur(Math.abs(resultat.ecart))}`}
                {resultat.regimeFavorable === "equivalent" &&
                  "Les deux régimes donnent un résultat équivalent (écart < 50 €)"}
              </p>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold mb-3">Plus-value nette imposable</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Plus-values brutes</span><span>{fmtEur(plusValues)}</span></div>
                <div className="flex justify-between"><span>− Moins-values année</span><span>{fmtEur(moinsValuesAnnee)}</span></div>
                <div className="flex justify-between"><span>− Moins-values reportées</span><span>{fmtEur(moinsValuesReportables)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                  <span>= Plus-value nette imposable</span><span>{fmtEur(resultat.plusValueNette)}</span>
                </div>
                {resultat.moinsValuesNonUtilisees > 0 && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Reste reportable sur les 10 prochaines années : {fmtEur(resultat.moinsValuesNonUtilisees)}
                  </p>
                )}
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-semibold mb-3">PFU (flat tax 31,4 %)</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Base imposable</span><span>{fmtEur(resultat.pfu.baseImposable)}</span></div>
                  <div className="flex justify-between"><span>IR (12,8 %)</span><span>{fmtEur(resultat.pfu.partIR)}</span></div>
                  <div className="flex justify-between"><span>Prélèvements sociaux (18,6 %)</span><span>{fmtEur(resultat.pfu.partPS)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2 text-base">
                    <span>Total à payer</span><span>{fmtEur(resultat.pfu.impotTotal)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold mb-3">Option barème IR</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Base imposable</span><span>{fmtEur(resultat.bareme.baseImposable)}</span></div>
                  <div className="flex justify-between">
                    <span>Abattement ({resultat.bareme.abattementApplique} %)</span>
                    <span>− {fmtEur(resultat.bareme.montantAbattement)}</span>
                  </div>
                  <div className="flex justify-between"><span>Base IR après abattement</span><span>{fmtEur(resultat.bareme.baseIRApresAbattement)}</span></div>
                  <div className="flex justify-between"><span>Impact sur votre IR</span><span>{fmtEur(resultat.bareme.impactIR)}</span></div>
                  <div className="flex justify-between"><span>PS (18,6 % sur base avant abattement)</span><span>{fmtEur(resultat.bareme.partPS)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2 text-base">
                    <span>Total à payer</span><span>{fmtEur(resultat.bareme.impotTotal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    Vous pourrez déduire {fmtEur(resultat.bareme.csgDeductibleAnneSuivante)} de CSG
                    (6,8 %) l'année suivante sur vos autres revenus.
                  </p>
                </div>
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="font-semibold mb-4">Comparaison visuelle</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RTooltip formatter={(v: number) => fmtEur(v)} />
                    <Bar dataKey="impot">
                      {chartData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.impot === Math.round(minImpot) ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 bg-muted/30">
              <h3 className="font-semibold mb-3">Points importants</h3>
              <ul className="text-sm space-y-2 list-disc pl-5">
                <li>
                  Les prélèvements sociaux (18,6 %) s'appliquent dans tous les cas,
                  même avec l'option barème : l'abattement ne réduit QUE l'impôt
                  sur le revenu.
                </li>
                <li>
                  L'option pour le barème vaut pour TOUS vos revenus du capital
                  de l'année (intérêts, dividendes…), pas seulement les plus-values.
                </li>
                <li>
                  Depuis la loi de finances pour 2026, l'option barème n'est plus
                  irrévocable : vous pouvez y renoncer ultérieurement si elle
                  s'avère défavorable.
                </li>
                <li>Les moins-values non utilisées sont reportables sur 10 ans.</li>
              </ul>
            </Card>

            <p className="text-xs text-muted-foreground">
              Calculs effectués selon le PFU 31,4 % issu de la LFSS 2026
              (n° 2025-1403) et le barème IR 2026. Sources : DGFiP,
              BOI-RPPM-RCM-20-15, BOI-RPPM-PVBMI. Cet outil est fourni à titre
              d'information et ne constitue pas un conseil fiscal.
            </p>
          </div>
        )}
      </div>
    </SimulateurLayout>
  );
}
