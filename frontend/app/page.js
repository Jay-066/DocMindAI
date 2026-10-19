'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Rocket,
  Search,
  Gauge,
  ArrowRight,
  FolderPlus,
  UploadCloud,
  MessagesSquare,
  Layers,
  Quote,
  Zap,
  Cpu,
  Briefcase,
  GraduationCap,
  Scale,
  Code2,
  ChevronDown,
  CheckCircle2,
  Brain,
  ListFilter,
  Pause,
  Play,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import PipelineDiagram from '@/components/PipelineDiagram';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

const FORMATS = ['PDF', 'DOCX', 'TXT', 'Markdown', 'CSV', 'JSON', 'YAML', 'XML'];

const STEPS = [
  {
    icon: FolderPlus,
    title: 'Create a collection',
    desc: 'Group related files together: a hiring round, a research project, or a policy library.',
  },
  {
    icon: UploadCloud,
    title: 'Upload your files',
    desc: 'Drop in PDFs, Word documents, or text files. Each one is split into passages and indexed automatically.',
  },
  {
    icon: MessagesSquare,
    title: 'Ask anything',
    desc: 'Get a streamed answer with numbered citations, the exact source passages, and live quality scores.',
  },
];

const FEATURES = [
  {
    icon: Search,
    color: 'text-accent',
    title: 'Hybrid search',
    desc: 'Keyword (BM25) and semantic vector search run side by side and are merged with Reciprocal Rank Fusion, so exact terms and paraphrases both match.',
  },
  {
    icon: ListFilter,
    color: 'text-eval-relevancy',
    title: 'Cross-encoder reranking',
    desc: 'A Cohere reranker re-scores the shortlist so only the most relevant passages reach the language model.',
  },
  {
    icon: Quote,
    color: 'text-eval-precision',
    title: 'Citation enforcement',
    desc: 'Every claim must point to a numbered source. Answers without citations are flagged with a warning instead of silently passing.',
  },
  {
    icon: Gauge,
    color: 'text-eval-faithfulness',
    title: 'Live answer scoring',
    desc: 'Each answer is graded for faithfulness, relevancy, context precision, and context recall right after it finishes streaming.',
  },
  {
    icon: Zap,
    color: 'text-warn',
    title: 'Streaming with history',
    desc: 'Answers appear word by word, and conversations are saved per collection so you can pick up where you left off.',
  },
  {
    icon: Cpu,
    color: 'text-eval-recall',
    title: 'Multi-model fallback',
    desc: 'Runs on Gemini, Groq, OpenAI, Anthropic, or DeepSeek. If one provider fails, the next one takes over automatically.',
  },
];

const PIPELINE_NOTES = [
  {
    title: 'Retrieve',
    desc: 'Your question is matched against every passage twice, by keywords and by meaning, and the two ranked lists are fused.',
  },
  {
    title: 'Rerank',
    desc: 'A cross-encoder reads the question and each candidate passage together and keeps only the best few.',
  },
  {
    title: 'Answer and verify',
    desc: 'The model answers only from those passages with inline citations, then an evaluator scores the result.',
  },
];

const USE_CASES = [
  {
    icon: Briefcase,
    title: 'Hiring and resumes',
    example: 'Which candidates have Kubernetes experience?',
  },
  {
    icon: GraduationCap,
    title: 'Research papers',
    example: 'What sample size did the 2024 study use?',
  },
  {
    icon: Scale,
    title: 'Policies and contracts',
    example: 'What is the notice period for resignation?',
  },
  {
    icon: Code2,
    title: 'Technical docs',
    example: 'Which region does the staging cluster run in?',
  },
];

const FAQS = [
  {
    q: 'What files can I upload?',
    a: 'PDF, Word (.docx), and plain-text files: TXT, Markdown, CSV, TSV, JSON, XML, YAML, and log files. Images, audio, and video are not supported.',
  },
  {
    q: 'What happens if the answer is not in my documents?',
    a: 'DocMind is instructed to answer only from your sources and to say so when the answer is not there, instead of guessing.',
  },
  {
    q: 'Who can search my documents?',
    a: 'Each collection belongs to your account, and every search runs only inside the collection you select.',
  },
  {
    q: 'How are answers scored?',
    a: 'A separate judge model rates every answer on four metrics: faithfulness (is it supported by the sources), answer relevancy, context precision, and context recall. Scores appear under the answer and on the Evaluation dashboard.',
  },
  {
    q: 'Can I see where an answer came from?',
    a: 'Yes. Below every answer, each citation number is listed with its document name, page or section, and the passage the claim was drawn from.',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .getPublicStats()
      .then(setStats)
      .catch(() => setStats(null)); // fail silently on landing page, not critical
  }, []);

  const primaryCta = user
    ? { href: '/workspace', label: 'Open your workspace' }
    : { href: '/register', label: 'Get started' };

  return (
    <div className="min-h-screen bg-base">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.14),transparent_55%)]"
        />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slideUp">
            <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 text-accent text-xs font-mono px-3 py-1.5 rounded-full mb-6">
              <Rocket size={13} /> Production-Grade Document RAG
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] mb-6">
              Search Your Documents{' '}
              <span className="text-accent">Intelligently</span>
            </h1>
            <p className="text-ink-dim text-lg leading-relaxed mb-8 max-w-lg">
              Upload PDFs, Word documents, or text files and ask questions in plain English.
              Every answer cites the exact passage it came from and is scored for accuracy
              automatically.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Link href={primaryCta.href} className="btn-primary">
                {primaryCta.label} <ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" className="btn-secondary">
                See how it works
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-dim">
              {['Cited answers', 'Private collections', 'Quality-scored'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-eval-faithfulness" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroDemo />
        </div>
      </section>

      {/* Supported formats */}
      <section className="border-y border-border bg-surface/40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <span className="eyebrow mr-2">Works with</span>
          {FORMATS.map((f) => (
            <span
              key={f}
              className="text-xs font-mono text-ink-dim border border-border bg-surface2 rounded-md px-2.5 py-1"
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 max-w-7xl mx-auto px-6 py-24">
        <SectionHeading
          eyebrow="How it works"
          title="From upload to answer in three steps"
          subtitle="No configuration needed. Create a collection, add your files, and start asking."
        />
        <ol className="grid md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card p-6 relative">
              <span className="absolute top-5 right-6 font-display text-4xl font-semibold text-border">
                {i + 1}
              </span>
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center mb-4">
                <step.icon size={20} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-ink-dim text-sm leading-relaxed">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 max-w-7xl mx-auto px-6 pb-24">
        <SectionHeading
          eyebrow="Features"
          title="Built for answers you can trust"
          subtitle="Every stage of the pipeline is designed to find the right passage and prove where the answer came from."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              icon={<f.icon size={20} className={f.color} />}
              title={f.title}
              desc={f.desc}
            />
          ))}
        </div>
      </section>

      {/* Under the hood */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <SectionHeading
          eyebrow="Under the hood"
          title="A retrieval pipeline, not just a chatbot"
          subtitle="Each question passes through six stages before you see an answer."
        />
        <div className="card p-6 mb-5">
          <PipelineDiagram />
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {PIPELINE_NOTES.map((note, i) => (
            <div key={note.title} className="card p-6">
              <p className="eyebrow text-accent mb-2">Stage {i + 1}</p>
              <h3 className="font-display font-semibold text-lg mb-2">{note.title}</h3>
              <p className="text-ink-dim text-sm leading-relaxed">{note.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <SectionHeading
          eyebrow="Use cases"
          title="Ask the questions you actually have"
          subtitle="Anything you would otherwise find with Ctrl+F and a lot of scrolling."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {USE_CASES.map((u) => (
            <div key={u.title} className="card p-6 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-surface2 flex items-center justify-center mb-4">
                <u.icon size={20} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold mb-3">{u.title}</h3>
              <p className="mt-auto text-xs font-mono text-ink-dim bg-surface2 border border-border rounded-lg px-3 py-2">
                “{u.example}”
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live stats */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <SectionHeading
          eyebrow="Live"
          title="Numbers from this DocMind instance"
          subtitle="Updated from real usage and the latest evaluation run."
        />
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

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 max-w-3xl mx-auto px-6 pb-24">
        <SectionHeading eyebrow="FAQ" title="Common questions" />
        <div className="space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="card group px-5 py-4 open:border-accent/40">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  size={18}
                  className="text-ink-faint shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="text-ink-dim text-sm leading-relaxed mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Footer user={user} />
    </div>
  );
}

const SLIDE_MS = 7000;

// Illustrative examples for the hero carousel. Answer parts are plain strings,
// { highlight } spans, or { cite } markers.
const DEMOS = [
  {
    collection: 'HR Policies',
    question: 'How much notice do employees need to give before resigning?',
    answer: [
      'Employees must give ',
      { highlight: "30 days' written notice" },
      ' before their last working day ',
      { cite: 1 },
      '. During probation, the notice period is 7 days ',
      { cite: 2 },
      '.',
    ],
    sources: [
      ['Employee_Handbook.pdf', 'Page 14'],
      ['Probation_Policy.docx', 'Document'],
    ],
    scores: ['0.96', '0.92', '0.88'],
  },
  {
    collection: 'Engineering Candidates',
    question: 'Which candidates have hands-on Kubernetes experience?',
    answer: [
      'Two candidates do. One ',
      { highlight: 'migrated a monolith to Kubernetes' },
      ', cutting deploy time by 70% ',
      { cite: 1 },
      ', and the other runs production EKS clusters with Helm ',
      { cite: 2 },
      '.',
    ],
    sources: [
      ['Backend_Engineer_Resume.pdf', 'Page 1'],
      ['DevOps_Engineer_Resume.docx', 'Document'],
    ],
    scores: ['0.94', '0.95', '0.90'],
  },
  {
    collection: 'Platform Runbooks',
    question: 'How do I roll back a failed staging deploy?',
    answer: [
      'Run ',
      { highlight: 'deploy rollback --env staging' },
      ' to restore the previous release ',
      { cite: 1 },
      '. Rollbacks must be approved by the on-call SRE before they run ',
      { cite: 2 },
      '.',
    ],
    sources: [
      ['staging-runbook.md', 'Document'],
      ['deploy-policy.yaml', 'Document'],
    ],
    scores: ['0.97', '0.93', '0.91'],
  },
];

const SCORE_STYLES = [
  { label: 'Faithfulness', dot: 'bg-eval-faithfulness', text: 'text-eval-faithfulness' },
  { label: 'Relevancy', dot: 'bg-eval-relevancy', text: 'text-eval-relevancy' },
  { label: 'Precision', dot: 'bg-eval-precision', text: 'text-eval-precision' },
];

function HeroDemo() {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null); // { x, width } while a pointer is down on the slides
  const lastWheel = useRef(0);

  // The active dot's fill animation is the timer: when it ends we advance, and pausing it
  // (hover, keyboard focus, dragging, or the pause button) keeps the remaining time.
  const autoplay = !reduceMotion && !userPaused;
  const paused = hovered || focused || dragging;
  const last = DEMOS.length - 1;
  const next = () => setIndex((i) => (i + 1) % DEMOS.length);
  const prev = () => setIndex((i) => (i - 1 + DEMOS.length) % DEMOS.length);

  // Drag or swipe the slides with the mouse, pen, or a finger
  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragStart.current = { x: e.clientX, width: e.currentTarget.offsetWidth };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    // Resist past the first/last slide so the empty edge doesn't show
    const atEdge = (index === 0 && dx > 0) || (index === last && dx < 0);
    setDragOffset(atEdge ? dx * 0.35 : dx);
  }

  function handlePointerUp() {
    if (!dragStart.current) return;
    const threshold = Math.min(80, dragStart.current.width * 0.2);
    if (dragOffset <= -threshold) next();
    else if (dragOffset >= threshold) prev();
    dragStart.current = null;
    setDragging(false);
    setDragOffset(0);
  }

  // Horizontal trackpad scrolling: one slide per gesture
  function handleWheel(e) {
    if (Math.abs(e.deltaX) < 20 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const now = Date.now();
    if (now - lastWheel.current < 600) return;
    lastWheel.current = now;
    if (e.deltaX > 0) next();
    else prev();
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Example questions and cited answers"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Only keyboard focus pauses; a mouse click on a dot shouldn't freeze autoplay
      onFocus={(e) => setFocused(e.target.matches(':focus-visible'))}
      onBlur={() => setFocused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
      }}
      className="min-w-0"
    >
      <div className="card p-4 shadow-glow">
        {/* Clip here, inside the padding, so neighbouring slides never peek in */}
        <div
          className={`overflow-hidden select-none touch-pan-y ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              transform: `translateX(calc(-${index * 100}% + ${dragOffset}px))`,
              transitionDuration: dragging ? '0ms' : undefined,
            }}
          >
            {DEMOS.map((demo, i) => (
              <div
                key={demo.collection}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${DEMOS.length}: ${demo.collection}`}
                aria-hidden={i !== index}
                className="w-full min-w-0 shrink-0"
              >
                <DemoSlide demo={demo} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-4">
        {DEMOS.map((demo, i) => {
          const active = i === index;
          return (
            <button
              key={demo.collection}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show example ${i + 1}: ${demo.collection}`}
              aria-current={active}
              className={`relative h-2 rounded-full overflow-hidden transition-all ${
                active ? 'w-8 bg-surface2' : 'w-2 bg-border hover:bg-ink-faint'
              }`}
            >
              {active &&
                (autoplay ? (
                  <span
                    key={index}
                    onAnimationEnd={next}
                    className="absolute inset-0 origin-left bg-accent animate-progress"
                    style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  />
                ) : (
                  <span className="absolute inset-0 bg-accent" />
                ))}
            </button>
          );
        })}
        {!reduceMotion && (
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? 'Play examples' : 'Pause examples'}
            className="ml-1 w-6 h-6 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface2 transition-colors"
          >
            {userPaused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

function DemoSlide({ demo }) {
  return (
    <>
      <div className="flex items-center gap-1.5 px-2 pb-3">
        <span className="w-3 h-3 rounded-full bg-danger/70" />
        <span className="w-3 h-3 rounded-full bg-warn/70" />
        <span className="w-3 h-3 rounded-full bg-eval-faithfulness/70" />
        <span className="ml-3 text-xs font-mono text-ink-faint truncate">
          Collection: {demo.collection}
        </span>
      </div>

      <div className="flex justify-end mb-3">
        <div className="bg-accent text-white rounded-lg rounded-br-sm px-4 py-2.5 text-sm max-w-[85%]">
          {demo.question}
        </div>
      </div>

      <div className="border border-accent/40 bg-accent/5 rounded-lg px-4 py-3">
        <p className="text-sm text-ink leading-relaxed">
          {demo.answer.map((part, i) => {
            if (typeof part === 'string') return <span key={i}>{part}</span>;
            if (part.cite) {
              return (
                <span key={i} className="font-mono text-xs text-accent">
                  [{part.cite}]
                </span>
              );
            }
            return (
              <span key={i} className="bg-accent/20 text-accent px-1 rounded">
                {part.highlight}
              </span>
            );
          })}
        </p>

        <div className="mt-3 space-y-1.5">
          {demo.sources.map(([doc, loc], i) => (
            <div key={doc} className="flex items-center gap-2 text-xs font-mono text-ink-dim">
              <span className="text-accent">[{i + 1}]</span>
              <span className="truncate">{doc}</span>
              <span className="text-ink-faint shrink-0">· {loc}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/60">
          {SCORE_STYLES.map((s, i) => (
            <span key={s.label} className="flex items-center gap-1.5 bg-surface2 rounded-md px-2 py-1">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <span className="text-[11px] text-ink-faint font-mono">{s.label}</span>
              <span className={`text-[11px] font-mono font-semibold ${s.text}`}>{demo.scores[i]}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <p className="eyebrow text-accent mb-3">{eyebrow}</p>
      <h2 className="font-display text-3xl md:text-4xl font-semibold mb-3">{title}</h2>
      {subtitle && <p className="text-ink-dim leading-relaxed">{subtitle}</p>}
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

function Footer({ user }) {
  const links = [
    { href: '/workspace', label: 'Ask My Docs' },
    { href: '/dashboard', label: 'Evaluation' },
    ...(user ? [] : [{ href: '/login', label: 'Log in' }, { href: '/register', label: 'Sign up' }]),
  ];

  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="flex items-center gap-2 font-display font-semibold">
            <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
              <Brain size={16} className="text-accent" />
            </div>
            DocMind AI
          </Link>
          <p className="text-xs text-ink-faint flex items-center gap-1.5">
            <Layers size={12} /> Next.js · Express · MongoDB · ChromaDB · Cohere
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-dim">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink transition-colors">
              {l.label}
            </Link>
          ))}
          <a href="#faq" className="hover:text-ink transition-colors">
            FAQ
          </a>
        </nav>
      </div>
    </footer>
  );
}
