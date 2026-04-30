import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AccentTextProps extends React.HTMLAttributes<HTMLElement> {
  /** 'highlight' (rose italique surligné jaune) ou 'yellow' (jaune italique sans surlignage, pour fonds violet) */
  variant?: 'highlight' | 'yellow';
}

/**
 * Mot-accent à utiliser à l'intérieur d'un titre Instrument Serif.
 * Exemple :
 *   <h1 className="font-display">Comprenez vos impôts. <AccentText>Sans jargon.</AccentText></h1>
 */
export const AccentText = React.forwardRef<HTMLElement, AccentTextProps>(
  ({ className, variant = 'highlight', children, ...props }, ref) => {
    const cls = variant === 'yellow' ? 'accent-yellow' : 'accent-serif';
    return (
      <em ref={ref as React.Ref<HTMLElement>} className={cn(cls, className)} {...props}>
        {children}
      </em>
    );
  }
);
AccentText.displayName = 'AccentText';
