'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

const PREVIEW = 2;

/**
 * Sources under an answer, labelled with the same [n] used in the answer text (c.index; older
 * messages without it fall back to list order). highlight = { n } from a clicked citation badge:
 * that source is revealed, scrolled into view, and outlined.
 */
export default function CitationList({ citations, highlight }) {
  const [expanded, setExpanded] = useState(false);
  const itemRefs = useRef({});
  const list = citations || [];
  const labelOf = (c, i) => c.index ?? i + 1;
  const highlightedAt = highlight ? list.findIndex((c, i) => labelOf(c, i) === highlight.n) : -1;

  useEffect(() => {
    if (!highlight) return;
    // Expand first if the source is hidden; this effect re-runs once it is rendered
    if (highlightedAt >= PREVIEW && !expanded) {
      setExpanded(true);
      return;
    }
    itemRefs.current[highlight.n]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlight, highlightedAt, expanded]);

  if (list.length === 0) return null;

  const showAll = expanded;
  const visible = showAll ? list : list.slice(0, PREVIEW);

  return (
    <div className="mt-4 space-y-1.5">
      <p className="text-[11px] font-mono uppercase tracking-wider text-ink-faint">Sources ({list.length})</p>
      {visible.map((c, i) => {
        const n = labelOf(c, i);
        const active = highlight?.n === n;
        return (
          <div
            key={c.chunkId || i}
            ref={(el) => {
              itemRefs.current[n] = el;
            }}
            className={`flex items-start gap-2 rounded-lg px-3 py-2 border transition-colors ${
              active ? 'bg-accent/10 border-accent/60' : 'bg-surface2 border-border hover:border-accent/40'
            }`}
          >
            <span className="text-accent font-mono text-xs mt-0.5 shrink-0">[{n}]</span>
            <FileText size={13} className="text-ink-faint mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-ink-dim">
                <span className="text-ink font-medium">{c.documentName}</span>
                {c.sourceLabel && <span className="text-ink-faint"> · {c.sourceLabel}</span>}
              </p>
              <p className="text-xs text-ink-faint mt-0.5 line-clamp-2">{c.snippet}</p>
            </div>
          </div>
        );
      })}
      {list.length > PREVIEW && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
        >
          {showAll ? (
            <>
              <ChevronUp size={13} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Show {list.length - PREVIEW} more
            </>
          )}
        </button>
      )}
    </div>
  );
}
