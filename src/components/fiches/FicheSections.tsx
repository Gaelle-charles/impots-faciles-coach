import { useMemo } from 'react';
import { marked } from 'marked';

export interface FicheSection {
  key: string;
  title: string;
  content_md: string;
}

export interface FicheSectionsContent {
  sections?: FicheSection[];
}

interface FicheSectionsProps {
  /** JSONB content from `contenu_sections` column */
  content: FicheSectionsContent | null | undefined;
  /** Markdown fallback used when `sections` is empty (legacy `description` column) */
  fallbackMarkdown?: string | null;
}

const PROSE_CLASS =
  'prose prose-sm md:prose-base max-w-none text-foreground ' +
  'prose-headings:font-display prose-headings:text-primary prose-headings:font-normal ' +
  'prose-h2:text-2xl prose-h3:text-xl ' +
  'prose-a:text-rose-dynamic prose-a:no-underline hover:prose-a:underline ' +
  'prose-strong:text-foreground prose-strong:font-semibold ' +
  'prose-li:marker:text-rose-dynamic';

/**
 * Renders enriched fiche content from the `contenu_sections` JSONB column.
 * Falls back to a single Markdown block (legacy `description`) when no sections are available.
 *
 * Style aligned with the homepage "épuré" design language:
 *  - rounded-3xl soft cards
 *  - Eyebrow-like section numbers in display serif
 *  - font-display headings, generous spacing
 */
export function FicheSections({ content, fallbackMarkdown }: FicheSectionsProps) {
  const sections = Array.isArray(content?.sections) ? content!.sections! : [];

  const renderedSections = useMemo(
    () =>
      sections
        .filter((s) => s && typeof s.content_md === 'string' && s.content_md.trim().length > 0)
        .map((s) => ({
          key: s.key,
          title: s.title,
          html: marked.parse(s.content_md, { async: false }) as string,
        })),
    [sections],
  );

  const fallbackHtml = useMemo(() => {
    if (renderedSections.length > 0) return null;
    if (!fallbackMarkdown || !fallbackMarkdown.trim()) return null;
    return marked.parse(fallbackMarkdown, { async: false }) as string;
  }, [renderedSections.length, fallbackMarkdown]);

  if (renderedSections.length === 0 && !fallbackHtml) {
    return (
      <div
        className="rounded-3xl border border-dashed border-border p-8 md:p-10 text-center"
        style={{ background: 'hsl(var(--rose-light))' }}
      >
        <p className="text-sm text-muted-foreground italic">
          Le contenu détaillé de cette fiche sera bientôt disponible.
        </p>
      </div>
    );
  }

  if (fallbackHtml) {
    return (
      <article
        className="rounded-3xl border border-border p-8 md:p-10 shadow-sm"
        style={{ background: 'hsl(var(--rose-light))' }}
      >
        <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: fallbackHtml }} />
      </article>
    );
  }

  // Alternate backgrounds by pairs of sections: 2 white, 2 rose, 2 violet, repeat.
  const PALETTE: { bg: string; number: string }[] = [
    { bg: 'hsl(0 0% 100%)', number: 'hsl(285 52% 85%)' },
    { bg: 'hsl(var(--rose-light))', number: 'hsl(336 70% 78%)' },
    { bg: 'hsl(285 45% 93%)', number: 'hsl(285 52% 72%)' },
  ];

  return (
    <div className="space-y-6">
      {renderedSections.map((s, idx) => {
        const palette = PALETTE[Math.floor(idx / 2) % PALETTE.length];
        return (
          <article
            key={s.key}
            className="relative rounded-3xl border border-border p-8 md:p-10 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: palette.bg }}
          >
            <p
              className="font-display text-5xl md:text-6xl leading-none select-none"
              style={{ color: palette.number, marginBottom: '-0.25em' }}
              aria-hidden
            >
              {String(idx + 1).padStart(2, '0')}
            </p>
            <h2 className="font-display text-xl md:text-2xl text-primary mt-2 mb-5">
              {s.title}
            </h2>
            <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: s.html }} />
          </article>
        );
      })}
    </div>
  );
}

export default FicheSections;
