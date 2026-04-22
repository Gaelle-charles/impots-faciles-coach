import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Euro, TrendingUp, CreditCard, RefreshCw, AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface StripeRevenue {
  currency: string;
  gross_revenue: number;
  refunded: number;
  net_revenue: number;
  paid_invoices_count: number;
  refunds_count: number;
  active_subscriptions: number;
  mrr: number;
  arr: number;
  by_month: { month: string; gross: number; refunded: number; net: number }[];
  generated_at: string;
}

export function StripeRevenueStats() {
  const [data, setData] = useState<StripeRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke('stripe-revenue');
    if (err) {
      setError(err.message || 'Erreur de chargement');
    } else if (res?.error) {
      setError(res.error);
    } else {
      setData(res as StripeRevenue);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const fmt = (cents: number, currency = data?.currency ?? 'eur') =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const fmtMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('fr-FR', {
      month: 'short',
      year: '2-digit',
    });
  };

  return (
    <Card className="border-border bg-background shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Euro className="h-5 w-5" /> CA Stripe (réel)
          {data && (
            <Badge variant="outline" className="ml-2 text-[10px] font-normal">
              MAJ {new Date(data.generated_at).toLocaleTimeString('fr-FR')}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs">Actualiser</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data && (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Impossible de récupérer les données Stripe : {error}
              <br />
              <span className="text-xs opacity-80">
                Vérifiez que la clé STRIPE_SECRET_KEY est configurée et que vous êtes admin.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <KpiBox icon={Euro} label="CA brut" value={fmt(data.gross_revenue)} hint={`${data.paid_invoices_count} factures payées`} />
              <KpiBox icon={RefreshCw} label="Remboursé" value={fmt(data.refunded)} hint={`${data.refunds_count} refunds`} />
              <KpiBox icon={Euro} label="CA net" value={fmt(data.net_revenue)} hint="Brut − refunds" highlight />
              <KpiBox icon={TrendingUp} label="MRR Stripe" value={fmt(data.mrr)} hint={`${data.active_subscriptions} abos actifs · ARR ${fmt(data.arr)}`} />
            </div>

            {data.by_month.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  CA mensuel (12 derniers mois)
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.by_month}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(285, 20%, 85%)" />
                    <XAxis dataKey="month" tickFormatter={fmtMonth} fontSize={11} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 100)} ${data.currency.toUpperCase()}`} fontSize={11} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                      formatter={(v: number) => fmt(v)}
                      labelFormatter={fmtMonth}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="gross" name="Brut" fill="hsl(285, 52%, 15%)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="refunded" name="Refunds" fill="hsl(0, 70%, 55%)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="net" name="Net" fill="hsl(150, 60%, 45%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.by_month.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune facture payée trouvée sur Stripe.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KpiBox({
  icon: Icon, label, value, hint, highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={`mt-1 font-heading text-xl font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
