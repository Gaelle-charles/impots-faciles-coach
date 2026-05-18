import { Link } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RateLimitModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-primary text-primary-foreground border-0 rounded-3xl p-8 md:p-10">
        <div className="text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-vivid text-violet-deep mb-5">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl leading-tight">
            Continuez à explorer Impôts Facile
          </h2>
          <p className="mt-4 text-sm text-primary-foreground/85 leading-relaxed">
            Pour ne pas surcharger nos serveurs, le simulateur gratuit est limité à 2 simulations par heure.
            Créez un compte gratuit pour accéder à toutes nos fonctionnalités sans limite.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link to="/inscription">
              <Button
                size="lg"
                className="w-full bg-yellow-vivid text-violet-deep hover:bg-yellow-vivid/90 rounded-full"
              >
                Créer mon compte gratuit
              </Button>
            </Link>
            <Link
              to="/connexion"
              className="text-sm text-primary-foreground/80 hover:text-primary-foreground underline"
            >
              J'ai déjà un compte
            </Link>
          </div>

          <p className="mt-6 text-xs text-primary-foreground/60">
            Vous pourrez retenter une simulation gratuite dans 1 heure.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
