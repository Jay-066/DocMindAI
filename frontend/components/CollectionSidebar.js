'use client';

import { useState } from 'react';
import { Plus, FolderOpen, Folders, Trash2, X, Search, Lightbulb } from 'lucide-react';
import { timeAgo } from '@/lib/format';

const PALETTE = [
  'bg-accent/15 text-accent',
  'bg-eval-faithfulness/15 text-eval-faithfulness',
  'bg-eval-relevancy/15 text-eval-relevancy',
  'bg-eval-precision/15 text-eval-precision',
  'bg-eval-recall/15 text-eval-recall',
  'bg-warn/15 text-warn',
];

/** Stable per-collection icon colour, derived from its id. */
export function collectionColor(id = '') {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export const COLLECTION_IDEAS = ['Resumes', 'HR Policies', 'Research Papers', 'Meeting Notes'];

export default function CollectionSidebar({
  collections,
  activeCollection,
  onSelect,
  onCreate,
  onDelete,
  className = '',
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  function openCreate(prefill = '') {
    setName(prefill);
    setDescription('');
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
    setName('');
    setDescription('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim(), description.trim());
      closeCreate();
    } catch (err) {
      alert(`Could not create collection: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  const visible = query
    ? collections.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : collections;
  const totalDocs = collections.reduce((sum, c) => sum + (c.documentCount || 0), 0);

  return (
    <aside className={`shrink-0 border-r border-border bg-surface/50 flex-col h-full ${className}`}>
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Collections</span>
            <span className="text-[10px] font-mono text-ink-faint bg-surface2 border border-border rounded px-1.5 py-0.5">
              {collections.length}
            </span>
          </div>
          <button
            onClick={() => (showCreate ? closeCreate() : openCreate())}
            aria-expanded={showCreate}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover hover:bg-accent/10 px-2 py-1 rounded-md transition-colors"
          >
            {showCreate ? (
              <>
                <X size={14} /> Cancel
              </>
            ) : (
              <>
                <Plus size={14} /> New
              </>
            )}
          </button>
        </div>

        {collections.length > 3 && !showCreate && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input-field text-sm py-2 pl-9"
              placeholder="Search collections"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search collections"
            />
          </div>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 border-b border-border space-y-2 bg-surface2/40">
          <input
            autoFocus
            className="input-field text-sm py-2"
            placeholder="Collection name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Collection name"
          />
          <input
            className="input-field text-sm py-2"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Collection description"
          />
          <button type="submit" disabled={creating || !name.trim()} className="btn-primary w-full text-sm py-2">
            {creating ? 'Creating...' : 'Create collection'}
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {collections.length === 0 && !showCreate && (
          <div className="text-center px-4 mt-10">
            <div className="w-12 h-12 mx-auto rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              <Folders size={22} className="text-accent" />
            </div>
            <p className="text-sm text-ink-dim mb-1">No collections yet</p>
            <p className="text-xs text-ink-faint mb-4">Start with one of these:</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {COLLECTION_IDEAS.map((idea) => (
                <button
                  key={idea}
                  onClick={() => openCreate(idea)}
                  className="text-xs text-ink-dim border border-border bg-surface2 rounded-full px-2.5 py-1 hover:border-accent/50 hover:text-accent transition-colors"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}

        {collections.length > 0 && visible.length === 0 && (
          <p className="text-xs text-ink-faint text-center mt-6 px-4">
            No collections match &ldquo;{query}&rdquo;
          </p>
        )}

        {visible.map((c) => {
          const active = activeCollection?._id === c._id;
          const docs = c.documentCount || 0;
          return (
            <div
              key={c._id}
              className={`group flex items-center gap-1 rounded-lg border transition-colors ${
                active ? 'bg-accent/10 border-accent/30' : 'border-transparent hover:bg-surface2'
              }`}
            >
              <button
                onClick={() => onSelect(c)}
                aria-current={active}
                className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <span
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${collectionColor(c._id)}`}
                >
                  <FolderOpen size={16} />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm truncate ${active ? 'text-ink font-medium' : 'text-ink-dim'}`}>
                    {c.name}
                  </span>
                  {c.description && (
                    <span className="block text-xs text-ink-faint truncate">{c.description}</span>
                  )}
                  <span className="block text-[11px] font-mono text-ink-faint">
                    {docs} {docs === 1 ? 'doc' : 'docs'} · {timeAgo(c.updatedAt)}
                  </span>
                </span>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete collection "${c.name}" and all its documents?`)) {
                    onDelete(c._id);
                  }
                }}
                aria-label={`Delete collection ${c.name}`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-faint hover:text-danger p-2 mr-1 shrink-0 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-border space-y-3">
        <div className="flex gap-2 rounded-lg bg-surface2/60 border border-border p-3">
          <Lightbulb size={14} className="text-warn shrink-0 mt-0.5" />
          <p className="text-xs text-ink-dim leading-relaxed">
            Keep each collection focused on one topic. Searches only look inside the selected
            collection, so answers stay sharp.
          </p>
        </div>
        <div className="flex justify-between text-[11px] font-mono text-ink-faint px-1">
          <span>
            {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
          </span>
          <span>
            {totalDocs} {totalDocs === 1 ? 'document' : 'documents'}
          </span>
        </div>
      </div>
    </aside>
  );
}
