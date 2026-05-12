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

const PROSE_BASE =
  'prose prose-sm md:prose-base max-w-none ' +
  'prose-headings:font-display prose-headings:font-normal ' +
  'prose-h2:text-2xl prose-h3:text-xl ' +
  'prose-a:no-underline hover:prose-a:underline ' +
  'prose-strong:font-semibold';

const PROSE_LIGHT =
  PROSE_BASE +
  ' text-foreground prose-headings:text-primary prose-strong:text-foreground ' +
  'prose-a:text-rose-dynamic prose-li:marker:text-rose-dynamic';

const PROSE_DARK =
  PROSE_BASE +
  ' text-white/85 prose-headings:text-white prose-strong:text-white ' +
  'prose-a:text-[hsl(56_100%_70%)] prose-li:marker:text-[hsl(56_100%_70%)]';

type Palette = {
  bg: string;
  title: string;
  number: string;
  prose: string;
  border: string;
};

// Palette inspired by homepage cards: violet-deep, yellow, white, rose-light.
// Sections alternate by pairs of 2.
const PALETTE: Palette[] = [
  {
    bg: 'hsl(var(--violet-deep))',
    title: 'text-white',
    number: 'hsl(0 0% 100% / 0.12)',
    prose: PROSE_DARK,
    border: 'border-transparent',
  },
  {
    bg: 'hsl(56 100% 49%)',
    title: 'text-primary',
    number: 'hsl(285 52% 15% / 0.12)',
    prose: PROSE_LIGHT,
    border: 'border-transparent',
  },
  {
    bg: 'hsl(0 0% 100%)',
    title: 'text-primary',
    number: 'hsl(285 52% 15% / 0.12)',
    prose: PROSE_LIGHT,
    border: 'border-border',
  },
  {
    bg: 'hsl(var(--rose-light))',
    title: 'text-primary',
    number: 'hsl(336 70% 50% / 0.18)',
    prose: PROSE_LIGHT,
    border: 'border-transparent',
  },
];

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
        <div className={PROSE_LIGHT} dangerouslySetInnerHTML={{ __html: fallbackHtml }} />
      </article>
    );
  }

  return (
    <div className="space-y-6">
      {renderedSections.map((s, idx) => {
        const palette = PALETTE[Math.floor(idx / 2) % PALETTE.length];
        return (
          <article
            key={s.key}
            className={`relative rounded-3xl border ${palette.border} p-8 md:p-10 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
            style={{ background: palette.bg }}
          >
            <p
              className="font-display text-5xl md:text-6xl leading-none select-none"
              style={{ color: palette.number, marginBottom: '-0.25em' }}
              aria-hidden
            >
              {String(idx + 1).padStart(2, '0')}
            </p>
            <h2 className={`font-display text-xl md:text-2xl mt-2 mb-5 ${palette.title}`}>
              {s.title}
            </h2>
            <div className={palette.prose} dangerouslySetInnerHTML={{ __html: s.html }} />
          </article>
        );
      })}
    </div>
  );

}

export default FicheSections;
