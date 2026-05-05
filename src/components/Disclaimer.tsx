import { Info } from 'lucide-react';
import { useState } from 'react';

/**
 * Disclaimer pédagogique permanent.
 * Affiché en bas de chaque page de l'app authentifiée via AppLayout.
 * Sur mobile/tablette (< lg), le texte est clampé à 3 lignes avec un bouton "Voir plus".
 */
export function Disclaimer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-12 rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
      <div className="flex gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={expanded ? '' : 'line-clamp-3 lg:line-clamp-none'}>
            <span className="font-semibold text-foreground">Information pédagogique.</span>{' '}
            Impôts Facile est une plateforme de formation et d'information sur les impôts.
            Les contenus, simulations, recommandations et fiches proposés ont une vocation
            éducative et ne constituent ni une formation sur les impôts personnalisée, ni une prestation
            réglementée. Pour toute décision engageante, consultez un professionnel agréé
            (avocat experte en déclarations d'impôts, expert-comptable) ou rendez-vous sur{' '}
            <a
              href="https://www.impots.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium text-primary hover:text-primary/80"
            >
              impots.gouv.fr
            </a>.
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="lg:hidden mt-1 text-xs font-semibold underline underline-offset-2 text-foreground/80 hover:text-foreground"
          >
            {expanded ? 'Voir moins' : 'Voir plus'}
          </button>
        </div>
      </div>
    </div>
  );
}
