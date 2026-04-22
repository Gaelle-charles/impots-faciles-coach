import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const TOTAL_STEPS = 7;

type SituationPrincipale =
  | 'salarie'
  | 'independant'
  | 'dirigeant'
  | 'retraite'
  | 'etudiant'
  | 'sans_activite';

const SITUATION_OPTIONS: { value: SituationPrincipale; label: string }[] = [
  { value: 'salarie', label: 'Salarié(e) (CDI / CDD / fonctionnaire)' },
  { value: 'independant', label: 'Indépendant(e) / Auto-entrepreneur' },
  { value: 'dirigeant', label: 'Dirigeant(e) de société (SASU, EURL, SARL...)' },
  { value: 'retraite', label: 'Retraité(e)' },
  { value: 'etudiant', label: 'Étudiant(e) / Jeune actif' },
  { value: 'sans_activite', label: "Demandeur d'emploi / Sans activité" },
];

const ACTIVITE_OPTIONS = [
  { value: 'vente_produits', label: 'Vente de produits / e-commerce' },
  { value: 'services', label: 'Services (artisanat, BTP, restauration...)' },
  { value: 'manuel', label: 'Métier manuel (VTC, livraison, construction...)' },
  { value: 'sante', label: 'Santé / soin (médecin, infirmier, kiné...)' },
  { value: 'creation', label: 'Création / culture (artiste, graphiste, photographe...)' },
  { value: 'formation', label: 'Formation / éducation / coaching' },
  { value: 'liberal', label: 'Libéral cadre (consultant, avocat, expert-comptable...)' },
  { value: 'numerique', label: 'Numérique / développement' },
  { value: 'autre', label: 'Autre / activité mixte' },
];

const FORME_JURIDIQUE_OPTIONS = [
  { value: 'eurl', label: 'EURL' },
  { value: 'sasu', label: 'SASU' },
  { value: 'sarl_sas', label: 'SARL / SAS' },
  { value: 'sel', label: "SEL (Société d'Exercice Libéral)" },
];

const CATEGORIE_METIER_OPTIONS = [
  { value: 'manuels_terrain', label: '🔧 Manuels / Terrain' },
  { value: 'sante_soin', label: '🧑‍⚕️ Santé / Soin' },
  { value: 'culture_creation', label: '🎭 Culture / Création' },
  { value: 'education_asso', label: '👩‍🏫 Éducation / Association' },
  { value: 'liberaux_cadres', label: '💼 Libéraux / Cadres' },
  { value: 'mobilite_specifiques', label: '🧳 Mobilité / Spécifiques' },
];

const SITUATION_FAMILIALE_OPTIONS = [
  { value: 'celibataire', label: 'Célibataire' },
  { value: 'couple', label: 'En couple (mariage / PACS / concubinage)' },
  { value: 'parent_isole', label: 'Parent isolé' },
  { value: 'divorce', label: 'Divorcé(e)' },
];

interface FormData {
  situation_principale: SituationPrincipale | '';
  activite_type: string;
  forme_juridique: string;
  metier_categorie: string;
  metier_id: string;
  situation_familiale: string;
  a_enfants: 'oui' | 'non' | '';
  nb_enfants_charge: number;
  personne_handicap: boolean;
  aidant_familial: boolean;
  pension_alimentaire: boolean;
  primo_declarant: boolean;
}

interface MetierRow {
  id: string;
  nom: string;
  icone: string | null;
}

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [prenom, setPrenom] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [metiers, setMetiers] = useState<MetierRow[]>([]);
  const [metiersLoading, setMetiersLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    situation_principale: '',
    activite_type: '',
    forme_juridique: '',
    metier_categorie: '',
    metier_id: '',
    situation_familiale: '',
    a_enfants: '',
    nb_enfants_charge: 0,
    personne_handicap: false,
    aidant_familial: false,
    pension_alimentaire: false,
    primo_declarant: false,
  });

  // Charger profil existant
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'prenom, onboarding_done, situation_principale, activite_type, forme_juridique, metier_categorie, metier_id, situation_familiale, nb_enfants_charge, personne_handicap, aidant_familial, pension_alimentaire, primo_declarant'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error('Impossible de charger votre profil.');
        setLoading(false);
        return;
      }

      if (data?.onboarding_done) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setPrenom(data?.prenom ?? '');
      setFormData((prev) => ({
        ...prev,
        situation_principale: (data?.situation_principale as SituationPrincipale) ?? '',
        activite_type: data?.activite_type ?? '',
        forme_juridique: data?.forme_juridique ?? '',
        metier_categorie: data?.metier_categorie ?? '',
        metier_id: data?.metier_id ?? '',
        situation_familiale: data?.situation_familiale ?? '',
        a_enfants: data?.nb_enfants_charge && data.nb_enfants_charge > 0 ? 'oui' : prev.a_enfants,
        nb_enfants_charge: data?.nb_enfants_charge ?? 0,
        personne_handicap: data?.personne_handicap ?? false,
        aidant_familial: data?.aidant_familial ?? false,
        pension_alimentaire: data?.pension_alimentaire ?? false,
        primo_declarant: data?.primo_declarant ?? false,
      }));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  // Charger les métiers selon la catégorie choisie (écran 3)
  useEffect(() => {
    if (!formData.metier_categorie) {
      setMetiers([]);
      return;
    }
    let cancelled = false;
    setMetiersLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('metiers')
        .select('id, nom, icone')
        .eq('categorie', formData.metier_categorie)
        .eq('is_active', true)
        .order('order_display', { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error('Impossible de charger les métiers.');
        setMetiers([]);
      } else {
        setMetiers((data as MetierRow[]) ?? []);
      }
      setMetiersLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.metier_categorie]);

  const needsActivityScreen =
    formData.situation_principale === 'independant' ||
    formData.situation_principale === 'dirigeant';

  // Le numéro réel d'écran à rendre. On "skip" l'écran 2 si non concerné.
  const visibleStepLabel = useMemo(() => {
    // Pour l'affichage de la barre de progression, on garde l'index logique 1..7
    return currentStep;
  }, [currentStep]);

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!formData.situation_principale;
      case 2:
        if (!needsActivityScreen) return true; // sera skip
        if (!formData.activite_type) return false;
        if (formData.situation_principale === 'dirigeant' && !formData.forme_juridique) return false;
        return true;
      case 3:
        return !!formData.metier_categorie && !!formData.metier_id;
      case 4:
        if (!formData.situation_familiale) return false;
        if (!formData.a_enfants) return false;
        if (formData.a_enfants === 'oui' && (!formData.nb_enfants_charge || formData.nb_enfants_charge < 1)) return false;
        return true;
      default:
        return true;
    }
  };

  const persistStep = async (): Promise<boolean> => {
    if (!user) return false;
    let patch: Record<string, unknown> = {};

    switch (currentStep) {
      case 1:
        patch = { situation_principale: formData.situation_principale };
        break;
      case 2:
        if (!needsActivityScreen) return true;
        patch = {
          activite_type: formData.activite_type,
          forme_juridique:
            formData.situation_principale === 'dirigeant' ? formData.forme_juridique : null,
        };
        break;
      case 3:
        patch = {
          metier_categorie: formData.metier_categorie,
          metier_id: formData.metier_id,
        };
        break;
      case 4:
        patch = {
          situation_familiale: formData.situation_familiale,
          nb_enfants_charge: formData.a_enfants === 'oui' ? formData.nb_enfants_charge : 0,
          personne_handicap: formData.personne_handicap,
          aidant_familial: formData.aidant_familial,
          pension_alimentaire: formData.pension_alimentaire,
          primo_declarant: formData.primo_declarant,
        };
        break;
      default:
        return true;
    }

    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (error) {
      toast.error('Erreur lors de la sauvegarde. Réessayez.');
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (!canGoNext()) return;
    setSaving(true);
    const ok = await persistStep();
    setSaving(false);
    if (!ok) return;

    toast.success('Réponses enregistrées', { duration: 1500 });

    let next = currentStep + 1;
    // Skip écran 2 si non concerné
    if (next === 2 && !needsActivityScreen) next = 3;
    if (next > TOTAL_STEPS) {
      // Pour l'instant, écrans 5-8 non implémentés : on reste sur écran 4 max.
      // (rien à faire ici, le bouton Suivant ne devrait pas dépasser 4 dans ce prompt)
      return;
    }
    setCurrentStep(next);
  };

  const handlePrev = () => {
    let prev = currentStep - 1;
    if (prev === 2 && !needsActivityScreen) prev = 1;
    if (prev < 1) prev = 1;
    setCurrentStep(prev);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
        <Skeleton className="h-96 w-full max-w-[680px] rounded-2xl" />
      </div>
    );
  }

  const progressValue = (visibleStepLabel / TOTAL_STEPS) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-[840px] items-center justify-between px-6 py-4">
          <div className="font-heading text-lg font-bold text-foreground">
            Impôts Facile
          </div>
          <div className="text-sm text-muted-foreground">
            Personnalisons votre expérience
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto w-full max-w-[680px] px-6 pt-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Étape {visibleStepLabel} sur {TOTAL_STEPS}
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round(progressValue)}%
          </span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col px-6 py-8">
        <Card className="rounded-2xl border-border bg-background shadow-md">
          <CardContent className="p-8">
            {currentStep === 1 && (
              <Step1
                value={formData.situation_principale}
                onChange={(v) =>
                  setFormData((p) => ({ ...p, situation_principale: v }))
                }
                prenom={prenom}
              />
            )}
            {currentStep === 2 && needsActivityScreen && (
              <Step2
                activite={formData.activite_type}
                onActiviteChange={(v) =>
                  setFormData((p) => ({ ...p, activite_type: v }))
                }
                showForme={formData.situation_principale === 'dirigeant'}
                forme={formData.forme_juridique}
                onFormeChange={(v) =>
                  setFormData((p) => ({ ...p, forme_juridique: v }))
                }
              />
            )}
            {currentStep === 3 && (
              <Step3
                categorie={formData.metier_categorie}
                onCategorieChange={(v) =>
                  setFormData((p) => ({ ...p, metier_categorie: v, metier_id: '' }))
                }
                metierId={formData.metier_id}
                onMetierChange={(v) =>
                  setFormData((p) => ({ ...p, metier_id: v }))
                }
                metiers={metiers}
                metiersLoading={metiersLoading}
              />
            )}
            {currentStep === 4 && (
              <Step4
                data={formData}
                onChange={(patch) => setFormData((p) => ({ ...p, ...patch }))}
              />
            )}
          </CardContent>
        </Card>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={saving}
              >
                ← Retour
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            disabled={!canGoNext() || saving}
          >
            {saving ? 'Enregistrement...' : 'Suivant →'}
          </Button>
        </div>
      </main>
    </div>
  );
};

/* ===================== Step 1 ===================== */
function Step1({
  value,
  onChange,
  prenom,
}: {
  value: SituationPrincipale | '';
  onChange: (v: SituationPrincipale) => void;
  prenom: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Bonjour{prenom ? ` ${prenom}` : ''} 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Quelle est votre situation principale en 2025 ?
        </p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as SituationPrincipale)}
        className="space-y-3"
      >
        {SITUATION_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            htmlFor={`sit-${opt.value}`}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
              value === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <RadioGroupItem value={opt.value} id={`sit-${opt.value}`} />
            <span className="text-sm font-medium text-foreground">{opt.label}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

/* ===================== Step 2 ===================== */
function Step2({
  activite,
  onActiviteChange,
  showForme,
  forme,
  onFormeChange,
}: {
  activite: string;
  onActiviteChange: (v: string) => void;
  showForme: boolean;
  forme: string;
  onFormeChange: (v: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Quelle est la nature de votre activité ?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sélectionnez la catégorie qui correspond le mieux.
        </p>
      </div>

      <RadioGroup
        value={activite}
        onValueChange={onActiviteChange}
        className="grid gap-2 sm:grid-cols-2"
      >
        {ACTIVITE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            htmlFor={`act-${opt.value}`}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm transition-colors ${
              activite === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <RadioGroupItem value={opt.value} id={`act-${opt.value}`} />
            <span className="font-medium text-foreground">{opt.label}</span>
          </label>
        ))}
      </RadioGroup>

      {showForme && (
        <div className="space-y-3 border-t border-border pt-6">
          <h3 className="font-heading text-base font-semibold text-foreground">
            Forme juridique de votre société ?
          </h3>
          <RadioGroup
            value={forme}
            onValueChange={onFormeChange}
            className="grid gap-2 sm:grid-cols-2"
          >
            {FORME_JURIDIQUE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                htmlFor={`forme-${opt.value}`}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm transition-colors ${
                  forme === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value={opt.value} id={`forme-${opt.value}`} />
                <span className="font-medium text-foreground">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      )}
    </div>
  );
}

/* ===================== Step 3 ===================== */
function Step3({
  categorie,
  onCategorieChange,
  metierId,
  onMetierChange,
  metiers,
  metiersLoading,
}: {
  categorie: string;
  onCategorieChange: (v: string) => void;
  metierId: string;
  onMetierChange: (v: string) => void;
  metiers: MetierRow[];
  metiersLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Votre métier principal
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisissez d'abord la catégorie, puis votre métier précis.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Catégorie</Label>
        <Select value={categorie} onValueChange={onCategorieChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIE_METIER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categorie && (
        <div className="space-y-2">
          <Label>Métier précis</Label>
          {metiersLoading ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : metiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun métier disponible pour cette catégorie.
            </p>
          ) : (
            <Select value={metierId} onValueChange={onMetierChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre métier" />
              </SelectTrigger>
              <SelectContent>
                {metiers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.icone ? `${m.icone} ` : ''}
                    {m.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

/* ===================== Step 4 ===================== */
function Step4({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Votre situation familiale
        </h2>
      </div>

      {/* Q1 */}
      <div className="space-y-3">
        <Label>Situation</Label>
        <RadioGroup
          value={data.situation_familiale}
          onValueChange={(v) => onChange({ situation_familiale: v })}
          className="grid gap-2 sm:grid-cols-2"
        >
          {SITUATION_FAMILIALE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`fam-${opt.value}`}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm transition-colors ${
                data.situation_familiale === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <RadioGroupItem value={opt.value} id={`fam-${opt.value}`} />
              <span className="font-medium text-foreground">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Q2 */}
      <div className="space-y-3">
        <Label>Avez-vous des enfants à charge ?</Label>
        <RadioGroup
          value={data.a_enfants}
          onValueChange={(v) =>
            onChange({
              a_enfants: v as 'oui' | 'non',
              nb_enfants_charge: v === 'non' ? 0 : data.nb_enfants_charge || 1,
            })
          }
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="oui" id="enf-oui" />
            <Label htmlFor="enf-oui" className="cursor-pointer font-normal">Oui</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="non" id="enf-non" />
            <Label htmlFor="enf-non" className="cursor-pointer font-normal">Non</Label>
          </div>
        </RadioGroup>

        {data.a_enfants === 'oui' && (
          <div className="space-y-2">
            <Label htmlFor="nb-enfants">Combien d'enfants ?</Label>
            <Input
              id="nb-enfants"
              type="number"
              min={1}
              max={10}
              value={data.nb_enfants_charge || ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                onChange({
                  nb_enfants_charge: isNaN(n) ? 0 : Math.min(10, Math.max(1, n)),
                });
              }}
              className="max-w-[160px]"
            />
          </div>
        )}
      </div>

      {/* Q3 */}
      <div className="space-y-3">
        <Label>Situation particulière ? (plusieurs choix possibles)</Label>
        <div className="space-y-2">
          {[
            { key: 'personne_handicap' as const, label: 'Personne en situation de handicap' },
            { key: 'aidant_familial' as const, label: 'Aidant familial' },
            { key: 'pension_alimentaire' as const, label: "J'ai versé ou reçu une pension alimentaire en 2025" },
            { key: 'primo_declarant' as const, label: "C'est ma première déclaration d'impôts" },
          ].map((item) => (
            <label
              key={item.key}
              htmlFor={`chk-${item.key}`}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm hover:border-primary/40"
            >
              <Checkbox
                id={`chk-${item.key}`}
                checked={data[item.key] as boolean}
                onCheckedChange={(checked) =>
                  onChange({ [item.key]: checked === true } as Partial<FormData>)
                }
              />
              <span className="font-medium text-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
