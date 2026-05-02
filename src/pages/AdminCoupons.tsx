import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Dice5, Plus, Power, Trash2, Loader2, AlertTriangle } from 'lucide-react';

type Plan = 'starter' | 'expert' | 'premium';
type ParrainType = 'user' | 'external' | 'none';
type ParrainExternalType = 'influenceur' | 'partenaire' | 'ami' | 'autre';

interface Coupon {
  id: string;
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
  created_at: string;
}

interface ProfileLite {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
}

const PLAN_LABEL: Record<Plan, string> = {
  starter: 'Starter',
  expert: 'Expert',
  premium: 'Premium',
};

const PLAN_COLOR: Record<Plan, string> = {
  starter: 'bg-blue-100 text-blue-800',
  expert: 'bg-amber-100 text-amber-800',
  premium: 'bg-violet-100 text-violet-800',
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [openCreate, setOpenCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadCoupons() {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setCoupons((data ?? []) as unknown as Coupon[]);
    }
    setLoading(false);
  }

  useEffect(() => { loadCoupons(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return coupons;
    return coupons.filter((c) => (filter === 'active' ? c.active : !c.active));
  }, [coupons, filter]);

  async function toggleActive(c: Coupon) {
    setActionLoading(c.id);
    const { error } = await supabase.functions.invoke('update-coupon', {
      body: { id: c.id, active: !c.active },
    });
    setActionLoading(null);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: c.active ? 'Coupon désactivé' : 'Coupon réactivé' });
      loadCoupons();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    const { data, error } = await supabase.functions.invoke('delete-coupon', {
      body: { id: deleteTarget.id },
    });
    setActionLoading(null);
    setDeleteTarget(null);
    if (error) {
      const msg = (data as { error?: string } | null)?.error ?? error.message;
      toast({ title: 'Action impossible', description: msg, variant: 'destructive' });
      loadCoupons();
    } else {
      toast({ title: 'Coupon supprimé' });
      loadCoupons();
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Coupons</h1>
          <p className="text-sm text-muted-foreground">Gérez les codes promo et le suivi parrainage.</p>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau coupon
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="active">Actifs</TabsTrigger>
          <TabsTrigger value="inactive">Désactivés</TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Parrain</TableHead>
              <TableHead>Utilisations</TableHead>
              <TableHead>Plans</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10">
                <Loader2 className="h-5 w-5 animate-spin inline" />
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                Aucun coupon
              </TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => window.location.assign(`/admin/coupons/${c.id}`)}>
                <TableCell className="font-mono font-semibold text-primary hover:underline">{c.code}</TableCell>
                <TableCell>{c.percent_off}%</TableCell>
                <TableCell className="text-sm">
                  {c.parrain_type === 'user' && <span className="text-blue-700">Utilisateur</span>}
                  {c.parrain_type === 'external' && (
                    <span>
                      {c.parrain_external_name}
                      {c.parrain_external_type && (
                        <span className="text-muted-foreground"> · {c.parrain_external_type}</span>
                      )}
                    </span>
                  )}
                  {c.parrain_type === 'none' && <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {c.times_redeemed}{' / '}
                  {c.max_redemptions ?? <span className="text-muted-foreground">∞</span>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.plans_applicables.map((p) => (
                      <Badge key={p} className={`${PLAN_COLOR[p]} border-0 text-xs`}>{PLAN_LABEL[p]}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={c.active ? 'default' : 'secondary'}>
                    {c.active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => toggleActive(c)}
                      disabled={actionLoading === c.id}
                      title={c.active ? 'Désactiver' : 'Réactiver'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => setDeleteTarget(c)}
                      disabled={actionLoading === c.id}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateCouponDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => { setOpenCreate(false); loadCoupons(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le coupon {deleteTarget?.code} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.times_redeemed > 0
                ? "Ce coupon a déjà été utilisé. Il ne peut pas être supprimé — il sera désactivé à la place."
                : "Cette action est définitive et supprimera également le coupon dans Stripe."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------- CREATE DIALOG ----------------

interface CreateProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

function CreateCouponDialog({ open, onOpenChange, onCreated }: CreateProps) {
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState<number>(10);
  const [plans, setPlans] = useState<Record<Plan, boolean>>({
    starter: true, expert: true, premium: true,
  });
  const [limitMode, setLimitMode] = useState<'unique' | 'limited' | 'unlimited'>('limited');
  const [limitedValue, setLimitedValue] = useState<number>(50);
  const [validFrom, setValidFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState<string>('');
  const [parrainType, setParrainType] = useState<ParrainType>('none');
  const [parrainUserId, setParrainUserId] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<ProfileLite[]>([]);
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalType, setExternalType] = useState<ParrainExternalType>('influenceur');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCode(''); setPercent(10);
    setPlans({ starter: true, expert: true, premium: true });
    setLimitMode('limited'); setLimitedValue(50);
    setValidFrom(new Date().toISOString().slice(0, 10)); setValidUntil('');
    setParrainType('none'); setParrainUserId(''); setUserQuery(''); setUserResults([]);
    setExternalName(''); setExternalEmail(''); setExternalType('influenceur');
    setNotes('');
  }

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  // Search users
  useEffect(() => {
    if (parrainType !== 'user' || userQuery.trim().length < 2) {
      setUserResults([]); return;
    }
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

  function selectedPlans(): Plan[] {
    return (Object.keys(plans) as Plan[]).filter((p) => plans[p]);
  }

  function validate(): string | null {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(c)) return 'Code invalide (3-40 caractères, A-Z 0-9 _ -)';
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) return '% doit être entre 1 et 100';
    if (selectedPlans().length === 0) return 'Sélectionnez au moins un plan';
    if (limitMode === 'limited' && (!Number.isInteger(limitedValue) || limitedValue < 1)) {
      return 'La limite doit être un entier ≥ 1';
    }
    if (validUntil && new Date(validUntil) <= new Date(validFrom)) {
      return "La date de fin doit être après la date de début";
    }
    if (parrainType === 'user' && !parrainUserId) return 'Sélectionnez un utilisateur parrain';
    if (parrainType === 'external' && !externalName.trim()) return 'Nom du parrain externe requis';
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) {
      toast({ title: 'Validation', description: err, variant: 'destructive' });
      return;
    }
    const maxRedemptions =
      limitMode === 'unique' ? 1 :
      limitMode === 'limited' ? limitedValue :
      null;

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('create-coupon', {
      body: {
        code: code.trim().toUpperCase(),
        percent_off: percent,
        plans_applicables: selectedPlans(),
        max_redemptions: maxRedemptions,
        valid_from: new Date(validFrom).toISOString(),
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        parrain_type: parrainType,
        parrain_user_id: parrainType === 'user' ? parrainUserId : null,
        parrain_external_name: parrainType === 'external' ? externalName.trim() : null,
        parrain_external_email: parrainType === 'external' ? externalEmail.trim() || null : null,
        parrain_external_type: parrainType === 'external' ? externalType : null,
        notes: notes.trim() || null,
      },
    });
    setSubmitting(false);

    if (error) {
      const msg = (data as { error?: string } | null)?.error ?? error.message;
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Coupon créé', description: `${code.toUpperCase()} (${percent}%)` });
    onCreated();
  }

  const selectedUser = userResults.find((u) => u.id === parrainUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau coupon</DialogTitle>
          <DialogDescription>Créer un code promo synchronisé avec Stripe.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Code */}
          <div className="space-y-2">
            <Label>Code</Label>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EX: BIENVENUE10"
                className="font-mono uppercase"
              />
              <Button type="button" variant="outline" onClick={() => setCode(generateCode())} title="Générer">
                <Dice5 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* % */}
          <div className="space-y-2">
            <Label>Pourcentage de réduction</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" min={1} max={100}
                value={percent}
                onChange={(e) => setPercent(parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <span>%</span>
            </div>
          </div>

          {/* Plans */}
          <div className="space-y-2">
            <Label>Plans applicables</Label>
            <div className="flex flex-wrap gap-4">
              {(['starter', 'expert', 'premium'] as Plan[]).map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={plans[p]}
                    onCheckedChange={(v) => setPlans((s) => ({ ...s, [p]: !!v }))}
                  />
                  <span>{PLAN_LABEL[p]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Limite */}
          <div className="space-y-2">
            <Label>Limite d'utilisation</Label>
            <RadioGroup value={limitMode} onValueChange={(v) => setLimitMode(v as typeof limitMode)}>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="unique" id="lim-unique" />
                <span>Usage unique (1 fois)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="limited" id="lim-limited" />
                <span>Limité à</span>
                <Input
                  type="number" min={1}
                  value={limitedValue}
                  onChange={(e) => setLimitedValue(parseInt(e.target.value) || 1)}
                  disabled={limitMode !== 'limited'}
                  className="w-24 h-8"
                />
                <span>utilisations</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="unlimited" id="lim-unlimited" />
                <span>Illimité</span>
                {limitMode === 'unlimited' && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" /> Aucune limite — à utiliser avec précaution
                  </span>
                )}
              </label>
            </RadioGroup>
          </div>

          {/* Validité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valide à partir du</Label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Jusqu'au (optionnel)</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>

          {/* Parrain */}
          <div className="space-y-2">
            <Label>Parrainage</Label>
            <RadioGroup value={parrainType} onValueChange={(v) => setParrainType(v as ParrainType)}>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="none" id="par-none" />
                <span>Aucun parrain</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="user" id="par-user" />
                <span>Utilisateur de la plateforme</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="external" id="par-ext" />
                <span>Parrain externe</span>
              </label>
            </RadioGroup>

            {parrainType === 'user' && (
              <div className="ml-6 space-y-2 mt-2">
                <Input
                  placeholder="Rechercher email, prénom ou nom…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
                {selectedUser && (
                  <div className="text-xs bg-muted p-2 rounded">
                    Sélectionné : <strong>{selectedUser.prenom} {selectedUser.nom}</strong> ({selectedUser.email})
                  </div>
                )}
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
            <Textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, campagne associée…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Créer le coupon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
