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

const B2B_SIGNUP_REDIRECT_KEY = 'b2bSignupInProgress';

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
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

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

        const { data: signInData, error: firstSignInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!firstSignInErr && signInData.user) {
          setNeedsEmailVerification(false);
          setStep('acceptation');
          setSubmitting(false);
          return;
        }

        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/impots-team/souscription?plan=${plan}&nb=${nbLicences}`,
            data: { prenom, nom, role: 'admin_org' },
          },
        });
        if (signUpErr) {
          if (/already registered|already exists|already been registered/i.test(signUpErr.message)) {
            toast({
              title: 'Compte déjà existant',
              description: 'Connectez-vous avec ce compte pour continuer la souscription équipe.',
              variant: 'destructive',
            });
            setSubmitting(false);
            return;
          }

          toast({ title: 'Erreur compte', description: signUpErr.message, variant: 'destructive' });
          setSubmitting(false);
          return;
        }

        sessionStorage.setItem(B2B_SIGNUP_REDIRECT_KEY, '1');

        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setNeedsEmailVerification(true);
          setStep('acceptation');
          toast({
            title: 'Compte créé',
            description: 'Votre confirmation email peut être finalisée après le paiement.',
          });
          setSubmitting(false);
          return;
        }

        sessionStorage.removeItem(B2B_SIGNUP_REDIRECT_KEY);
      }
      setNeedsEmailVerification(false);
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
          ...(!user ? {
            admin_email: email.trim().toLowerCase(),
            admin_password: password,
            admin_prenom: prenom.trim(),
            admin_nom: nom.trim(),
            signup_created_now: needsEmailVerification,
          } : {}),
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

      if (!user) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (signInErr) {
          toast({
            title: 'Connexion impossible',
            description: 'Le paiement a été préparé, mais la connexion au compte admin a échoué. Réessayez.',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
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

          <div className="mb-3 text-xs font-medium text-muted-foreground">
            Étape {step === 'entreprise' ? 1 : step === 'compte' ? 2 : 3} / 3 —{' '}
            {step === 'entreprise' ? 'Entreprise' : step === 'compte' ? 'Compte administrateur' : 'Conditions & paiement'}
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
                    <Button className="flex-1" onClick={goToAcceptation} disabled={submitting}>
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Préparation…</>
                      ) : (
                        'Continuer'
                      )}
                    </Button>
                  </div>
                </>
              )}

              {step === 'acceptation' && (
                <>
                  {needsEmailVerification && !user ? (
                    <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                      Votre compte a été créé. Vous pouvez finaliser le paiement maintenant ; la confirmation email pourra être terminée juste après l'achat.
                    </div>
                  ) : null}

                  <div className="rounded-lg border bg-background p-4 space-y-1 text-sm">
                    <p className="font-medium">Récapitulatif</p>
                    <p className="text-muted-foreground">
                      Plan <span className="text-foreground font-medium">{PRICES[plan].label}</span> ·{' '}
                      <span className="text-foreground font-medium">{nbLicences}</span> licences
                    </p>
                    <p className="text-muted-foreground">
                      Total annuel TTC :{' '}
                      <span className="text-primary font-semibold">
                        {total.toLocaleString('fr-FR')} €
                      </span>
                    </p>
                  </div>

                  <div className="space-y-3 rounded-lg border bg-background p-4">
                    <p className="text-sm font-medium">Acceptation des conditions</p>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={acceptCgv}
                        onCheckedChange={(v) => setAcceptCgv(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm leading-relaxed">
                        J'ai lu et j'accepte les{' '}
                        <Link
                          to="/legal/cgv"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-1"
                        >
                          Conditions Générales de Vente
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        .
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={acceptCgu}
                        onCheckedChange={(v) => setAcceptCgu(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm leading-relaxed">
                        J'ai lu et j'accepte les{' '}
                        <Link
                          to="/legal/cgu"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-1"
                        >
                          Conditions Générales d'Utilisation
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        .
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('compte')} disabled={submitting}>
                      Retour
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={submitting || !acceptCgv || !acceptCgu}
                    >
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
