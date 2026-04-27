import { useMemo, useState } from "react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  appliquerPlafonnementQF,
  calculerDecote,
  calculerIRBareme,
  calculerParts,
  fmtEur,
  MENTION_LEGALE_SIMULATEUR,
  PLAFOND_QF_DEMI_PART,
  type SituationFamiliale,
} from "@/lib/calculs-fiscaux";

export default function SimulateurQuotientFamilial() {
  const [situation, setSituation] = useState<SituationFamiliale>("celibataire");
  const [revenuImposable, setRevenu] = useState(60000);

  const [enfantsCharge, setEnfantsCharge] = useState(0);
  const [enfantsAlternee, setEnfantsAlternee] = useState(0);
  const [enfantsInvalides, setEnfantsInvalides] = useState(0);
  const [parentIsole, setParentIsole] = useState(false);
  const [invaliditeContrib, setInvContrib] = useState(false);
  const [invaliditeConjoint, setInvConjoint] = useState(false);

  const couple = situation === "marie_pacs";
  const partsBase = couple ? 2 : 1;

  const parts = useMemo(() => calculerParts({
    situation,
    enfantsChargeComplete: enfantsCharge,
    enfantsGardeAlternee: enfantsAlternee,
    parentIsole,
    invaliditeContribuable: invaliditeContrib,
    invaliditeConjoint: invaliditeConjoint,
    enfantsInvalides,
  }), [situation, enfantsCharge, enfantsAlternee, parentIsole, invaliditeContrib, invaliditeConjoint, enfantsInvalides]);

  const calc = useMemo(() => {
    const irSansEnfants = calculerIRBareme(revenuImposable, partsBase);
    const decoteSans = calculerDecote(irSansEnfants.impotBrut, couple);
    const irNetSans = Math.max(0, irSansEnfants.impotBrut - decoteSans);

    const irAvecEnfants = calculerIRBareme(revenuImposable, parts.total);
    const decoteAvec = calculerDecote(irAvecEnfants.impotBrut, couple);
    const irNetAvecAvantPlafond = Math.max(0, irAvecEnfants.impotBrut - decoteAvec);

    const plaf = appliquerPlafonnementQF(revenuImposable, parts.total, partsBase);
    const decoteApresPlaf = calculerDecote(plaf.irApres, couple);
    const irNetApresPlafond = Math.max(0, plaf.irApres - decoteApresPlaf);

    const gain = Math.max(0, irNetSans - irNetApresPlafond);
    const gainParEnfant = (parts.total > partsBase) ? gain / Math.max(1, (enfantsCharge + enfantsAlternee + enfantsInvalides)) : 0;

    return {
      irSansEnfants: irNetSans,
      irAvecEnfantsAvantPlafond: irNetAvecAvantPlafond,
      irApresPlafond: irNetApresPlafond,
      plafond: plaf.plafond,
      avantageTheorique: plaf.avantageTheorique,
      plafonne: plaf.plafonne,
      gain,
      gainParEnfant,
      manqueAGagner: plaf.plafonne ? plaf.avantageTheorique - plaf.plafond : 0,
    };
  }, [revenuImposable, parts.total, partsBase, couple, enfantsCharge, enfantsAlternee, enfantsInvalides]);

  return (
    <SimulateurLayout
      emoji="👪"
      title="Quotient familial — IR 2026"
      subtitle="Calculez vos parts fiscales et le gain réel apporté par votre foyer (avec plafonnement)."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Votre situation</h2>

            <div className="space-y-2">
              <Label>Situation familiale</Label>
              <RadioGroup value={situation} onValueChange={(v) => setSituation(v as SituationFamiliale)} className="grid grid-cols-2 gap-2">
                {[
                  { v: "celibataire", l: "Célibataire (1 part)" },
                  { v: "marie_pacs", l: "Marié/PACS (2 parts)" },
                  { v: "divorce", l: "Divorcé(e) (1 part)" },
                  { v: "veuf", l: "Veuf(ve) (1 part)" },
                ].map((o) => (
                  <Label key={o.v} className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value={o.v} />
                    <span className="text-sm">{o.l}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rni">Revenu net imposable annuel (€)</Label>
              <Input id="rni" type="number" min={0} value={revenuImposable || ""} onChange={(e) => setRevenu(Number(e.target.value) || 0)} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Enfants à charge</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Charge complète</Label>
                <Input type="number" min={0} value={enfantsCharge || ""} onChange={(e) => setEnfantsCharge(Number(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">+0,5 (1er & 2e), +1 (3e+)</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Garde alternée</Label>
                <Input type="number" min={0} value={enfantsAlternee || ""} onChange={(e) => setEnfantsAlternee(Number(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">+0,25 (1er & 2e)</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Invalides</Label>
                <Input type="number" min={0} value={enfantsInvalides || ""} onChange={(e) => setEnfantsInvalides(Number(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">+0,5 chacun</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg font-bold text-foreground">Situations spéciales</h2>
            {(situation === "celibataire" || situation === "divorce" || situation === "veuf") && (
              <Label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={parentIsole} onCheckedChange={(v) => setParentIsole(!!v)} />
                Parent isolé (case T) — +0,5 part pour le 1er enfant
              </Label>
            )}
            <Label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={invaliditeContrib} onCheckedChange={(v) => setInvContrib(!!v)} />
              Invalidité titulaire (case P) — +0,5 part
            </Label>
            {couple && (
              <Label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={invaliditeConjoint} onCheckedChange={(v) => setInvConjoint(!!v)} />
                Conjoint invalide (case F) — +0,5 part
              </Label>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <Card className="p-5 bg-gradient-to-br from-primary/5 to-yellow-vivid/10 border-primary/30 space-y-3">
            <h2 className="font-heading text-base font-bold">📊 Récapitulatif des parts</h2>
            <Row label="Parts de base" value={parts.partsBase.toFixed(2)} />
            <Row label="+ Enfants" value={`+${parts.partsEnfants.toFixed(2)}`} />
            <Row label="+ Spéciales" value={`+${parts.partsSpeciales.toFixed(2)}`} />
            <hr className="border-border" />
            <Row label="Total" value={`${parts.total.toFixed(2)} parts`} bold />
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-base font-bold">💰 Calcul comparatif</h2>
            <Row label="IR sans QF enfants" value={fmtEur(calc.irSansEnfants)} />
            <Row label="IR avec QF (avant plafond)" value={fmtEur(calc.irAvecEnfantsAvantPlafond)} />
            <Row label="IR après plafonnement" value={fmtEur(calc.irApresPlafond)} bold />
            <hr className="border-border" />
            <div className="rounded-xl bg-green-50 border border-green-300 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">🎯 Gain fiscal réel du QF</p>
              <p className="font-heading text-3xl font-bold text-green-600">{fmtEur(calc.gain)}</p>
              {calc.gainParEnfant > 0 && (
                <p className="text-xs text-muted-foreground mt-1">≈ {fmtEur(calc.gainParEnfant)}/enfant</p>
              )}
            </div>

            {calc.plafonne && (
              <div className="rounded-lg bg-yellow-vivid/10 border border-yellow-vivid/30 p-3 text-xs">
                <p className="font-semibold text-foreground">⚠️ Plafonnement actif</p>
                <p className="text-muted-foreground mt-1">
                  Avantage théorique : {fmtEur(calc.avantageTheorique)} • Plafond autorisé : {fmtEur(calc.plafond)} •
                  Manque à gagner : <strong>{fmtEur(calc.manqueAGagner)}</strong>
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-5 mt-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-3">📚 Comprendre le calcul</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="principe">
            <AccordionTrigger>Le principe du quotient familial</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>Le QF divise votre revenu net imposable par votre nombre de parts. Le barème progressif s'applique au QF (revenu par part), puis l'impôt est multiplié par le nombre de parts.</p>
              <p><strong>Formule</strong> : IR brut = Barème(RNI ÷ N) × N</p>
              <p>Plus N est élevé, plus le revenu par part est faible et plus le taux marginal effectif est réduit.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="parts">
            <AccordionTrigger>Règles de calcul des parts (2026)</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-1">
              <p>• Célibataire/Divorcé/Veuf sans enfant : <strong>1 part</strong></p>
              <p>• Marié/PACS : <strong>2 parts</strong></p>
              <p>• 1er & 2e enfants à charge : <strong>+0,5 chacun</strong></p>
              <p>• 3e enfant et au-delà : <strong>+1 chacun</strong></p>
              <p>• Garde alternée : <strong>+0,25 chacun</strong> (au lieu de +0,5)</p>
              <p>• Parent isolé (case T) : <strong>+0,5 supp.</strong> pour le 1er enfant</p>
              <p>• Invalide (case P) : <strong>+0,5</strong></p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="plafond">
            <AccordionTrigger>Le plafonnement (1 759 € par demi-part en 2026)</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>L'avantage fiscal apporté par chaque demi-part <em>supplémentaire</em> (hors parts de base) est plafonné à <strong>{fmtEur(PLAFOND_QF_DEMI_PART)}</strong>.</p>
              <p>Si l'économie théorique dépasse ce plafond, l'IR retenu = IR sans enfants − plafond. C'est fréquent pour les hauts revenus avec plusieurs enfants.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="rattachement">
            <AccordionTrigger>Rattacher ou détacher un enfant majeur ?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Option A — Rattachement</strong> : +0,5 part (gain plafonné à 1 759 €).</p>
              <p><strong>Option B — Détachement + pension alimentaire</strong> : déduction du RNI (max 6 674 €/an), gain = pension × TMI.</p>
              <p>Si TMI ≥ 30 % : le détachement est souvent plus avantageux. Comparez les deux options.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground italic">{MENTION_LEGALE_SIMULATEUR}</p>
    </SimulateurLayout>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold text-foreground" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
