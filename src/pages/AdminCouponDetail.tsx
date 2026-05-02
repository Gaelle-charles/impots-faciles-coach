import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Pencil, Power, Loader2, Inbox, Lock, AlertTriangle, ExternalLink,
} from 'lucide-react';

type Plan = 'starter' | 'expert' | 'premium';
type ParrainType = 'user' | 'external' | 'none';
type ParrainExternalType = 'influenceur' | 'partenaire' | 'ami' | 'autre';

interface Coupon {
  id: string;
  stripe_coupon_id: string | null;
  stripe_promo_code_id: string | null;
  code: string;
  percent_off: number;
  plans_applicables: Plan[];
  max_redemptions: number | null;
  times_redeemed: number;
  parrain_type: ParrainType;
  parrain_user_id: string | null;
  parrain_external_name: string | null;
  parrain_external_email: string | null;
  parrain_external_type: ParrainExternalType | null;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Redemption {
  id: string;
  user_id: string | null;
  redeemed_at: string;
  plan_purchased: Plan;
  amount_paid: number;
  amount_saved: number;
  stripe_session_id: string | null;
}

interface ProfileLite {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
}

const PLAN_LABEL: Record<Plan, string> = {
  starter: 'Starter', expert: 'Expert', premium: 'Premium',
};
const PLAN_COLOR: Record<Plan, string> = {
  starter: 'bg-blue-100 text-blue-800',
  expert: 'bg-amber-100 text-amber-800',
  premium: 'bg-violet-100 text-violet-800',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function AdminCouponDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>({});
  const [parrainProfile, setParrainProfile] = useState<ProfileLite | null>(null);
  const [creator, setCreator] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    const [{ data: c }, { data: rs }] = await Promise.all([
      supabase.from('coupons').select('*').eq('id', id).maybeSingle(),
      supabase.from('coupon_redemptions').select('*').eq('coupon_id', id)
        .order('redeemed_at', { ascending: false }),
    ]);

    if (!c) { setLoading(false); setCoupon(null); return; }
    setCoupon(c as unknown as Coupon);
    const reds = (rs ?? []) as unknown as Redemption[];
    setRedemptions(reds);

    // Charge profils des filleuls + parrain user + créateur
    const userIds = new Set<string>();
    reds.forEach((r) => { if (r.user_id) userIds.add(r.user_id); });
    if (c.parrain_user_id) userIds.add(c.parrain_user_id);
    if (c.created_by) userIds.add(c.created_by);

    if (userIds.size > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', Array.from(userIds));
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((p) => { map[p.id] = p as ProfileLite; });
      setProfilesById(map);
      if (c.parrain_user_id) setParrainProfile(map[c.parrain_user_id] ?? null);
      if (c.created_by) setCreator(map[c.created_by] ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);

  const kpis = useMemo(() => {
    const ca = redemptions.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
    const saved = redemptions.reduce((s, r) => s + (r.amount_saved ?? 0), 0);
    return {
      ca: ca / 100,
      saved: saved / 100,
      net: ca / 100, // amount_paid est déjà après réduction
    };
  }, [redemptions]);

  const usagePct = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.max_redemptions == null) return Math.min(100, coupon.times_redeemed > 0 ? 5 : 0);
    return Math.min(100, (coupon.times_redeemed / coupon.max_redemptions) * 100);
  }, [coupon]);

  async function deactivate() {
    if (!coupon) return;
    setActionLoading(true);
    const { error } = await supabase.functions.invoke('update-coupon', {
      body: { id: coupon.id, active: false },
    });
    setActionLoading(false);
    setDeactivateOpen(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Coupon désactivé' });
      loadAll();
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!coupon) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Coupon introuvable.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/coupons')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <Link to="/admin/coupons" className="hover:text-foreground">Coupons</Link>
        <span>/</span>
        <span className="text-foreground font-mono">{coupon.code}</span>
      </nav>
      <div>
        <Link to="/admin/coupons" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Tous les coupons
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-3xl font-bold font-mono">{coupon.code}</h1>
            <Badge className="text-lg px-3 py-1 bg-primary/10 text-primary border-0">
              −{coupon.percent_off}%
            </Badge>
            <Badge variant={coupon.active ? 'default' : 'secondary'}>
              {coupon.active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1">
            {coupon.plans_applicables.map((p) => (
              <Badge key={p} className={`${PLAN_COLOR[p]} border-0 text-xs`}>{PLAN_LABEL[p]}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" /> Éditer
          </Button>
          {coupon.active && (
            <Button variant="outline" onClick={() => setDeactivateOpen(true)}>
              <Power className="h-4 w-4 mr-2" /> Désactiver
            </Button>
          )}
        </div>
      </div>

      {/* Infos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
          <Info label="Parrain">
            {coupon.parrain_type === 'none' && <span className="text-muted-foreground">Aucun</span>}
            {coupon.parrain_type === 'user' && parrainProfile && (
              <Link to={`/admin/users?q=${parrainProfile.email ?? ''}`} className="text-primary hover:underline inline-flex items-center gap-1">
                {parrainProfile.prenom} {parrainProfile.nom}
                <span className="text-muted-foreground">({parrainProfile.email})</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {coupon.parrain_type === 'user' && !parrainProfile && (
              <span className="text-muted-foreground">Utilisateur supprimé</span>
            )}
            {coupon.parrain_type === 'external' && (
              <span>
                {coupon.parrain_external_name}
                {coupon.parrain_external_email && (
                  <span className="text-muted-foreground"> · {coupon.parrain_external_email}</span>
                )}
                {coupon.parrain_external_type && (
                  <Badge variant="outline" className="ml-2 text-xs">{coupon.parrain_external_type}</Badge>
                )}
              </span>
            )}
          </Info>
          <Info label="Validité">
            {formatDate(coupon.valid_from)} → {coupon.valid_until ? formatDate(coupon.valid_until) : <span className="text-muted-foreground">illimité</span>}
          </Info>
          <Info label="Créé par">
            {creator ? `${creator.prenom ?? ''} ${creator.nom ?? ''} (${creator.email})` : '—'}
          </Info>
          <Info label="Créé le">{formatDate(coupon.created_at)}</Info>
          {coupon.notes && (
            <div className="md:col-span-2">
              <Info label="Notes">{coupon.notes}</Info>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Utilisations</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {coupon.times_redeemed}
              <span className="text-base text-muted-foreground"> / {coupon.max_redemptions ?? '∞'}</span>
            </p>
            {coupon.max_redemptions != null && (
              <Progress value={usagePct} className="mt-2 h-2" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">CA généré</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatEur(kpis.ca)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Réduction totale</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-700">−{formatEur(kpis.saved)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">CA net encaissé</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-700">{formatEur(kpis.net)}</p></CardContent>
        </Card>
      </div>

      {/* Redemptions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Historique des utilisations</CardTitle></CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Aucune utilisation pour le moment.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Filleul</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                  <TableHead className="text-right">Économisé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((r) => {
                  const p = r.user_id ? profilesById[r.user_id] : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{formatDate(r.redeemed_at)}</TableCell>
                      <TableCell className="text-sm">
                        {p ? (
                          <Link to={`/admin/users?q=${p.email ?? ''}`} className="hover:underline text-primary">
                            <div className="font-medium">{p.prenom} {p.nom}</div>
                            <div className="text-xs text-muted-foreground">{p.email}</div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">Utilisateur supprimé</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${PLAN_COLOR[r.plan_purchased]} border-0 text-xs`}>
                          {PLAN_LABEL[r.plan_purchased]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatEur(r.amount_paid / 100)}</TableCell>
                      <TableCell className="text-right text-amber-700">−{formatEur(r.amount_saved / 100)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditCouponDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        coupon={coupon}
        onSaved={() => { setEditOpen(false); loadAll(); }}
      />

      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver ce coupon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action désactive immédiatement le coupon côté Stripe. Les utilisateurs ne pourront plus l'utiliser.
              L'historique reste conservé. Confirmer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deactivate} disabled={actionLoading} className="bg-destructive hover:bg-destructive/90">
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground mb-1">{label}</p>
      <div>{children}</div>
    </div>
  );
}

// ---------------- EDIT DIALOG ----------------

interface EditProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coupon: Coupon;
  onSaved: () => void;
}

function EditCouponDialog({ open, onOpenChange, coupon, onSaved }: EditProps) {
  const [maxRed, setMaxRed] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [parrainType, setParrainType] = useState<ParrainType>('none');
  const [parrainUserId, setParrainUserId] = useState<string>('');
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalType, setExternalType] = useState<ParrainExternalType>('influenceur');
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<ProfileLite[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMaxRed(coupon.max_redemptions != null ? String(coupon.max_redemptions) : '');
    setValidUntil(coupon.valid_until ? coupon.valid_until.slice(0, 10) : '');
    setNotes(coupon.notes ?? '');
    setParrainType(coupon.parrain_type);
    setParrainUserId(coupon.parrain_user_id ?? '');
    setExternalName(coupon.parrain_external_name ?? '');
    setExternalEmail(coupon.parrain_external_email ?? '');
    setExternalType(coupon.parrain_external_type ?? 'influenceur');
    setUserQuery(''); setUserResults([]);
  }, [open, coupon]);

  useEffect(() => {
    if (parrainType !== 'user' || userQuery.trim().length < 2) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      const q = userQuery.trim();
      const { data } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .or(`email.ilike.%${q}%,prenom.ilike.%${q}%,nom.ilike.%${q}%`)
        .limit(8);
      setUserResults((data ?? []) as ProfileLite[]);
    }, 250);
    return () => clearTimeout(t);
  }, [userQuery, parrainType]);

  const maxRedNum = maxRed.trim() === '' ? null : parseInt(maxRed, 10);
  const maxRedTooLow = maxRedNum != null && maxRedNum < coupon.times_redeemed;

  async function submit() {
    if (maxRedTooLow) return;
    setSubmitting(true);
    const { error } = await supabase.functions.invoke('update-coupon', {
      body: {
        id: coupon.id,
        max_redemptions: maxRedNum,
        notes: notes.trim() || null,
        parrain_type: parrainType,
        parrain_user_id: parrainType === 'user' ? parrainUserId || null : null,
        parrain_external_name: parrainType === 'external' ? externalName.trim() || null : null,
        parrain_external_email: parrainType === 'external' ? externalEmail.trim() || null : null,
        parrain_external_type: parrainType === 'external' ? externalType : null,
        // valid_until rejeté côté edge actuelle (FORBIDDEN_FIELDS) — voir note plus bas
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Coupon mis à jour' });
      onSaved();
    }
  }

  const lockedTooltip = "Non modifiable côté Stripe. Désactivez et créez un nouveau coupon si besoin.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Éditer le coupon</DialogTitle>
          <DialogDescription>Seuls quelques champs sont modifiables.</DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <div className="space-y-5">
            {/* Locked fields */}
            <div className="grid gap-3 grid-cols-2">
              <LockedField label="Code" value={coupon.code} tooltip={lockedTooltip} />
              <LockedField label="Réduction" value={`${coupon.percent_off}%`} tooltip={lockedTooltip} />
              <div className="col-span-2">
                <LockedField
                  label="Plans applicables"
                  value={coupon.plans_applicables.map((p) => PLAN_LABEL[p]).join(', ')}
                  tooltip={lockedTooltip}
                />
              </div>
            </div>

            {/* Max redemptions */}
            <div className="space-y-2">
              <Label>Limite d'utilisation</Label>
              <Input
                type="number" min={coupon.times_redeemed} placeholder="Vide = illimité"
                value={maxRed}
                onChange={(e) => setMaxRed(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Utilisations actuelles : <strong>{coupon.times_redeemed}</strong>
              </p>
              {maxRedTooLow && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Impossible : la limite ne peut pas être inférieure aux utilisations actuelles ({coupon.times_redeemed}).
                </p>
              )}
            </div>

            {/* Valid until — affiché en lecture seule (Stripe Promotion Code expiry n'est pas modifiable) */}
            <div className="space-y-2">
              <LockedField
                label="Valide jusqu'au"
                value={coupon.valid_until ? formatDate(coupon.valid_until) : 'Illimité'}
                tooltip="La date d'expiration du Promotion Code Stripe ne peut pas être modifiée. Désactivez et créez un nouveau coupon pour prolonger."
              />
            </div>

            {/* Parrain */}
            <div className="space-y-2">
              <Label>Parrainage</Label>
              <RadioGroup value={parrainType} onValueChange={(v) => setParrainType(v as ParrainType)}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="none" id="ep-none" /><span>Aucun</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="user" id="ep-user" /><span>Utilisateur de la plateforme</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="external" id="ep-ext" /><span>Parrain externe</span>
                </label>
              </RadioGroup>

              {parrainType === 'user' && (
                <div className="ml-6 space-y-2 mt-2">
                  {parrainUserId && (
                    <div className="text-xs bg-muted p-2 rounded">
                      Sélectionné : <strong>{parrainUserId}</strong>
                    </div>
                  )}
                  <Input placeholder="Rechercher email/nom…" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
                  {userResults.length > 0 && (
                    <div className="border rounded max-h-40 overflow-y-auto">
                      {userResults.map((u) => (
                        <button
                          key={u.id} type="button"
                          onClick={() => { setParrainUserId(u.id); setUserResults([]); setUserQuery(''); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                        >
                          <div className="font-medium">{u.prenom} {u.nom}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {parrainType === 'external' && (
                <div className="ml-6 space-y-2 mt-2">
                  <Input placeholder="Nom" value={externalName} onChange={(e) => setExternalName(e.target.value)} />
                  <Input placeholder="Email (optionnel)" type="email" value={externalEmail} onChange={(e) => setExternalEmail(e.target.value)} />
                  <Select value={externalType} onValueChange={(v) => setExternalType(v as ParrainExternalType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="influenceur">Influenceur</SelectItem>
                      <SelectItem value="partenaire">Partenaire</SelectItem>
                      <SelectItem value="ami">Ami</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes internes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
        </TooltipProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={submit} disabled={submitting || maxRedTooLow}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LockedField({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <Lock className="h-3 w-3 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </Label>
      <div className="mt-1 px-3 py-2 rounded-md bg-muted text-sm font-medium">{value}</div>
    </div>
  );
}
