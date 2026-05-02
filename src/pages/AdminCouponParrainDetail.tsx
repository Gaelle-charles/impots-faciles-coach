import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { formatEUR } from '@/lib/csvExport';
import {
  ArrowLeft, Mail, Coins, Ticket, TrendingDown, TrendingUp, Inbox, ExternalLink,
} from 'lucide-react';

type Plan = 'starter' | 'expert' | 'premium';
type ParrainType = 'user' | 'external' | 'none';

interface CouponRow {
  id: string;
  code: string;
  percent_off: number;
  times_redeemed: number;
  active: boolean;
  parrain_type: ParrainType;
  parrain_user_id: string | null;
  parrain_external_name: string | null;
  parrain_external_email: string | null;
  parrain_external_type: string | null;
}

interface RedemptionRow {
  id: string;
  coupon_id: string;
  user_id: string | null;
  amount_paid: number;
  amount_saved: number;
  plan_purchased: Plan;
  redeemed_at: string;
}

interface ProfileLite {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
}

const PLAN_COLOR: Record<Plan, string> = {
  starter: 'bg-blue-50 text-blue-700 border-blue-200',
  expert: 'bg-amber-50 text-amber-700 border-amber-200',
  premium: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function AdminCouponParrainDetail() {
  const { id: rawKey } = useParams<{ id: string }>();
  const parrainKey = decodeURIComponent(rawKey ?? '');
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [parrainProfile, setParrainProfile] = useState<ProfileLite | null>(null);
  const [filleulProfiles, setFilleulProfiles] = useState<Map<string, ProfileLite>>(new Map());

  const parsed = useMemo(() => {
    if (parrainKey.startsWith('user:')) return { type: 'user' as ParrainType, value: parrainKey.slice(5) };
    if (parrainKey.startsWith('ext:')) return { type: 'external' as ParrainType, value: parrainKey.slice(4) };
    return { type: 'none' as ParrainType, value: '' };
  }, [parrainKey]);

  async function load() {
    setLoading(true);
    // Fetch coupons matching this parrain key
    let query = supabase.from('coupons').select('*');
    if (parsed.type === 'user') {
      query = query.eq('parrain_type', 'user').eq('parrain_user_id', parsed.value);
    } else if (parsed.type === 'external') {
      query = query.eq('parrain_type', 'external').ilike('parrain_external_name', parsed.value);
    } else {
      query = query.eq('parrain_type', 'none');
    }
    const { data: cData, error: cErr } = await query;
    if (cErr) {
      toast({ title: 'Erreur', description: cErr.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const cs = (cData ?? []) as CouponRow[];
    setCoupons(cs);

    // Fetch parrain profile if user
    if (parsed.type === 'user' && parsed.value) {
      const { data } = await supabase.from('profiles').select('id, prenom, nom, email').eq('id', parsed.value).maybeSingle();
      setParrainProfile(data as ProfileLite | null);
    }

    // Fetch redemptions for these coupons
    if (cs.length > 0) {
      const { data: rData } = await supabase
        .from('coupon_redemptions')
        .select('*')
        .in('coupon_id', cs.map((c) => c.id))
        .order('redeemed_at', { ascending: false });
      const rs = (rData ?? []) as RedemptionRow[];
      setRedemptions(rs);

      // Fetch filleul profiles
      const uids = Array.from(new Set(rs.filter((r) => r.user_id).map((r) => r.user_id!)));
      if (uids.length > 0) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('id, prenom, nom, email')
          .in('id', uids);
        const m = new Map<string, ProfileLite>();
        (pData ?? []).forEach((p) => m.set(p.id, p as ProfileLite));
        setFilleulProfiles(m);
      }
    } else {
      setRedemptions([]);
    }

    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [parrainKey]);

  const stats = useMemo(() => {
    const caGenere = redemptions.reduce((s, r) => s + r.amount_paid, 0);
    const reduction = redemptions.reduce((s, r) => s + r.amount_saved, 0);
    const caNet = caGenere - reduction;
    // Plan le plus acheté
    const planCount = new Map<Plan, number>();
    redemptions.forEach((r) => planCount.set(r.plan_purchased, (planCount.get(r.plan_purchased) ?? 0) + 1));
    let topPlan: Plan | null = null; let max = 0;
    planCount.forEach((v, k) => { if (v > max) { max = v; topPlan = k; } });
    return { caGenere, reduction, caNet, topPlan, totalRedemptions: redemptions.length };
  }, [redemptions]);

  // Header info
  const firstCoupon = coupons[0];
  const headerName = parsed.type === 'user'
    ? (parrainProfile ? `${parrainProfile.prenom ?? ''} ${parrainProfile.nom ?? ''}`.trim() || parrainProfile.email || 'Utilisateur' : 'Utilisateur')
    : parsed.type === 'external' ? (firstCoupon?.parrain_external_name ?? parsed.value) : 'Sans parrain';
  const headerEmail = parsed.type === 'user' ? parrainProfile?.email : firstCoupon?.parrain_external_email;
  const externalType = firstCoupon?.parrain_external_type;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <Link to="/admin/coupons" className="hover:text-foreground">Coupons</Link>
        <span>/</span>
        <Link to="/admin/coupons/parrains" className="hover:text-foreground">Parrains</Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{headerName}</span>
      </nav>

      <Button variant="outline" asChild className="w-fit">
        <Link to="/admin/coupons/parrains"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Link>
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold">{loading ? <Skeleton className="h-7 w-48" /> : headerName}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={
                  parsed.type === 'user' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  parsed.type === 'external' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                  'bg-slate-50 text-slate-600 border-slate-200'
                }>
                  {parsed.type === 'user' ? 'Utilisateur' : parsed.type === 'external' ? `Externe${externalType ? ' · ' + externalType : ''}` : 'Aucun parrain'}
                </Badge>
                {headerEmail && (
                  <a href={`mailto:${headerEmail}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {headerEmail}
                  </a>
                )}
              </div>
            </div>
            {parsed.type === 'user' && parrainProfile && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/users`}>Voir profil <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Coins className="h-4 w-4" />} label="CA généré" value={loading ? null : formatEUR(stats.caGenere)} />
        <KpiCard icon={<Ticket className="h-4 w-4" />} label="Utilisations" value={loading ? null : String(stats.totalRedemptions)} />
        <KpiCard icon={<TrendingDown className="h-4 w-4" />} label="Réductions" value={loading ? null : formatEUR(stats.reduction)} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="CA net" value={loading ? null : formatEUR(stats.caNet)} highlight />
      </div>

      {stats.topPlan && (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Plan le plus acheté :</span>
            <Badge className={PLAN_COLOR[stats.topPlan as Plan] + ' border'}>{stats.topPlan}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Coupons */}
      <Card>
        <CardHeader><CardTitle className="text-base">Coupons de ce parrain ({coupons.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Utilisations</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">
                    <Inbox className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun coupon</p>
                  </TableCell></TableRow>
                ) : coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>{c.percent_off}%</TableCell>
                    <TableCell>{c.times_redeemed}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Actif' : 'Inactif'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/admin/coupons/${c.id}`}>Détail <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Redemptions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Historique des utilisations ({redemptions.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Filleul</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                  <TableHead className="text-right">Économie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ) : redemptions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">
                    <Inbox className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune utilisation</p>
                  </TableCell></TableRow>
                ) : redemptions.map((r) => {
                  const f = r.user_id ? filleulProfiles.get(r.user_id) : null;
                  const fName = f ? `${f.prenom ?? ''} ${f.nom ?? ''}`.trim() || f.email : 'Utilisateur supprimé';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{new Date(r.redeemed_at).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{fName}{f?.email && <div className="text-xs text-muted-foreground">{f.email}</div>}</TableCell>
                      <TableCell><Badge className={PLAN_COLOR[r.plan_purchased] + ' border'}>{r.plan_purchased}</Badge></TableCell>
                      <TableCell className="text-right">{formatEUR(r.amount_paid)}</TableCell>
                      <TableCell className="text-right text-orange-700">{formatEUR(r.amount_saved)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | null; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-primary/40 bg-primary/5' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon}{label}</div>
        {value === null ? <Skeleton className="h-7 w-24" /> : <div className="text-xl font-bold">{value}</div>}
      </CardContent>
    </Card>
  );
}
