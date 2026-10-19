'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlayCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  MessagesSquare,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  FolderOpen,
  Check,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ScoreTrendChart from '@/components/ScoreTrendChart';
import MarkdownAnswer from '@/components/MarkdownAnswer';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';

// Chart-mark colours: the app's eval hues re-stepped into the dark-surface lightness band
// and validated for colour-blind separation (dataviz validate_palette, --pairs all).
const METRICS = [
  {
    key: 'faithfulness',
    avgKey: 'avgFaithfulness',
    label: 'Faithfulness',
    short: 'Faithfulness',
    question: 'Is every claim backed by the retrieved passages?',
    color: '#02B350',
  },
  {
    key: 'answerRelevancy',
    avgKey: 'avgAnswerRelevancy',
    label: 'Answer relevancy',
    short: 'Relevancy',
    question: 'Does the answer address the question that was asked?',
    color: '#0A9DB7',
  },
  {
    key: 'contextPrecision',
    avgKey: 'avgContextPrecision',
    label: 'Context precision',
    short: 'Precision',
    question: 'Are the retrieved passages actually relevant?',
    color: '#8669D5',
  },
  {
    key: 'contextRecall',
    avgKey: 'avgContextRecall',
    label: 'Context recall',
    short: 'Recall',
    question: 'Did retrieval find everything needed to answer?',
    color: '#B95102',
  },
];

// Run history and conversations show this many items; the rest sit behind a "Show older" toggle
const PREVIEW_COUNT = 3;

function formatDuration(ms) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function collectionName(run) {
  return run.collection?.name || 'Deleted collection';
}

export default function EvaluationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [runs, setRuns] = useState([]);
  const [collections, setCollections] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetCollection, setTargetCollection] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('faithfulness');
  const [expandedRun, setExpandedRun] = useState(null);
  const [showAllRuns, setShowAllRuns] = useState(false);
  const [showAllConversations, setShowAllConversations] = useState(false);
  const historyRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [runsRes, collRes, convRes] = await Promise.all([
        api.listEvalRuns(),
        api.listCollections(),
        api.listConversations(),
      ]);
      setRuns(runsRes.runs);
      setCollections(collRes.collections);
      setConversations(convRes.conversations);
      setTargetCollection((current) => {
        if (current && collRes.collections.some((c) => c._id === current)) return current;
        const lastRunCollection = runsRes.runs[0]?.collection?._id;
        const own = collRes.collections.find((c) => c._id === lastRunCollection);
        return own?._id || collRes.collections[0]?._id || '';
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) loadData();
  }, [user, authLoading, router, loadData]);

  async function handleRunEval() {
    if (!targetCollection) return;
    setRunning(true);
    setRunError(null);
    try {
      const { evalRun } = await api.triggerEval(targetCollection);
      await loadData();
      setExpandedRun(evalRun?._id || null);
    } catch (err) {
      setRunError(err.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleDeleteRun(runId) {
    if (!confirm('Delete this evaluation run?')) return;
    try {
      await api.deleteEvalRun(runId);
      setRuns((prev) => prev.filter((r) => r._id !== runId));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteConversation(convId) {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
    } catch (err) {
      alert(err.message);
    }
  }

  function showLatestDetails() {
    if (!runs[0]) return;
    setExpandedRun(runs[0]._id);
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center gap-2 text-ink-faint text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading evaluation...
      </div>
    );
  }

  const latest = runs[0] || null;
  const previous = runs[1] || null;
  const metric = METRICS.find((m) => m.key === selectedMetric);
  const collectionNames = Object.fromEntries(collections.map((c) => [c._id, c.name]));
  const trendPoints = [...runs].reverse().map((run) => ({
    score: run[metric.avgKey],
    tick: new Date(run.createdAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    fullDate: new Date(run.createdAt).toLocaleString(),
    collection: collectionName(run),
  }));
  const visibleRuns = showAllRuns ? runs : runs.slice(0, PREVIEW_COUNT);
  const visibleConversations = showAllConversations
    ? conversations
    : conversations.slice(0, PREVIEW_COUNT);

  return (
    <div className="min-h-screen bg-base">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {/* Header + run controls */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="eyebrow text-accent mb-2">Evaluation</p>
            <h1 className="font-display text-3xl font-semibold">Answer quality</h1>
            <p className="text-ink-dim text-sm mt-1.5 max-w-xl">
              Run a set of test questions against a collection and see how faithful, relevant, and
              well-sourced the answers are.
            </p>
          </div>
          <RunControls
            collections={collections}
            value={targetCollection}
            onChange={setTargetCollection}
            onRun={handleRunEval}
            running={running}
          />
        </div>

        {running && (
          <div className="card p-5 flex items-center gap-4 border-accent/40" role="status">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Loader2 size={20} className="text-accent animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Evaluating &ldquo;{collectionNames[targetCollection]}&rdquo;
              </p>
              <p className="text-xs text-ink-faint">
                Asking the test questions and scoring each answer. This usually takes under a minute.
              </p>
            </div>
          </div>
        )}

        {runError && (
          <div className="flex items-start justify-between gap-3 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
            <p className="text-sm text-danger flex items-start gap-2">
              <XCircle size={16} className="shrink-0 mt-0.5" /> Evaluation failed: {runError}
            </p>
            <button onClick={() => setRunError(null)} aria-label="Dismiss error" className="text-danger shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {!latest ? (
          !running && <EmptyState hasCollections={collections.length > 0} />
        ) : (
          <>
            <StatusSummary run={latest} onShowDetails={showLatestDetails} />

            {/* Metric tiles: also pick which metric the trend chart shows */}
            <section aria-label="Latest scores">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {METRICS.map((m) => (
                  <MetricTile
                    key={m.key}
                    metric={m}
                    value={latest[m.avgKey]}
                    previous={previous?.[m.avgKey]}
                    threshold={latest.thresholds?.[m.key]}
                    selected={m.key === selectedMetric}
                    onSelect={() => setSelectedMetric(m.key)}
                  />
                ))}
              </div>
              <p className="text-xs text-ink-faint mt-2">Select a score to see its history below.</p>
            </section>

            <section className="card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-display font-semibold text-lg">{metric.label} over time</h2>
                  <p className="text-xs text-ink-faint">
                    {runs.length === 1
                      ? 'Run another evaluation to start a trend.'
                      : `Last ${runs.length} runs, oldest to newest. The dashed line is the ${
                          latest.thresholds?.[metric.key]?.toFixed(2) ?? ''
                        } target.`}
                  </p>
                </div>
              </div>
              <ScoreTrendChart
                points={trendPoints}
                metric={metric}
                threshold={latest.thresholds?.[metric.key]}
              />
            </section>
          </>
        )}

        {runs.length > 0 && (
          <section ref={historyRef} className="card overflow-hidden scroll-mt-20">
            <div className="px-6 py-4 border-b border-border flex items-baseline justify-between">
              <h2 className="font-display font-semibold text-lg">Run history</h2>
              <span className="text-xs text-ink-faint">Newest first · select a row for per-question scores</span>
            </div>
            {/* relative: keeps the absolutely positioned sr-only headers inside the scroll box on phones */}
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink-faint border-b border-border">
                    <th className="w-12 pl-6 py-3">
                      <span className="sr-only">Details</span>
                    </th>
                    <th className="font-medium px-3 py-3">Collection</th>
                    {METRICS.map((m) => (
                      <th key={m.key} className="font-medium px-3 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                          {m.short}
                        </span>
                      </th>
                    ))}
                    <th className="font-medium px-3 py-3">Result</th>
                    <th className="px-3 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRuns.map((run) => (
                    <RunRow
                      key={run._id}
                      run={run}
                      expanded={expandedRun === run._id}
                      onToggle={() => setExpandedRun((id) => (id === run._id ? null : run._id))}
                      onDelete={() => handleDeleteRun(run._id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <ShowMoreToggle
              total={runs.length}
              expanded={showAllRuns}
              onToggle={() => setShowAllRuns((s) => !s)}
              noun="run"
            />
          </section>
        )}

        {/* Conversations */}
        <section className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-baseline justify-between">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <MessagesSquare size={17} className="text-ink-faint" /> Recent conversations
            </h2>
            <span className="text-xs text-ink-faint">{conversations.length} total</span>
          </div>
          {conversations.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-faint text-center">
              No conversations yet. Questions you ask in{' '}
              <Link href="/workspace" className="text-accent hover:text-accent-hover">
                Ask My Docs
              </Link>{' '}
              will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleConversations.map((conv) => (
                <li key={conv._id} className="group flex items-center gap-4 px-6 py-3 hover:bg-surface2/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{conv.title || 'Untitled conversation'}</p>
                    <p className="text-xs text-ink-faint truncate" title={new Date(conv.updatedAt).toLocaleString()}>
                      {collectionNames[conv.collection] || 'Deleted collection'} · {timeAgo(conv.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteConversation(conv._id)}
                    aria-label={`Delete conversation ${conv.title || ''}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-faint hover:text-danger p-1 shrink-0 transition-opacity"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ShowMoreToggle
            total={conversations.length}
            expanded={showAllConversations}
            onToggle={() => setShowAllConversations((s) => !s)}
            noun="conversation"
          />
        </section>

        <HowScoringWorks run={latest} />
      </main>
    </div>
  );
}

function RunControls({ collections, value, onChange, onRun, running }) {
  if (collections.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-xs text-ink-faint">Create a collection with documents to run an evaluation.</p>
        <Link href="/workspace" className="btn-secondary text-sm shrink-0">
          Go to Ask My Docs
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <CollectionPicker collections={collections} value={value} onChange={onChange} disabled={running} />
      <button onClick={onRun} disabled={running || !value} className="btn-primary h-12 shrink-0">
        {running ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
        {running ? 'Running...' : 'Run evaluation'}
      </button>
    </div>
  );
}

/** Styled dropdown instead of a native <select>, whose option list the OS renders unstyled. */
function CollectionPicker({ collections, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = collections.find((c) => c._id === value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-12 w-full sm:w-64 flex items-center gap-3 rounded-lg border border-border bg-surface px-3 text-left hover:border-accent/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
          <FolderOpen size={15} className="text-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-faint leading-none mb-1">
            Collection
          </span>
          <span className="block text-sm text-ink truncate leading-tight">
            {selected?.name || 'Select a collection'}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-ink-faint shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Collection to evaluate"
          className="absolute right-0 z-20 mt-2 w-full sm:w-72 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-black/40"
        >
          {collections.map((c) => {
            const active = c._id === value;
            const docs = c.documentCount || 0;
            return (
              <li key={c._id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(c._id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    active ? 'bg-accent/10' : 'hover:bg-surface2'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm truncate ${active ? 'text-ink font-medium' : 'text-ink-dim'}`}>
                      {c.name}
                    </span>
                    <span className="block text-[11px] text-ink-faint">
                      {docs} {docs === 1 ? 'document' : 'documents'}
                    </span>
                  </span>
                  {active && <Check size={15} className="text-accent shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ShowMoreToggle({ total, expanded, onToggle, noun }) {
  const hidden = total - PREVIEW_COUNT;
  if (hidden <= 0) return null;
  return (
    <button
      onClick={onToggle}
      aria-expanded={expanded}
      className="w-full flex items-center justify-center gap-1.5 border-t border-border px-6 py-3 text-xs font-medium text-accent hover:text-accent-hover hover:bg-surface2/50 transition-colors"
    >
      {expanded ? 'Show fewer' : `Show ${hidden} older ${hidden === 1 ? noun : `${noun}s`}`}
      <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </button>
  );
}

function HowScoringWorks({ run }) {
  const questions = run?.caseResults?.length;
  const thresholds = run?.thresholds;

  return (
    <section className="card p-6">
      <h2 className="font-display font-semibold text-lg">How scoring works</h2>
      <p className="text-xs text-ink-faint mb-5">What happens every time you run an evaluation.</p>

      <ol className="grid md:grid-cols-3 gap-4">
        <ScoringStep n={1} title="Ask test questions">
          DocMind answers{' '}
          <Highlight>
            {questions ? `${questions} test ${questions === 1 ? 'question' : 'questions'}` : 'the test questions'}
          </Highlight>{' '}
          about the selected collection, using the same search and answer steps as Ask My Docs.
        </ScoringStep>
        <ScoringStep n={2} title="Score every answer">
          A separate judge model rates each answer from <Highlight>0 to 1</Highlight> on faithfulness,
          relevancy, precision, and recall.
        </ScoringStep>
        <ScoringStep n={3} title="Compare with targets">
          The run <Highlight>passes only if all four averages</Highlight> reach their targets
          {thresholds ? ':' : '.'}
          {thresholds && (
            <span className="flex flex-wrap gap-1.5 mt-2.5">
              {METRICS.filter((m) => thresholds[m.key] != null).map((m) => (
                <span
                  key={m.key}
                  className="inline-flex items-center gap-1.5 bg-surface2 border border-border rounded-md px-2 py-0.5 text-[11px] font-mono text-ink"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.short} ≥ {thresholds[m.key].toFixed(2)}
                </span>
              ))}
            </span>
          )}
        </ScoringStep>
      </ol>
    </section>
  );
}

function ScoringStep({ n, title, children }) {
  return (
    <li className="rounded-lg border border-border bg-surface2/40 p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-mono font-semibold flex items-center justify-center">
          {n}
        </span>
        <h3 className="text-sm font-medium text-ink">{title}</h3>
      </div>
      <p className="text-xs text-ink-dim leading-relaxed">{children}</p>
    </li>
  );
}

function Highlight({ children }) {
  return <span className="text-accent font-medium bg-accent/10 rounded px-1 whitespace-nowrap">{children}</span>;
}

function EmptyState({ hasCollections }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Gauge size={26} className="text-accent" />
      </div>
      <h2 className="font-display text-xl font-semibold mb-2">No evaluations yet</h2>
      <p className="text-sm text-ink-dim max-w-md mx-auto">
        {hasCollections
          ? 'Pick a collection above and run an evaluation to score answer quality on four metrics.'
          : 'Create a collection and upload documents in Ask My Docs, then come back to score answer quality.'}
      </p>
      <div className="grid sm:grid-cols-4 gap-3 mt-8 text-left">
        {METRICS.map((m) => (
          <div key={m.key} className="rounded-lg border border-border bg-surface2/50 p-3">
            <p className="text-xs font-medium text-ink flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} /> {m.label}
            </p>
            <p className="text-[11px] text-ink-faint leading-relaxed">{m.question}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusSummary({ run, onShowDetails }) {
  const failing = METRICS.filter((m) => {
    const t = run.thresholds?.[m.key];
    return t != null && run[m.avgKey] < t;
  });
  const passed = failing.length === 0;
  const cases = run.caseResults?.length;

  return (
    <div className={`card p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${passed ? 'border-eval-faithfulness/30' : 'border-danger/30'}`}>
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          passed ? 'bg-eval-faithfulness/10 text-eval-faithfulness' : 'bg-danger/10 text-danger'
        }`}
      >
        {passed ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          {passed
            ? 'Latest run passed: all 4 scores meet their targets'
            : `Latest run is below target on ${failing.length} of 4 scores (${failing.map((m) => m.label.toLowerCase()).join(', ')})`}
        </p>
        <p className="text-xs text-ink-faint mt-0.5" title={new Date(run.createdAt).toLocaleString()}>
          {collectionName(run)}
          {cases ? ` · ${cases} ${cases === 1 ? 'question' : 'questions'}` : ''} · took {formatDuration(run.durationMs)} ·{' '}
          {timeAgo(run.createdAt)}
        </p>
      </div>
      <button onClick={onShowDetails} className="btn-secondary text-sm py-2 shrink-0">
        View per-question scores
      </button>
    </div>
  );
}

function MetricTile({ metric, value, previous, threshold, selected, onSelect }) {
  const hasTarget = threshold != null;
  const meets = !hasTarget || value >= threshold;
  const delta = previous != null ? value - previous : null;

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`card p-5 text-left transition-colors ${
        selected ? 'border-accent/60 bg-accent/5' : 'hover:border-accent/30'
      }`}
    >
      <p className="text-sm font-medium text-ink flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: metric.color }} />
        {metric.label}
      </p>
      <p className="text-xs text-ink-faint leading-relaxed mb-4 min-h-[2.5rem]">{metric.question}</p>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display text-3xl font-semibold text-ink">{value.toFixed(2)}</span>
        {delta != null && Math.abs(delta) >= 0.005 && (
          <span className="flex items-center text-xs text-ink-dim">
            {delta > 0 ? (
              <ArrowUpRight size={14} className="text-eval-faithfulness" />
            ) : (
              <ArrowDownRight size={14} className="text-danger" />
            )}
            {Math.abs(delta).toFixed(2)} vs previous
          </span>
        )}
      </div>

      {/* Meter: same-hue track, score fill, target tick */}
      <div className="relative h-2 rounded-full" style={{ backgroundColor: `${metric.color}26` }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: metric.color }}
        />
        {hasTarget && (
          <span
            className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink"
            style={{ left: `calc(${threshold * 100}% - 1px)` }}
            aria-hidden="true"
          />
        )}
      </div>
      {hasTarget && (
        <div className="flex items-center justify-between gap-2 mt-3">
          <span className="text-[11px] text-ink-faint">Target {threshold.toFixed(2)}</span>
          <span
            className={`flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 ${
              meets
                ? 'text-eval-faithfulness bg-eval-faithfulness/10 border-eval-faithfulness/30'
                : 'text-danger bg-danger/10 border-danger/30'
            }`}
          >
            {meets ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
            {meets ? 'Passing' : 'Below target'}
          </span>
        </div>
      )}
    </button>
  );
}

function RunRow({ run, expanded, onToggle, onDelete }) {
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!expanded || detail) return;
    setLoadingDetail(true);
    api
      .getEvalRun(run._id)
      .then(({ run: full }) => setDetail(full))
      .catch((err) => console.error(err))
      .finally(() => setLoadingDetail(false));
  }, [expanded, detail, run._id]);

  const cases = detail?.caseResults || run.caseResults || [];

  return (
    <>
      <tr
        onClick={onToggle}
        className={`group border-b border-border cursor-pointer transition-colors ${
          expanded ? 'bg-surface2/60' : 'hover:bg-surface2/40'
        }`}
      >
        <td className="pl-6 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={expanded}
            aria-label={`Show per-question scores for the run ${timeAgo(run.createdAt)}`}
            className="flex items-center"
          >
            {expanded ? (
              <ChevronDown size={15} className="text-ink-faint" />
            ) : (
              <ChevronRight size={15} className="text-ink-faint" />
            )}
          </button>
        </td>
        <td className="px-3 py-3.5 text-ink max-w-[14rem] truncate" title={new Date(run.createdAt).toLocaleString()}>
          {collectionName(run)}
        </td>
        {METRICS.map((m) => (
          <ScoreCell key={m.key} value={run[m.avgKey]} threshold={run.thresholds?.[m.key]} />
        ))}
        <td className="px-3 py-3">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium border rounded-full px-2 py-0.5 ${
              run.passed
                ? 'text-eval-faithfulness bg-eval-faithfulness/10 border-eval-faithfulness/30'
                : 'text-danger bg-danger/10 border-danger/30'
            }`}
          >
            {run.passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
            {run.passed ? 'Passed' : 'Failed'}
          </span>
        </td>
        <td className="px-3 py-3 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete this run"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-faint hover:text-danger p-1 transition-opacity"
          >
            <Trash2 size={15} />
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border bg-surface2/30">
          <td colSpan={8} className="px-6 py-4">
            <p className="text-xs text-ink-faint mb-3">
              Run on {new Date(run.createdAt).toLocaleString()} · {cases.length}{' '}
              {cases.length === 1 ? 'question' : 'questions'} · took {formatDuration(run.durationMs)}
            </p>
            {cases.length === 0 ? (
              <p className="text-xs text-ink-faint">No per-question results were stored for this run.</p>
            ) : (
              <ol className="space-y-3">
                {cases.map((c, i) => (
                  <CaseResult
                    key={i}
                    index={i + 1}
                    result={c}
                    thresholds={run.thresholds}
                    loadingAnswer={loadingDetail}
                  />
                ))}
              </ol>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function ScoreCell({ value, threshold }) {
  const below = threshold != null && value < threshold;
  return (
    <td className="px-3 py-3 text-right tabular-nums">
      <span
        className={`inline-flex items-center gap-1 ${below ? 'text-danger' : 'text-ink'}`}
        title={threshold != null ? `Target ${threshold.toFixed(2)}` : undefined}
      >
        {below && <AlertTriangle size={12} aria-label="Below target" />}
        {value.toFixed(2)}
      </span>
    </td>
  );
}

function CaseResult({ index, result, thresholds, loadingAnswer }) {
  const [showFull, setShowFull] = useState(false);

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <p className="text-sm text-ink">
          <span className="font-mono text-xs text-ink-faint mr-2">Q{index}</span>
          {result.question}
        </p>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {METRICS.map((m) => {
            const value = result[m.key];
            const below = thresholds?.[m.key] != null && value < thresholds[m.key];
            return (
              <span
                key={m.key}
                className="flex items-center gap-1.5 bg-surface2 rounded-md px-2 py-1 text-[11px] font-mono"
                title={`${m.label}: ${value.toFixed(2)}`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-ink-faint">{m.short}</span>
                <span className={`font-semibold tabular-nums ${below ? 'text-danger' : 'text-ink'}`}>
                  {value.toFixed(2)}
                </span>
              </span>
            );
          })}
        </div>
      </div>
      {result.answer ? (
        <div className="mt-3">
          <div
            className={
              showFull ? '' : 'max-h-16 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]'
            }
          >
            <MarkdownAnswer text={result.answer} className="text-xs text-ink-dim" />
          </div>
          <button
            onClick={() => setShowFull((s) => !s)}
            className="text-xs text-accent hover:text-accent-hover mt-1"
          >
            {showFull ? 'Show less' : 'Show full answer'}
          </button>
        </div>
      ) : (
        loadingAnswer && (
          <p className="text-xs text-ink-faint mt-3 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Loading answer...
          </p>
        )
      )}
    </li>
  );
}
