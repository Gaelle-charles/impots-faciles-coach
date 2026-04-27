import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TeamSidebar } from '@/components/TeamSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, RefreshCw, X, Upload, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const PRICE_PER_LIC: Record<string, number> = { starter: 44, expert: 71, premium: 107 };

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
  logo_url: string | null;
}

interface Member {
  id: string;
  email: string;
  role: string;
  accepted_at: string | null;
  removed_at: string | null;
  invited_at: string;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function ImpotsTeamDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const initialTab: 'abonnement' | 'membres' | 'branding' =
    params.get('tab') === 'membres' ? 'membres'
    : params.get('tab') === 'branding' ? 'branding' : 'abonnement';
  const [activeTab, setActiveTab] = useState<'abonnement' | 'membres' | 'branding'>(initialTab);

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [openingPortal, setOpeningPortal] = useState(false);
  const [updatingLicences, setUpdatingLicences] = useState(false);
  const [newNb, setNewNb] = useState<number>(0);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [logoUploading, setLogoUploading] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [activating, setActivating] = useState(false);
  const [adminHasLicense, setAdminHasLicense] = useState(false);

  const handleActivateLicense = async () => {
    if (!user || !org) return;
    setActivating(true);
    try {
      const { data, error } = await supabase.rpc('activate_admin_license');
      const res = data as { success?: boolean; error?: string } | null;
      if (error || !res?.success) {
        toast({ title: 'Erreur', description: res?.error || error?.message || 'Activation impossible', variant: 'destructive' });
        return;
      }
      toast({ title: 'Licence activée', description: 'Accès au parcours complet débloqué.' });
      setShowActivate(false);
      setAdminHasLicense(true);
      await reloadMembers(org.id);
    } finally {
      setActivating(false);
    }
  };

  const reloadMembers = async (orgId: string) => {
    const [{ data: m }, { data: inv }] = await Promise.all([
      supabase.from('organization_members')
        .select('id,email,role,accepted_at,removed_at,invited_at')
        .eq('organization_id', orgId)
        .order('invited_at', { ascending: true }),
      supabase.from('organization_invitations')
        .select('id,email,status,expires_at,created_at')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);
    setMembers((m ?? []) as Member[]);
    setInvitations((inv ?? []) as Invitation[]);
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id,raison_sociale,siret,plan,nb_licences,statut,date_paiement,stripe_customer_id,stripe_subscription_id,logo_url')
        .eq('admin_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const o = orgs?.[0] ?? null;
      setOrg(o as Org | null);
      if (o) {
        setNewNb(o.nb_licences);
        await reloadMembers(o.id);
        const { data: hasLic } = await supabase.rpc('org_admin_has_license', { p_user_id: user.id });
        setAdminHasLicense(!!hasLic);
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
        toast({ title: 'Erreur', description: data?.error || "Impossible d'ouvrir le portail.", variant: 'destructive' });
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

  // Modèle B : l'admin n'occupe PAS de licence. Les licences = collaborateurs (membres + invitations en attente).
  const activeMembersCount = members.filter((m) => !m.removed_at).length;
  const pendingCount = invitations.length;
  const usedLicences = activeMembersCount + pendingCount;
  const remainingLicences = org ? Math.max(0, org.nb_licences - usedLicences) : 0;

  const handleInvite = async () => {
    if (!org) return;
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast({ title: 'Email invalide', variant: 'destructive' });
      return;
    }
    if (remainingLicences <= 0) {
      toast({ title: 'Aucune licence disponible', description: 'Augmentez d\'abord le nombre de licences.', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('team-invite-member', {
        body: { organization_id: org.id, email: cleanEmail },
      });
      if (error || !data?.success) {
        toast({ title: 'Erreur', description: data?.error || (error as any)?.message || 'Invitation échouée', variant: 'destructive' });
        return;
      }
      toast({ title: 'Invitation envoyée', description: cleanEmail + (data.warning ? ` — ${data.warning}` : '') });
      setInviteEmail('');
      await reloadMembers(org.id);
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (invId: string) => {
    if (!org) return;
    setBusyId(invId);
    try {
      const { data, error } = await supabase.functions.invoke('team-resend-invitation', { body: { invitation_id: invId } });
      if (error || !data?.success) {
        toast({ title: 'Erreur', description: data?.error || (error as any)?.message || 'Renvoi échoué', variant: 'destructive' });
        return;
      }
      toast({ title: 'Email renvoyé' });
      await reloadMembers(org.id);
    } finally { setBusyId(null); }
  };

  const handleRevoke = async (invId: string) => {
    if (!org) return;
    setBusyId(invId);
    try {
      const { data, error } = await supabase.functions.invoke('team-revoke-invitation', { body: { invitation_id: invId } });
      if (error || !data?.success) {
        toast({ title: 'Erreur', description: data?.error || (error as any)?.message || 'Révocation échouée', variant: 'destructive' });
        return;
      }
      toast({ title: 'Invitation révoquée' });
      await reloadMembers(org.id);
    } finally { setBusyId(null); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!org) return;
    setBusyId(memberId);
    try {
      const { data, error } = await supabase.functions.invoke('team-remove-member', { body: { member_id: memberId } });
      if (error || !data?.success) {
        toast({ title: 'Erreur', description: data?.error || (error as any)?.message || 'Retrait échoué', variant: 'destructive' });
        return;
      }
      toast({ title: 'Membre retiré' });
      await reloadMembers(org.id);
    } finally { setBusyId(null); }
  };

  const handleLogoUpload = async (file: File) => {
    if (!org) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Fichier trop lourd', description: 'Maximum 2 MB.', variant: 'destructive' });
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Format non supporté', description: 'PNG, JPEG, SVG ou WebP.', variant: 'destructive' });
      return;
    }
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${org.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('org-logos').upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        toast({ title: 'Upload échoué', description: upErr.message, variant: 'destructive' });
        return;
      }
      const { data: pub } = supabase.storage.from('org-logos').getPublicUrl(path);
      const { error: updErr } = await supabase.from('organizations').update({ logo_url: pub.publicUrl }).eq('id', org.id);
      if (updErr) { toast({ title: 'Erreur', description: updErr.message, variant: 'destructive' }); return; }
      setOrg({ ...org, logo_url: pub.publicUrl });
      toast({ title: 'Logo mis à jour' });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!org?.logo_url) return;
    setLogoUploading(true);
    try {
      // Extraire le path à partir de l'URL publique
      const marker = '/org-logos/';
      const idx = org.logo_url.indexOf(marker);
      if (idx >= 0) {
        const path = org.logo_url.substring(idx + marker.length);
        await supabase.storage.from('org-logos').remove([path]);
      }
      await supabase.from('organizations').update({ logo_url: null }).eq('id', org.id);
      setOrg({ ...org, logo_url: null });
      toast({ title: 'Logo supprimé' });
    } finally { setLogoUploading(false); }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></main>
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
              <p className="mt-2 text-muted-foreground">Connectez-vous pour accéder au dashboard Impôts Team.</p>
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
              <p className="mt-2 text-muted-foreground">Vous n'êtes administrateur d'aucune organisation Impôts Team.</p>
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

  const adminInitials = (
    (user?.email?.[0] ?? '') + (user?.email?.[1] ?? '')
  ).toUpperCase();

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {!isMobile && (
        <TeamSidebar
          orgName={org.raison_sociale}
          orgLogoUrl={org.logo_url}
          adminInitials={adminInitials}
          hasLicense={adminHasLicense}
          activeTeamTab={activeTab}
          onTeamTabChange={setActiveTab}
        />
      )}
      {isMobile && <Header />}
      <main className={`min-h-screen ${isMobile ? '' : 'ml-sidebar'}`}>
        <div className={`mx-auto w-full max-w-4xl py-10 ${isMobile ? 'px-4 pb-24' : 'px-6 lg:px-8'}`}>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {org.logo_url && !isMobile === false && (
                <img src={org.logo_url} alt={org.raison_sociale} className="h-12 w-12 rounded object-contain bg-background border" />
              )}
              <div>
                <h1 className="font-heading text-2xl font-bold">{org.raison_sociale}</h1>
                <p className="text-sm text-muted-foreground">SIRET {org.siret}</p>
              </div>
            </div>
            <Badge variant={org.statut === 'active' ? 'default' : 'secondary'}>
              {org.statut === 'active' ? 'Actif' : org.statut}
            </Badge>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'abonnement' | 'membres' | 'branding')} className="w-full">
            <TabsList className={isMobile ? '' : 'hidden'}>
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
                        id="nbLic" type="number" min={2} max={500} value={newNb}
                        onChange={(e) => setNewNb(Math.max(2, Math.min(500, parseInt(e.target.value || '2', 10) || 2)))}
                      />
                      <Button onClick={handleUpdateLicences} disabled={updatingLicences || newNb === org.nb_licences}>
                        {updatingLicences ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mettre à jour'}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Le prorata est calculé automatiquement. Vous ne pouvez pas descendre en dessous du nombre de membres actifs.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <Button variant="outline" onClick={handleOpenPortal} disabled={openingPortal}>
                      {openingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Gérer la facturation
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
                <CardHeader>
                  <CardTitle>Collaborateurs</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {usedLicences} / {org.nb_licences} licence{org.nb_licences > 1 ? 's' : ''} utilisée{usedLicences > 1 ? 's' : ''}
                    {' · '}{remainingLicences} disponible{remainingLicences > 1 ? 's' : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Votre compte administrateur n'occupe pas de licence et n'a pas accès aux modules.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border bg-background p-4">
                    <Label htmlFor="invEmail">Inviter un collaborateur</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        id="invEmail" type="email" placeholder="prenom.nom@entreprise.fr"
                        value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <Button onClick={handleInvite} disabled={inviting || remainingLicences <= 0}>
                        {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="mr-1 h-4 w-4" /> Inviter</>}
                      </Button>
                    </div>
                    {remainingLicences <= 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        Capacité maximale atteinte. Pour ajouter d'autres collaborateurs, augmentez vos licences dans « Mon abonnement ».
                      </p>
                    )}
                  </div>

                  {/* Bloc "Suivre la formation moi aussi" */}
                  <div className="rounded-lg border bg-background p-4">
                    <h3 className="text-sm font-medium">Suivre la formation moi aussi</h3>
                    {adminHasLicense ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Votre licence personnelle est active : vous avez accès au parcours complet certifiant.
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Vous accédez à un aperçu de la plateforme. Activez votre licence personnelle pour suivre le parcours complet, sauvegarder vos progressions et obtenir le certificat (occupe 1 licence sur les {org.nb_licences} disponibles).
                        </p>
                        <Button
                          size="sm" className="mt-3"
                          onClick={() => setShowActivate(true)}
                          disabled={remainingLicences <= 0}
                        >
                          Activer ma licence personnelle
                        </Button>
                        {remainingLicences <= 0 && (
                          <p className="mt-2 text-xs text-amber-700">
                            Capacité atteinte. Augmentez vos licences pour activer votre accès complet.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {invitations.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-medium">Invitations en attente</h3>
                      <ul className="divide-y rounded-lg border bg-background">
                        {invitations.map((i) => (
                          <li key={i.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{i.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Expire le {new Date(i.expires_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleResend(i.id)} disabled={busyId === i.id}>
                                {busyId === i.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRevoke(i.id)} disabled={busyId === i.id}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h3 className="mb-2 text-sm font-medium">Membres</h3>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun membre.</p>
                    ) : (
                      <ul className="divide-y rounded-lg border bg-background">
                        {members.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{m.email}</p>
                              <p className="text-xs text-muted-foreground">
                                {m.role === 'admin' ? 'Administrateur' : 'Membre'} ·{' '}
                                {m.removed_at ? 'Retiré' : m.accepted_at ? 'Actif' : 'En attente'}
                              </p>
                            </div>
                            {m.role !== 'admin' && !m.removed_at && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" disabled={busyId === m.id}>
                                    {busyId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {m.email} perdra l'accès aux modules payants. La licence sera libérée
                                      pour un autre collaborateur. Cette action est réversible via une nouvelle invitation.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveMember(m.id)}>Retirer</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {m.removed_at && <Badge variant="secondary">Retiré</Badge>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding">
              <Card>
                <CardHeader><CardTitle>Personnalisation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Affichez votre logo dans l'espace Impôts Facile de vos collaborateurs.
                  </p>

                  <div className="flex items-center gap-4 rounded-lg border bg-background p-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded border bg-muted/30">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Aucun logo</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="inline-flex">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                        />
                        <Button asChild disabled={logoUploading}>
                          <span>
                            {logoUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {org.logo_url ? 'Changer le logo' : 'Téléverser un logo'}
                          </span>
                        </Button>
                      </label>
                      {org.logo_url && (
                        <Button variant="outline" size="sm" onClick={handleLogoRemove} disabled={logoUploading}>
                          <Trash2 className="mr-2 h-3 w-3" /> Supprimer
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        PNG, JPEG, SVG ou WebP — 2 MB maximum. Format carré recommandé.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Modal activation licence admin */}
      <AlertDialog open={showActivate} onOpenChange={setShowActivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer ma licence personnelle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous accédez déjà à un aperçu de la plateforme. Si vous souhaitez suivre le parcours
              complet, sauvegarder vos progressions et obtenir le certificat, activez votre licence
              personnelle. Cela occupera 1 licence sur les {org?.nb_licences ?? '—'} disponibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activating}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateLicense} disabled={activating}>
              {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Activer ma licence personnelle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
