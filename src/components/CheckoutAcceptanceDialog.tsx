import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ExternalLink, Loader2, ChevronDown, ChevronRight, Tag, CheckCircle2, X } from 'lucide-react';

interface AppliedCoupon {
  code: string;
  percent_off: number;
  base_price: number;     // euros
  new_price: number;      // euros
  discount_amount: number; // euros
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planLabel: string;
  planPrice: number;
  planSlug: 'starter' | 'expert' | 'premium' | string;
  loading: boolean;
  onConfirm: (acceptances: {
    cgv_accepted_at: string;
    cgu_accepted_at: string;
    waiver_accepted_at: string;
    coupon_code?: string;
  }) => void;
}

export function CheckoutAcceptanceDialog({
  open,
  onOpenChange,
  planLabel,
  planPrice,
  planSlug,
  loading,
  onConfirm,
}: Props) {
  const [cgv, setCgv] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [waiver, setWaiver] = useState(false);

  // Coupon state
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  useEffect(() => {
    if (!open) {
      setCgv(false); setCgu(false); setWaiver(false);
      setCouponOpen(false); setCouponInput('');
      setCouponError(null); setAppliedCoupon(null);
    }
  }, [open]);

  const allAccepted = cgv && cgu && waiver;

  const errorMessage = (errorCode?: string, fallback?: string): string => {
    switch (errorCode) {
      case 'not_found': return "Ce code promo n'existe pas.";
      case 'inactive': return "Ce code promo n'est plus actif.";
      case 'expired': return "Ce code promo a expiré.";
      case 'not_started': return "Ce code promo n'est pas encore actif.";
      case 'limit_reached': return "Ce code promo a atteint sa limite d'utilisations.";
      case 'plan_not_eligible': return "Ce code promo n'est pas applicable à ce plan.";
      default: return fallback ?? 'Code invalide.';
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: { code, plan: planSlug, base_price: planPrice },
      });
      if (error) throw error;
      if (!data?.valid) {
        setCouponError(errorMessage(data?.error_code, data?.error));
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.code,
          percent_off: data.percent_off,
          base_price: data.base_price,
          new_price: data.new_price,
          discount_amount: data.discount_amount,
        });
        setCouponError(null);
      }
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Erreur de validation');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleConfirm = () => {
    if (!allAccepted) return;
    const now = new Date().toISOString();
    onConfirm({
      cgv_accepted_at: now,
      cgu_accepted_at: now,
      waiver_accepted_at: now,
      coupon_code: appliedCoupon?.code,
    });
  };

  const displayedPrice = appliedCoupon ? appliedCoupon.new_price : planPrice;

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conditions et accès immédiat</DialogTitle>
          <DialogDescription>
            Plan <span className="font-semibold text-foreground">{planLabel}</span> —{' '}
            {appliedCoupon ? (
              <>
                <span className="line-through text-muted-foreground">{planPrice} €</span>{' '}
                <span className="font-semibold text-emerald-700">{displayedPrice} € / an TTC</span>
              </>
            ) : (
              <span className="font-semibold text-foreground">{planPrice} € / an TTC</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* === Coupon section === */}
          <div className="rounded-lg border bg-muted/30">
            <button
              type="button"
              onClick={() => setCouponOpen((v) => !v)}
              disabled={loading || !!appliedCoupon}
              className="w-full flex items-center gap-2 p-3 text-sm font-medium hover:bg-muted/50 transition rounded-lg disabled:opacity-100"
            >
              {appliedCoupon ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : couponOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Tag className="h-4 w-4" />
              {appliedCoupon ? (
                <span>
                  Code <strong className="font-mono">{appliedCoupon.code}</strong> appliqué — −{appliedCoupon.percent_off}%
                </span>
              ) : (
                <span>J'ai un code promo</span>
              )}
              {appliedCoupon && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeCoupon(); }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label="Retirer le code promo"
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </button>

            {couponOpen && !appliedCoupon && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    className="font-mono uppercase"
                    disabled={couponLoading || loading}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyCoupon}
                    disabled={couponLoading || loading || !couponInput.trim()}
                  >
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-xs text-destructive">{couponError}</p>
                )}
              </div>
            )}

            {appliedCoupon && (
              <div className="px-3 pb-3 -mt-1 space-y-1.5">
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2">
                  <p>
                    Économie : <strong>−{appliedCoupon.discount_amount} €</strong> · Nouveau total :{' '}
                    <strong>{appliedCoupon.new_price} € / an TTC</strong>
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground italic leading-snug">
                  ⓘ La réduction de {appliedCoupon.percent_off}% s'applique uniquement à votre première année
                  d'abonnement. Le tarif plein de <strong>{planPrice} € / an</strong> sera appliqué au renouvellement.
                </p>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={cgv}
              onCheckedChange={(v) => setCgv(v === true)}
              className="mt-0.5"
              disabled={loading}
            />
            <span className="text-sm leading-relaxed">
              J'ai lu et j'accepte les{' '}
              <Link
                to="/legal/cgv"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                Conditions Générales de Vente
                <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={cgu}
              onCheckedChange={(v) => setCgu(v === true)}
              className="mt-0.5"
              disabled={loading}
            />
            <span className="text-sm leading-relaxed">
              J'ai lu et j'accepte les{' '}
              <Link
                to="/legal/cgu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                Conditions Générales d'Utilisation
                <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </span>
          </label>

          <p className="text-sm text-muted-foreground pt-1">
            Accès immédiat dès paiement. Aucun droit de rétractation possible (voir{' '}
            <Link to="/legal/cgv" target="_blank" rel="noopener noreferrer" className="underline">
              CGV
            </Link>
            ).
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="cta"
            onClick={handleConfirm}
            disabled={!allAccepted || loading}
            className="min-w-[180px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirection…
              </>
            ) : (
              'Procéder au paiement sécurisé'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
