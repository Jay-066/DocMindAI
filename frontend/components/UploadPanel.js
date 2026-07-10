'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Sheet,
  Presentation,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';

const TYPE_ICONS = {
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
  xlsx: Sheet,
  image: ImageIcon,
  audio: Music,
  video: Video,
};

const STATUS_STYLES = {
  queued: { color: 'text-ink-faint', icon: Loader2, spin: true },
  processing: { color: 'text-accent', icon: Loader2, spin: true },
  indexed: { color: 'text-eval-faithfulness', icon: CheckCircle2, spin: false },
  failed: { color: 'text-danger', icon: XCircle, spin: false },
};

export default function UploadPanel({ collectionId }) {
  const [documents, setDocuments] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const loadDocuments = useCallback(async () => {
    if (!collectionId) return;
    try {
      const { documents: docs } = await api.listDocuments(collectionId);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
  }, [collectionId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Poll while any document is still queued/processing
  useEffect(() => {
    const hasPending = documents.some((d) => d.status === 'queued' || d.status === 'processing');
    if (hasPending) {
      pollRef.current = setInterval(loadDocuments, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [documents, loadDocuments]);

  async function handleFiles(files) {
    if (!collectionId || !files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(file, collectionId);
      }
      await loadDocuments();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId, e) {
    e.stopPropagation();
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

  return (
    <div className="space-y-4">
      <div
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
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.pptx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.mp4,.mov,.webm"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <UploadCloud size={28} className="mx-auto text-accent mb-2" />
        <p className="text-sm text-ink-dim">
          {uploading ? 'Uploading...' : 'Drag files here or click to browse'}
        </p>
        <p className="text-xs text-ink-faint mt-1">
          PDF · DOCX · PPTX · XLSX · Images (OCR) · Audio · Video
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <p className="text-xs text-danger truncate pr-2">{error}</p>
          <button onClick={() => setError(null)} className="text-danger shrink-0">
            <XCircle size={14} />
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {documents.map((doc) => {
          const Icon = TYPE_ICONS[doc.fileType] || FileText;
          const statusStyle = STATUS_STYLES[doc.status] || STATUS_STYLES.queued;
          const StatusIcon = statusStyle.icon;
          const isDeleting = deletingId === doc._id;

          return (
            <div key={doc._id} className="flex items-center gap-3 bg-surface2 rounded-lg px-3 py-2.5">
              <Icon size={16} className="text-ink-faint shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{doc.originalName}</p>
                <p className="text-xs text-ink-faint">
                  {doc.status === 'indexed' && `${doc.chunkCount} chunks indexed`}
                  {doc.status === 'failed' && (doc.errorMessage || 'Failed to process')}
                  {(doc.status === 'queued' || doc.status === 'processing') && 'Processing...'}
                </p>
              </div>
              <StatusIcon
                size={16}
                className={`shrink-0 ${statusStyle.color} ${statusStyle.spin ? 'animate-spin' : ''}`}
              />
              <button
                onClick={(e) => handleDelete(doc._id, e)}
                disabled={isDeleting}
                className="text-ink-faint hover:text-danger transition-colors shrink-0 p-1"
                title="Delete document"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}