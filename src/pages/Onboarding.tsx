import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

const STEPS = ['Bienvenue', 'Ton profil', "C'est parti"];

const situationsFamille = [
  'Célibataire',
  'En couple (marié / pacsé)',
  'En couple (non marié)',
  'Parent isolé',
];

const situationsPro = [
  'Salarié(e)',
  'Indépendant(e) / Auto-entrepreneur',
  'Fonctionnaire',
  'Retraité(e)',
  'Étudiant(e)',
  'Sans activité',
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [prenom, setPrenom] = useState('');
  const [loading, setLoading] = useState(true);
  const [famille, setFamille] = useState('');
  const [pro, setPro] = useState('');
  const [premiere, setPremiere] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('prenom, onboarding_done')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast({ title: 'Erreur', description: 'Impossible de charger votre profil.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (data?.onboarding_done) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setPrenom(data?.prenom ?? '');
      setLoading(false);
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        situation_famille: famille || null,
        situation_pro: pro || null,
        premiere_declaration: premiere === 'oui' ? true : premiere === 'non' ? false : null,
      })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible d’enregistrer votre profil.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    setSaving(false);
    setStep(2);
  };

  const handleFinish = async () => {
    if (!user) return;

    setFinishing(true);

    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_done: true })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Erreur', description: "Impossible de finaliser l'inscription.", variant: 'destructive' });
      setFinishing(false);
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
        <Skeleton className="h-96 w-full max-w-[640px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-[640px] space-y-8">
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full font-heading text-sm font-bold transition-colors ${
                    i <= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-border text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`mt-1.5 text-xs font-medium ${i <= step ? 'text-primary' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-3 h-0.5 w-12 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="rounded-2xl border-border bg-background shadow-lg">
          <CardContent className="p-8">
            {step === 0 && (
              <div className="space-y-6 text-center">
                <div className="text-6xl">🎉</div>
                <div>
                  <h1 className="font-heading text-2xl font-bold text-foreground">
                    Bienvenue sur Impôts Facile{prenom ? `, ${prenom}` : ''} !
                  </h1>
                  <p className="mt-2 text-muted-foreground">
                    Tu es à 3 étapes de comprendre ta déclaration d'impôts.
                  </p>
                </div>

                <p className="leading-relaxed text-sm text-foreground/80">
                  Impôts Facile te guide pas à pas à travers 8 modules pour comprendre,
                  optimiser et valider ta déclaration de revenus — même si tu pars de zéro.
                </p>

                <div className="grid grid-cols-3 gap-4 py-2">
                  {[
                    { emoji: '📚', text: '8 modules de cours' },
                    { emoji: '❓', text: 'Quiz interactifs' },
                    { emoji: '🎯', text: 'Conseils personnalisés' },
                  ].map((item) => (
                    <div key={item.text} className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary p-4">
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-xs font-medium text-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full" onClick={() => setStep(1)}>
                  Commencer →
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    Dis-nous en un peu plus sur toi
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pour personnaliser ton parcours fiscal.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Situation familiale</Label>
                    <Select value={famille} onValueChange={setFamille}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionne ta situation" />
                      </SelectTrigger>
                      <SelectContent>
                        {situationsFamille.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Situation professionnelle</Label>
                    <Select value={pro} onValueChange={setPro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionne ta situation" />
                      </SelectTrigger>
                      <SelectContent>
                        {situationsPro.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Première déclaration ?</Label>
                    <RadioGroup value={premiere} onValueChange={setPremiere} className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="oui" id="prem-oui" />
                        <Label htmlFor="prem-oui" className="cursor-pointer font-normal">Oui, c'est ma première fois</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="non" id="prem-non" />
                        <Label htmlFor="prem-non" className="cursor-pointer font-normal">Non, j'ai déjà déclaré</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Button className="w-full" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Suivant →'}
                </Button>

                <button
                  onClick={() => setStep(2)}
                  className="block w-full text-center text-sm text-muted-foreground hover:underline"
                >
                  Passer cette étape →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 text-center">
                <div className="text-6xl">🚀</div>
                <div>
                  <h2 className="font-heading text-2xl font-bold text-foreground">
                    Tout est prêt{prenom ? `, ${prenom}` : ''} !
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Ton espace est configuré. Tu arrives maintenant sur ton dashboard.
                  </p>
                </div>

                <Card className="border-border bg-secondary/50 text-left">
                  <CardContent className="space-y-3 p-5">
                    <span className="text-xs font-bold uppercase tracking-wide text-primary">Prochaine étape</span>
                    <h3 className="font-heading text-base font-semibold text-foreground">
                      Accéder à ton espace personnel
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tu pourras découvrir les modules depuis ton dashboard une fois ton accès activé.
                    </p>
                  </CardContent>
                </Card>

                <Button className="w-full" onClick={handleFinish} disabled={finishing}>
                  {finishing ? 'Redirection...' : '📊 Accéder à mon dashboard →'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
