import { useState, type ReactNode, type MouseEvent } from 'react';

interface ExpandableTextProps {
  children: ReactNode;
  className?: string;
  /** Number of lines to clamp to on mobile. Defaults to 2. */
  clampLines?: number;
}

/**
 * Affiche le texte clampé sur mobile (avec "Voir plus") et entièrement sur ≥sm.
 */
export const ExpandableText = ({ children, className = '', clampLines = 2 }: ExpandableTextProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <div className={className}>
      <p
        className={expanded ? '' : 'sm:[display:block]'}
        style={
          expanded
            ? undefined
            : {
                display: '-webkit-box',
                WebkitLineClamp: clampLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
        }
      >
        {children}
      </p>
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
