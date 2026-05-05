import { useState, type ReactNode, type MouseEvent } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

interface ExpandableTextProps {
  children: ReactNode;
  className?: string;
  /** Tailwind line-clamp class for mobile. Defaults to line-clamp-2. */
  clampClassName?: string;
  /** Breakpoint above which the text is fully shown. Defaults to 'sm'. */
  breakpoint?: Breakpoint;
}

const UNCLAMP_MAP: Record<Breakpoint, string> = {
  sm: 'sm:line-clamp-none',
  md: 'md:line-clamp-none',
  lg: 'lg:line-clamp-none',
  xl: 'xl:line-clamp-none',
};

const HIDE_BTN_MAP: Record<Breakpoint, string> = {
  sm: 'sm:hidden',
  md: 'md:hidden',
  lg: 'lg:hidden',
  xl: 'xl:hidden',
};

/**
 * Affiche le texte clampé sur mobile (avec "Voir plus") et entièrement au-dessus du breakpoint.
 */
export const ExpandableText = ({
  children,
  className = '',
  clampClassName = 'line-clamp-2',
  breakpoint = 'sm',
}: ExpandableTextProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  const unclamp = UNCLAMP_MAP[breakpoint];
  const hideBtn = HIDE_BTN_MAP[breakpoint];

  return (
    <div className={className}>
      <p className={expanded ? '' : `${clampClassName} ${unclamp}`}>{children}</p>
      <button
        type="button"
        onClick={handleToggle}
        className={`${hideBtn} mt-1 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100`}
      >
        {expanded ? 'Voir moins' : 'Voir plus'}
      </button>
    </div>
  );
};
