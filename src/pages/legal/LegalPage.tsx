import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export interface LegalPageProps {
  title: string;
  slug: string;
  markdown: string;
  /**
   * REMOVE_BEFORE_LAUNCH — set to false on each page once placeholders are filled.
   */
  showDraftBanner?: boolean;
  /** TODO list shown only in dev console for the team. */
  todos?: string[];
}

const LEGAL_LINKS = [
  { slug: 'cgv', label: 'CGV' },
  { slug: 'cgu', label: 'CGU' },
  { slug: 'confidentialite', label: 'Politique de confidentialité' },
  { slug: 'mentions-legales', label: 'Mentions légales' },
  { slug: 'disclaimer', label: 'Disclaimer fiscal' },
  { slug: 'renonciation-retractation', label: 'Renonciation rétractation' },
  { slug: 'remboursement', label: 'Politique de remboursement' },
];

export function LegalPage({ title, slug, markdown, showDraftBanner, todos }: LegalPageProps) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} — Impôts Facile`;
    return () => { document.title = prev; };
  }, [title]);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Top nav */}
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-[800px] items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
          <span className="text-xs text-gray-500">Impôts Facile</span>
        </div>
      </header>

      <main className="mx-auto max-w-[800px] px-6 py-10">
        {/* REMOVE_BEFORE_LAUNCH — bannière brouillon */}
        {showDraftBanner && (
          <div className="mb-8 flex items-start gap-3 rounded-lg border border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-900">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" aria-hidden />
            <div>
              <p className="font-semibold">🚧 Document en cours de finalisation.</p>
              <p>Version complète avant lancement.</p>
              {todos && todos.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs underline">{todos.length} champ(s) à compléter</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {todos.map((t, i) => (
                      <li key={i}><code>[{t}]</code></li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}

        <h1 className="font-heading text-3xl font-bold text-black sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Mis à jour : avril 2026</p>

        <article className="prose prose-lg mt-8 max-w-none prose-headings:font-heading prose-headings:text-black prose-a:text-violet-deep prose-strong:text-black prose-table:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>

        {/* Footer with links to other docs */}
        <footer className="mt-16 border-t border-gray-200 pt-8">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-gray-500">
            Autres documents légaux
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {LEGAL_LINKS.filter((l) => l.slug !== slug).map((l) => (
              <li key={l.slug}>
                <Link to={`/${l.slug}`} className="text-sm text-violet-deep underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-gray-500">© {new Date().getFullYear()} Impôts Facile</p>
        </footer>
      </main>
    </div>
  );
}
