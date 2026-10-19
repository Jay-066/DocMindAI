'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// [n] markers become #cite-n links so the `a` renderer below can draw them as source badges.
// Markers already used as link text, e.g. [1](https://...), are left alone.
function linkCitations(text) {
  return (text || '').replace(/\[(\d{1,2})\](?!\()/g, '[$1](#cite-$1)');
}

/**
 * Renders an answer's markdown (lists, bold, headings, tables, code) in the app's typography and
 * turns [n] citation markers into small badges. Raw HTML in the text is not rendered.
 * citations: [{ index, documentName, sourceLabel }] for badge tooltips; onCiteClick(n) on click.
 */
export default function MarkdownAnswer({ text, citations = [], onCiteClick, className = 'text-sm text-ink' }) {
  const sources = Object.fromEntries((citations || []).map((c, i) => [c.index ?? i + 1, c]));

  const components = {
    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1.5 marker:text-accent">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1.5 marker:text-ink-faint">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    h1: ({ children }) => <h3 className="font-display font-semibold text-ink text-base mt-4 mb-2 first:mt-0">{children}</h3>,
    h2: ({ children }) => <h3 className="font-display font-semibold text-ink text-base mt-4 mb-2 first:mt-0">{children}</h3>,
    h3: ({ children }) => <h4 className="font-semibold text-ink mt-3 mb-1.5 first:mt-0">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-accent/40 pl-3 my-3 text-ink-dim">{children}</blockquote>
    ),
    hr: () => <hr className="my-4 border-border" />,
    code: ({ children }) => (
      <code className="font-mono text-[0.85em] bg-surface2 border border-border rounded px-1 py-0.5">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-base p-3 text-xs [&>code]:bg-transparent [&>code]:border-0 [&>code]:p-0">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="text-left font-medium text-ink bg-surface2/60 border-b border-border px-3 py-2">{children}</th>
    ),
    td: ({ children }) => <td className="border-b border-border/60 px-3 py-2 text-ink-dim align-top">{children}</td>,
    a: ({ href, children }) => {
      const cite = /^#cite-(\d+)$/.exec(href || '');
      if (!cite) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">
            {children}
          </a>
        );
      }
      const n = Number(cite[1]);
      const source = sources[n];
      return (
        <button
          type="button"
          onClick={() => onCiteClick?.(n)}
          title={source ? `${source.documentName}${source.sourceLabel ? ` · ${source.sourceLabel}` : ''}` : `Source ${n}`}
          aria-label={`Source ${n}${source ? `: ${source.documentName}` : ''}`}
          className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.125rem] px-1 mx-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-mono font-semibold align-[0.15em] hover:bg-accent/30 transition-colors"
        >
          {n}
        </button>
      );
    },
  };

  return (
    <div className={`leading-relaxed break-words ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {linkCitations(text)}
      </ReactMarkdown>
    </div>
  );
}
