import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const PRICE_PER_LIC: Record<string, number> = {
  starter: 44,
  expert: 71,
  premium: 107,
};

interface Org {
  id: string;
  raison_sociale: string;
  siret: string;
  plan: 'starter' | 'expert' | 'premium';
  nb_licences: number;
  statut: string;
  date_paiement: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface Member {
  id: string;
  email: string;
  role: string;
  accepted_at: string | null;
  removed_at: string | null;
}

export default function ImpotsTeamDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const initialTab = params.get('tab') === 'membres' ? 'membres' : params.get('tab') === 'branding' ? 'branding' : 'abonnement';

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [updatingLicences, setUpdatingLicences] = useState(false);
  const [newNb, setNewNb] = useState<number>(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id,raison_sociale,siret,plan,nb_licences,statut,date_paiement,stripe_customer_id,stripe_subscription_id')
        .eq('admin_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const o = orgs?.[0] ?? null;
      setOrg(o as Org | null);
      if (o) {
        setNewNb(o.nb_licences);
        const { data: m } = await supabase
          .from('organization_members')
          .select('id,email,role,accepted_at,removed_at')
          .eq('organization_id', o.id)
          .order('invited_at', { ascending: true });
        setMembers((m ?? []) as Member[]);
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  const handleOpenPortal = async () => {
    if (!org) return;
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-team-portal-session', {
        body: { organization_id: org.id },
      });
      if (error || !data?.url) {
        toast({ title: 'Erreur', description: data?.error || 'Impossible d\'ouvrir le portail.', variant: 'destructive' });
        return;
      }
      window.location.href = data.url;
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleUpdateLicences = async () => {
    if (!org) return;
    if (newNb < 2 || newNb > 500) {
      toast({ title: 'Nb licences invalide', description: 'Entre 2 et 500.', variant: 'destructive' });
      return;
    }
    if (newNb === org.nb_licences) return;
    setUpdatingLicences(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-team-licences', {
        body: { organization_id: org.id, nb_licences: newNb },
      });
      if (error || !data?.success) {
        toast({
          title: 'Erreur',
          description: data?.error || (error as any)?.message || 'Mise à jour impossible.',
          variant: 'destructive',
        });
        return;
      }
      setOrg({ ...org, nb_licences: newNb });
      toast({ title: 'Licences mises à jour', description: `${newNb} licences actives. Le prorata sera appliqué.` });
    } finally {
      setUpdatingLicences(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <h2 className="font-heading text-xl font-bold">Connexion requise</h2>
              <p className="mt-2 text-muted-foreground">
                Connectez-vous pour accéder au dashboard Impôts Team.
              </p>
              <Link to="/connexion"><Button className="mt-4">Se connecter</Button></Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <h2 className="font-heading text-xl font-bold">Aucune organisation</h2>
              <p className="mt-2 text-muted-foreground">
                Vous n'êtes administrateur d'aucune organisation Impôts Team.
              </p>
              <Link to="/impots-team"><Button className="mt-4">Découvrir Impôts Team</Button></Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const totalAnnuel = PRICE_PER_LIC[org.plan] * org.nb_licences;
  const dateEcheance = org.date_paiement
    ? new Date(new Date(org.date_paiement).getTime() + 365 * 24 * 3600 * 1000).toLocaleDateString('fr-FR')
    : '—';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/30 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold">{org.raison_sociale}</h1>
              <p className="text-sm text-muted-foreground">SIRET {org.siret}</p>
            </div>
            <Badge variant={org.statut === 'active' ? 'default' : 'secondary'}>
              {org.statut === 'active' ? 'Actif' : org.statut}
            </Badge>
          </div>

          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList>
              <TabsTrigger value="abonnement">Mon abonnement</TabsTrigger>
              <TabsTrigger value="membres">Mes collaborateurs</TabsTrigger>
              <TabsTrigger value="branding">Personnalisation</TabsTrigger>
            </TabsList>

            <TabsContent value="abonnement">
              <Card>
                <CardHeader><CardTitle>Détails de l'abonnement</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Plan</span><p className="font-medium capitalize">{org.plan}</p></div>
                    <div><span className="text-muted-foreground">Nb licences</span><p className="font-medium">{org.nb_licences}</p></div>
                    <div><span className="text-muted-foreground">Total annuel TTC</span><p className="font-medium">{totalAnnuel.toLocaleString('fr-FR')} €</p></div>
                    <div><span className="text-muted-foreground">Prochaine échéance</span><p className="font-medium">{dateEcheance}</p></div>
                  </div>

                  <div className="border-t pt-4">
                    <Label htmlFor="nbLic">Modifier le nombre de licences</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        id="nbLic"
                        type="number"
                        min={2}
                        max={500}
                        value={newNb}
                        onChange={(e) => setNewNb(Math.max(2, Math.min(500, parseInt(e.target.value || '2', 10) || 2)))}
                      />
                      <Button onClick={handleUpdateLicences} disabled={updatingLicences || newNb === org.nb_licences}>
                        {updatingLicences ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mettre à jour'}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Le prorata est calculé automatiquement par Stripe.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <Button variant="outline" onClick={handleOpenPortal} disabled={openingPortal}>
                      {openingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Gérer via le portail Stripe
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Factures, moyens de paiement, annulation à la fin de la période.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="membres">
              <Card>
                <CardHeader><CardTitle>Collaborateurs</CardTitle></CardHeader>
                <CardContent>
                  <div className="mb-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                    🚧 Invitation et gestion d'accès — à venir (sprint B2B-2). Pour l'instant, lecture seule.
                  </div>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun membre.</p>
                  ) : (
                    <ul className="divide-y">
                      {members.map((m) => (
                        <li key={m.id} className="flex items-center justify-between py-3 text-sm">
                          <div>
                            <p className="font-medium">{m.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.role === 'admin' ? 'Administrateur' : 'Membre'} ·{' '}
                              {m.accepted_at ? 'Actif' : 'Invitation en attente'}
                            </p>
                          </div>
                          {m.removed_at && <Badge variant="secondary">Retiré</Badge>}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding">
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    🚧 Personnalisation (logo, couleurs) — à venir (sprint B2B-2).
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
