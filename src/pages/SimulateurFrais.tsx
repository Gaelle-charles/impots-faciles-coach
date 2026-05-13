import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccessGuard } from '@/components/AccessGuard';
import SimulateurLayout from '@/components/simulateur/SimulateurLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAccess } from '@/hooks/useAccess';
import { abattementSalaires, fmtEur, MENTION_LEGALE_SIMULATEUR } from '@/lib/calculs-fiscaux';

const NumberField = ({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm">{label}</Label>
    <Input
      id={id}
      type="number"
      min={0}
      inputMode="numeric"
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder="0"
    />
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const SimulateurFraisContent = () => {
  const navigate = useNavigate();
  const { plan } = useAccess();
  const [salaireBrut, setSalaireBrut] = useState(35000);
  const [transport, setTransport] = useState(0);
  const [repas, setRepas] = useState(0);
  const [teletravail, setTeletravail] = useState(0);
  const [formation, setFormation] = useState(0);
  const [materiel, setMateriel] = useState(0);
  const [autres, setAutres] = useState(0);
  const [tmi, setTmi] = useState(30);

  const calc = useMemo(() => {
    const abattement = abattementSalaires(salaireBrut);
    const fraisReels = transport + repas + teletravail + formation + materiel + autres;
    const avantageFraisReels = Math.max(0, fraisReels - abattement);
    const economiePotentielle = avantageFraisReels * (tmi / 100);
    const optionOptimale = fraisReels > abattement ? 'frais-reels' : 'abattement';

    return {
      abattement,
      fraisReels,
      avantageFraisReels,
      economiePotentielle,
      optionOptimale,
    };
  }, [autres, formation, materiel, repas, salaireBrut, teletravail, tmi, transport]);

  return (
    <SimulateurLayout
      emoji="🧾"
      title="Simulateur de frais réels"
      subtitle="Comparez vos frais professionnels déductibles avec l'abattement forfaitaire de 10 % sur vos salaires."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">1 — Revenus</h2>
            <NumberField
              id="salaire-brut"
              label="Salaire brut annuel (€)"
              value={salaireBrut}
              onChange={setSalaireBrut}
              hint="L'abattement forfaitaire de 10 % est calculé automatiquement avec le minimum et le plafond légaux."
            />
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">2 — Vos frais professionnels</h2>
            <p className="text-sm text-muted-foreground">
              Indiquez les montants annuels réellement déductibles que vous avez déjà reconstitués à partir de vos justificatifs.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField id="transport" label="Transport / déplacements (€)" value={transport} onChange={setTransport} />
              <NumberField id="repas" label="Repas (€)" value={repas} onChange={setRepas} />
              <NumberField id="teletravail" label="Télétravail (€)" value={teletravail} onChange={setTeletravail} />
              <NumberField id="formation" label="Formation (€)" value={formation} onChange={setFormation} />
              <NumberField id="materiel" label="Matériel / fournitures (€)" value={materiel} onChange={setMateriel} />
              <NumberField id="autres-frais" label="Autres frais (€)" value={autres} onChange={setAutres} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">3 — Estimation de votre gain fiscal</h2>
            <div className="space-y-2">
              <Label className="text-sm">Votre tranche marginale d'imposition (TMI)</Label>
              <RadioGroup value={String(tmi)} onValueChange={(v) => setTmi(Number(v))} className="grid grid-cols-5 gap-2">
                {[0, 11, 30, 41, 45].map((value) => (
                  <Label
                    key={value}
                    className="flex items-center justify-center rounded-md border border-border p-3 text-sm cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem value={String(value)} className="hidden" />
                    {value} %
                  </Label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Cette estimation donne un ordre de grandeur du gain potentiel si les frais réels sont plus favorables.
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <Card className="p-5 bg-primary/5 border-primary/20 space-y-4">
            <h2 className="font-heading text-base font-bold text-foreground">Comparatif instantané</h2>

            <div className="space-y-3 text-sm">
              <ResultRow label="Abattement forfaitaire 10 %" value={fmtEur(calc.abattement)} />
              <ResultRow label="Total de vos frais réels" value={fmtEur(calc.fraisReels)} />
              <ResultRow label="Écart en faveur des frais réels" value={fmtEur(calc.avantageFraisReels)} muted={calc.avantageFraisReels === 0} />
              <ResultRow label="Économie d'impôt estimée" value={fmtEur(calc.economiePotentielle)} muted={calc.economiePotentielle === 0} />
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommandation</p>
              <p className="mt-2 font-heading text-lg font-bold text-foreground">
                {calc.optionOptimale === 'frais-reels' ? 'Déclarer les frais réels' : 'Conserver l’abattement forfaitaire'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {calc.optionOptimale === 'frais-reels'
                  ? 'Vos frais réels dépassent l’abattement automatique de 10 %. L’option frais réels semble plus avantageuse.'
                  : 'Vos frais réels ne dépassent pas l’abattement de 10 %. L’abattement forfaitaire reste le plus favorable.'}
              </p>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-heading text-base font-bold text-foreground">À vérifier avant déclaration</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>Conservez vos justificatifs pendant 3 ans.</li>
              <li>Ne retenez que les dépenses réellement déductibles.</li>
              <li>Évitez de comptabiliser deux fois une dépense déjà remboursée par l'employeur.</li>
            </ul>
          </Card>

          <Card className="p-4 text-xs text-muted-foreground">
            {MENTION_LEGALE_SIMULATEUR}
          </Card>
        </div>
      </div>
    </SimulateurLayout>
  );
};

function ResultRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

const SimulateurFrais = () => (
  <AccessGuard requires="starter">
    <SimulateurFraisContent />
  </AccessGuard>
);

export default SimulateurFrais;
