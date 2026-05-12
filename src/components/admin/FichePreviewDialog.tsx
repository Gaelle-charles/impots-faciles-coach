// no router import needed
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, FileWarning, X } from 'lucide-react';
import { FicheSections, type FicheSectionsContent } from '@/components/fiches/FicheSections';

export type FicheType = 'profil' | 'metier' | 'pays';

export interface FichePreviewData {
  id: string;
  nom: string;
  slug?: string | null;
  icone?: string | null;
  description?: string | null;
  contenu_sections?: unknown;
  is_active?: boolean | null;
}

interface FichePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ficheType: FicheType;
  ficheData: FichePreviewData | null;
}

const TYPE_LABEL: Record<FicheType, string> = {
  profil: 'Profil',
  metier: 'Métier',
  pays: 'Pays',
};

const TYPE_BADGE_CLASS: Record<FicheType, string> = {
  profil: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100',
  metier: 'bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-100',
  pays: 'bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-100',
};

const TYPE_ADMIN_ROUTE: Record<FicheType, string> = {
  profil: '/admin/fiches-profils',
  metier: '/admin/metiers',
  pays: '/admin/pays',
};

function hasSectionContent(contenu: unknown): boolean {
  if (!contenu || typeof contenu !== 'object') return false;
  const sections = (contenu as FicheSectionsContent).sections;
  if (!Array.isArray(sections)) return false;
  return sections.some(
    (s) => s && typeof s.content_md === 'string' && s.content_md.trim().length > 0,
  );
}

export function FichePreviewDialog({
  open,
  onOpenChange,
  ficheType,
  ficheData,
}: FichePreviewDialogProps) {
  if (!ficheData) return null;

  const isDraft = ficheData.is_active === false;
  const hasContent =
    hasSectionContent(ficheData.contenu_sections) ||
    Boolean(ficheData.description && ficheData.description.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="font-heading flex items-center gap-2 flex-wrap">
            <Eye className="h-5 w-5 text-primary shrink-0" />
            <span>Aperçu — {ficheData.nom}</span>
            <Badge variant="outline" className={TYPE_BADGE_CLASS[ficheType]}>
              {TYPE_LABEL[ficheType]}
            </Badge>
            {isDraft && (
              <Badge
                variant="outline"
                className="bg-yellow-100 text-yellow-900 border-yellow-400 hover:bg-yellow-100"
              >
                Brouillon
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ background: 'hsl(285 30% 97%)' }}>
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            Vous prévisualisez cette fiche en mode admin. Voici le rendu tel que vu par les utilisateurs.
          </div>

          {isDraft && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
              ⚠️ Cette fiche est en brouillon. Elle n'est pas visible par les utilisateurs.
            </div>
          )}

          {hasContent ? (
            <>
              <header className="relative overflow-hidden rounded-3xl border border-border bg-background p-6 md:p-8 shadow-sm">
                <div
                  className="blob-decor"
                  style={{
                    background: 'hsl(var(--rose-light))',
                    width: 240,
                    height: 240,
                    top: -100,
                    right: -100,
                    opacity: 0.7,
                  }}
                  aria-hidden
                />
                <div className="relative space-y-4">
                  <span className="eyebrow">{TYPE_LABEL[ficheType]}</span>
                  <div className="flex items-start gap-3">
                    {ficheData.icone && (
                      <span className="text-4xl shrink-0 leading-none" aria-hidden>
                        {ficheData.icone}
                      </span>
                    )}
                    <h1 className="font-display text-3xl md:text-4xl text-primary leading-tight">
                      {ficheData.nom}
                    </h1>
                  </div>
                  {ficheData.description && (
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      {ficheData.description}
                    </p>
                  )}
                </div>
              </header>
              <FicheSections
                content={ficheData.contenu_sections as FicheSectionsContent | null | undefined}
                fallbackMarkdown={ficheData.description}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 rounded-3xl border border-dashed border-border bg-background">
              <FileWarning className="h-16 w-16 text-muted-foreground/60" />
              <h3 className="font-display text-xl text-primary">
                Contenu en attente
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Cette fiche n'a pas encore de contenu rédigé. Cliquez sur « Modifier la fiche » pour ajouter les sections.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-background">
          <Button onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="h-4 w-4" />
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FichePreviewDialog;
