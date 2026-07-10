'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Rocket, Search, FileText, Gauge, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';

export default function LandingPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .getPublicStats()
      .then(setStats)
      .catch(() => setStats(null)); // fail silently on landing page, not critical
  }, []);
  return (
    <div className="min-h-screen bg-base">
      <Navbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-slideUp">
          <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 text-accent text-xs font-mono px-3 py-1.5 rounded-full mb-6">
            <Rocket size={13} /> Production-Grade Multimodal RAG
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] mb-6">
            Search Your Documents{' '}
            <span className="text-accent">Intelligently</span>
          </h1>
          <p className="text-ink-dim text-lg leading-relaxed mb-8 max-w-lg">
            Upload PDFs, slides, spreadsheets, images, audio, or video — and get instant,
            source-backed answers powered by hybrid search, cross-encoder reranking, and
            automatic answer-quality evaluation.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/register" className="btn-primary">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="card p-4 shadow-glow">
          <div className="flex items-center gap-1.5 px-2 pb-3">
            <span className="w-3 h-3 rounded-full bg-danger/70" />
            <span className="w-3 h-3 rounded-full bg-warn/70" />
            <span className="w-3 h-3 rounded-full bg-eval-faithfulness/70" />
          </div>
          <div className="bg-surface2 rounded-lg px-4 py-3 mb-3 text-ink-dim text-sm">
            What are the battery cooling methods used in EV systems?
          </div>
          <div className="border border-accent/40 bg-accent/5 rounded-lg px-4 py-3">
            <p className="text-sm text-ink leading-relaxed">
              According to Document-12,{' '}
              <span className="bg-accent/20 text-accent px-1 rounded">
                vapor cooling improves thermal stability
              </span>{' '}
              by reducing peak battery temperatures.{' '}
              <span className="font-mono text-xs text-accent">[1]</span>
            </p>
            <div className="mt-2 text-xs text-accent/80 font-mono">
              Source: EV_Thermal_Report.pdf
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="font-display text-3xl font-semibold text-center mb-12">
          Powerful Features
        </h2>

        <div className="grid md:grid-cols-3 gap-5 mb-10">
          <FeatureCard
            icon={<Search size={20} className="text-accent" />}
            title="Hybrid Search"
            desc="Documents are retrieved with BM25 sparse search fused with dense vector similarity via Reciprocal Rank Fusion."
          />
          <FeatureCard
            icon={<FileText size={20} className="text-eval-relevancy" />}
            title="Source Snippets"
            desc="Every answer is shown alongside the exact document chunks it was generated from, with citation enforcement."
          />
          <FeatureCard
            icon={<Gauge size={20} className="text-eval-precision" />}
            title="Answer Evaluation"
            desc="Each answer is automatically scored for faithfulness, relevancy, context precision, and recall."
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Avg. Faithfulness"
            value={stats?.avgFaithfulness != null ? stats.avgFaithfulness.toFixed(2) : '—'}
            color="bg-eval-faithfulness"
          />
          <StatCard
            label="Documents Indexed"
            value={stats?.documentsIndexed ?? '—'}
            color="bg-eval-relevancy"
          />
          <StatCard
            label="Avg. Context Precision"
            value={stats?.avgContextPrecision != null ? stats.avgContextPrecision.toFixed(2) : '—'}
            color="bg-eval-precision"
          />
          <StatCard
            label="Questions Answered"
            value={stats?.questionsAnswered ?? '—'}
            color="bg-eval-recall"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="card p-6 hover:border-accent/40 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-surface2 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
      <p className="text-ink-dim text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="card p-6 flex flex-col items-center text-center gap-3">
      <span className={`w-10 h-1 rounded-full ${color}`} />
      <span className="text-2xl font-display font-semibold">{value}</span>
      <span className="text-ink-dim text-sm">{label}</span>
    </div>
  );
}