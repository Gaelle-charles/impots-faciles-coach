import DOMPurify from 'dompurify';
import { marked } from 'marked';

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title',
  'class', 'colspan', 'rowspan', 'style',
];

export function sanitizePasseportHtml(html: string): string {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  return clean;
}

// DOMPurify hook to enforce target=_blank rel=noopener on every <a>
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/**
 * Renders a passeport section's content. Prefers `content_html`; if absent,
 * converts legacy `content_md` to HTML on-the-fly. Always sanitised.
 */
export function renderSectionContent(section: {
  content_html?: string | null;
  content_md?: string | null;
}): string {
  const html = section.content_html?.trim();
  if (html) return sanitizePasseportHtml(html);
  const md = section.content_md?.trim();
  if (md) {
    const converted = marked.parse(md, { async: false }) as string;
    return sanitizePasseportHtml(converted);
  }
  return '';
}
