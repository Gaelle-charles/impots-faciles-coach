import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'violet' | 'white';
}

/**
 * Pill décoratif placé au-dessus des titres de section.
 * Variants:
 *  - default : fond rose pâle / texte rose dynamique
 *  - violet  : fond violet 8% / texte violet
 *  - white   : fond blanc 15% / texte blanc (sur fond violet)
 */
export const Eyebrow = React.forwardRef<HTMLSpanElement, EyebrowProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClass =
      variant === 'violet' ? 'eyebrow eyebrow--violet'
      : variant === 'white' ? 'eyebrow eyebrow--white'
      : 'eyebrow';
    return (
      <span ref={ref} className={cn(variantClass, className)} {...props}>
        {children}
      </span>
    );
  }
);
Eyebrow.displayName = 'Eyebrow';
