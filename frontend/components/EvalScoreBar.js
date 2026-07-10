'use client';

const METRICS = [
  { key: 'faithfulness', label: 'Faithfulness', color: '#22C55E' },
  { key: 'answerRelevancy', label: 'Relevancy', color: '#06B6D4' },
  { key: 'contextPrecision', label: 'Precision', color: '#A78BFA' },
  { key: 'contextRecall', label: 'Recall', color: '#F97316' },
];

export default function EvalScoreBar({ scores, loading }) {
  const hasScores = scores && Object.values(scores).some((v) => v !== null && v !== undefined);

  if (loading && !hasScores) {
    return (
      <div className="flex items-center gap-2 mt-2 text-xs text-ink-faint font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulseSoft" />
        scoring answer quality...
      </div>
    );
  }

  if (!hasScores) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/60">
      {METRICS.map((m) => {
        const value = scores[m.key];
        if (value === null || value === undefined) return null;
        return (
          <div
            key={m.key}
            className="flex items-center gap-1.5 bg-surface2 rounded-md px-2 py-1"
            title={`${m.label}: ${value.toFixed(2)}`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-[11px] text-ink-faint font-mono">{m.label}</span>
            <span className="text-[11px] font-mono font-semibold" style={{ color: m.color }}>
              {value.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
