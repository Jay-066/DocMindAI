'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, Loader2, CheckCircle2, XCircle, Clock, Trash2, MessagesSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';

const METRIC_META = [
  { key: 'avgFaithfulness', label: 'Faithfulness', color: '#22C55E' },
  { key: 'avgAnswerRelevancy', label: 'Answer Relevancy', color: '#06B6D4' },
  { key: 'avgContextPrecision', label: 'Context Precision', color: '#A78BFA' },
  { key: 'avgContextRecall', label: 'Context Recall', color: '#F97316' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [latest, setLatest] = useState(null);
  const [runs, setRuns] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [latestRes, runsRes, convRes] = await Promise.all([
        api.getLatestEval(),
        api.listEvalRuns(),
        api.listConversations(),
      ]);
      setLatest(latestRes.run);
      setRuns(runsRes.runs);
      setConversations(convRes.conversations);
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
    setRunning(true);
    try {
      await api.triggerEval();
      await loadData();
    } catch (err) {
      alert(err.message);
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
    if (!confirm('Delete this chat log? This cannot be undone.')) return;
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
    } catch (err) {
      alert(err.message);
    }
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center text-ink-faint text-sm">
        Loading dashboard...
      </div>
    );
  }

  const chartData = METRIC_META.map((m) => ({
    name: m.label,
    value: latest ? Number((latest[m.key] || 0).toFixed(3)) : 0,
    color: m.color,
  }));

  return (
    <div className="min-h-screen bg-base">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold">Evaluation Dashboard</h1>
            <p className="text-ink-dim text-sm mt-1">
              CI-gated RAGAS-style scoring — faithfulness, relevancy, precision, and recall
            </p>
          </div>
          <button onClick={handleRunEval} disabled={running} className="btn-primary">
            {running ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
            {running ? 'Running eval...' : 'Run Evaluation'}
          </button>
        </div>

        {!latest && (
          <div className="card p-10 text-center text-ink-faint text-sm mb-8">
            No evaluation runs yet. Click &quot;Run Evaluation&quot; to score your RAG pipeline
            against the eval dataset.
          </div>
        )}

        {latest && (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {METRIC_META.map((m) => (
                <MetricCard
                  key={m.key}
                  label={m.label}
                  value={latest[m.key]}
                  threshold={latest.thresholds?.[m.key.replace('avg', '').charAt(0).toLowerCase() + m.key.replace('avg', '').slice(1)]}
                  color={m.color}
                />
              ))}
            </div>

            {/* Chart */}
            <div className="card p-6 mb-8">
              <p className="eyebrow mb-4">Latest Run — Score Breakdown</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2430" vertical={false} />
                  <XAxis dataKey="name" stroke="#5B6474" fontSize={12} />
                  <YAxis domain={[0, 1]} stroke="#5B6474" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: '#12161F',
                      border: '1px solid #1E2430',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Run history */}
        <div className="card p-6 mb-8">
          <p className="eyebrow mb-4">Run History</p>
          {runs.length === 0 ? (
            <p className="text-ink-faint text-sm">No runs recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <div
                  key={run._id}
                  className="flex items-center justify-between bg-surface2 rounded-lg px-4 py-3 group"
                >
                  <div className="flex items-center gap-3">
                    {run.passed ? (
                      <CheckCircle2 size={16} className="text-eval-faithfulness shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-danger shrink-0" />
                    )}
                    <div>
                      <p className="text-sm text-ink">
                        F: {run.avgFaithfulness.toFixed(2)} · R: {run.avgAnswerRelevancy.toFixed(2)} · P:{' '}
                        {run.avgContextPrecision.toFixed(2)} · Rc: {run.avgContextRecall.toFixed(2)}
                      </p>
                      <p className="text-xs text-ink-faint flex items-center gap-1 mt-0.5">
                        <Clock size={11} /> {new Date(run.createdAt).toLocaleString()} ·{' '}
                        {run.triggeredBy}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRun(run._id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-opacity shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <MessagesSquare size={13} /> Chat Logs
          </p>
          {conversations.length === 0 ? (
            <p className="text-ink-faint text-sm">No chat conversations recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv._id}
                  className="flex items-center justify-between bg-surface2 rounded-lg px-4 py-3 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{conv.title || 'Untitled conversation'}</p>
                    <p className="text-xs text-ink-faint flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> {new Date(conv.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteConversation(conv._id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-opacity shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, threshold, color }) {
  const pct = Math.round((value || 0) * 100);
  const passed = threshold === undefined || threshold === null || value >= threshold;

  return (
    <div className="card p-5">
      <p className="text-xs text-ink-faint mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-3xl font-display font-semibold" style={{ color }}>
          {value?.toFixed(2) ?? '—'}
        </span>
        {threshold !== undefined && threshold !== null && (
          <span className="text-xs text-ink-faint">/ {threshold} min</span>
        )}
      </div>
      <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {!passed && <p className="text-[11px] text-danger mt-1.5">Below threshold</p>}
    </div>
  );
}