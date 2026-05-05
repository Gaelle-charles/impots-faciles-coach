import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { Sparkles, Target, ShieldCheck, Clock, Check, Loader2, X, Plus, FileText, Briefcase, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { recalculerMatching } from '@/lib/matching';
import { useOrgRole } from '@/hooks/useOrgRole';
import { Link } from 'react-router-dom';
import { CheckoutAcceptanceDialog } from '@/components/CheckoutAcceptanceDialog';

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

const REVENUS_COMPL_OPTIONS = [
  { key: 'a_activite_secondaire', label: "Une activité secondaire (freelance, job d'appoint...)" },
  { key: 'a_revenus_fonciers_nus', label: 'Des revenus locatifs nus (location vide)' },
  { key: 'a_revenus_lmnp', label: 'Des revenus locatifs meublés (LMNP / LMP)' },
  { key: 'a_placements', label: 'Des placements financiers (dividendes, plus-values...)' },
  { key: 'a_revenus_etrangers', label: "Des revenus ou des comptes à l'étranger" },
  { key: 'a_investissements_defisc', label: 'Des investissements défiscalisants (Pinel, PER, Madelin...)' },
] as const;

const SITUATION_INTL_OPTIONS = [
  { value: 'frontalier', label: 'Je suis frontalier(ère) (Belgique/Suisse/Luxembourg)' },
  { value: 'revenus_etranger', label: "J'ai des revenus d'un pays étranger" },
  { value: 'expat_retour', label: 'Je suis expatrié de retour en France' },
  { value: 'drom', label: 'Je réside en Outre-Mer (DROM)' },
  { value: 'non_resident', label: 'Je suis non-résident avec revenus en France' },
];

const ZONES_OPTIONS = [
  { value: 'afrique', label: '🌍 Afrique' },
  { value: 'asie', label: '🌏 Asie' },
  { value: 'europe', label: '🇪🇺 Europe' },
  { value: 'ameriques', label: '🌎 Amériques' },
  { value: 'moyen_orient', label: '🌍 Moyen-Orient' },
];

const TRANCHE_REVENUS_OPTIONS = [
  { value: 'moins_20k', label: 'Moins de 20 000 €' },
  { value: '20k_40k', label: '20 000 - 40 000 €' },
  { value: '40k_80k', label: '40 000 - 80 000 €' },
  { value: '80k_150k', label: '80 000 - 150 000 €' },
  { value: 'plus_150k', label: 'Plus de 150 000 € (⚠️ potentiellement concerné par la CDHR)' },
  { value: 'non_precise', label: 'Je préfère ne pas répondre' },
];

const PLANS = [
  { slug: 'starter', name: 'Starter', price: 49, features: ['7 modules pédagogiques', 'Contenu personnalisé', 'Simulateur de frais'] },
  { slug: 'expert', name: 'Expert', price: 99, features: ['Tout Starter +', 'Fiches profil contribuable', 'Fiches métier', 'Parcours adaptatif IA'] },
  { slug: 'premium', name: 'Premium', price: 159, features: ['Tout Expert +', 'Parcours pédagogique IA personnalisé', '5 webinaires thématiques'] },
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
  // Step 5
  a_activite_secondaire: boolean;
  a_revenus_fonciers_nus: boolean;
  a_revenus_lmnp: boolean;
  a_placements: boolean;
  a_revenus_etrangers: boolean;
  a_investissements_defisc: boolean;
  aucun_revenu_compl: boolean;
  // Step 6
  situation_internationale: string;
  pays_concernes: string[];
  // Step 7
  tranche_revenus: string;
}

interface MetierRow {
  id: string;
  nom: string;
  icone: string | null;
}

interface PaysRow {
  id: string;
  nom: string;
  icone: string | null;
  zone: string;
}

const REVENUS_KEYS: (keyof FormData)[] = [
  'a_activite_secondaire',
  'a_revenus_fonciers_nus',
  'a_revenus_lmnp',
  'a_placements',
  'a_revenus_etrangers',
  'a_investissements_defisc',
];

function calculerScore(p: FormData): number {
  let s = 0;
  if (p.situation_principale === 'independant') s += 3;
  if (p.situation_principale === 'dirigeant') s += 6;
  if (p.situation_principale === 'retraite') s += 1;

  if (p.a_activite_secondaire) s += 2;
  if (p.a_revenus_fonciers_nus) s += 1;
  if (p.a_revenus_lmnp) s += 2;
  if (p.a_placements) s += 2;
  if (p.a_revenus_etrangers) s += 3;
  if (p.a_investissements_defisc) s += 2;

  if (p.situation_familiale === 'parent_isole') s += 1;
  if (p.personne_handicap) s += 1;
  if (p.pension_alimentaire) s += 1;

  if (p.situation_internationale === 'frontalier') s += 2;
  if (p.situation_internationale === 'expat_retour') s += 3;
  if (p.situation_internationale === 'non_resident') s += 3;

  if (p.tranche_revenus === '40k_80k') s += 1;
  if (p.tranche_revenus === '80k_150k') s += 2;
  if (p.tranche_revenus === 'plus_150k') s += 4;

  return s;
}

function getRecommendedPlan(score: number): 'starter' | 'expert' | 'premium' {
  if (score <= 3) return 'starter';
  if (score <= 8) return 'expert';
  return 'premium';
}

function getProfilLabel(p: FormData, metierNom?: string, paysNoms?: string[]): string {
  const parts: string[] = [];

  const baseMap: Record<string, string> = {
    salarie: 'Salarié(e)',
    independant: 'Indépendant(e)',
    dirigeant: 'Dirigeant(e) de société',
    retraite: 'Retraité(e)',
    etudiant: 'Étudiant(e) / Jeune actif',
    sans_activite: 'Sans activité',
  };
  parts.push(baseMap[p.situation_principale] ?? 'Contribuable');

  if (metierNom && (p.situation_principale === 'independant' || p.situation_principale === 'dirigeant')) {
    parts[0] = `${metierNom}`;
  }

  const compl: string[] = [];
  if (p.a_revenus_lmnp) compl.push('revenus locatifs meublés');
  if (p.a_revenus_fonciers_nus) compl.push('revenus locatifs nus');
  if (p.a_placements) compl.push('placements financiers');
  if (p.a_activite_secondaire) compl.push('activité secondaire');
  if (p.a_investissements_defisc) compl.push('investissements défiscalisants');

  let sentence = parts[0];
  if (compl.length > 0) {
    sentence += ` avec ${compl.slice(0, 2).join(' et ')}`;
  }

  if (p.a_revenus_etrangers || p.situation_internationale) {
    if (paysNoms && paysNoms.length > 0) {
      sentence += ` et situation internationale (${paysNoms.join(', ')})`;
    } else if (p.situation_internationale === 'drom') {
      sentence += ' résidant en Outre-Mer';
    } else {
      sentence += ' avec situation internationale';
    }
  }

  if (p.tranche_revenus === 'plus_150k') sentence += ' — hauts revenus';

  return sentence;
}

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === '1';
  const { org, isOrgAdmin, hasLicense, loading: orgLoading } = useOrgRole();
  const [loading, setLoading] = useState(true);
  const [prenom, setPrenom] = useState('');
  const [currentStep, setCurrentStep] = useState(editMode ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [metiers, setMetiers] = useState<MetierRow[]>([]);
  const [metiersLoading, setMetiersLoading] = useState(false);

  // Step 6 — pays
  const [paysSelectors, setPaysSelectors] = useState<{ zone: string; paysId: string }[]>([
    { zone: '', paysId: '' },
  ]);
  const [paysByZone, setPaysByZone] = useState<Record<string, PaysRow[]>>({});
  const [paysLoadingZone, setPaysLoadingZone] = useState<Record<string, boolean>>({});

  // Step 8 — résultat
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalPlan, setFinalPlan] = useState<'starter' | 'expert' | 'premium'>('starter');
  const [finalLabel, setFinalLabel] = useState('');
  const [matchCounts, setMatchCounts] = useState<{ profils: number; metiers: number; pays: number }>({ profils: 0, metiers: 0, pays: 0 });
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

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
    a_activite_secondaire: false,
    a_revenus_fonciers_nus: false,
    a_revenus_lmnp: false,
    a_placements: false,
    a_revenus_etrangers: false,
    a_investissements_defisc: false,
    aucun_revenu_compl: false,
    situation_internationale: '',
    pays_concernes: [],
    tranche_revenus: '',
  });

  // Charger profil existant
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'prenom, onboarding_done, situation_principale, activite_type, forme_juridique, metier_categorie, metier_id, situation_familiale, nb_enfants_charge, personne_handicap, aidant_familial, pension_alimentaire, primo_declarant, a_activite_secondaire, a_revenus_fonciers_nus, a_revenus_lmnp, a_placements, a_revenus_etrangers, a_investissements_defisc, situation_internationale, pays_concernes, tranche_revenus'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error('Impossible de charger votre profil.');
        setLoading(false);
        return;
      }

      if (data?.onboarding_done && !editMode) {
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
        a_activite_secondaire: data?.a_activite_secondaire ?? false,
        a_revenus_fonciers_nus: data?.a_revenus_fonciers_nus ?? false,
        a_revenus_lmnp: data?.a_revenus_lmnp ?? false,
        a_placements: data?.a_placements ?? false,
        a_revenus_etrangers: data?.a_revenus_etrangers ?? false,
        a_investissements_defisc: data?.a_investissements_defisc ?? false,
        situation_internationale: data?.situation_internationale ?? '',
        pays_concernes: (data?.pays_concernes as string[]) ?? [],
        tranche_revenus: data?.tranche_revenus ?? '',
      }));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  // Charger les métiers
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

  const needsIntlScreen = formData.a_revenus_etrangers === true;

  // Charger pays pour une zone donnée
  const loadPaysForZone = async (zone: string) => {
    if (!zone || paysByZone[zone]) return;
    setPaysLoadingZone((prev) => ({ ...prev, [zone]: true }));
    const { data, error } = await supabase
      .from('pays')
      .select('id, nom, icone, zone, type')
      .eq('zone', zone)
      .eq('is_active', true)
      .order('order_display', { ascending: true });
    setPaysLoadingZone((prev) => ({ ...prev, [zone]: false }));
    if (error) {
      console.error('Erreur chargement pays:', error);
      toast.error('Impossible de charger la liste des pays.', {
        description: error.message,
      });
      return;
    }
    setPaysByZone((prev) => ({ ...prev, [zone]: (data as PaysRow[]) ?? [] }));
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!formData.situation_principale;
      case 2:
        if (!needsActivityScreen) return true;
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
      case 5: {
        if (formData.aucun_revenu_compl) return true;
        return REVENUS_KEYS.some((k) => formData[k] === true);
      }
      case 6: {
        if (!formData.situation_internationale) return false;
        if (formData.situation_internationale === 'drom') return true;
        return formData.pays_concernes.length > 0;
      }
      case 7:
        return !!formData.tranche_revenus;
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
      case 5:
        patch = {
          a_activite_secondaire: formData.a_activite_secondaire,
          a_revenus_fonciers_nus: formData.a_revenus_fonciers_nus,
          a_revenus_lmnp: formData.a_revenus_lmnp,
          a_placements: formData.a_placements,
          a_revenus_etrangers: formData.a_revenus_etrangers,
          a_investissements_defisc: formData.a_investissements_defisc,
        };
        break;
      case 6:
        patch = {
          situation_internationale: formData.situation_internationale,
          pays_concernes:
            formData.situation_internationale === 'drom' ? [] : formData.pays_concernes,
        };
        break;
      case 7:
        patch = { tranche_revenus: formData.tranche_revenus };
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

  const finalizeAndShowResult = async () => {
    if (!user) return;
    if (!user) return;
    const score = calculerScore(formData);
    const plan = getRecommendedPlan(score);

    // 1. UPDATE des réponses brutes de l'écran 7 (tranche_revenus)
    const { error: trancheError } = await supabase
      .from('profiles')
      .update({ tranche_revenus: formData.tranche_revenus })
      .eq('id', user.id);
    if (trancheError) {
      console.error('UPDATE tranche_revenus error:', trancheError);
      toast.error('Erreur lors de la sauvegarde de la tranche de revenus.');
      return;
    }

    // 2. UPDATE scoring + plan_recommande
    const { error: scoreError } = await supabase
      .from('profiles')
      .update({
        plan_recommande: plan,
        score_complexite: score,
      })
      .eq('id', user.id);
    if (scoreError) {
      console.error('UPDATE score/plan error:', scoreError);
      toast.error('Erreur lors du calcul du plan recommandé.');
      return;
    }

    // 3. Recalcul du matching profils / métiers (APRÈS les UPDATE ci-dessus)
    await recalculerMatching(user.id);

    // 4. Re-SELECT pour récupérer les valeurs fraichement calculées
    const { data: refreshed, error: selectError } = await supabase
      .from('profiles')
      .select('profils_detectes, metiers_detectes, pays_concernes')
      .eq('id', user.id)
      .maybeSingle();
    if (selectError) {
      console.error('SELECT profil rafraîchi error:', selectError);
    }

    // Récupérer noms métier et pays pour le label
    let metierNom: string | undefined;
    if (formData.metier_id) {
      const m = metiers.find((x) => x.id === formData.metier_id);
      if (m) metierNom = m.nom;
      else {
        const { data } = await supabase
          .from('metiers')
          .select('nom')
          .eq('id', formData.metier_id)
          .maybeSingle();
        metierNom = data?.nom;
      }
    }

    let paysNoms: string[] = [];
    if (formData.pays_concernes.length > 0) {
      const { data } = await supabase
        .from('pays')
        .select('nom')
        .in('id', formData.pays_concernes);
      paysNoms = (data ?? []).map((p) => p.nom);
    }

    const label = getProfilLabel(formData, metierNom, paysNoms);

    // 5. UPDATE onboarding_done + onboarding_completed_at
    const { error: doneError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_done: true,
      })
      .eq('id', user.id);
    if (doneError) {
      console.error('UPDATE onboarding_done error:', doneError);
      toast.error('Erreur lors de la finalisation. Réessayez.');
      return;
    }

    setMatchCounts({
      profils: refreshed?.profils_detectes?.length ?? 0,
      metiers: refreshed?.metiers_detectes?.length ?? 0,
      pays: refreshed?.pays_concernes?.length ?? 0,
    });

    // 6. Navigation vers l'écran 8
    setFinalScore(score);
    setFinalPlan(plan);
    setFinalLabel(label);
    setCurrentStep(8);
  };

  const handleNext = async () => {
    if (!canGoNext()) return;
    setSaving(true);
    const ok = await persistStep();
    setSaving(false);
    if (!ok) return;

    toast.success('Réponses enregistrées', { duration: 1200 });

    // Step 7 → finalisation
    if (currentStep === 7) {
      setSaving(true);
      if (editMode) {
        // En mode édition : on sauvegarde + recalcule le matching, sans checkout
        await supabase
          .from('profiles')
          .update({ tranche_revenus: formData.tranche_revenus })
          .eq('id', user!.id);
        await recalculerMatching(user!.id);
        toast.success('Profil mis à jour ✓');
        setSaving(false);
        navigate('/profil');
        return;
      }
      await finalizeAndShowResult();
      setSaving(false);
      return;
    }

    let next = currentStep + 1;
    if (next === 2 && !needsActivityScreen) next = 3;
    if (next === 6 && !needsIntlScreen) next = 7;
    if (next > TOTAL_STEPS) return;
    setCurrentStep(next);
  };

  const handlePrev = () => {
    let prev = currentStep - 1;
    if (prev === 6 && !needsIntlScreen) prev = 5;
    if (prev === 2 && !needsActivityScreen) prev = 1;
    if (prev < 1) prev = 1;
    setCurrentStep(prev);
  };

  // Step 5 handlers
  const toggleRevenu = (key: typeof REVENUS_COMPL_OPTIONS[number]['key'], checked: boolean) => {
    setFormData((p) => ({
      ...p,
      [key]: checked,
      aucun_revenu_compl: checked ? false : p.aucun_revenu_compl,
    }));
  };
  const toggleAucun = (checked: boolean) => {
    setFormData((p) => ({
      ...p,
      aucun_revenu_compl: checked,
      ...(checked
        ? {
            a_activite_secondaire: false,
            a_revenus_fonciers_nus: false,
            a_revenus_lmnp: false,
            a_placements: false,
            a_revenus_etrangers: false,
            a_investissements_defisc: false,
          }
        : {}),
    }));
  };

  // Step 6 handlers
  const updateSelector = (idx: number, patch: Partial<{ zone: string; paysId: string }>) => {
    setPaysSelectors((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      if (patch.zone !== undefined) next[idx].paysId = '';
      return next;
    });
    if (patch.zone) loadPaysForZone(patch.zone);
  };
  const addSelector = () => setPaysSelectors((p) => [...p, { zone: '', paysId: '' }]);
  const removeSelector = (idx: number) =>
    setPaysSelectors((p) => p.filter((_, i) => i !== idx));

  // Sync pays_concernes depuis paysSelectors
  useEffect(() => {
    const ids = Array.from(
      new Set(paysSelectors.map((s) => s.paysId).filter((id) => !!id))
    );
    setFormData((p) => {
      if (
        p.pays_concernes.length === ids.length &&
        p.pays_concernes.every((id, i) => ids[i] === id)
      ) {
        return p;
      }
      return { ...p, pays_concernes: ids };
    });
  }, [paysSelectors]);

  // Hydrater paysSelectors depuis pays_concernes existants
  useEffect(() => {
    if (currentStep !== 6) return;
    if (formData.pays_concernes.length === 0) return;
    if (paysSelectors.some((s) => s.paysId)) return;
    (async () => {
      const { data } = await supabase
        .from('pays')
        .select('id, nom, icone, zone')
        .in('id', formData.pays_concernes);
      if (!data) return;
      const zones = Array.from(new Set(data.map((p) => p.zone)));
      await Promise.all(zones.map((z) => loadPaysForZone(z)));
      setPaysSelectors(data.map((p) => ({ zone: p.zone, paysId: p.id })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleCheckout = (planSlug: string) => {
    // Ouvre le dialogue d'acceptation (CGV/CGU/renonciation) avant la redirection Stripe
    setPendingPlan(planSlug);
  };

  const confirmCheckout = async (acceptances: {
    cgv_accepted_at: string;
    cgu_accepted_at: string;
    waiver_accepted_at: string;
    coupon_code?: string;
  }) => {
    if (!pendingPlan) return;
    try {
      setCheckoutLoading(pendingPlan);
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: pendingPlan, ...acceptances },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('URL Stripe manquante');
      window.location.href = data.url;
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Erreur de paiement';
      toast.error('Erreur de paiement', { description: m });
      setCheckoutLoading(null);
      setPendingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
        <Skeleton className="h-96 w-full max-w-[680px] rounded-2xl" />
      </div>
    );
  }

  const showProgress = currentStep >= 1 && currentStep <= TOTAL_STEPS;
  const progressValue = (currentStep / TOTAL_STEPS) * 100;
  const isResult = currentStep === 8;

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-[840px] items-center justify-between px-6 py-4">
          <div className="font-heading text-lg font-bold text-foreground">Impôts Facile</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {editMode ? 'Modification de votre profil' : 'Personnalisons votre expérience'}
            </div>
            {editMode && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/profil')}>
                Annuler
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Progress */}
      {showProgress && (
        <div className="mx-auto w-full max-w-[680px] px-6 pt-8">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Étape {currentStep} sur {TOTAL_STEPS}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      )}

      {/* Content */}
      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8',
          isResult ? 'max-w-7xl' : 'max-w-[680px]'
        )}
      >
        <Card className="rounded-2xl border-border bg-background shadow-md">
          <CardContent className={cn(isResult ? 'p-8 sm:p-10' : 'p-8')}>
            {currentStep === 0 && <Step0 prenom={prenom} />}
            {currentStep === 1 && (
              <Step1
                value={formData.situation_principale}
                onChange={(v) => setFormData((p) => ({ ...p, situation_principale: v }))}
                prenom={prenom}
              />
            )}
            {currentStep === 2 && needsActivityScreen && (
              <Step2
                activite={formData.activite_type}
                onActiviteChange={(v) => setFormData((p) => ({ ...p, activite_type: v }))}
                showForme={formData.situation_principale === 'dirigeant'}
                forme={formData.forme_juridique}
                onFormeChange={(v) => setFormData((p) => ({ ...p, forme_juridique: v }))}
              />
            )}
            {currentStep === 3 && (
              <Step3
                categorie={formData.metier_categorie}
                onCategorieChange={(v) =>
                  setFormData((p) => ({ ...p, metier_categorie: v, metier_id: '' }))
                }
                metierId={formData.metier_id}
                onMetierChange={(v) => setFormData((p) => ({ ...p, metier_id: v }))}
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
            {currentStep === 5 && (
              <Step5
                data={formData}
                onToggleRevenu={toggleRevenu}
                onToggleAucun={toggleAucun}
              />
            )}
            {currentStep === 6 && (
              <Step6
                situation={formData.situation_internationale}
                onSituationChange={(v) =>
                  setFormData((p) => ({ ...p, situation_internationale: v }))
                }
                selectors={paysSelectors}
                paysByZone={paysByZone}
                paysLoadingZone={paysLoadingZone}
                onUpdateSelector={updateSelector}
                onAddSelector={addSelector}
                onRemoveSelector={removeSelector}
              />
            )}
            {currentStep === 7 && (
              <Step7
                value={formData.tranche_revenus}
                onChange={(v) => setFormData((p) => ({ ...p, tranche_revenus: v }))}
              />
            )}
            {currentStep === 8 && finalScore !== null && (
              <Step8
                profilLabel={finalLabel}
                plan={finalPlan}
                score={finalScore}
                formData={formData}
                matchCounts={matchCounts}
                onCheckout={handleCheckout}
                checkoutLoading={checkoutLoading}
                onSkip={() => navigate('/dashboard')}
                prenom={prenom}
                org={org}
                isOrgAdmin={isOrgAdmin}
                hasOrgLicense={hasLicense}
                orgLoading={orgLoading}
                onNavigate={(to) => navigate(to)}
              />
            )}
          </CardContent>
        </Card>

        {/* Footer actions */}
        {currentStep === 0 && (
          <div className="mt-6 flex justify-center">
            <Button size="lg" variant="cta" onClick={() => setCurrentStep(1)}>
              Commencer le questionnaire →
            </Button>
          </div>
        )}

        {currentStep >= 1 && currentStep <= TOTAL_STEPS && (
          <div className="mt-6 flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={handlePrev} disabled={saving}>
                  ← Retour
                </Button>
              )}
            </div>
            <Button onClick={handleNext} disabled={!canGoNext() || saving}>
              {saving
                ? 'Enregistrement...'
                : currentStep === 7
                ? 'Voir ma recommandation →'
                : 'Suivant →'}
            </Button>
          </div>
        )}
      </main>

      <CheckoutAcceptanceDialog
        open={pendingPlan !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingPlan(null);
            setCheckoutLoading(null);
          }
        }}
        planLabel={PLANS.find((p) => p.slug === pendingPlan)?.name ?? ''}
        planPrice={PLANS.find((p) => p.slug === pendingPlan)?.price ?? 0}
        planSlug={pendingPlan ?? ''}
        loading={checkoutLoading !== null}
        onConfirm={confirmCheckout}
      />
    </div>
  );
};

/* ===================== Step 0 (Welcome) ===================== */
function Step0({ prenom }: { prenom: string }) {
  return (
    <div className="space-y-8 text-center animate-in fade-in duration-500">
      <div className="text-6xl" aria-hidden>🎉</div>
      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
          {prenom ? `Bienvenue sur Impôts Facile, ${prenom} !` : 'Bienvenue sur Impôts Facile !'}
        </h1>
        <p className="text-lg text-muted-foreground">
          Personnalisons votre expérience en 2 minutes
        </p>
      </div>

      <div className="space-y-4 rounded-xl bg-secondary/50 p-6 text-left">
        {[
          { Icon: Sparkles, title: 'Personnalisation', text: 'Nous allons vous poser quelques questions pour adapter le contenu à votre situation' },
          { Icon: Target, title: 'Recommandation', text: 'À la fin, nous vous suggérerons le plan le plus adapté à votre profil' },
          { Icon: ShieldCheck, title: 'Confidentialité', text: 'Vos réponses sont stockées de manière sécurisée et modifiables à tout moment dans votre profil' },
        ].map(({ Icon, title, text }) => (
          <div key={title} className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Environ 2-3 minutes</span>
        </div>
      </div>
    </div>
  );
}

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
          <div key={opt.value}>
            <label
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
            {opt.value === 'dirigeant' && value === 'dirigeant' && (
              <div className="mt-2 ml-2 rounded-lg border border-yellow-vivid/40 bg-yellow-vivid/10 p-3 text-xs leading-relaxed text-foreground">
                ⚠️ Impôts Facile traite uniquement votre <strong>déclaration personnelle</strong>{' '}
                (IR, salaires + dividendes perçus). Pour la fiscalité de votre société (IS, BIC
                professionnel, TVA d'entreprise…), consultez un expert-comptable.
              </div>
            )}
          </div>
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
        <h2 className="font-heading text-xl font-bold text-foreground">Votre métier principal</h2>
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
        <h2 className="font-heading text-xl font-bold text-foreground">Votre situation familiale</h2>
      </div>

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

/* ===================== Step 5 — Revenus complémentaires ===================== */
function Step5({
  data,
  onToggleRevenu,
  onToggleAucun,
}: {
  data: FormData;
  onToggleRevenu: (key: typeof REVENUS_COMPL_OPTIONS[number]['key'], checked: boolean) => void;
  onToggleAucun: (checked: boolean) => void;
}) {
  const aucun = data.aucun_revenu_compl;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Avez-vous aussi… ?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sélectionnez toutes les situations qui vous concernent (plusieurs réponses possibles).
        </p>
      </div>

      <div className="space-y-2">
        {REVENUS_COMPL_OPTIONS.map((opt) => {
          const checked = data[opt.key] as boolean;
          return (
            <label
              key={opt.key}
              htmlFor={`rev-${opt.key}`}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm transition-colors',
                checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                aucun && 'cursor-not-allowed opacity-50'
              )}
            >
              <Checkbox
                id={`rev-${opt.key}`}
                checked={checked}
                disabled={aucun}
                onCheckedChange={(c) => onToggleRevenu(opt.key, c === true)}
              />
              <span className="font-medium text-foreground">{opt.label}</span>
            </label>
          );
        })}

        <label
          htmlFor="rev-aucun"
          className={cn(
            'mt-3 flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm transition-colors',
            aucun ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
          )}
        >
          <Checkbox
            id="rev-aucun"
            checked={aucun}
            onCheckedChange={(c) => onToggleAucun(c === true)}
          />
          <span className="font-medium text-foreground">
            Aucun, ma situation principale est mon seul revenu
          </span>
        </label>
      </div>
    </div>
  );
}

/* ===================== Step 6 — International ===================== */
function Step6({
  situation,
  onSituationChange,
  selectors,
  paysByZone,
  paysLoadingZone,
  onUpdateSelector,
  onAddSelector,
  onRemoveSelector,
}: {
  situation: string;
  onSituationChange: (v: string) => void;
  selectors: { zone: string; paysId: string }[];
  paysByZone: Record<string, PaysRow[]>;
  paysLoadingZone: Record<string, boolean>;
  onUpdateSelector: (idx: number, patch: Partial<{ zone: string; paysId: string }>) => void;
  onAddSelector: () => void;
  onRemoveSelector: (idx: number) => void;
}) {
  const showPays = situation && situation !== 'drom';
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Votre situation internationale</h2>
      </div>

      <div className="space-y-3">
        <Label>Quelle est votre situation ?</Label>
        <RadioGroup value={situation} onValueChange={onSituationChange} className="space-y-2">
          {SITUATION_INTL_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`intl-${opt.value}`}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm transition-colors',
                situation === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <RadioGroupItem value={opt.value} id={`intl-${opt.value}`} />
              <span className="font-medium text-foreground">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {showPays && (
        <div className="space-y-3 border-t border-border pt-6">
          <Label>Quel(s) pays vous concerne(nt) ?</Label>
          <div className="space-y-3">
            {selectors.map((sel, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Zone</span>
                  <Select
                    value={sel.zone}
                    onValueChange={(v) => onUpdateSelector(idx, { zone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES_OPTIONS.map((z) => (
                        <SelectItem key={z.value} value={z.value}>
                          {z.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Pays</span>
                  <Select
                    value={sel.paysId}
                    onValueChange={(v) => onUpdateSelector(idx, { paysId: v })}
                    disabled={!sel.zone || !!paysLoadingZone[sel.zone]}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !sel.zone
                            ? 'Choisir une zone d\u2019abord'
                            : paysLoadingZone[sel.zone]
                              ? 'Chargement\u2026'
                              : 'Choisir un pays'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sel.zone && !paysLoadingZone[sel.zone] && (paysByZone[sel.zone]?.length ?? 0) === 0 ? (
                        <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                          Aucun pays disponible dans cette zone
                        </div>
                      ) : (
                        (paysByZone[sel.zone] ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.icone ? `${p.icone} ` : ''}
                            {p.nom}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {selectors.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveSelector(idx)}
                    aria-label="Retirer ce pays"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={onAddSelector} className="mt-2">
            <Plus className="h-4 w-4" /> Ajouter un autre pays
          </Button>
        </div>
      )}
    </div>
  );
}

/* ===================== Step 7 — Tranche revenus ===================== */
function Step7({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Vos revenus annuels bruts</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tous revenus confondus, estimation.</p>
      </div>

      <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
        {TRANCHE_REVENUS_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            htmlFor={`tr-${opt.value}`}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm transition-colors',
              value === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            )}
          >
            <RadioGroupItem value={opt.value} id={`tr-${opt.value}`} />
            <span className="font-medium text-foreground">{opt.label}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

/* ===================== Step 8 — Résultat ===================== */
function Step8({
  profilLabel,
  plan,
  score,
  formData,
  matchCounts,
  onCheckout,
  checkoutLoading,
  onSkip,
  prenom,
  org,
  isOrgAdmin,
  hasOrgLicense,
  orgLoading,
  onNavigate,
}: {
  profilLabel: string;
  plan: 'starter' | 'expert' | 'premium';
  score: number;
  formData: FormData;
  matchCounts: { profils: number; metiers: number; pays: number };
  onCheckout: (slug: string) => void;
  checkoutLoading: string | null;
  onSkip: () => void;
  prenom: string;
  org: { raison_sociale: string; plan: string; role: string } | null;
  isOrgAdmin: boolean;
  hasOrgLicense: boolean;
  orgLoading: boolean;
  onNavigate: (to: string) => void;
}) {
  const { user } = useAuth();
  const [directOrgMembership, setDirectOrgMembership] = useState(false);
  const [directOrgRole, setDirectOrgRole] = useState<string | null>(org?.role ?? null);
  const [directOrgId, setDirectOrgId] = useState<string | null>(null);
  const [directOrgLoading, setDirectOrgLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setDirectOrgMembership(false);
      setDirectOrgRole(org?.role ?? null);
      setDirectOrgId(null);
      setDirectOrgLoading(false);
      return;
    }

    setDirectOrgLoading(true);

    supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .is('removed_at', null)
      .not('accepted_at', 'is', null)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          console.error('Step8 direct org lookup failed', error);
          setDirectOrgMembership(!!org);
          setDirectOrgRole(org?.role ?? null);
          setDirectOrgId(null);
        } else {
          setDirectOrgMembership(!!data || !!org);
          setDirectOrgRole((data?.role as string | null) ?? org?.role ?? null);
          setDirectOrgId(data?.organization_id ?? null);
        }

        setDirectOrgLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, org]);

  const isInOrg = !!org || directOrgMembership;
  const effectiveOrgRole = org?.role ?? directOrgRole;

  console.log('Step8 debug', {
    userId: user?.id,
    organizationId: directOrgId,
    role: effectiveOrgRole,
    isInOrg,
    isOrgAdmin,
    hasOrgLicense,
    orgLoading: orgLoading || directOrgLoading,
  });

  if (orgLoading || directOrgLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement de votre profil…</p>
      </div>
    );
  }

  const justification =
    plan === 'starter'
      ? 'Votre situation est simple. Le plan Starter couvre tous les essentiels.'
      : plan === 'expert'
      ? `Votre profil présente plusieurs spécificités (score ${score}). Le plan Expert vous donne accès aux fiches métier et au parcours adaptatif.`
      : `Votre situation est complexe (score ${score}). Le plan Premium ajoute le parcours pédagogique IA personnalisé et les webinaires.`;

  const bullets: string[] = [
    'Modules pédagogiques personnalisés',
    'Fiches pour votre profil contribuable',
  ];
  if (plan !== 'starter') bullets.push('Fiche métier correspondant à votre activité');
  if (formData.a_revenus_etrangers || formData.pays_concernes.length > 0)
    bullets.push('Fiche(s) pays pour vos revenus étrangers');
  bullets.push('Simulateurs adaptés à votre profil');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-3 text-center">
        <div className="text-6xl" aria-hidden>✨</div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Votre profil</h1>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 text-center">
          <p className="text-lg font-medium text-foreground">{profilLabel}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-2xl font-bold text-foreground">{matchCounts.profils}</p>
            <p className="text-xs text-muted-foreground">
              {matchCounts.profils > 1 ? 'fiches profil détectées' : 'fiche profil détectée'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-2xl font-bold text-foreground">{matchCounts.metiers}</p>
            <p className="text-xs text-muted-foreground">
              {matchCounts.metiers > 1 ? 'fiches métier' : 'fiche métier'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-2xl font-bold text-foreground">{matchCounts.pays}</p>
            <p className="text-xs text-muted-foreground">
              {matchCounts.pays > 1 ? 'pays concernés' : 'pays concerné'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Voici ce qui vous attend sur Impôts Facile :
        </h2>
        <ul className="space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bloc tarification — conditionnel selon le statut de l'utilisateur */}
      {!isInOrg && (
        <>
          <div className="rounded-xl border-2 border-accent bg-accent/10 p-5 text-center">
            <p className="font-heading text-lg font-bold text-foreground">
              💡 Plan recommandé pour vous :{' '}
              <span className="text-primary">{PLANS.find((p) => p.slug === plan)?.name}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{justification}</p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {PLANS.map((p) => {
              const isReco = p.slug === plan;
              return (
                <div
                  key={p.slug}
                  className={cn(
                    'relative flex flex-col rounded-xl border-2 p-5 transition-all',
                    isReco
                      ? 'border-primary bg-background shadow-lg ring-2 ring-primary'
                      : 'border-border bg-card'
                  )}
                >
                  {isReco && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      ⭐ RECOMMANDÉ
                    </Badge>
                  )}
                  <h3 className="font-heading text-lg font-bold text-foreground">{p.name}</h3>
                  <p className="mt-2">
                    <span className="font-heading text-3xl font-bold text-foreground">{p.price}€</span>
                    <span className="ml-1 text-xs text-muted-foreground">/ an</span>
                  </p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => onCheckout(p.slug)}
                    disabled={checkoutLoading !== null}
                    variant={isReco ? 'cta' : 'default'}
                    className="mt-5 w-full"
                  >
                    {checkoutLoading === p.slug ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirection…</>
                    ) : (
                      'Choisir ce plan'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="mx-auto max-w-2xl text-center text-xs text-muted-foreground leading-relaxed">
            ⚠️ Note : le passage à un plan inférieur n'est pas possible en cours d'abonnement.
            Choisissez avec soin.
          </p>

          <div className="text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ou Commencer gratuitement avec le module 0 →
            </button>
          </div>
        </>
      )}

      {/* CAS 2 — Admin orga sans licence personnelle */}
      {isOrgAdmin && effectiveOrgRole === 'admin' && !hasOrgLicense && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 text-center">
            <p className="text-base text-foreground">
              Vous gérez l'organisation <strong>{org.raison_sociale}</strong>. Vos collaborateurs
              auront accès au plan <strong className="capitalize">{org.plan}</strong>. Vous pouvez
              activer une licence personnelle depuis votre dashboard pour suivre la formation
              vous-même.
            </p>
          </div>
          <div className="flex justify-center">
            <Button size="lg" variant="cta" onClick={() => onNavigate('/impots-team/dashboard')}>
              Aller au dashboard de gestion →
            </Button>
          </div>
        </div>
      )}

      {/* CAS 3 — Admin avec licence personnelle */}
      {isOrgAdmin && effectiveOrgRole === 'admin_with_license' && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 text-center">
            <p className="text-base text-foreground">
              Bonjour <strong>{prenom}</strong>, votre licence personnelle{' '}
              <strong className="capitalize">{org.plan}</strong> est active dans l'organisation{' '}
              <strong>{org.raison_sociale}</strong>. Voici votre parcours personnalisé.
            </p>
          </div>
          <div className="flex justify-center">
            <Button size="lg" variant="cta" onClick={() => onNavigate('/mes-modules')}>
              Commencer ma formation →
            </Button>
          </div>
        </div>
      )}

      {/* CAS 4 — Membre d'orga (rôle member, pas admin) */}
      {!isOrgAdmin && effectiveOrgRole === 'member' && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 text-center">
            <p className="text-base text-foreground">
              Bonjour <strong>{prenom}</strong>, vous avez rejoint l'organisation{' '}
              <strong>{org.raison_sociale}</strong>. Votre accès{' '}
              <strong className="capitalize">{org.plan}</strong> vous donne accès à votre parcours
              personnalisé ci-dessus.
            </p>
          </div>
          <div className="flex justify-center">
            <Button size="lg" variant="cta" onClick={() => onNavigate('/mes-modules')}>
              Commencer ma formation →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Onboarding;
