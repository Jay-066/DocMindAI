'use client';

import { useState } from 'react';
import { FolderPlus, UploadCloud, MessagesSquare, ArrowRight, Brain } from 'lucide-react';
import { COLLECTION_IDEAS } from './CollectionSidebar';

const STEPS = [
  {
    icon: FolderPlus,
    title: 'Create a collection',
    desc: 'A folder for related files, like a hiring round or a policy library.',
  },
  {
    icon: UploadCloud,
    title: 'Upload documents',
    desc: 'PDFs, Word documents, or text files. Indexing starts automatically.',
  },
  {
    icon: MessagesSquare,
    title: 'Ask questions',
    desc: 'Get answers with numbered citations and live quality scores.',
  },
];

/** Shown in place of the documents + chat panels until the user has a collection. */
export default function WorkspaceWelcome({ onCreate, className = '' }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim(), '');
    } catch (err) {
      alert(`Could not create collection: ${err.message}`);
      setCreating(false);
    }
  }

  return (
    <div className={`flex-1 overflow-y-auto ${className}`}>
      <div className="max-w-2xl mx-auto px-6 py-16 animate-slideUp">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <Brain size={26} className="text-accent" />
          </div>
          <h1 className="font-display text-3xl font-semibold mb-2">Welcome to your workspace</h1>
          <p className="text-ink-dim">
            Create your first collection to start uploading documents and asking questions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-4 flex flex-col sm:flex-row gap-3 mb-4">
          <input
            autoFocus
            className="input-field"
            placeholder="Name your first collection, e.g. Resumes"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Collection name"
          />
          <button type="submit" disabled={creating || !name.trim()} className="btn-primary shrink-0">
            {creating ? 'Creating...' : 'Create'} <ArrowRight size={16} />
          </button>
        </form>

        <div className="flex flex-wrap justify-center items-center gap-2 mb-12">
          <span className="text-xs text-ink-faint">Ideas:</span>
          {COLLECTION_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setName(idea)}
              className="text-xs text-ink-dim border border-border bg-surface2 rounded-full px-3 py-1 hover:border-accent/50 hover:text-accent transition-colors"
            >
              {idea}
            </button>
          ))}
        </div>

        <ol className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className={`card p-5 ${i === 0 ? 'border-accent/40' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-mono flex items-center justify-center ${
                    i === 0 ? 'bg-accent text-white' : 'bg-surface2 text-ink-faint'
                  }`}
                >
                  {i + 1}
                </span>
                <step.icon size={16} className={i === 0 ? 'text-accent' : 'text-ink-faint'} />
              </div>
              <h3 className="font-display font-semibold mb-1">{step.title}</h3>
              <p className="text-xs text-ink-dim leading-relaxed">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
