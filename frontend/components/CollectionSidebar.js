'use client';

import { useState } from 'react';
import { Plus, FolderOpen, Trash2, X } from 'lucide-react';

export default function CollectionSidebar({
  collections,
  activeCollection,
  onSelect,
  onCreate,
  onDelete,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim());
      setName('');
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="w-64 shrink-0 border-r border-border bg-surface/50 flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="eyebrow">Collections</span>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="w-7 h-7 rounded-md hover:bg-surface2 flex items-center justify-center text-ink-dim hover:text-accent transition-colors"
        >
          {showCreate ? <X size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-3 border-b border-border space-y-2">
          <input
            autoFocus
            className="input-field text-sm py-2"
            placeholder="Collection name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" disabled={creating} className="btn-primary w-full text-sm py-2">
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {collections.length === 0 && (
          <p className="text-ink-faint text-sm text-center mt-8 px-4">
            No collections yet. Create one to start uploading documents.
          </p>
        )}
        {collections.map((c) => {
          const active = activeCollection?._id === c._id;
          return (
            <div
              key={c._id}
              onClick={() => onSelect(c)}
              className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                active ? 'bg-accent/15 border border-accent/30' : 'hover:bg-surface2 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen size={15} className={active ? 'text-accent' : 'text-ink-faint'} />
                <div className="min-w-0">
                  <p className={`text-sm truncate ${active ? 'text-ink font-medium' : 'text-ink-dim'}`}>
                    {c.name}
                  </p>
                  <p className="text-xs text-ink-faint">{c.documentCount || 0} docs</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete collection "${c.name}" and all its documents?`)) {
                    onDelete(c._id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-opacity shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
