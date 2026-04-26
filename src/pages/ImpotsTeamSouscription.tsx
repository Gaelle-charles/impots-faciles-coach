import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const PRICES = {
  starter: { individuel: 49, team: 44, label: 'Starter' },
  expert: { individuel: 79, team: 71, label: 'Expert' },
  premium: { individuel: 119, team: 107, label: 'Premium' },
} as const;
type Plan = keyof typeof PRICES;

export default function ImpotsTeamSouscription() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const initialPlan = (params.get('plan') as Plan) || 'expert';
  const initialNb = Math.max(2, parseInt(params.get('nb') || '10', 10) || 10);

  const [step, setStep] = useState<'entreprise' | 'compte' | 'acceptation'>('entreprise');
  const [acceptCgv, setAcceptCgv] = useState(false);
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Étape A
  const [raisonSociale, setRaisonSociale] = useState('');
  const [siret, setSiret] = useState('');
  const [adresse, setAdresse] = useState('');
  const [tva, setTva] = useState('');
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [nbLicences, setNbLicences] = useState(initialNb);

  // Étape B (création de compte si pas connecté)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');

  const total = useMemo(() => PRICES[plan].team * nbLicences, [plan, nbLicences]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const validateEntreprise = (): string | null => {
    if (raisonSociale.trim().length < 2) return 'Raison sociale requise';
    const cleanSiret = siret.replace(/\s/g, '');
    if (!/^\d{14}$/.test(cleanSiret)) return 'SIRET invalide (14 chiffres)';
    if (adresse.trim().length < 5) return 'Adresse de facturation requise';
    if (!['starter', 'expert', 'premium'].includes(plan)) return 'Plan invalide';
    if (nbLicences < 2 || nbLicences > 500) return 'Nb licences entre 2 et 500';
    return null;
  };

  const goNext = () => {
    const err = validateEntreprise();
    if (err) {
      toast({ title: 'Vérifiez le formulaire', description: err, variant: 'destructive' });
      return;
    }
    setStep('compte');
  };

  const goToAcceptation = async () => {
    // Côté étape "compte" : valider le compte / créer si besoin, puis passer à l'étape acceptation
    setSubmitting(true);
    try {
      if (!user) {
        if (!email || !password || password.length < 8 || !prenom || !nom) {
          toast({
            title: 'Compte invalide',
            description: 'Email, mot de passe (min 8) et identité requis.',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { prenom, nom, role: 'admin_org' },
          },
        });
        if (signUpErr) {
          toast({ title: 'Erreur compte', description: signUpErr.message, variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          toast({
            title: 'Vérifiez votre email',
            description: 'Confirmez votre email puis connectez-vous pour finaliser.',
          });
          setSubmitting(false);
          return;
        }
      }
      setStep('acceptation');
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!acceptCgv || !acceptCgu) {
      toast({
        title: 'Acceptation requise',
        description: 'Vous devez accepter les CGV et les CGU pour continuer.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase.functions.invoke('create-team-checkout-session', {
        body: {
          raison_sociale: raisonSociale.trim(),
          siret: siret.replace(/\s/g, ''),
          adresse: adresse.trim(),
          tva_intra: tva.trim(),
          plan,
          nb_licences: nbLicences,
          cgv_accepted_at: nowIso,
          cgu_accepted_at: nowIso,
        },
      });

      if (error || !data?.url) {
        toast({
          title: 'Paiement indisponible',
          description: (error as any)?.message || data?.error || 'Erreur lors de la création du paiement',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: (err as Error).message, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/30 px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <Link to="/impots-team" className="text-sm text-muted-foreground hover:underline">
              ← Retour à Impôts Team
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Souscription — {PRICES[plan].label} × {nbLicences} licences
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Total annuel TTC : <span className="font-semibold text-primary">{total.toLocaleString('fr-FR')} €</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 'entreprise' && (
                <>
                  <div>
                    <Label htmlFor="rs">Raison sociale *</Label>
                    <Input id="rs" value={raisonSociale} onChange={(e) => setRaisonSociale(e.target.value)} className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="siret">SIRET * (14 chiffres)</Label>
                    <Input id="siret" value={siret} onChange={(e) => setSiret(e.target.value)} maxLength={17} className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="adresse">Adresse de facturation *</Label>
                    <Textarea id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} className="mt-2" rows={3} />
                  </div>
                  <div>
                    <Label htmlFor="tva">TVA intracommunautaire (optionnel)</Label>
                    <Input id="tva" value={tva} onChange={(e) => setTva(e.target.value)} placeholder="FR..." className="mt-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Plan</Label>
                      <select
                        value={plan}
                        onChange={(e) => setPlan(e.target.value as Plan)}
                        className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
                      >
                        <option value="starter">Starter (44€/lic)</option>
                        <option value="expert">Expert (71€/lic)</option>
                        <option value="premium">Premium (107€/lic)</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="nb">Nb licences</Label>
                      <Input
                        id="nb"
                        type="number"
                        min={2}
                        max={500}
                        value={nbLicences}
                        onChange={(e) => setNbLicences(Math.max(2, Math.min(500, parseInt(e.target.value || '2', 10) || 2)))}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={goNext}>Continuer</Button>
                </>
              )}

              {step === 'compte' && (
                <>
                  {user ? (
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-sm">
                        Connecté en tant que <span className="font-medium">{user.email}</span>
                      </p>
                      <button
                        type="button"
                        onClick={async () => { await signOut(); navigate(0); }}
                        className="mt-2 text-xs text-muted-foreground underline"
                      >
                        Utiliser un autre compte
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="prenom">Prénom *</Label>
                          <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="mt-2" />
                        </div>
                        <div>
                          <Label htmlFor="nom">Nom *</Label>
                          <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className="mt-2" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
                      </div>
                      <div>
                        <Label htmlFor="pwd">Mot de passe * (min 8)</Label>
                        <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" />
                      </div>
                    </>
                  )}

                  <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                    ⚠️ Le passage à un plan inférieur n'est pas possible en cours
                    d'abonnement. Vous pourrez en revanche augmenter votre plan ou
                    votre nombre de licences à tout moment.
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('entreprise')} disabled={submitting}>
                      Retour
                    </Button>
                    <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirection…</>
                      ) : (
                        'Procéder au paiement sécurisé'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
