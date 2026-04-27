import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Invitation {
  id: string;
  email: string;
  organization_id: string;
  organization_name: string;
  plan: string;
  status: string;
  expires_at: string;
}

export default function InvitationAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth form
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [password, setPassword] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) { setError('Lien invalide'); setLoading(false); return; }
    (async () => {
      const { data, error: rpcErr } = await supabase.rpc('get_invitation_by_token', { p_token: token });
      if (rpcErr) {
        setError(rpcErr.message);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) setError('Invitation introuvable');
        else setInv(row as Invitation);
      }
      setLoading(false);
    })();
  }, [token]);

  const acceptNow = async () => {
    if (!token) return;
    setSubmitting(true);
    const { data, error: rpcErr } = await supabase.rpc('accept_invitation', { p_token: token });
    setSubmitting(false);
    const result = data as any;
    if (rpcErr || !result?.success) {
      toast({
        title: 'Acceptation impossible',
        description: rpcErr?.message || result?.error || 'Erreur',
        variant: 'destructive',
      });
      return;
    }
    setAccepted(true);
    toast({ title: 'Invitation acceptée', description: `Bienvenue chez ${result.organization_name}` });
    setTimeout(() => navigate('/dashboard'), 1200);
  };

  // Une fois logué + invitation valide + email match → on déclenche
  useEffect(() => {
    if (!user || !inv || accepted) return;
    if (inv.status !== 'pending') return;
    if (user.email?.toLowerCase() !== inv.email.toLowerCase()) return;
    acceptNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, inv]);

  const handleSignup = async () => {
    if (!inv) return;
    if (password.length < 8 || !prenom || !nom) {
      toast({ title: 'Champs manquants', description: 'Prénom, nom et mot de passe (min 8) requis.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error: signUpErr } = await supabase.auth.signUp({
      email: inv.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/impots-team/invitation/${token}`,
        data: { prenom, nom },
      },
    });
    if (signUpErr) {
      setSubmitting(false);
      toast({ title: 'Erreur', description: signUpErr.message, variant: 'destructive' });
      return;
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: inv.email, password });
    setSubmitting(false);
    if (signInErr) {
      toast({
        title: 'Compte créé',
        description: 'Vérifiez votre email puis revenez sur ce lien pour finaliser.',
      });
    }
    // L'effet `useEffect` déclenchera acceptNow() automatiquement
  };

  const handleSignin = async () => {
    if (!inv) return;
    if (!password) { toast({ title: 'Mot de passe requis', variant: 'destructive' }); return; }
    setSubmitting(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email: inv.email, password });
    setSubmitting(false);
    if (e) toast({ title: 'Connexion échouée', description: e.message, variant: 'destructive' });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center bg-muted/30 px-6 py-12">
        <Card className="w-full max-w-md">
          {loading || authLoading ? (
            <CardContent className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          ) : error || !inv ? (
            <CardContent className="p-8 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
              <h2 className="mt-3 font-heading text-lg font-bold">Lien invalide</h2>
              <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Invitation introuvable'}</p>
              <Link to="/"><Button variant="outline" className="mt-4">Retour à l'accueil</Button></Link>
            </CardContent>
          ) : inv.status !== 'pending' ? (
            <CardContent className="p-8 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
              <h2 className="mt-3 font-heading text-lg font-bold">Invitation {inv.status}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Cette invitation n'est plus valide. Demandez à votre administrateur d'en envoyer une nouvelle.
              </p>
            </CardContent>
          ) : accepted ? (
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h2 className="mt-3 font-heading text-lg font-bold">Bienvenue !</h2>
              <p className="mt-2 text-sm text-muted-foreground">Redirection vers votre tableau de bord…</p>
            </CardContent>
          ) : user && user.email?.toLowerCase() !== inv.email.toLowerCase() ? (
            <CardContent className="p-8 text-center space-y-3">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
              <h2 className="font-heading text-lg font-bold">Mauvais compte</h2>
              <p className="text-sm text-muted-foreground">
                Vous êtes connecté·e avec <strong>{user.email}</strong> mais l'invitation a été
                envoyée à <strong>{inv.email}</strong>.
              </p>
              <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); }}>
                Se déconnecter
              </Button>
            </CardContent>
          ) : user ? (
            <CardContent className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Invitation à rejoindre {inv.organization_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Plan <span className="font-medium capitalize text-foreground">{inv.plan}</span> ·{' '}
                  email <span className="font-medium text-foreground">{inv.email}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={mode === 'signup' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('signup')}
                  >
                    Créer mon compte
                  </Button>
                  <Button
                    variant={mode === 'signin' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('signin')}
                  >
                    J'ai déjà un compte
                  </Button>
                </div>

                {mode === 'signup' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="prenom">Prénom</Label>
                        <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="mt-2" />
                      </div>
                      <div>
                        <Label htmlFor="nom">Nom</Label>
                        <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className="mt-2" />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="pwd">Mot de passe {mode === 'signup' && '(min 8)'}</Label>
                  <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" />
                </div>

                <Button
                  className="w-full"
                  onClick={mode === 'signup' ? handleSignup : handleSignin}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {mode === 'signup' ? "Créer mon compte et accepter" : "Se connecter et accepter"}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
