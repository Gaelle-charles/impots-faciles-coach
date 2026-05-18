import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Calculator, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { AccentText } from '@/components/ui/accent-text';
import { useFraisReelsConstants } from '@/hooks/useFraisReelsConstants';
import {
  calculerFraisReelsGratuit,
  type ResultGratuit,
} from '@/lib/calculs-frais-reels-gratuit';
import type { Motorisation } from '@/lib/calculs-frais-reels';
import { supabase } from '@/integrations/supabase/client';
import { RateLimitModal } from './RateLimitModal';

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

const LOCKED_ITEMS = [
  'Frais de repas hors domicile : jusqu\u2019à 1 500 € selon votre situation',
  'Bureau à domicile / télétravail : jusqu\u2019à 2 000 €',
  'Matériel professionnel avec amortissement : jusqu\u2019à 1 000 €',
  'Frais Outre-mer (DROM) : jusqu\u2019à 1 800 €',
];

export function SimulateurGratuitBento() {
  const { constants, loading } = useFraisReelsConstants(2025);

  const [distance, setDistance] = useState(20);
  const [allerRetour, setAllerRetour] = useState(1);
  const [jours, setJours] = useState(218);
  const [cv, setCv] = useState(5);
  const [motorisation, setMotorisation] = useState<Motorisation>('thermique');
  const [indemnites, setIndemnites] = useState(0);
  const [salaire, setSalaire] = useState<number | ''>('');

  const [limitReached, setLimitReached] = useState(false);
  const [frozenResult, setFrozenResult] = useState<ResultGratuit | null>(null);
  const [tracked, setTracked] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const liveResult = useMemo<ResultGratuit | null>(() => {
    if (!constants) return null;
    try {
      return calculerFraisReelsGratuit(
        {
          distanceAllerSimple: distance,
          nbAllerRetourParJour: allerRetour,
          nbJoursTravailles: jours,
          cv,
          motorisation,
          indemnitesKmEmployeur: indemnites,
          salaireNetImposable: typeof salaire === 'number' ? salaire : undefined,
        },
        constants,
      );
    } catch {
      return null;
    }
  }, [constants, distance, allerRetour, jours, cv, motorisation, indemnites, salaire]);

  const result = limitReached ? frozenResult : liveResult;

  // Tracker une fois quand l'utilisateur a un résultat valide et a interagi
  useEffect(() => {
    if (tracked || !liveResult || limitReached) return;
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('track-free-simulation', {
          body: {},
        });
        if (error) return;
        if (data?.limit_reached) {
          setFrozenResult(liveResult);
          setLimitReached(true);
          setShowModal(true);
        }
        setTracked(true);
      } catch {
        // silencieux
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [liveResult, tracked, limitReached]);

  // Tracker une 2e simulation si l'utilisateur modifie après coup
  const [interactionCount, setInteractionCount] = useState(0);
  useEffect(() => {
    if (!tracked || limitReached) return;
    if (interactionCount === 0) return;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('track-free-simulation', {
          body: {},
        });
        if (data?.limit_reached && liveResult) {
          setFrozenResult(liveResult);
          setLimitReached(true);
          setShowModal(true);
        }
      } catch {
        // silencieux
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [interactionCount, tracked, limitReached, liveResult]);

  const handleChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    if (tracked) setInteractionCount((c) => c + 1);
  };

  return (
    <section id="simulateur" className="px-4 sm:px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <Eyebrow variant="violet">
            <Calculator className="mr-1.5 inline h-3.5 w-3.5" />
            Simulateur gratuit
          </Eyebrow>
          <h2 className="font-display mt-5 text-4xl md:text-5xl text-foreground">
            Essayez <AccentText>sans inscription.</AccentText>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
            Estimez vos frais kilométriques en 30 secondes selon le barème officiel DGFiP — revenus 2025, déclaration 2026.
          </p>
        </div>

        <div
          className="rounded-3xl bg-background border border-border shadow-sm p-6 sm:p-8 md:p-12"
          style={{ background: 'hsl(0 0% 99%)' }}
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* ============ COLONNE FORMULAIRE ============ */}
            <div>
              <h3 className="font-display text-2xl md:text-3xl text-foreground leading-tight">
                Vos frais kilométriques en <AccentText>30 secondes.</AccentText>
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Calcul gratuit, sans inscription. Barème officiel DGFiP — revenus 2025, déclaration 2026.
              </p>

              <div className="mt-6 grid gap-4">
                <div>
                  <Label htmlFor="distance">Distance domicile-travail (km, aller simple)</Label>
                  <Input
                    id="distance"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={distance}
                    onChange={(e) => handleChange(setDistance)(Number(e.target.value) || 0)}
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ar">Allers-retours / jour</Label>
                    <Input
                      id="ar"
                      type="number"
                      min={1}
                      max={4}
                      step={1}
                      value={allerRetour}
                      onChange={(e) =>
                        handleChange(setAllerRetour)(Number(e.target.value) || 1)
                      }
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jours">Jours travaillés / an</Label>
                    <Input
                      id="jours"
                      type="number"
                      min={0}
                      max={260}
                      step={1}
                      value={jours}
                      onChange={(e) => handleChange(setJours)(Number(e.target.value) || 0)}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cv">Puissance fiscale (CV)</Label>
                  <Select
                    value={String(cv)}
                    onValueChange={(v) => handleChange(setCv)(Number(v))}
                  >
                    <SelectTrigger id="cv" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 CV</SelectItem>
                      <SelectItem value="4">4 CV</SelectItem>
                      <SelectItem value="5">5 CV</SelectItem>
                      <SelectItem value="6">6 CV</SelectItem>
                      <SelectItem value="7">7 CV et plus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Motorisation</Label>
                  <RadioGroup
                    value={motorisation}
                    onValueChange={(v) => handleChange(setMotorisation)(v as Motorisation)}
                    className="mt-2 grid grid-cols-2 gap-2"
                  >
                    <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="thermique" id="m-th" />
                      <span className="text-sm">Thermique / Hybride</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="electrique" id="m-el" />
                      <span className="text-sm">100% Électrique</span>
                    </label>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="ind">
                    Indemnités kilométriques perçues (€/an, optionnel)
                  </Label>
                  <Input
                    id="ind"
                    type="number"
                    min={0}
                    step={10}
                    value={indemnites}
                    onChange={(e) =>
                      handleChange(setIndemnites)(Number(e.target.value) || 0)
                    }
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="sal">
                    Salaire net imposable annuel (€, optionnel)
                  </Label>
                  <Input
                    id="sal"
                    type="number"
                    min={0}
                    step={100}
                    placeholder="Ex: 30000"
                    value={salaire}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : Number(e.target.value) || 0;
                      handleChange<number | ''>(setSalaire)(v);
                    }}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* ============ COLONNE RÉSULTAT ============ */}
            <div className="lg:sticky lg:top-24 self-start">
              <div className="rounded-2xl bg-primary text-primary-foreground p-6 md:p-8">
                <p className="text-sm text-primary-foreground/80">
                  Vos frais kilométriques déductibles
                </p>
                <p className="mt-2 font-display text-4xl md:text-5xl text-yellow-vivid">
                  {loading || !result ? '—' : formatEuro(result.netDeductible)}
                </p>

                {result && (
                  <div className="mt-4 space-y-1 text-sm text-primary-foreground/85">
                    <div className="flex justify-between">
                      <span>Barème kilométrique</span>
                      <span>{formatEuro(result.baremeKm)}</span>
                    </div>
                    {result.indemnites > 0 && (
                      <div className="flex justify-between">
                        <span>Indemnités employeur</span>
                        <span>– {formatEuro(result.indemnites)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-primary-foreground pt-1 border-t border-primary-foreground/15">
                      <span>Net déductible</span>
                      <span>{formatEuro(result.netDeductible)}</span>
                    </div>
                  </div>
                )}

                {result?.verdict && (
                  <div
                    className={`mt-5 rounded-xl p-3 text-sm ${
                      result.verdict === 'frais_reels_avantageux'
                        ? 'bg-yellow-vivid/15 text-white'
                        : 'bg-primary-foreground/10 text-primary-foreground/90'
                    }`}
                  >
                    {result.verdict === 'frais_reels_avantageux'
                      ? `Avec le régime frais réels, vous pourriez déduire ${formatEuro(
                          result.difference ?? 0,
                        )} de plus que l\u2019abattement automatique.`
                      : `Pour information, l\u2019abattement automatique de 10 % reste plus avantageux pour votre situation.`}
                  </div>
                )}

                {/* Section floutée */}
                <div className="mt-6 space-y-2">
                  {LOCKED_ITEMS.map((label) => (
                    <div
                      key={label}
                      className="flex items-start gap-2 rounded-lg bg-primary-foreground/5 px-3 py-2 text-xs text-primary-foreground/55"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <Link to="/inscription" className="block mt-6">
                  <Button
                    size="lg"
                    className="w-full bg-yellow-vivid text-violet-deep hover:bg-yellow-vivid/90 rounded-full font-semibold"
                  >
                    Créer mon compte gratuit
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="mt-2 text-center text-xs text-primary-foreground/60">
                  À partir de 49 €/an.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Estimation pédagogique basée sur les barèmes officiels DGFiP (revenus 2025, déclaration 2026).
            Cette estimation ne constitue pas un calcul officiel d\u2019impôt et ne se substitue
            pas à votre déclaration. En cas de doute, contactez votre service des impôts.
          </p>
        </div>
      </div>

      <RateLimitModal open={showModal} onOpenChange={setShowModal} />
    </section>
  );
}
