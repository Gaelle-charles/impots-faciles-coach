import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { downloadCSV, formatEUR } from '@/lib/csvExport';
import {
  Coins, Ticket, TrendingDown, TrendingUp, Star, Users, Download, Search, Inbox, ArrowLeft,
} from 'lucide-react';

type Plan = 'starter' | 'expert' | 'premium';
type ParrainType = 'user' | 'external' | 'none';

interface CouponLite {
  id: string;
  code: string;
  parrain_type: ParrainType;
  parrain_user_id: string | null;
  parrain_external_name: string | null;
  parrain_external_email: string | null;
  parrain_external_type: string | null;
  times_redeemed: number;
}

interface RedemptionLite {
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

interface ParrainAggregate {
  key: string; // user_id or 'ext:name' or 'none'
  type: ParrainType;
  name: string;
  email: string | null;
  externalType: string | null;
  user_id: string | null;
  couponsCount: number;
  redemptionsCount: number;
  caGenere: number;
  reductionAccordee: number;
  caNet: number;
  conversionRate: number | null;
}

type Period = '7d' | '30d' | '12m' | 'custom';

function periodRange(period: Period, customStart: string, customEnd: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (period === '7d') {
    const s = new Date(now); s.setDate(s.getDate() - 7);
    return { start: s, end: now };
  }
  if (period === '30d') {
    const s = new Date(now); s.setDate(s.getDate() - 30);
    return { start: s, end: now };
  }
  if (period === '12m') {
    const s = new Date(now); s.setFullYear(s.getFullYear() - 1);
    return { start: s, end: now };
  }
  return {
    start: customStart ? new Date(customStart) : null,
    end: customEnd ? new Date(customEnd + 'T23:59:59') : null,
  };
}

export default function AdminCouponsParrains() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<CouponLite[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionLite[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileLite>>(new Map());
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ParrainType>('all');

  async function load() {
    setLoading(true);
    const [cRes, rRes] = await Promise.all([
      supabase.from('coupons').select('id, code, parrain_type, parrain_user_id, parrain_external_name, parrain_external_email, parrain_external_type, times_redeemed'),
      supabase.from('coupon_redemptions').select('id, coupon_id, user_id, amount_paid, amount_saved, plan_purchased, redeemed_at'),
    ]);
    if (cRes.error || rRes.error) {
      toast({ title: 'Erreur', description: cRes.error?.message ?? rRes.error?.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const cs = (cRes.data ?? []) as CouponLite[];
    const rs = (rRes.data ?? []) as RedemptionLite[];
    setCoupons(cs);
    setRedemptions(rs);

    // Fetch parrain user profiles
    const userIds = Array.from(new Set(cs.filter((c) => c.parrain_user_id).map((c) => c.parrain_user_id!)));
    if (userIds.length > 0) {
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', userIds);
      const m = new Map<string, ProfileLite>();
      (pData ?? []).forEach((p) => m.set(p.id, p as ProfileLite));
      setProfiles(m);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const range = useMemo(() => periodRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const filteredRedemptions = useMemo(() => {
    return redemptions.filter((r) => {
      const d = new Date(r.redeemed_at);
      if (range.start && d < range.start) return false;
      if (range.end && d > range.end) return false;
      return true;
    });
  }, [redemptions, range]);

  const aggregates = useMemo<ParrainAggregate[]>(() => {
    // Build a map: key -> aggregate
    const map = new Map<string, ParrainAggregate>();

    // Index coupons by id for quick lookup
    const couponById = new Map(coupons.map((c) => [c.id, c]));

    // First, count coupons per parrain
    const couponsPerKey = new Map<string, Set<string>>();
    for (const c of coupons) {
      const key = parrainKey(c);
      if (!couponsPerKey.has(key)) couponsPerKey.set(key, new Set());
      couponsPerKey.get(key)!.add(c.id);
    }

    // Init aggregates from coupons (so parrains with 0 redemptions in period appear when "all")
    for (const c of coupons) {
      const key = parrainKey(c);
      if (!map.has(key)) {
        const profile = c.parrain_user_id ? profiles.get(c.parrain_user_id) : null;
        const name = c.parrain_type === 'user'
          ? (profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || profile.email || 'Utilisateur' : 'Utilisateur')
          : c.parrain_type === 'external' ? (c.parrain_external_name ?? 'Externe') : 'Aucun parrain';
        map.set(key, {
          key,
          type: c.parrain_type,
          name,
          email: c.parrain_type === 'user' ? (profile?.email ?? null) : c.parrain_external_email,
          externalType: c.parrain_external_type,
          user_id: c.parrain_user_id,
          couponsCount: couponsPerKey.get(key)!.size,
          redemptionsCount: 0,
          caGenere: 0,
          reductionAccordee: 0,
          caNet: 0,
          conversionRate: null,
        });
      }
    }

    // Apply filtered redemptions
    for (const r of filteredRedemptions) {
      const c = couponById.get(r.coupon_id);
      if (!c) continue;
      const key = parrainKey(c);
      const agg = map.get(key);
      if (!agg) continue;
      agg.redemptionsCount++;
      agg.caGenere += r.amount_paid;
      agg.reductionAccordee += r.amount_saved;
      agg.caNet = agg.caGenere - agg.reductionAccordee;
    }

    // Compute conversion (utilisations / codes émis × 100) for users only
    for (const a of map.values()) {
      if (a.type === 'user' && a.couponsCount > 0) {
        a.conversionRate = (a.redemptionsCount / a.couponsCount) * 100;
      }
    }

    let arr = Array.from(map.values());
    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((a) => a.name.toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      arr = arr.filter((a) => a.type === typeFilter);
    }
    // Sort by CA net desc
    arr.sort((a, b) => b.caNet - a.caNet);
    return arr;
  }, [coupons, profiles, filteredRedemptions, search, typeFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const caGenere = filteredRedemptions.reduce((s, r) => s + r.amount_paid, 0);
    const reductionAccordee = filteredRedemptions.reduce((s, r) => s + r.amount_saved, 0);
    const caNet = caGenere - reductionAccordee;
    const codesUtilises = filteredRedemptions.length;
    // Top parrain & active count (only from current aggregates with >0 redemptions)
    const actives = aggregates.filter((a) => a.redemptionsCount > 0);
    const top = actives[0] ?? null;
    return {
      caGenere, reductionAccordee, caNet, codesUtilises,
      topParrain: top, activeCount: actives.length,
    };
  }, [filteredRedemptions, aggregates]);

  function exportCSV() {
    downloadCSV(
      `performance-parrains-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Parrain', 'Type', 'Email', 'Codes émis', 'Utilisations', 'Taux conversion (%)', 'CA généré (€)', 'Réduction accordée (€)', 'CA net (€)'],
      aggregates.map((a) => [
        a.name,
        a.type === 'user' ? 'Utilisateur' : a.type === 'external' ? 'Externe' : 'Aucun',
        a.email ?? '',
        a.couponsCount,
        a.redemptionsCount,
        a.conversionRate !== null ? a.conversionRate.toFixed(1) : '',
        (a.caGenere / 100).toFixed(2).replace('.', ','),
        (a.reductionAccordee / 100).toFixed(2).replace('.', ','),
        (a.caNet / 100).toFixed(2).replace('.', ','),
      ]),
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-2">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <Link to="/admin/coupons" className="hover:text-foreground">Coupons</Link>
        <span>/</span>
        <span className="text-foreground">Performance parrains</span>
      </nav>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Performance parrains</h1>
          <p className="text-sm text-muted-foreground">Analyse des conversions et du chiffre d'affaires généré par parrain.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/coupons"><ArrowLeft className="h-4 w-4 mr-2" />Retour coupons</Link>
          </Button>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exporter CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Période</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="12m">12 derniers mois</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === 'custom' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Du</label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Au</label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Recherche parrain</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Nom ou email" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="external">Externe</SelectItem>
                <SelectItem value="none">Aucun</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={<Coins className="h-4 w-4" />} label="CA généré" value={loading ? null : formatEUR(kpis.caGenere)} />
        <KpiCard icon={<Ticket className="h-4 w-4" />} label="Codes utilisés" value={loading ? null : String(kpis.codesUtilises)} />
        <KpiCard icon={<TrendingDown className="h-4 w-4" />} label="Réductions" value={loading ? null : formatEUR(kpis.reductionAccordee)} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="CA net" value={loading ? null : formatEUR(kpis.caNet)} highlight />
        <KpiCard icon={<Star className="h-4 w-4" />} label="Top parrain" value={loading ? null : (kpis.topParrain?.name ?? '—')} valueSize="sm" />
        <KpiCard icon={<Users className="h-4 w-4" />} label="Parrains actifs" value={loading ? null : String(kpis.activeCount)} />
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Détail par parrain</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parrain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Codes émis</TableHead>
                  <TableHead className="text-right">Utilisations</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead className="text-right">CA généré</TableHead>
                  <TableHead className="text-right">Réduction</TableHead>
                  <TableHead className="text-right">CA net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : aggregates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun parrain trouvé sur cette période.</p>
                    </TableCell>
                  </TableRow>
                ) : aggregates.map((a) => {
                  const detailHref = `/admin/coupons/parrains/${encodeURIComponent(a.key)}`;
                  return (
                    <TableRow key={a.key} className="cursor-pointer" onClick={() => window.location.assign(detailHref)}>
                      <TableCell className="font-medium">
                        <Link to={detailHref} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {a.name}
                        </Link>
                        {a.email && <div className="text-xs text-muted-foreground">{a.email}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            a.type === 'user' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            a.type === 'external' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }
                        >
                          {a.type === 'user' ? 'Utilisateur' : a.type === 'external' ? `Externe${a.externalType ? ' · ' + a.externalType : ''}` : 'Aucun'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{a.couponsCount}</TableCell>
                      <TableCell className="text-right">{a.redemptionsCount}</TableCell>
                      <TableCell className="text-right">
                        {a.conversionRate !== null ? `${a.conversionRate.toFixed(1)}%` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">{formatEUR(a.caGenere)}</TableCell>
                      <TableCell className="text-right text-orange-700">{formatEUR(a.reductionAccordee)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatEUR(a.caNet)}</TableCell>
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

function parrainKey(c: CouponLite): string {
  if (c.parrain_type === 'user' && c.parrain_user_id) return `user:${c.parrain_user_id}`;
  if (c.parrain_type === 'external') return `ext:${(c.parrain_external_name ?? 'sans-nom').toLowerCase()}`;
  return 'none';
}

function KpiCard({ icon, label, value, highlight, valueSize = 'lg' }: {
  icon: React.ReactNode; label: string; value: string | null; highlight?: boolean; valueSize?: 'lg' | 'sm';
}) {
  return (
    <Card className={highlight ? 'border-primary/40 bg-primary/5' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon}{label}</div>
        {value === null ? <Skeleton className="h-7 w-24" /> :
          <div className={valueSize === 'sm' ? 'text-base font-semibold truncate' : 'text-xl font-bold'}>{value}</div>}
      </CardContent>
    </Card>
  );
}
