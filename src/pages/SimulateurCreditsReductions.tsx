import { useMemo, useState } from "react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { fmtEur, MENTION_LEGALE_SIMULATEUR } from "@/lib/calculs-fiscaux";

/**
 * Simulateur Crédits & Réductions d'impôt 2026
 * Top 6 dispositifs grand public (validé avec utilisatrice).
 *
 * - CI-1 : Emploi à domicile (CRÉDIT, 50%)
 * - CI-2 : Garde enfants hors domicile (CRÉDIT, 50%)
 * - RI-1 : Dons (RÉDUCTION, 66% / 75% Coluche)
 * - RI-2 : Souscription PME / FCPI / FIP (RÉDUCTION, 25%)
 * - PER : Versements déductibles (DÉDUCTION du revenu, gain = TMI × versement)
 * - CI-6 : Cotisations syndicales (RÉDUCTION, 66%)
 */
export default function SimulateurCreditsReductions() {
  // TMI utilisateur (pour PER + comparaisons)
  const [tmi, setTmi] = useState(30);
  const [irAvant, setIrAvant] = useState(5000);

  // CI-1 — Emploi à domicile (crédit 50%, plafond 12 000€ + 1500€/enfant max 15 000€, 20 000€ si invalide)
  const [emploiDom, setEmploiDom] = useState(false);
  const [emploiDomDepenses, setEmploiDomDepenses] = useState(0);
  const [emploiDomEnfants, setEmploiDomEnfants] = useState(0);
  const [emploiDomInvalide, setEmploiDomInvalide] = useState(false);

  // CI-2 — Garde enfants hors domicile (crédit 50%, plafond 3 500€/enfant <6ans)
  const [garde, setGarde] = useState(false);
  const [gardeNbEnfants, setGardeNbEnfants] = useState(0);
  const [gardeDepenses, setGardeDepenses] = useState(0);

  // RI-1 — Dons
  const [dons, setDons] = useState(false);
  const [donsColuche, setDonsColuche] = useState(0); // 75% jusqu'à 1000€, puis 66%
  const [donsGeneraux, setDonsGeneraux] = useState(0); // 66% (plafond 20% RNG)
  const [revenuRefDons, setRevenuRefDons] = useState(0); // pour plafond 20% RNG

  // RI-2 — Souscription PME (réduction 25%, plafond 50k€ cél. / 100k€ couple)
  const [pme, setPme] = useState(false);
  const [pmeMontant, setPmeMontant] = useState(0);
  const [pmeCouple, setPmeCouple] = useState(false);

  // PER déductible (gain = TMI × versement, plafond ≈ 10% PASS = 4 660 €)
  const [per, setPer] = useState(false);
  const [perVersement, setPerVersement] = useState(0);

  // CI-6 — Cotisations syndicales (réduction 66%, plafond 1% revenu brut)
  const [syndicat, setSyndicat] = useState(false);
  const [cotisationsSynd, setCotisationsSynd] = useState(0);
  const [revenuBrutSynd, setRevenuBrutSynd] = useState(0);

  const calc = useMemo(() => {
    let credits = 0;
    let reductions = 0;
    let economieDeduction = 0; // PER (impact sur le revenu, pas l'IR direct)
    const details: { nom: string; type: "crédit" | "réduction" | "déduction"; montant: number; note?: string }[] = [];

    // CI-1
    if (emploiDom && emploiDomDepenses > 0) {
      const plafondBase = emploiDomInvalide ? 20000 : 12000;
      const plafondAvecMaj = Math.min(plafondBase + emploiDomEnfants * 1500, emploiDomInvalide ? 20000 : 15000);
      const depRetenues = Math.min(emploiDomDepenses, plafondAvecMaj);
      const credit = depRetenues * 0.5;
      credits += credit;
      details.push({
        nom: "Emploi salarié à domicile",
        type: "crédit",
        montant: credit,
        note: `Dépenses retenues : ${fmtEur(depRetenues)} (plafond ${fmtEur(plafondAvecMaj)})`,
      });
    }

    // CI-2
    if (garde && gardeDepenses > 0 && gardeNbEnfants > 0) {
      const plafond = gardeNbEnfants * 3500;
      const depRetenues = Math.min(gardeDepenses, plafond);
      const credit = depRetenues * 0.5;
      credits += credit;
      details.push({
        nom: "Garde d'enfants hors domicile (<6 ans)",
        type: "crédit",
        montant: credit,
        note: `Dépenses retenues : ${fmtEur(depRetenues)} (plafond ${fmtEur(plafond)} pour ${gardeNbEnfants} enfant·s)`,
      });
    }

    // RI-1 — Dons
    if (dons) {
      let red = 0;
      // Coluche : 75% jusqu'à 1000€, puis 66%
      if (donsColuche > 0) {
        const trancheHaute = Math.min(donsColuche, 1000);
        const trancheBasse = Math.max(0, donsColuche - 1000);
        red += trancheHaute * 0.75 + trancheBasse * 0.66;
      }
      // Dons généraux : 66% (plafond 20% RNG)
      if (donsGeneraux > 0) {
        const plafond = revenuRefDons > 0 ? revenuRefDons * 0.20 : Infinity;
        const retenu = Math.min(donsGeneraux, plafond);
        red += retenu * 0.66;
      }
      reductions += red;
      details.push({ nom: "Dons aux associations", type: "réduction", montant: red });
    }

    // RI-2 — PME
    if (pme && pmeMontant > 0) {
      const plafond = pmeCouple ? 100000 : 50000;
      const retenu = Math.min(pmeMontant, plafond);
      const red = retenu * 0.25;
      reductions += red;
      details.push({
        nom: "Souscription PME / JEII",
        type: "réduction",
        montant: red,
        note: `Investissement retenu : ${fmtEur(retenu)} (plafond ${fmtEur(plafond)})`,
      });
    }

    // PER — gain = TMI × versement
    if (per && perVersement > 0) {
      const gain = perVersement * (tmi / 100);
      economieDeduction += gain;
      details.push({
        nom: "Versement PER",
        type: "déduction",
        montant: gain,
        note: `Gain = TMI (${tmi} %) × versement. Le PER réduit le revenu imposable, pas l'IR directement.`,
      });
    }

    // CI-6 — Cotisations syndicales
    if (syndicat && cotisationsSynd > 0) {
      const plafond = revenuBrutSynd > 0 ? revenuBrutSynd * 0.01 : Infinity;
      const retenu = Math.min(cotisationsSynd, plafond);
      const red = retenu * 0.66;
      reductions += red;
      details.push({
        nom: "Cotisations syndicales",
        type: "réduction",
        montant: red,
        note: `Cotisations retenues : ${fmtEur(retenu)} (plafond 1 % du brut)`,
      });
    }

    // Calcul de l'IR final
    const reductionsAppliquees = Math.min(reductions, irAvant);
    const apresRed = irAvant - reductionsAppliquees;
    const irApres = apresRed - credits;
    const remboursementEventuel = Math.max(0, -irApres);

    return {
      credits,
      reductions,
      reductionsAppliquees,
      reductionsPerdues: Math.max(0, reductions - reductionsAppliquees),
      economieDeduction,
      irAvant,
      irApres: Math.max(0, irApres),
      remboursementEventuel,
      gainTotal: credits + reductionsAppliquees + economieDeduction,
      details,
    };
  }, [emploiDom, emploiDomDepenses, emploiDomEnfants, emploiDomInvalide, garde, gardeNbEnfants, gardeDepenses,
      dons, donsColuche, donsGeneraux, revenuRefDons, pme, pmeMontant, pmeCouple, per, perVersement, tmi,
      syndicat, cotisationsSynd, revenuBrutSynd, irAvant]);

  return (
    <SimulateurLayout
      emoji="🎁"
      title="Crédits & Réductions d'impôt 2026"
      subtitle="Estimez l'impact des 6 dispositifs grand public sur votre IR 2026."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          {/* Contexte */}
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold">📍 Votre situation</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>IR brut estimé avant avantages (€)</Label>
                <Input type="number" min={0} value={irAvant || ""} onChange={(e) => setIrAvant(Number(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">Calculé via le simulateur IR Barème</p>
              </div>
              <div className="space-y-1.5">
                <Label>Votre TMI (%)</Label>
                <RadioGroup value={String(tmi)} onValueChange={(v) => setTmi(Number(v))} className="grid grid-cols-5 gap-1 mt-2">
                  {[0, 11, 30, 41, 45].map((t) => (
                    <Label key={t} className="flex items-center justify-center gap-1 rounded-md border border-border p-2 text-xs cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <RadioGroupItem value={String(t)} className="hidden" />
                      {t}%
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </Card>

          {/* CI-1 Emploi à domicile */}
          <DispositifCard
            title="Emploi salarié à domicile"
            type="crédit"
            taux="50 %"
            checked={emploiDom}
            onCheck={setEmploiDom}
            description="Ménage, garde d'enfant à domicile, jardinage, soutien scolaire, aide aux personnes âgées…"
          >
            {emploiDom && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Dépenses annuelles (€)</Label>
                  <Input type="number" min={0} value={emploiDomDepenses || ""} onChange={(e) => setEmploiDomDepenses(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Nombre d'enfants à charge</Label>
                  <Input type="number" min={0} max={2} value={emploiDomEnfants || ""} onChange={(e) => setEmploiDomEnfants(Number(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground">+1 500 €/enfant (max 2)</p>
                </div>
                <Label className="flex items-center gap-2 text-sm cursor-pointer col-span-2">
                  <Checkbox checked={emploiDomInvalide} onCheckedChange={(v) => setEmploiDomInvalide(!!v)} />
                  Personne invalide ou &gt; 65 ans (plafond porté à 20 000 €)
                </Label>
              </div>
            )}
          </DispositifCard>

          {/* CI-2 Garde enfants */}
          <DispositifCard
            title="Garde d'enfants hors domicile"
            type="crédit"
            taux="50 %"
            checked={garde}
            onCheck={setGarde}
            description="Crèche, assistante maternelle agréée, garderie périscolaire — enfants de moins de 6 ans au 1er janvier."
          >
            {garde && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Nombre d'enfants &lt; 6 ans</Label>
                  <Input type="number" min={0} value={gardeNbEnfants || ""} onChange={(e) => setGardeNbEnfants(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Dépenses totales (€)</Label>
                  <Input type="number" min={0} value={gardeDepenses || ""} onChange={(e) => setGardeDepenses(Number(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground">Plafond 3 500 €/enfant</p>
                </div>
              </div>
            )}
          </DispositifCard>

          {/* RI-1 Dons */}
          <DispositifCard
            title="Dons aux associations"
            type="réduction"
            taux="66 % – 75 %"
            checked={dons}
            onCheck={setDons}
            description="Coluche/Croix-Rouge/Restos du Cœur : 75 % jusqu'à 1 000 €, 66 % au-delà. Autres associations : 66 % (plafond 20 % du revenu)."
          >
            {dons && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Dons "Coluche" (€)</Label>
                  <Input type="number" min={0} value={donsColuche || ""} onChange={(e) => setDonsColuche(Number(e.target.value) || 0)} />
                  <p className="text-xs text-muted-foreground">Restos du Cœur, Secours pop., Croix-Rouge…</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Dons généraux (€)</Label>
                  <Input type="number" min={0} value={donsGeneraux || ""} onChange={(e) => setDonsGeneraux(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-sm">Revenu net global (pour plafond 20 %, optionnel)</Label>
                  <Input type="number" min={0} value={revenuRefDons || ""} onChange={(e) => setRevenuRefDons(Number(e.target.value) || 0)} />
                </div>
              </div>
            )}
          </DispositifCard>

          {/* RI-2 PME */}
          <DispositifCard
            title="Souscription au capital de PME / FCPI / FIP"
            type="réduction"
            taux="25 %"
            checked={pme}
            onCheck={setPme}
            description="Investissement dans une PME éligible (Madelin, JEII). Conservation 5 ans minimum."
          >
            {pme && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Montant investi (€)</Label>
                  <Input type="number" min={0} value={pmeMontant || ""} onChange={(e) => setPmeMontant(Number(e.target.value) || 0)} />
                </div>
                <Label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={pmeCouple} onCheckedChange={(v) => setPmeCouple(!!v)} />
                  Imposition commune (couple) — plafond 100 000 € au lieu de 50 000 €
                </Label>
              </div>
            )}
          </DispositifCard>

          {/* PER */}
          <DispositifCard
            title="Versement PER (Plan Épargne Retraite)"
            type="déduction"
            taux={`gain = TMI (${tmi} %)`}
            checked={per}
            onCheck={setPer}
            description="⚠️ Le PER ne réduit pas l'IR directement, il déduit du revenu imposable. Gain = TMI × versement."
          >
            {per && (
              <div className="space-y-1.5 mt-3">
                <Label className="text-sm">Versement PER de l'année (€)</Label>
                <Input type="number" min={0} value={perVersement || ""} onChange={(e) => setPerVersement(Number(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">Plafond ≈ 10 % du revenu pro, max ≈ 37 094 € (8 PASS × 10 %)</p>
              </div>
            )}
          </DispositifCard>

          {/* CI-6 Syndicat */}
          <DispositifCard
            title="Cotisations syndicales"
            type="réduction"
            taux="66 %"
            checked={syndicat}
            onCheck={setSyndicat}
            description="Plafond : 1 % du revenu brut déclaré. Préférable au régime des frais réels dans la plupart des cas."
          >
            {syndicat && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Cotisations versées (€)</Label>
                  <Input type="number" min={0} value={cotisationsSynd || ""} onChange={(e) => setCotisationsSynd(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Revenu brut annuel (€)</Label>
                  <Input type="number" min={0} value={revenuBrutSynd || ""} onChange={(e) => setRevenuBrutSynd(Number(e.target.value) || 0)} />
                </div>
              </div>
            )}
          </DispositifCard>
        </div>

        {/* RÉSULTAT */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <Card className="p-5 bg-gradient-to-br from-primary/5 to-yellow-vivid/10 border-primary/30 space-y-3">
            <h2 className="font-heading text-base font-bold">💰 Synthèse</h2>
            <Row label="IR avant avantages" value={fmtEur(calc.irAvant)} />
            {calc.reductionsAppliquees > 0 && <Row label="− Réductions appliquées" value={`−${fmtEur(calc.reductionsAppliquees)}`} muted />}
            {calc.reductionsPerdues > 0 && (
              <p className="text-xs text-yellow-vivid">⚠️ {fmtEur(calc.reductionsPerdues)} de réductions perdues (IR insuffisant)</p>
            )}
            {calc.credits > 0 && <Row label="− Crédits" value={`−${fmtEur(calc.credits)}`} muted />}
            <hr className="border-border" />
            <div className={`rounded-xl p-4 text-center ${calc.remboursementEventuel > 0 ? "bg-green-50 border border-green-300" : "bg-background border border-border"}`}>
              <p className="text-xs text-muted-foreground mb-1">{calc.remboursementEventuel > 0 ? "💰 Remboursement attendu" : "🎯 IR net après avantages"}</p>
              <p className={`font-heading text-3xl font-bold ${calc.remboursementEventuel > 0 ? "text-green-600" : "text-primary"}`}>
                {fmtEur(calc.remboursementEventuel > 0 ? calc.remboursementEventuel : calc.irApres)}
              </p>
            </div>

            {calc.economieDeduction > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs">
                <p className="font-semibold text-foreground">+ Économie PER (déduction) : {fmtEur(calc.economieDeduction)}</p>
                <p className="text-muted-foreground mt-1">À déduire de votre revenu imposable, pas de l'IR direct.</p>
              </div>
            )}

            <div className="text-center pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Gain fiscal total</p>
              <p className="font-heading text-lg font-bold text-foreground">{fmtEur(calc.gainTotal)}</p>
            </div>
          </Card>

          {calc.details.length > 0 && (
            <Card className="p-4 space-y-2">
              <h3 className="font-heading text-sm font-bold">Détail des avantages</h3>
              {calc.details.map((d, i) => (
                <div key={i} className="text-xs border-l-2 border-primary/30 pl-2 py-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{d.nom}</span>
                    <span className="tabular-nums font-bold">{fmtEur(d.montant)}</span>
                  </div>
                  <p className="text-muted-foreground">{d.type}{d.note ? ` · ${d.note}` : ""}</p>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <Card className="p-5 mt-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-3">📚 Comprendre le calcul</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="diff">
            <AccordionTrigger>Réduction vs Crédit vs Déduction — la différence essentielle</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <div>
                <p><strong>📉 Réduction d'impôt</strong></p>
                <p>Diminue l'IR. <em>Si IR &lt; réduction, l'excédent est PERDU.</em> Ex : dons, PME, syndicats.</p>
              </div>
              <div>
                <p><strong>💰 Crédit d'impôt</strong></p>
                <p>Diminue l'IR. <em>Si IR &lt; crédit, l'excédent est REMBOURSÉ.</em> Même si IR = 0, le crédit est versé. Ex : emploi domicile, garde enfant.</p>
              </div>
              <div>
                <p><strong>📊 Déduction du revenu</strong></p>
                <p>Diminue le revenu imposable AVANT calcul de l'IR. Gain = TMI × montant déduit. Ex : PER, pension alimentaire.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="cumul">
            <AccordionTrigger>Plafonnement global des niches fiscales</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>Le total des avantages fiscaux par niches est plafonné à <strong>10 000 €/an</strong> par foyer (18 000 € pour Outre-mer/SOFICA).</p>
              <p>Ce plafond n'inclut PAS : dons, PER, pensions alimentaires, frais de garde et emploi à domicile (hors plafond global pour ceux liés à des dépenses contraintes).</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="strategie">
            <AccordionTrigger>Stratégie d'optimisation</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>1. <strong>Maximiser les crédits</strong> en premier (ils sont remboursables).</p>
              <p>2. <strong>Calibrer les réductions</strong> pour ne pas dépasser l'IR dû (sinon excédent perdu).</p>
              <p>3. <strong>PER</strong> uniquement si TMI ≥ 30 % pour un effet significatif.</p>
              <p>4. Pensez au <strong>fractionnement</strong> des dons sur plusieurs années si vous risquez de dépasser le plafond 20 % RNG.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground italic">{MENTION_LEGALE_SIMULATEUR}</p>
    </SimulateurLayout>
  );
}

function DispositifCard({
  title, type, taux, checked, onCheck, description, children,
}: {
  title: string;
  type: "crédit" | "réduction" | "déduction";
  taux: string;
  checked: boolean;
  onCheck: (v: boolean) => void;
  description: string;
  children?: React.ReactNode;
}) {
  const colors = {
    "crédit": "bg-green-50 text-green-700 border-green-200",
    "réduction": "bg-blue-50 text-blue-700 border-blue-200",
    "déduction": "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <Card className="p-4">
      <Label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheck(!!v)} className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading text-base font-bold text-foreground">{title}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[type]}`}>
              {type} · {taux}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </Label>
      {children}
    </Card>
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
