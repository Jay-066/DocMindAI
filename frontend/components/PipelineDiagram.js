'use client';

const stages = [
  { label: 'Query', sub: 'user question', color: '#5B6474' },
  { label: 'BM25', sub: 'sparse', color: '#F59E0B' },
  { label: 'Vector', sub: 'dense (Chroma)', color: '#3B82F6' },
  { label: 'RRF Fusion', sub: 'reciprocal rank', color: '#A78BFA' },
  { label: 'Reranker', sub: 'cross-encoder', color: '#06B6D4' },
  { label: 'LLM', sub: 'cited answer', color: '#22C55E' },
];

export default function PipelineDiagram({ compact = false }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className={`flex items-center gap-2 min-w-max ${compact ? 'py-2' : 'py-4'}`}>
        {stages.map((stage, i) => {
          const isBranch = stage.label === 'BM25' || stage.label === 'Vector';
          return (
            <div key={stage.label} className="flex items-center gap-2">
              {i === 2 && (
                <div className="flex flex-col items-center justify-center mr-1">
                  <span className="text-[10px] font-mono text-ink-faint">+</span>
                </div>
              )}
              <div
                className="rounded-lg border px-3.5 py-2.5 bg-surface2 flex flex-col items-center gap-0.5 shrink-0"
                style={{ borderColor: `${stage.color}55` }}
              >
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: stage.color }}
                >
                  {stage.label}
                </span>
                <span className="text-[10px] text-ink-faint whitespace-nowrap">{stage.sub}</span>
              </div>
              {i < stages.length - 1 && !isBranch && (
                <Arrow />
              )}
              {stage.label === 'BM25' && <ArrowStacked />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="28" height="12" viewBox="0 0 28 12" className="shrink-0">
      <line
        x1="0"
        y1="6"
        x2="22"
        y2="6"
        stroke="#2A3242"
        strokeWidth="2"
        strokeDasharray="4 4"
        className="animate-flowDash"
      />
      <path d="M20 2 L26 6 L20 10 Z" fill="#2A3242" />
    </svg>
  );
}

function ArrowStacked() {
  return (
    <svg width="28" height="12" viewBox="0 0 28 12" className="shrink-0">
      <line x1="0" y1="6" x2="22" y2="6" stroke="#2A3242" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M20 2 L26 6 L20 10 Z" fill="#2A3242" />
    </svg>
  );
}
