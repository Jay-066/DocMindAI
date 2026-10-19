'use client';

const QUERY = { label: 'Query', sub: 'user question', color: '#5B6474' };
// BM25 and dense search run in parallel on the same query, then get fused
const RETRIEVERS = [
  { label: 'BM25', sub: 'sparse', color: '#F59E0B' },
  { label: 'Vector', sub: 'dense (Chroma)', color: '#3B82F6' },
];
const DOWNSTREAM = [
  { label: 'RRF Fusion', sub: 'reciprocal rank', color: '#A78BFA' },
  { label: 'Reranker', sub: 'cross-encoder', color: '#06B6D4' },
  { label: 'LLM', sub: 'cited answer', color: '#22C55E' },
];

export default function PipelineDiagram({ compact = false }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className={`flex items-center gap-2 w-max mx-auto ${compact ? 'py-2' : 'py-4'}`}>
        <Stage stage={QUERY} />
        <Arrow />
        <div className="flex flex-col gap-2">
          {RETRIEVERS.map((stage) => (
            <Stage key={stage.label} stage={stage} />
          ))}
        </div>
        <Arrow />
        {DOWNSTREAM.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-2">
            <Stage stage={stage} />
            {i < DOWNSTREAM.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stage({ stage }) {
  return (
    <div
      className="rounded-lg border px-3.5 py-2.5 bg-surface2 flex flex-col items-center gap-0.5 shrink-0"
      style={{ borderColor: `${stage.color}55` }}
    >
      <span className="text-xs font-mono font-semibold" style={{ color: stage.color }}>
        {stage.label}
      </span>
      <span className="text-[10px] text-ink-faint whitespace-nowrap">{stage.sub}</span>
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
