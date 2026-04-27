import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { ExternalLink, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planLabel: string;
  planPrice: number;
  loading: boolean;
  onConfirm: (acceptances: {
    cgv_accepted_at: string;
    cgu_accepted_at: string;
    waiver_accepted_at: string;
  }) => void;
}

/**
 * Dialogue d'acceptation B2C — affiché AVANT la redirection Stripe.
 * Conforme Doc 6 (Renonciation au droit de rétractation) :
 *   - case CGV obligatoire
 *   - case CGU obligatoire
 *   - case renonciation expresse au droit de rétractation (article L221-28, 13° C. conso.)
 */
export function CheckoutAcceptanceDialog({
  open,
  onOpenChange,
  planLabel,
  planPrice,
  loading,
  onConfirm,
}: Props) {
  const [cgv, setCgv] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [waiver, setWaiver] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setCgv(false);
      setCgu(false);
      setWaiver(false);
    }
  }, [open]);

  const allAccepted = cgv && cgu && waiver;

  const handleConfirm = () => {
    if (!allAccepted) return;
    const now = new Date().toISOString();
    onConfirm({
      cgv_accepted_at: now,
      cgu_accepted_at: now,
      waiver_accepted_at: now,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conditions et accès immédiat</DialogTitle>
          <DialogDescription>
            Plan <span className="font-semibold text-foreground">{planLabel}</span> —{' '}
            <span className="font-semibold text-foreground">{planPrice} € / an TTC</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={waiver}
                onCheckedChange={(v) => setWaiver(v === true)}
                className="mt-0.5"
                disabled={loading}
              />
              <span className="text-sm leading-relaxed text-amber-900">
                Je reconnais avoir expressément demandé un accès immédiat au contenu numérique
                commandé avant l'expiration du délai légal de rétractation de 14 jours. En cochant
                cette case, j'accepte expressément et en toute connaissance de cause de{' '}
                <strong>perdre définitivement mon droit de rétractation</strong> dès lors que
                l'accès à la plateforme Impôts Facile sera activé par ANNUL IMPOTS, conformément à
                l'article L221-28, alinéa 13° du Code de la consommation. J'ai pris connaissance
                des Conditions Générales de Vente et de la présente renonciation avant de valider
                ma commande.
              </span>
            </label>
            <p className="mt-2 pl-7 text-xs text-amber-800 italic">
              Cette case est obligatoire pour accéder immédiatement à votre contenu. Si vous
              souhaitez conserver votre droit de rétractation de 14 jours, ne validez pas cette
              commande — contactez-nous à info@impotsfacile.com pour différer l'activation après le
              délai légal.
            </p>
          </div>
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
