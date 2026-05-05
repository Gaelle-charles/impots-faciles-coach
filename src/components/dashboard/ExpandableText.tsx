import { useState, type ReactNode, type MouseEvent } from 'react';

interface ExpandableTextProps {
  children: ReactNode;
  className?: string;
  /** Tailwind line-clamp class for mobile. Defaults to line-clamp-2. */
  clampClassName?: string;
}

/**
 * Affiche le texte clampé sur mobile (avec "Voir plus") et entièrement sur ≥sm.
 * Le clamp est désactivé automatiquement sur ≥sm via sm:line-clamp-none.
 */
export const ExpandableText = ({
  children,
  className = '',
  clampClassName = 'line-clamp-2',
}: ExpandableTextProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <div className={className}>
      <p className={expanded ? '' : `${clampClassName} sm:line-clamp-none`}>{children}</p>
      <button
        type="button"
        onClick={handleToggle}
        className="sm:hidden mt-1 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
      >
        {expanded ? 'Voir moins' : 'Voir plus'}
      </button>
    </div>
  );
};
