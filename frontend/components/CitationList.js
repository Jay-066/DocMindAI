'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function CitationList({ citations }) {
  const [expanded, setExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  const visible = expanded ? citations : citations.slice(0, 2);

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[11px] font-mono uppercase tracking-wider text-ink-faint">
        Sources ({citations.length})
      </p>
      {visible.map((c, i) => (
        <div
          key={c.chunkId || i}
          className="flex items-start gap-2 bg-surface2 border border-border rounded-lg px-3 py-2 hover:border-accent/40 transition-colors"
        >
          <span className="text-accent font-mono text-xs mt-0.5 shrink-0">[{i + 1}]</span>
          <FileText size={13} className="text-ink-faint mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-ink-dim">
              <span className="text-ink font-medium">{c.documentName}</span>
              {c.sourceLabel && <span className="text-ink-faint"> — {c.sourceLabel}</span>}
            </p>
            <p className="text-xs text-ink-faint mt-0.5 line-clamp-2">{c.snippet}</p>
          </div>
        </div>
      ))}
      {citations.length > 2 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
        >
          {expanded ? (
            <>
              <ChevronUp size={13} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Show {citations.length - 2} more
            </>
          )}
        </button>
      )}
    </div>
  );
}
