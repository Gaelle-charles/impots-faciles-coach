import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export interface LegalPageProps {
  title: string;
  slug: string;
  markdown: string;
  /** REMOVE_BEFORE_LAUNCH — set to false on each page once placeholders are filled. */
  showDraftBanner?: boolean;
  /** TODO list shown only when showDraftBanner is true. */
  todos?: string[];
}

const LEGAL_LINKS = [
  { slug: 'cgv', label: 'CGV' },
  { slug: 'cgu', label: 'CGU' },
  { slug: 'politique-confidentialite', label: 'Politique de confidentialité' },
  { slug: 'mentions-legales', label: 'Mentions légales' },
  { slug: 'disclaimer-fiscal', label: 'Disclaimer fiscal' },
  { slug: 'renonciation-retractation', label: 'Renonciation rétractation' },
  { slug: 'politique-remboursement', label: 'Politique de remboursement' },
];

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export function LegalPage({ title, slug, markdown, showDraftBanner, todos }: LegalPageProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} — Impôts Facile`;
    setMeta(
      'description',
      'Document légal de la plateforme Impôts Facile éditée par ANNUL IMPOTS.'
    );
    setMeta('robots', 'noindex, follow');
    return () => {
      document.title = prevTitle;
    };
  }, [title]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
          {/* Breadcrumb */}
          <nav
            aria-label="Fil d'Ariane"
            className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          >
            <Link to="/" className="hover:text-primary transition-colors">
              Accueil
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span>Légal</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="text-foreground font-medium">{title}</span>
          </nav>

          {/* REMOVE_BEFORE_LAUNCH — bannière brouillon */}
          {showDraftBanner && (
            <div className="mb-8 flex items-start gap-3 rounded-lg border border-yellow-vivid/50 bg-yellow-vivid/10 p-4 text-sm text-foreground">
              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-vivid-foreground" aria-hidden />
              <div>
                <p className="font-semibold">Document en cours de finalisation.</p>
                <p className="text-muted-foreground">
                  Quelques mentions seront complétées avant le lancement.
                </p>
                {todos && todos.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs underline text-muted-foreground">
                      {todos.length} champ(s) à compléter
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {todos.map((t, i) => (
                        <li key={i}>
                          <code className="text-foreground">[{t}]</code>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}

          <header>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Mis à jour : avril 2026 — Version 1.0
            </p>
          </header>

          <article
            className="
              prose prose-slate max-w-none mt-8
              prose-headings:font-heading prose-headings:text-foreground prose-headings:tracking-tight
              prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-h4:text-base prose-h4:mt-6 prose-h4:mb-2
              prose-p:text-foreground/90 prose-p:leading-relaxed
              prose-li:text-foreground/90 prose-li:my-1
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-4 prose-blockquote:border-primary/40
              prose-blockquote:bg-muted/40 prose-blockquote:py-2 prose-blockquote:px-4
              prose-blockquote:rounded-r-md prose-blockquote:not-italic
              prose-blockquote:text-foreground/80
              prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
              prose-code:rounded prose-code:text-sm prose-code:font-medium
              prose-code:before:content-[''] prose-code:after:content-['']
              prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border
              prose-hr:border-border
            "
          >
            {/* Tables wrapper for horizontal scroll on mobile */}
            <div className="overflow-x-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <div className="my-6 overflow-x-auto rounded-lg border border-border">
                      <table
                        className="w-full border-collapse text-sm"
                        {...props}
                      />
                    </div>
                  ),
                  thead: (props) => <thead className="bg-muted" {...props} />,
                  th: (props) => (
                    <th
                      className="px-4 py-2.5 text-left font-semibold text-foreground border-b border-border"
                      {...props}
                    />
                  ),
                  td: (props) => (
                    <td
                      className="px-4 py-2.5 align-top border-b border-border/60 text-foreground/90"
                      {...props}
                    />
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </article>

          {/* Footer with links to other docs */}
          <section className="mt-16 border-t border-border pt-8">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Voir aussi
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {LEGAL_LINKS.filter((l) => l.slug !== slug).map((l, i, arr) => (
                <li key={l.slug} className="flex items-center gap-x-4">
                  <Link
                    to={`/${l.slug}`}
                    className="text-primary hover:underline underline-offset-4"
                  >
                    {l.label}
                  </Link>
                  {i < arr.length - 1 && (
                    <span className="text-muted-foreground/40">|</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
