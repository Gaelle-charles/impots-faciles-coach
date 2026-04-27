import { useMemo, useState } from "react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  abattementSalaires,
  abattementPensions,
  calculerIRNet,
  calculerParts,
  fmtEur,
  fmtPct,
  MENTION_LEGALE_SIMULATEUR,
  PLAFOND_QF_DEMI_PART,
  type SituationFamiliale,
} from "@/lib/calculs-fiscaux";

const NumberField = ({
  id, label, value, onChange, hint,
}: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm">{label}</Label>
    <Input
      id={id}
      type="number"
      min={0}
      inputMode="numeric"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder="0"
    />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default function SimulateurIRBareme() {
  // --- Situation familiale ---
  const [situation, setSituation] = useState<SituationFamiliale>("celibataire");
  const [enfantsChargeComplete, setEnfantsCharge] = useState(0);
  const [enfantsGardeAlternee, setEnfantsGarde] = useState(0);
  const [parentIsole, setParentIsole] = useState(false);
  const [invaliditeContribuable, setInvaliditeContrib] = useState(false);
  const [invaliditeConjoint, setInvaliditeConjoint] = useState(false);
  const [enfantsInvalides, setEnfantsInvalides] = useState(0);

  // --- Revenus 2025 ---
  const [salairesNets, setSalairesNets] = useState(0); // déjà après abattement
  const [salairesBruts, setSalairesBruts] = useState(0); // brut → on applique abattement
  const [pensionsBrutes, setPensions] = useState(0);
  const [revenusFonciers, setFonciers] = useState(0);
  const [bicBnc, setBicBnc] = useState(0);
  const [dividendesBareme, setDividendes] = useState(0);
  const [autresRevenus, setAutres] = useState(0);

  // --- Charges déductibles ---
  const [pensionsAlim, setPensionsAlim] = useState(0);
  const [per, setPer] = useState(0);
  const [deficitFoncier, setDeficitFoncier] = useState(0);
  const [autresCharges, setAutresCharges] = useState(0);

  // --- Réductions / crédits ---
  const [reductions, setReductions] = useState(0);
  const [credits, setCredits] = useState(0);

  const partsResult = useMemo(() => calculerParts({
    situation,
    enfantsChargeComplete,
    enfantsGardeAlternee,
    parentIsole,
    invaliditeContribuable,
    invaliditeConjoint,
    enfantsInvalides,
  }), [situation, enfantsChargeComplete, enfantsGardeAlternee, parentIsole, invaliditeContribuable, invaliditeConjoint, enfantsInvalides]);

  const couple = situation === "marie_pacs";
  const partsBase = couple ? 2 : 1;

  const calc = useMemo(() => {
    // Étape 1 — Salaires nets imposables
    const salairesAbattus = salairesBruts > 0
      ? Math.max(0, salairesBruts - abattementSalaires(salairesBruts))
      : 0;
    const salairesTotaux = salairesNets + salairesAbattus;

    // Pensions
    const pensionsNettes = pensionsBrutes > 0
      ? Math.max(0, pensionsBrutes - abattementPensions(pensionsBrutes))
      : 0;

    const revenuBrutGlobal =
      salairesTotaux + pensionsNettes + revenusFonciers + bicBnc + dividendesBareme + autresRevenus;

    const totalCharges = pensionsAlim + per + deficitFoncier + autresCharges;
    const revenuImposable = Math.max(0, revenuBrutGlobal - totalCharges);

    const ir = calculerIRNet({
      parts: partsResult.total,
      partsBase,
      couple,
      revenuImposable,
      reductionsImpot: reductions,
      creditsImpot: credits,
    });

    return {
      salairesTotaux,
      pensionsNettes,
      revenuBrutGlobal,
      totalCharges,
      revenuImposable,
      ir,
      abatSalaires: salairesBruts > 0 ? abattementSalaires(salairesBruts) : 0,
      abatPensions: pensionsBrutes > 0 ? abattementPensions(pensionsBrutes) : 0,
    };
  }, [
    salairesNets, salairesBruts, pensionsBrutes, revenusFonciers, bicBnc, dividendesBareme, autresRevenus,
    pensionsAlim, per, deficitFoncier, autresCharges, reductions, credits,
    partsResult.total, partsBase, couple,
  ]);

  return (
    <SimulateurLayout
      emoji="🧮"
      title="Impôt sur le revenu — Barème 2026"
      subtitle="Calculez pas à pas votre IR 2026 (revenus 2025) selon le barème PLF 2026."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ========== FORMULAIRE ========== */}
        <div className="space-y-5">
          {/* Étape 1 — Situation */}
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Étape 1 — Situation personnelle</h2>

            <div className="space-y-2">
              <Label className="text-sm">Situation familiale</Label>
              <RadioGroup value={situation} onValueChange={(v) => setSituation(v as SituationFamiliale)} className="grid grid-cols-2 gap-2">
                {[
                  { v: "celibataire", l: "Célibataire" },
                  { v: "marie_pacs", l: "Marié(e) / PACS" },
                  { v: "divorce", l: "Divorcé(e)" },
                  { v: "veuf", l: "Veuf(ve)" },
                ].map((o) => (
                  <Label key={o.v} className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value={o.v} />
                    <span className="text-sm">{o.l}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                id="ec" label="Enfants à charge complète"
                value={enfantsChargeComplete} onChange={setEnfantsCharge}
                hint="+0,5 part (1er & 2e), +1 part (3e et +)"
              />
              <NumberField
                id="ga" label="Enfants en garde alternée"
                value={enfantsGardeAlternee} onChange={setEnfantsGarde}
                hint="+0,25 part chacun (1er & 2e)"
              />
              <NumberField
                id="ei" label="Enfants invalides"
                value={enfantsInvalides} onChange={setEnfantsInvalides}
                hint="+0,5 part chacun"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {(situation === "celibataire" || situation === "divorce" || situation === "veuf") && (
                <Label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={parentIsole} onCheckedChange={(v) => setParentIsole(!!v)} />
                  Parent isolé (case T) — +0,5 part pour le 1er enfant
                </Label>
              )}
              <Label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={invaliditeContribuable} onCheckedChange={(v) => setInvaliditeContrib(!!v)} />
                Invalidité titulaire carte (case P) — +0,5 part
              </Label>
              {couple && (
                <Label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={invaliditeConjoint} onCheckedChange={(v) => setInvaliditeConjoint(!!v)} />
                  Conjoint invalide (case F) — +0,5 part
                </Label>
              )}
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
              <span className="font-semibold text-foreground">Nombre de parts : </span>
              <span className="font-heading font-bold text-primary">{partsResult.total.toFixed(2)} parts</span>
              <span className="text-muted-foreground"> ({partsResult.partsBase} base + {partsResult.partsEnfants.toFixed(2)} enfants + {partsResult.partsSpeciales.toFixed(2)} spéciales)</span>
            </div>
          </Card>

          {/* Étape 2 — Revenus */}
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Étape 2 — Revenus 2025</h2>
            <p className="text-xs text-muted-foreground">
              Renseignez vos salaires <strong>nets imposables</strong> (abattement 10 % déjà fait) <strong>OU</strong> vos salaires bruts (l'abattement sera calculé : min 502 €, max 14 426 €).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField id="sn" label="Salaires nets imposables (€)" value={salairesNets} onChange={setSalairesNets} />
              <NumberField id="sb" label="OU salaires bruts (€)" value={salairesBruts} onChange={setSalairesBruts}
                hint={salairesBruts > 0 ? `Abattement : ${fmtEur(calc.abatSalaires)}` : undefined} />
              <NumberField id="pe" label="Pensions retraite brutes (€)" value={pensionsBrutes} onChange={setPensions}
                hint={pensionsBrutes > 0 ? `Abattement 10 % : ${fmtEur(calc.abatPensions)}` : "min 422 €, max 4 321 €"} />
              <NumberField id="fo" label="Revenus fonciers nets (€)" value={revenusFonciers} onChange={setFonciers} />
              <NumberField id="bb" label="BIC / BNC (€)" value={bicBnc} onChange={setBicBnc} />
              <NumberField id="di" label="Dividendes (option barème) (€)" value={dividendesBareme} onChange={setDividendes} />
              <NumberField id="au" label="Autres revenus imposables (€)" value={autresRevenus} onChange={setAutres} />
            </div>
          </Card>

          {/* Étape 3 — Charges */}
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Étape 3 — Charges déductibles</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumberField id="pa" label="Pensions alimentaires versées (€)" value={pensionsAlim} onChange={setPensionsAlim}
                hint="Enfant majeur : max 6 674 €/an" />
              <NumberField id="pr" label="Versements PER déductibles (€)" value={per} onChange={setPer} />
              <NumberField id="df" label="Déficit foncier (€)" value={deficitFoncier} onChange={setDeficitFoncier} />
              <NumberField id="ac" label="Autres charges (€)" value={autresCharges} onChange={setAutresCharges} />
            </div>
          </Card>

          {/* Étape 4 — Réductions / crédits */}
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Étape 4 — Réductions & crédits d'impôt</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumberField id="rd" label="Réductions d'impôt (€)" value={reductions} onChange={setReductions}
                hint="Dons, Pinel, FCPI…" />
              <NumberField id="cr" label="Crédits d'impôt (€)" value={credits} onChange={setCredits}
                hint="Emploi à domicile, garde enfants…" />
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Détaillez vos crédits & réductions avec le <a href="/simulateur/credits-reductions" className="text-primary underline">simulateur dédié</a>.
            </p>
          </Card>
        </div>

        {/* ========== RÉSULTAT ========== */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <Card className="p-5 bg-gradient-to-br from-primary/5 to-yellow-vivid/10 border-primary/30 space-y-3">
            <h2 className="font-heading text-base font-bold text-foreground">💰 Votre impôt 2026</h2>
            <Row label="Revenu net imposable" value={fmtEur(calc.revenuImposable)} />
            <Row label="Quotient familial" value={`${partsResult.total.toFixed(2)} parts`} />
            <Row label="IR brut (barème)" value={fmtEur(calc.ir.irBareme)} />
            {calc.ir.plafonnementQF.plafonne && (
              <Row label="Plafonnement QF" value={`−${fmtEur(calc.ir.plafonnementQF.avantage - calc.ir.plafonnementQF.plafond)}`} muted />
            )}
            {calc.ir.decote > 0 && <Row label="Décote" value={`−${fmtEur(calc.ir.decote)}`} muted />}
            {calc.ir.reductions > 0 && <Row label="Réductions" value={`−${fmtEur(calc.ir.reductions)}`} muted />}
            {calc.ir.credits > 0 && <Row label="Crédits" value={`−${fmtEur(calc.ir.credits)}`} muted />}
            <hr className="border-border" />
            <div className={`rounded-xl p-4 text-center ${calc.ir.irNet >= 0 ? "bg-destructive/10 border border-destructive/30" : "bg-green-50 border border-green-300"}`}>
              <p className="text-xs text-muted-foreground mb-1">{calc.ir.irNet >= 0 ? "🎯 IR net dû" : "💰 Remboursement estimé"}</p>
              <p className={`font-heading text-3xl font-bold ${calc.ir.irNet >= 0 ? "text-destructive" : "text-green-600"}`}>
                {fmtEur(Math.abs(calc.ir.irNet))}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="bg-secondary rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Taux moyen</p>
                <p className="font-heading font-bold">{fmtPct(calc.ir.tauxMoyen)}</p>
              </div>
              <div className="bg-secondary rounded-lg p-2">
                <p className="text-xs text-muted-foreground">TMI</p>
                <p className="font-heading font-bold">{calc.ir.tmi} %</p>
              </div>
            </div>
          </Card>

          {/* Détail tranche par tranche */}
          {calc.ir.detailBareme.tranches.length > 0 && (
            <Card className="p-4">
              <h3 className="font-heading text-sm font-bold mb-2">Détail par tranche</h3>
              <div className="space-y-1 text-xs">
                {calc.ir.detailBareme.tranches.map((t, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {fmtPct(t.taux * 100, 0)} : {fmtEur(t.montantImpose)}
                    </span>
                    <span className="font-medium">{fmtEur(t.impotPart * partsResult.total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ========== COMPRENDRE ========== */}
      <Card className="p-5 mt-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-3">📚 Comprendre le calcul</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="bareme">
            <AccordionTrigger>Le barème progressif PLF 2026</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>L'IR 2026 (sur revenus 2025) applique 5 tranches au revenu <strong>par part</strong> :</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>0 % jusqu'à 11 600 €</li>
                <li>11 % de 11 601 € à 29 579 €</li>
                <li>30 % de 29 580 € à 84 577 €</li>
                <li>41 % de 84 578 € à 181 917 €</li>
                <li>45 % au-delà de 181 917 €</li>
              </ul>
              <p>L'impôt obtenu sur le QF est ensuite multiplié par le nombre de parts du foyer.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="qf">
            <AccordionTrigger>Le quotient familial et son plafond</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Le QF abaisse votre TMI grâce aux personnes à charge. Mais l'avantage est plafonné à <strong>{fmtEur(PLAFOND_QF_DEMI_PART)} par demi-part supplémentaire</strong> en 2026 (soit 3 518 € par part entière).
              </p>
              <p>
                Si l'économie théorique dépasse ce plafond, l'administration applique un IR = (IR sans enfants) − plafond.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="decote">
            <AccordionTrigger>La décote pour faibles revenus</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Célibataire</strong> : si IR brut &lt; 1 929 € → décote = 873 € − (IR brut × 45,25 %).<br />
                <strong>Couple</strong> : si IR brut &lt; 3 191 € → décote = 1 444 € − (IR brut × 45,25 %).
              </p>
              <p>La décote ne peut jamais dépasser l'IR dû.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="abattements">
            <AccordionTrigger>Les abattements 10 %</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Salaires</strong> : 10 % automatique, plancher 502 €, plafond 14 426 €.<br />
                <strong>Pensions</strong> : 10 % automatique, plancher 422 €, plafond 4 321 € par pensionné.
              </p>
              <p>Si vos frais réels dépassent l'abattement, vous pouvez opter pour leur déduction.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="diff">
            <AccordionTrigger>Réduction vs Crédit d'impôt</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Réduction</strong> : diminue l'IR, mais l'excédent est <em>perdu</em> si IR &lt; réduction.</p>
              <p><strong>Crédit</strong> : diminue l'IR ET l'excédent est <em>remboursé</em> par l'État (même si IR = 0).</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground italic">{MENTION_LEGALE_SIMULATEUR}</p>
    </SimulateurLayout>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={`tabular-nums ${muted ? "text-muted-foreground" : "font-medium text-foreground"}`}>{value}</span>
    </div>
  );
}
