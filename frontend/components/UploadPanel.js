'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  FolderOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Search,
  Lightbulb,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatBytes, timeAgo, fileExtension } from '@/lib/format';
import { collectionColor } from './CollectionSidebar';

const TYPE_STYLES = {
  pdf: 'text-danger bg-danger/10 border-danger/30',
  docx: 'text-accent bg-accent/10 border-accent/30',
  text: 'text-eval-relevancy bg-eval-relevancy/10 border-eval-relevancy/30',
};

const STATUS_STYLES = {
  queued: { label: 'Queued', className: 'text-ink-dim bg-surface2 border-border', icon: Clock },
  processing: { label: 'Indexing', className: 'text-accent bg-accent/10 border-accent/30', icon: Loader2, spin: true },
  indexed: {
    label: 'Indexed',
    className: 'text-eval-faithfulness bg-eval-faithfulness/10 border-eval-faithfulness/30',
    icon: CheckCircle2,
  },
  failed: { label: 'Failed', className: 'text-danger bg-danger/10 border-danger/30', icon: XCircle },
};

// Keep in sync with EXT_TO_TYPE in backend/src/middleware/upload.js
const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.yaml,.yml,.log';
const FORMAT_CHIPS = ['PDF', 'DOCX', 'TXT', 'MD', 'CSV', 'JSON'];

const TIPS = [
  'Use text-based PDFs. Scanned pages are images, so there is no text to search.',
  'Put related files in one collection so answers can draw on all of them.',
  'Markdown, CSV, JSON, and YAML files are indexed as plain text.',
];

/**
 * Documents for one collection: summary header, drop zone, and the document list.
 * Reports the list to the parent via onDocumentsChange (null while loading) so the
 * chat panel can tailor its empty state. Remount with a key per collection.
 */
export default function UploadPanel({ collection, onDocumentsChange, refreshSignal = 0 }) {
  const collectionId = collection._id;
  const [documents, setDocuments] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total, name } while uploading
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [skipped, setSkipped] = useState([]); // duplicate files that were not uploaded
  const [filter, setFilter] = useState('');
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const loadDocuments = useCallback(async () => {
    try {
      const { documents: docs } = await api.listDocuments(collectionId);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      setDocuments((prev) => prev ?? []);
    }
  }, [collectionId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Re-fetch when the chat's Refresh button bumps the signal (not on mount: loaded above)
  const initialRefreshSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal !== initialRefreshSignal.current) loadDocuments();
  }, [refreshSignal, loadDocuments]);

  useEffect(() => {
    onDocumentsChange?.(documents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  // Poll while any document is still queued/processing
  useEffect(() => {
    const hasPending = documents?.some((d) => d.status === 'queued' || d.status === 'processing');
    if (hasPending) {
      pollRef.current = setInterval(loadDocuments, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [documents, loadDocuments]);

  async function handleFiles(files) {
    const list = Array.from(files || []);
    if (list.length === 0 || progress) return;
    setError(null);
    setSkipped([]);

    // Skip names already in this collection (or repeated in this batch) without uploading.
    // The server is the source of truth: it also rejects identical contents under another name (409).
    const taken = new Set(
      (documents || []).filter((d) => d.status !== 'failed').map((d) => d.originalName.toLowerCase())
    );
    const toUpload = [];
    const duplicates = [];
    for (const file of list) {
      const key = file.name.toLowerCase();
      if (taken.has(key)) {
        duplicates.push(`${file.name} is already in this collection.`);
      } else {
        taken.add(key);
        toUpload.push(file);
      }
    }

    const failures = [];
    for (const [i, file] of toUpload.entries()) {
      setProgress({ current: i + 1, total: toUpload.length, name: file.name });
      try {
        await api.uploadDocument(file, collectionId);
      } catch (err) {
        if (err.status === 409) duplicates.push(`${file.name}: ${err.message}`);
        else failures.push(`${file.name}: ${err.message}`);
      }
    }
    setProgress(null);
    setSkipped(duplicates);
    if (failures.length) setError(failures.join(' · '));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (toUpload.length > 0) await loadDocuments();
  }

  async function handleDelete(docId) {
    if (!confirm('Delete this document? This cannot be undone.')) return;

    setDeletingId(docId);
    setError(null);
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch (err) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  }

  const docs = documents || [];
  const indexed = docs.filter((d) => d.status === 'indexed');
  const pending = docs.filter((d) => d.status === 'queued' || d.status === 'processing').length;
  const failed = docs.filter((d) => d.status === 'failed').length;
  const chunkTotal = indexed.reduce((sum, d) => sum + (d.chunkCount || 0), 0);
  const visibleDocs = filter
    ? docs.filter((d) => d.originalName.toLowerCase().includes(filter.toLowerCase()))
    : docs;

  return (
    <div className="space-y-5">
      {/* Collection summary */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <span
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${collectionColor(collectionId)}`}
          >
            <FolderOpen size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-lg leading-tight truncate">{collection.name}</h2>
            <p className="text-xs text-ink-faint truncate mt-0.5">
              {collection.description || `Created ${timeAgo(collection.createdAt)}`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label="Documents" value={documents ? docs.length : '—'} />
          <Stat label="Chunks" value={documents ? chunkTotal : '—'} />
          <Stat label="Indexed" value={documents ? `${indexed.length}/${docs.length}` : '—'} />
        </div>
        {(pending > 0 || failed > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
            {pending > 0 && (
              <span className="flex items-center gap-1.5 text-accent">
                <Loader2 size={12} className="animate-spin" /> Indexing {pending}{' '}
                {pending === 1 ? 'document' : 'documents'}
              </span>
            )}
            {failed > 0 && (
              <span className="flex items-center gap-1.5 text-danger">
                <XCircle size={12} /> {failed} failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload documents"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl px-6 py-7 text-center cursor-pointer transition-colors ${
          dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40 hover:bg-surface/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-11 h-11 rounded-xl bg-accent/10 mx-auto flex items-center justify-center mb-3">
          {progress ? (
            <Loader2 size={22} className="text-accent animate-spin" />
          ) : (
            <UploadCloud size={22} className="text-accent" />
          )}
        </div>
        <p className="text-sm text-ink font-medium truncate">
          {progress ? `Uploading ${progress.name}` : 'Drop files here or click to browse'}
        </p>
        <p className="text-xs text-ink-faint mt-1">
          {progress ? `${progress.current} of ${progress.total}` : 'You can select several files at once'}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-4">
          {FORMAT_CHIPS.map((f) => (
            <span
              key={f}
              className="text-[10px] font-mono text-ink-dim border border-border bg-surface2 rounded px-1.5 py-0.5"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <p className="text-xs text-danger">{error}</p>
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-danger shrink-0">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="flex items-start justify-between gap-2 bg-warn/10 border border-warn/30 rounded-lg px-3 py-2">
          <div className="text-xs text-warn space-y-0.5 min-w-0">
            <p className="font-medium">
              Skipped {skipped.length === 1 ? '1 duplicate' : `${skipped.length} duplicates`}
            </p>
            {skipped.map((message) => (
              <p key={message} className="break-words">
                {message}
              </p>
            ))}
          </div>
          <button onClick={() => setSkipped([])} aria-label="Dismiss duplicates notice" className="text-warn shrink-0">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Document list */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="eyebrow">Documents</p>
          {docs.length > 4 && (
            <div className="relative w-40">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                className="input-field text-xs py-1.5 pl-7"
                placeholder="Filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter documents"
              />
            </div>
          )}
        </div>

        {documents === null && (
          <div className="space-y-2" aria-label="Loading documents">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-surface2/60 border border-border animate-pulseSoft" />
            ))}
          </div>
        )}

        {documents !== null && docs.length === 0 && (
          <div className="card p-4">
            <p className="text-sm font-medium mb-1">No documents yet</p>
            <p className="text-xs text-ink-faint mb-3">Upload your first file above. Tips for better answers:</p>
            <ul className="space-y-2">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 text-xs text-ink-dim leading-relaxed">
                  <Lightbulb size={13} className="text-warn shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {docs.length > 0 && visibleDocs.length === 0 && (
          <p className="text-xs text-ink-faint py-3">No documents match &ldquo;{filter}&rdquo;</p>
        )}

        <div className="space-y-2">
          {visibleDocs.map((doc) => (
            <DocumentRow
              key={doc._id}
              doc={doc}
              deleting={deletingId === doc._id}
              onDelete={() => handleDelete(doc._id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface2/70 border border-border rounded-lg px-3 py-2">
      <p className="font-display font-semibold text-lg leading-tight">{value}</p>
      <p className="text-[11px] text-ink-faint">{label}</p>
    </div>
  );
}

function DocumentRow({ doc, deleting, onDelete }) {
  const status = STATUS_STYLES[doc.status] || STATUS_STYLES.queued;
  const StatusIcon = status.icon;
  const meta = [
    formatBytes(doc.sizeBytes),
    doc.pageCount ? `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}` : null,
    doc.status === 'indexed' ? `${doc.chunkCount} ${doc.chunkCount === 1 ? 'chunk' : 'chunks'}` : null,
    timeAgo(doc.createdAt),
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-3 bg-surface2/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent/30 transition-colors">
      <span
        className={`text-[10px] font-mono font-semibold border rounded w-11 py-1 text-center shrink-0 ${
          TYPE_STYLES[doc.fileType] || TYPE_STYLES.text
        }`}
      >
        {fileExtension(doc.originalName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink truncate" title={doc.originalName}>
          {doc.originalName}
        </p>
        {doc.status === 'failed' ? (
          <p className="text-[11px] text-danger truncate" title={doc.errorMessage || ''}>
            {doc.errorMessage || 'Failed to process'}
          </p>
        ) : (
          <p className="text-[11px] text-ink-faint truncate">{meta.join(' · ')}</p>
        )}
      </div>
      <span
        className={`flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 shrink-0 ${status.className}`}
      >
        <StatusIcon size={11} className={status.spin ? 'animate-spin' : ''} />
        {status.label}
      </span>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="text-ink-faint hover:text-danger transition-colors shrink-0 p-1"
        aria-label={`Delete ${doc.originalName}`}
        title="Delete document"
      >
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}
