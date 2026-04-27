import { useMemo, useState } from "react";
import SimulateurLayout from "@/components/simulateur/SimulateurLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { fmtEur, fmtPct, MENTION_LEGALE_SIMULATEUR, tauxPasNeutre, GRILLE_PAS_NEUTRE_2026 } from "@/lib/calculs-fiscaux";

export default function SimulateurPAS() {
  // Taux neutre
  const [revenuMensuel, setRevenuMensuel] = useState(2500);

  // Taux personnalisé
  const [irN1, setIrN1] = useState(4200);
  const [revenusN1, setRevenusN1] = useState(42000);
  const [revenusMensuelsN, setRevenusMensuelsN] = useState(3500);

  // Individualisé (couple)
  const [revenuA, setRevenuA] = useState(3500);
  const [revenuB, setRevenuB] = useState(1800);
  const [irFoyer, setIrFoyer] = useState(4800);

  // Acomptes (indépendants/fonciers)
  const [irAcompte, setIrAcompte] = useState(5400);
  const [psAcompte, setPsAcompte] = useState(3096);

  const neutre = useMemo(() => {
    const taux = tauxPasNeutre(revenuMensuel);
    return { taux, pas: revenuMensuel * taux };
  }, [revenuMensuel]);

  const personnalise = useMemo(() => {
    const taux = revenusN1 > 0 ? irN1 / revenusN1 : 0;
    return { taux, pas: revenusMensuelsN * taux };
  }, [irN1, revenusN1, revenusMensuelsN]);

  const individualise = useMemo(() => {
    // Option 1 — taux individualisé : chacun selon grille neutre sur son revenu
    const tauxA = tauxPasNeutre(revenuA);
    const tauxB = tauxPasNeutre(revenuB);
    const pasA = revenuA * tauxA;
    const pasB = revenuB * tauxB;

    // Option 2 — taux commun
    const revenusFoyerAnnuels = (revenuA + revenuB) * 12;
    const tauxCommun = revenusFoyerAnnuels > 0 ? irFoyer / revenusFoyerAnnuels : 0;
    const pasCommunA = revenuA * tauxCommun;
    const pasCommunB = revenuB * tauxCommun;

    return {
      tauxA, tauxB, pasA, pasB, totalIndiv: pasA + pasB,
      tauxCommun, pasCommunA, pasCommunB, totalCommun: pasCommunA + pasCommunB,
      ecartA: pasA - pasCommunA,
      ecartB: pasB - pasCommunB,
    };
  }, [revenuA, revenuB, irFoyer]);

  const acomptes = useMemo(() => {
    const total = irAcompte + psAcompte;
    return { total, mensuel: total / 12, trimestriel: total / 4 };
  }, [irAcompte, psAcompte]);

  return (
    <SimulateurLayout
      emoji="💼"
      title="Prélèvement à la source (PAS) — 2026"
      subtitle="Estimez votre PAS selon les 3 modes : neutre, personnalisé, individualisé (par défaut couples depuis 09/2025)."
    >
      <Tabs defaultValue="neutre" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="neutre">Taux neutre</TabsTrigger>
          <TabsTrigger value="personnalise">Personnalisé</TabsTrigger>
          <TabsTrigger value="individualise">Couple</TabsTrigger>
          <TabsTrigger value="acomptes">Acomptes</TabsTrigger>
        </TabsList>

        {/* ========== TAUX NEUTRE ========== */}
        <TabsContent value="neutre">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5 space-y-4">
              <h2 className="font-heading text-lg font-bold">Taux neutre (grille 2026)</h2>
              <p className="text-xs text-muted-foreground">
                Utilisé si vous n'avez jamais déclaré de revenus, si vous demandez la confidentialité totale, ou pour les nouveaux contribuables.
              </p>
              <div className="space-y-2">
                <Label>Revenu mensuel net imposable (€)</Label>
                <Input type="number" min={0} value={revenuMensuel || ""} onChange={(e) => setRevenuMensuel(Number(e.target.value) || 0)} />
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Taux neutre applicable</p>
                <p className="font-heading text-3xl font-bold text-primary">{fmtPct(neutre.taux * 100)}</p>
                <p className="text-sm text-muted-foreground">PAS mensuel : <strong>{fmtEur(neutre.pas)}</strong></p>
              </div>
              <p className="text-xs text-muted-foreground italic">⚠️ Avec le taux neutre, vous devez verser à la DGFIP la différence entre le PAS prélevé et l'impôt réellement dû (paiement complémentaire).</p>
            </Card>

            <Card className="p-5">
              <h3 className="font-heading text-sm font-bold mb-2">Grille complète 2026</h3>
              <div className="text-xs space-y-1 max-h-96 overflow-y-auto">
                {GRILLE_PAS_NEUTRE_2026.map((t, i) => {
                  const actif = revenuMensuel >= t.min && revenuMensuel < t.max;
                  return (
                    <div key={i} className={`flex justify-between p-1.5 rounded ${actif ? "bg-primary/10 border border-primary/30 font-semibold" : ""}`}>
                      <span className="text-muted-foreground">
                        {fmtEur(t.min)} → {t.max === Infinity ? "∞" : fmtEur(t.max)}
                      </span>
                      <span className="tabular-nums">{fmtPct(t.taux * 100, 1)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ========== TAUX PERSONNALISÉ ========== */}
        <TabsContent value="personnalise">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5 space-y-4">
              <h2 className="font-heading text-lg font-bold">Taux personnalisé</h2>
              <p className="text-xs text-muted-foreground">
                Calculé sur la base de votre dernière déclaration. C'est le taux par défaut (sauf option couple).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>IR N-1 payé (€)</Label>
                  <Input type="number" min={0} value={irN1 || ""} onChange={(e) => setIrN1(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Revenus N-1 totaux (€)</Label>
                  <Input type="number" min={0} value={revenusN1 || ""} onChange={(e) => setRevenusN1(Number(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Revenus mensuels actuels (€/mois)</Label>
                <Input type="number" min={0} value={revenusMensuelsN || ""} onChange={(e) => setRevenusMensuelsN(Number(e.target.value) || 0)} />
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-primary/5 to-yellow-vivid/10 border-primary/30 space-y-3">
              <h2 className="font-heading text-base font-bold">📊 Estimation</h2>
              <Row label="Taux personnalisé estimé" value={fmtPct(personnalise.taux * 100)} bold />
              <div className="rounded-xl bg-background border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">PAS mensuel estimé</p>
                <p className="font-heading text-3xl font-bold text-primary">{fmtEur(personnalise.pas)}</p>
                <p className="text-xs text-muted-foreground mt-1">Sur la base de {fmtEur(revenusMensuelsN)}/mois</p>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 La DGFIP recalcule ce taux chaque année en septembre, après votre déclaration de mai-juin.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* ========== INDIVIDUALISÉ COUPLE ========== */}
        <TabsContent value="individualise">
          <div className="rounded-lg bg-yellow-vivid/10 border border-yellow-vivid/30 p-4 mb-4 text-sm">
            <p className="font-semibold">📌 Nouveau depuis le 01/09/2025</p>
            <p className="text-muted-foreground mt-1">Le taux individualisé est désormais le mode <strong>par défaut</strong> pour les couples mariés/pacsés. Chaque conjoint a son propre taux calculé sur ses seuls revenus. Pour revenir au taux commun, il faut en faire la demande explicite.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5 space-y-4">
              <h2 className="font-heading text-lg font-bold">Vos revenus (couple)</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Revenu mensuel A (€)</Label>
                  <Input type="number" min={0} value={revenuA || ""} onChange={(e) => setRevenuA(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Revenu mensuel B (€)</Label>
                  <Input type="number" min={0} value={revenuB || ""} onChange={(e) => setRevenuB(Number(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>IR annuel estimé du foyer (€)</Label>
                <Input type="number" min={0} value={irFoyer || ""} onChange={(e) => setIrFoyer(Number(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">Sert à calculer le taux commun pour comparaison</p>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h2 className="font-heading text-base font-bold">📊 Comparaison</h2>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1 text-sm">
                <p className="font-semibold text-foreground">Option 1 — Individualisé (défaut)</p>
                <Row label={`Conjoint A (${fmtPct(individualise.tauxA * 100, 1)})`} value={fmtEur(individualise.pasA) + "/mois"} />
                <Row label={`Conjoint B (${fmtPct(individualise.tauxB * 100, 1)})`} value={fmtEur(individualise.pasB) + "/mois"} />
                <hr className="border-border" />
                <Row label="Total foyer" value={fmtEur(individualise.totalIndiv) + "/mois"} bold />
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
                <p className="font-semibold text-foreground">Option 2 — Taux commun (sur demande)</p>
                <Row label={`Taux commun (${fmtPct(individualise.tauxCommun * 100, 1)})`} value="" />
                <Row label="Conjoint A" value={fmtEur(individualise.pasCommunA) + "/mois"} />
                <Row label="Conjoint B" value={fmtEur(individualise.pasCommunB) + "/mois"} />
                <hr className="border-border" />
                <Row label="Total foyer" value={fmtEur(individualise.totalCommun) + "/mois"} bold />
              </div>

              <p className="text-xs text-muted-foreground italic">
                💡 Le total foyer est <em>quasi identique</em>. Seule la <strong>répartition</strong> entre conjoints change : avec l'individualisé, le conjoint le mieux payé supporte plus de PAS.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* ========== ACOMPTES ========== */}
        <TabsContent value="acomptes">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5 space-y-4">
              <h2 className="font-heading text-lg font-bold">Acomptes PAS (BIC/BNC/Foncier)</h2>
              <p className="text-xs text-muted-foreground">
                Pour les revenus sans tiers payeur (indépendants, fonciers, RCM hors PFU). La DGFIP prélève des acomptes mensuels ou trimestriels.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>IR estimé sur ces revenus (€)</Label>
                  <Input type="number" min={0} value={irAcompte || ""} onChange={(e) => setIrAcompte(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Prélèvements sociaux 17,2 % (€)</Label>
                  <Input type="number" min={0} value={psAcompte || ""} onChange={(e) => setPsAcompte(Number(e.target.value) || 0)} />
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <h2 className="font-heading text-base font-bold">📊 Échéancier</h2>
              <Row label="Total à échelonner" value={fmtEur(acomptes.total)} bold />
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold mb-1">Mensuel (15 du mois)</p>
                <p className="font-heading text-2xl font-bold text-primary">{fmtEur(acomptes.mensuel)}/mois</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold mb-1">Trimestriel (15 fév. / mai / août / nov.)</p>
                <p className="font-heading text-2xl font-bold text-primary">{fmtEur(acomptes.trimestriel)}/trimestre</p>
              </div>
              <p className="text-xs text-muted-foreground italic">⚠️ Modulation à la baisse possible si revenus chutent &gt; 10 %, mais une insuffisance de plus de 10 % entraîne une pénalité de 10 %.</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card className="p-5 mt-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-3">📚 Comprendre le PAS</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="principe">
            <AccordionTrigger>Le principe du Prélèvement à la Source</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>En vigueur depuis 2019, le PAS collecte l'impôt en temps réel. L'employeur ou la caisse de retraite prélève directement sur la base d'un taux transmis par la DGFIP via la DSN.</p>
              <p>Chaque année en mai-juin, vous régularisez : si le PAS prélevé &gt; IR réel → remboursement. Sinon → rappel à payer.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="trois">
            <AccordionTrigger>Les 3 types de taux</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>🔵 Personnalisé</strong> : calculé sur votre dernière déclaration. L'employeur le voit.</p>
              <p><strong>🟡 Individualisé</strong> (défaut couples depuis 09/2025) : chaque conjoint a son taux. Confidentialité entre conjoints.</p>
              <p><strong>⚫ Neutre</strong> : grille barémique nationale, sans tenir compte du foyer. L'employeur ne voit pas votre TMI réel, mais vous devez verser le complément à la DGFIP.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="moduler">
            <AccordionTrigger>Comment moduler son taux ?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>Sur impots.gouv.fr → Espace particulier → Gérer mon prélèvement à la source → Actualiser mon taux.</p>
              <p>Modulation à la baisse possible si revenus chutent &gt; 10 %. Attention : si la baisse dépasse 10 %, pénalité de 10 % sur l'écart.</p>
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
