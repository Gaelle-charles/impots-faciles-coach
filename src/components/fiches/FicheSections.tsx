import { useMemo } from 'react';
import { marked } from 'marked';
import { Card, CardContent } from '@/components/ui/card';

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

/**
 * Renders enriched fiche content from the `contenu_sections` JSONB column.
 * Falls back to a single Markdown block (legacy `description`) when no sections are available.
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
      <Card className="border-dashed border-border bg-background">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground italic">
            Le contenu détaillé de cette fiche sera bientôt disponible.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (fallbackHtml) {
    return (
      <Card className="border-border bg-background shadow-sm">
        <CardContent className="p-6">
          <div
            className="prose prose-sm max-w-none text-foreground prose-headings:font-heading prose-headings:text-foreground prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: fallbackHtml }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {renderedSections.map((s) => (
        <Card key={s.key} className="border-border bg-background shadow-sm">
          <CardContent className="p-6 space-y-3">
            <h2 className="font-heading text-xl font-bold text-foreground">{s.title}</h2>
            <div
              className="prose prose-sm max-w-none text-foreground prose-headings:font-heading prose-headings:text-foreground prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default FicheSections;
