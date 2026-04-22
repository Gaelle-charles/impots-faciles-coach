import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Euro, TrendingUp, Users, CreditCard, Percent } from 'lucide-react';

/** Prix mensuels HT (alignés sur src/pages/Tarifs.tsx) */
export const PLAN_PRICES: Record<string, number> = {
  nouveau: 0,
  starter: 49,
  expert: 79,
  premium: 119,
};

const PLAN_LABELS: Record<string, string> = {
  nouveau: 'Gratuit',
  starter: 'Starter',
  expert: 'Expert',
  premium: 'Premium',
};

const PLAN_COLORS: Record<string, string> = {
  nouveau: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-100 text-blue-700',
  expert: 'bg-primary/10 text-primary',
  premium: 'bg-amber-100 text-amber-700',
};

export interface RevenueProfile {
  plan: string;
  role: string;
  is_active?: boolean | null;
  date_paiement?: string | null;
  created_at: string;
}

interface Props {
  profiles: RevenueProfile[];
}

/**
 * KPI business : MRR, ARR, CA cumulé estimé, répartition par plan, taux de conversion.
 * Calculs purement front basés sur profiles.plan + PLAN_PRICES.
 * Hypothèse : abonnement mensuel récurrent. CA cumulé = somme(prix * mois écoulés depuis date_paiement).
 */
export function RevenueStats({ profiles }: Props) {
  const stats = useMemo(() => {
    const clients = profiles.filter((p) => p.role !== 'admin');
    const totalUsers = clients.length;

    // Abonnés actifs payants
    const payingActive = clients.filter(
      (p) => p.is_active !== false && PLAN_PRICES[p.plan] > 0,
    );

    // MRR : somme des prix mensuels des abonnés actifs payants
    const mrr = payingActive.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] || 0), 0);
    const arr = mrr * 12;

    // ARPU (Average Revenue Per Paying User)
    const arpu = payingActive.length > 0 ? mrr / payingActive.length : 0;

    // Taux de conversion : payants / total
    const conversionRate = totalUsers > 0 ? (payingActive.length / totalUsers) * 100 : 0;

    // Répartition par plan (clients seulement)
    const planCounts: Record<string, number> = {};
    clients.forEach((p) => {
      planCounts[p.plan] = (planCounts[p.plan] || 0) + 1;
    });
    const planBreakdown = Object.entries(planCounts)
      .map(([plan, count]) => ({
        plan,
        count,
        mrr: count * (PLAN_PRICES[plan] || 0),
        share: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
      }))
      .sort((a, b) => b.mrr - a.mrr);

    // CA cumulé estimé : somme(prix * nb mois depuis date_paiement)
    const now = Date.now();
    const cumulativeRevenue = payingActive.reduce((sum, p) => {
      if (!p.date_paiement) return sum;
      const start = new Date(p.date_paiement).getTime();
      if (Number.isNaN(start) || start > now) return sum;
      const months = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30)));
      return sum + months * (PLAN_PRICES[p.plan] || 0);
    }, 0);

    return {
      mrr,
      arr,
      arpu,
      conversionRate,
      payingCount: payingActive.length,
      planBreakdown,
      cumulativeRevenue,
    };
  }, [profiles]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n));

  const kpis = [
    { label: 'MRR', value: `${fmt(stats.mrr)} €`, icon: Euro, hint: 'Revenu mensuel récurrent' },
    { label: 'ARR', value: `${fmt(stats.arr)} €`, icon: TrendingUp, hint: 'Revenu annualisé' },
    { label: 'Abonnés payants', value: stats.payingCount, icon: CreditCard, hint: 'Plans actifs Starter/Expert/Premium' },
    { label: 'ARPU', value: `${fmt(stats.arpu)} €`, icon: Users, hint: 'Revenu moyen / abonné payant' },
    { label: 'Conversion', value: `${stats.conversionRate.toFixed(1)}%`, icon: Percent, hint: 'Payants / total inscrits' },
    { label: 'CA cumulé estimé', value: `${fmt(stats.cumulativeRevenue)} €`, icon: Euro, hint: 'Depuis date_paiement de chaque abonné' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border bg-background shadow-sm">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <k.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <p className="font-heading text-xl font-bold text-foreground">{k.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{k.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-background shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Répartition par plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.planBreakdown.map((row) => (
            <div key={row.plan} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Badge className={`${PLAN_COLORS[row.plan] ?? 'bg-muted'} capitalize`}>
                  {PLAN_LABELS[row.plan] ?? row.plan}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {row.count} {row.count > 1 ? 'utilisateurs' : 'utilisateur'} · {row.share.toFixed(1)}%
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground shrink-0">
                {fmt(row.mrr)} € / mois
              </span>
            </div>
          ))}
          {stats.planBreakdown.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
