import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Switcher entre l'espace équipe (B2B) et l'espace personnel (B2C).
 * À afficher en haut de la sidebar pour les admins org qui ont aussi accès
 * à un parcours individuel (licence Team OU plan B2C actif).
 */
export function SpaceSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTeamSpace = location.pathname.startsWith('/impots-team');

  const baseBtn =
    'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors';

  return (
    <div
      role="tablist"
      aria-label="Changer d'espace"
      className="mx-4 mb-3 flex items-center gap-1 rounded-lg bg-sidebar-muted/60 p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={isTeamSpace}
        onClick={() => navigate('/impots-team/dashboard')}
        className={cn(
          baseBtn,
          isTeamSpace
            ? 'bg-background text-foreground shadow-sm'
            : 'text-primary-foreground/70 hover:text-primary-foreground'
        )}
      >
        <Briefcase className="h-3.5 w-3.5" />
        <span>Espace équipe</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={!isTeamSpace}
        onClick={() => navigate('/dashboard')}
        className={cn(
          baseBtn,
          !isTeamSpace
            ? 'bg-background text-foreground shadow-sm'
            : 'text-primary-foreground/70 hover:text-primary-foreground'
        )}
      >
        <User className="h-3.5 w-3.5" />
        <span>Mon espace perso</span>
      </button>
    </div>
  );
}
