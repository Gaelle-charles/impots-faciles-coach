import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Save,
  Lock,
  BookOpen,
  Target,
  CalendarDays,
  Camera,
  CreditCard,
  ArrowRight,
  Trash2,
} from 'lucide-react';

interface ProfileData {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  plan: string;
  created_at: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
}

const planConfig: Record<string, { label: string; color: string }> = {
  nouveau: { label: 'Gratuit', color: 'bg-muted text-muted-foreground' },
  essentiel: { label: 'Essentiel', color: 'bg-blue-100 text-blue-800' },
  pro: { label: 'Pro', color: 'bg-primary/10 text-primary' },
  expert: { label: 'Expert', color: 'bg-accent/10 text-accent' },
  starter: { label: 'Starter', color: 'bg-blue-100 text-blue-800' },
  premium: { label: 'Premium', color: 'bg-accent/10 text-accent' },
};

interface SubInfo {
  active: boolean;
  status?: string;
  plan?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  price_amount?: number | null;
  price_currency?: string | null;
  interval?: string | null;
}

const Profil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');

  // Stats
  const [totalModules, setTotalModules] = useState(0);
  const [completedModules, setCompletedModules] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Active-sub warning step before final delete
  const [subWarnOpen, setSubWarnOpen] = useState(false);
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [checkingSub, setCheckingSub] = useState(false);

  // Billing portal
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);

  // Complete profile (for users missing prenom/nom)
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completePrenom, setCompletePrenom] = useState('');
  const [completeNom, setCompleteNom] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      const [profRes, modRes, progRes, resRes] = await Promise.all([
        supabase.from('profiles').select('prenom, nom, email, plan, created_at, stripe_subscription_id, stripe_customer_id').eq('id', user.id).maybeSingle(),
        supabase.from('modules').select('id'),
        supabase.from('progressions').select('completion_date').eq('user_id', user.id),
        supabase.from('resultat_quiz').select('pourcentage').eq('user_id', user.id),
      ]);

      if (profRes.data) {
        setProfile(profRes.data);
        setPrenom(profRes.data.prenom ?? '');
        setNom(profRes.data.nom ?? '');
        // Auto-open completion modal if prenom or nom is missing
        if (!profRes.data.prenom?.trim() || !profRes.data.nom?.trim()) {
          setCompletePrenom(profRes.data.prenom ?? '');
          setCompleteNom(profRes.data.nom ?? '');
          setCompleteOpen(true);
        }
      }
      setTotalModules(modRes.data?.length ?? 0);
      setCompletedModules(progRes.data?.filter((p) => !!p.completion_date).length ?? 0);
      if (resRes.data && resRes.data.length > 0) {
        setAvgScore(Math.round(resRes.data.reduce((a, r) => a + Number(r.pourcentage), 0) / resRes.data.length));
      }
      setLoading(false);

      // Fetch active subscription details (best-effort)
      if (profRes.data?.stripe_subscription_id) {
        const { data: subData } = await supabase.functions.invoke('get-subscription-status');
        if (subData) setSubInfo(subData as SubInfo);
      }
    };

    fetchAll();
  }, [user]);

  const initials = useMemo(() => {
    const p = (profile?.prenom?.[0] ?? '').toUpperCase();
    const n = (profile?.nom?.[0] ?? '').toUpperCase();
    return p + n || '?';
  }, [profile]);

  const handleManageBilling = () => {
    setPortalOpen(true);
  };

  const handleConfirmPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal-session');
      const url = (data as { url?: string; error?: string })?.url;
      const errMsg = (data as { error?: string })?.error ?? error?.message;
      if (errMsg || !url) {
        toast({
          title: 'Erreur',
          description: 'Impossible d\'accéder à la gestion de votre abonnement.',
          variant: 'destructive',
        });
        setOpeningPortal(false);
        return;
      }
      window.location.href = url;
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accéder à la gestion de votre abonnement.',
        variant: 'destructive',
      });
      setOpeningPortal(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const tp = prenom.trim();
    const tn = nom.trim();
    if (!tp || tp.length < 2) {
      toast({ title: 'Erreur', description: 'Le prénom doit contenir au moins 2 caractères.', variant: 'destructive' });
      return;
    }
    if (!tn || tn.length < 2) {
      toast({ title: 'Erreur', description: 'Le nom doit contenir au moins 2 caractères.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('profiles').update({ prenom: tp, nom: tn }).eq('id', user.id);
    setSaving(false);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } else {
      setProfile((prev) => (prev ? { ...prev, prenom: tp, nom: tn } : prev));
      toast({ title: 'Profil mis à jour ✓', description: 'Tes informations ont été sauvegardées.' });
    }
  };

  const handleResetPassword = async () => {
    const email = profile?.email ?? user?.email;
    if (!email) return;
    setSendingReset(true);
    const { getEmailRedirectOrigin } = await import('@/lib/auth-redirect');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getEmailRedirectOrigin()}/auth/callback`,
    });
    setSendingReset(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email envoyé', description: `Vérifie ta boîte mail à ${email}` });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER' || !user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account');
      if (error || (data && (data as { error?: string }).error)) {
        const msg = (data as { error?: string })?.error ?? error?.message ?? 'Erreur inconnue';
        toast({ title: 'Échec de la suppression', description: msg, variant: 'destructive' });
        setDeleting(false);
        return;
      }
      await signOut();
      navigate('/');
      toast({ title: 'Compte supprimé', description: 'Votre compte a été supprimé.' });
    } catch (e) {
      toast({
        title: 'Échec de la suppression',
        description: (e as Error).message,
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!user) return;
    const tp = completePrenom.trim();
    const tn = completeNom.trim();
    if (tp.length < 2 || tn.length < 2) {
      toast({ title: 'Erreur', description: 'Prénom et nom doivent contenir au moins 2 caractères.', variant: 'destructive' });
      return;
    }
    setCompleting(true);
    const { error } = await supabase.from('profiles').update({ prenom: tp, nom: tn }).eq('id', user.id);
    setCompleting(false);
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
      return;
    }
    setProfile((prev) => (prev ? { ...prev, prenom: tp, nom: tn } : prev));
    setPrenom(tp);
    setNom(tn);
    setCompleteOpen(false);
    toast({ title: 'Profil complété ✓', description: 'Merci !' });
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '—';

  const plan = planConfig[profile?.plan ?? 'nouveau'] ?? planConfig.nouveau;

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <h1 className="font-heading text-3xl font-bold text-foreground">👤 Mon profil</h1>

      {/* ── Informations personnelles ── */}
      <Card className="border-border bg-background shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-heading text-2xl font-bold">
              {initials}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" disabled className="gap-2">
                  <Camera className="h-4 w-4" />
                  Changer la photo
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bientôt disponible</TooltipContent>
            </Tooltip>
          </div>

          {/* Form fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Votre prénom" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom" maxLength={100} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? user?.email ?? ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Pour changer ton email, contacte le support.</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : '💾 Enregistrer les modifications'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Mon abonnement ── */}
      <Card className="border-border bg-background shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Mon abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Plan actuel :</span>
              <Badge className={plan.color}>{plan.label}</Badge>
            </div>
            {profile?.stripe_customer_id && profile.plan !== 'nouveau' ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={openingPortal}
                onClick={handleManageBilling}
              >
                {openingPortal ? 'Ouverture...' : 'Gérer mon abonnement'}{' '}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => navigate('/tarifs')}
              >
                Voir les offres <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          {profile?.stripe_customer_id && profile.plan !== 'nouveau' && (
            <p className="text-xs text-muted-foreground">
              Vous pourrez y modifier votre plan, mettre à jour votre moyen de
              paiement, consulter vos factures ou annuler votre abonnement.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Modal redirection Stripe Portal ── */}
      <Dialog open={portalOpen} onOpenChange={(open) => {
        if (openingPortal) return;
        setPortalOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Gérer votre abonnement</DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-3 text-sm text-muted-foreground">
            <p>Vous allez être redirigé vers notre page de gestion d'abonnement sécurisée Stripe.</p>
            <p>Vous pourrez y :</p>
            <ul className="list-none space-y-1 pl-1">
              <li className="flex items-center gap-2"><span>✅</span> Modifier votre moyen de paiement</li>
              <li className="flex items-center gap-2"><span>✅</span> Consulter et télécharger vos factures</li>
              <li className="flex items-center gap-2"><span>✅</span> Upgrader vers un plan supérieur (avec calcul au prorata)</li>
              <li className="flex items-center gap-2"><span>✅</span> Annuler votre abonnement (fin de la période en cours)</li>
            </ul>
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs">
              <p className="font-semibold mb-1">⚠️ Important</p>
              <p>Le passage à un plan inférieur n'est pas possible en cours d'abonnement. Cette règle est précisée dans nos CGV.</p>
            </div>
          </DialogDescription>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPortalOpen(false)}
              disabled={openingPortal}
            >
              Annuler
            </Button>
            <Button
              className="gap-2"
              disabled={openingPortal}
              onClick={handleConfirmPortal}
            >
              {openingPortal ? 'Redirection...' : 'Continuer vers la gestion'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sécurité ── */}
      <Card className="border-border bg-background shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleResetPassword} disabled={sendingReset} className="gap-2">
            <Lock className="h-4 w-4" />
            {sendingReset ? 'Envoi en cours...' : 'Changer mon mot de passe'}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Un email de réinitialisation sera envoyé à ton adresse.
          </p>
        </CardContent>
      </Card>

      {/* ── Mes statistiques ── */}
      <Card className="border-border bg-background shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">Mes statistiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Modules complétés</p>
                <p className="font-heading font-bold text-foreground">{completedModules} / {totalModules}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Score moyen aux quiz</p>
                <p className="font-heading font-bold text-foreground">{avgScore !== null ? `${avgScore}%` : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Membre depuis</p>
                <p className="font-heading font-bold text-foreground capitalize">{memberSince}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Zone danger ── */}
      <Card className="border-destructive/30 bg-background shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Zone dangereuse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            La suppression de ton compte est définitive. Toutes tes données seront perdues.
          </p>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-2" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteOpen(open);
          if (!open) setDeleteConfirm('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive font-heading">
              Supprimer définitivement votre compte ?
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-md border-2 border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-semibold mb-1">⚠️ Action DÉFINITIVE et IRRÉVERSIBLE</p>
            <p>
              Toutes vos données seront effacées sous 30 jours : votre profil,
              votre progression dans les modules, vos simulations sauvegardées,
              votre certificat.
            </p>
          </div>

          {profile?.stripe_subscription_id && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
              Votre abonnement <span className="font-semibold">{plan.label}</span> sera
              annulé automatiquement à la fin de la période en cours
              (vous conservez l'accès jusque-là).
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Pour confirmer, tapez exactement : <span className="font-bold">SUPPRIMER</span>
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SUPPRIMER"
              autoComplete="off"
              disabled={deleting}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirm('');
              }}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== 'SUPPRIMER' || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete profile dialog (auto-open if prenom/nom missing) */}
      <Dialog open={completeOpen} onOpenChange={(open) => {
        // Prevent closing if still missing required fields
        if (!open && (!profile?.prenom?.trim() || !profile?.nom?.trim())) return;
        setCompleteOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complétez votre profil</DialogTitle>
            <DialogDescription>
              Pour finaliser votre compte, merci d'indiquer votre prénom et votre nom.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="complete-prenom">Prénom *</Label>
              <Input
                id="complete-prenom"
                value={completePrenom}
                onChange={(e) => setCompletePrenom(e.target.value)}
                placeholder="Votre prénom"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-nom">Nom *</Label>
              <Input
                id="complete-nom"
                value={completeNom}
                onChange={(e) => setCompleteNom(e.target.value)}
                placeholder="Votre nom"
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCompleteProfile}
              disabled={completing || !completePrenom.trim() || !completeNom.trim()}
            >
              {completing ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profil;
