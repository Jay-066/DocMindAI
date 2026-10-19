'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  AlertTriangle,
  Loader2,
  MessageSquareText,
  Info,
  SearchX,
  RefreshCw,
  Plus,
  X,
  UploadCloud,
} from 'lucide-react';
import { streamChat, api } from '@/lib/api';
import CitationList from './CitationList';
import ConfirmDialog from './ConfirmDialog';
import EvalScoreBar from './EvalScoreBar';
import MarkdownAnswer from './MarkdownAnswer';

function storageKey(collectionId) {
  return `docmind_conversation_${collectionId}`;
}

function suggestedQuestions(indexedDocs) {
  const [first, second] = indexedDocs.map((d) => d.originalName);
  if (second) {
    return [
      `Summarize ${first} in 5 bullet points`,
      `Compare ${first} and ${second}`,
      'What topics do these documents cover?',
      'List any dates, numbers, or deadlines mentioned',
    ];
  }
  return [
    `Summarize ${first} in 5 bullet points`,
    `What are the key facts and figures in ${first}?`,
    'List any dates, numbers, or deadlines mentioned',
    `Explain the main ideas of ${first} in simple terms`,
  ];
}

/**
 * documents: the active collection's documents from UploadPanel (null while loading),
 * used to show the right empty state and only allow questions once something is indexed.
 */
export default function ChatPanel({ collection, documents, onRefresh }) {
  const collectionId = collection?._id;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingSources, setPendingSources] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [confirmingNewChat, setConfirmingNewChat] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [newChatError, setNewChatError] = useState(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingSources]);

  // When the collection changes (or on first mount), try to restore the
  // last conversation for THIS collection from localStorage + backend,
  // instead of always starting blank. This is what keeps chat visible
  // across navigating to Home/Evaluation and back.
  // quiet: used by the Refresh button; keeps the current messages on screen while reloading
  // and rethrows connection errors so the caller can report them.
  const restoreConversation = useCallback(async ({ quiet = false } = {}) => {
    if (!collectionId) {
      setMessages([]);
      setConversationId(null);
      return;
    }

    const savedConvId = localStorage.getItem(storageKey(collectionId));
    if (!savedConvId) {
      setMessages([]);
      setConversationId(null);
      return;
    }

    if (!quiet) setLoadingHistory(true);
    try {
      const { conversation } = await api.getConversation(savedConvId);
      setConversationId(conversation._id);
      setMessages(
        conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
          citations: m.citations || [],
          eval: m.eval || {},
          kind: m.kind || 'answer',
          isStreaming: false,
        }))
      );
    } catch (err) {
      // No HTTP status means the server wasn't reached: keep the saved conversation for next time
      if (!err.status) {
        if (quiet) throw err;
        return;
      }
      // The server says it no longer exists or isn't accessible - start fresh
      localStorage.removeItem(storageKey(collectionId));
      setMessages([]);
      setConversationId(null);
    } finally {
      if (!quiet) setLoadingHistory(false);
    }
  }, [collectionId]);

  useEffect(() => {
    restoreConversation();
  }, [restoreConversation]);

  function handleSend(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function sendMessage(text) {
    if (!text.trim() || !collectionId || isStreaming) return;

    const userMessage = { role: 'user', content: text, citations: [] };
    const assistantMessage = {
      role: 'assistant',
      content: '',
      citations: [],
      eval: {},
      warning: null,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setPendingSources(null);
    setIsStreaming(true);

    const query = text;
    setInput('');

    abortRef.current = streamChat(
      { collectionId, conversationId, message: query },
      {
        sources: ({ chunks }) => setPendingSources(chunks),
        token: ({ delta }) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: next[next.length - 1].content + delta,
            };
            return next;
          });
        },
        citations: ({ citations, warning, kind }) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], citations, warning, kind };
            return next;
          });
          setPendingSources(null);
        },
        done: ({ conversationId: newConvId }) => {
          setConversationId(newConvId);
          localStorage.setItem(storageKey(collectionId), newConvId);
          setIsStreaming(false);
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], isStreaming: false };
            return next;
          });
          // Poll once for live eval scores shortly after stream completes
          setTimeout(() => pollLatestEval(newConvId), 2500);
        },
        error: ({ error }) => {
          setIsStreaming(false);
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: next[next.length - 1].content || `Error: ${error}`,
              isStreaming: false,
            };
            return next;
          });
        },
      }
    );
  }

  async function pollLatestEval(convId) {
    try {
      const { api } = await import('@/lib/api');
      const { conversation } = await api.getConversation(convId);
      const lastMsg = conversation.messages[conversation.messages.length - 1];
      if (lastMsg?.eval) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], eval: lastMsg.eval };
          return next;
        });
      }
    } catch (err) {
      // eval polling is best-effort, safe to ignore failures
    }
  }

  // Re-fetch without a page reload: this conversation (picks up quality scores that finished after
  // the answer) plus, via onRefresh, the documents panel and collection counts.
  async function handleRefresh() {
    if (refreshing || isStreaming) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      await Promise.all([restoreConversation({ quiet: true }), onRefresh?.()]);
    } catch (err) {
      setRefreshError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  const closeNewChatDialog = useCallback(() => {
    setConfirmingNewChat(false);
    setNewChatError(null);
  }, []);

  // Confirmed in the dialog: delete the current conversation on the server, then start fresh
  async function startNewChat() {
    setDeletingChat(true);
    setNewChatError(null);
    try {
      if (conversationId) {
        try {
          await api.deleteConversation(conversationId);
        } catch (err) {
          if (err.status !== 404) throw err; // already gone is fine
        }
      }
      localStorage.removeItem(storageKey(collectionId));
      setConversationId(null);
      setMessages([]);
      setPendingSources(null);
      setConfirmingNewChat(false);
    } catch (err) {
      setNewChatError(`Couldn't delete this conversation: ${err.message}`);
    } finally {
      setDeletingChat(false);
    }
  }

  if (!collectionId) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-faint text-sm">
        Select or create a collection to start chatting with your documents.
      </div>
    );
  }

  const docs = documents || [];
  const indexedDocs = docs.filter((d) => d.status === 'indexed');
  const pendingCount = docs.filter((d) => d.status === 'queued' || d.status === 'processing').length;
  const docState =
    documents === null
      ? 'loading'
      : docs.length === 0
        ? 'empty'
        : indexedDocs.length > 0
          ? 'ready'
          : pendingCount > 0
            ? 'indexing'
            : 'failed';
  const canAsk = docState === 'ready';
  const questionCount = messages.filter((m) => m.role === 'user').length;
  const placeholder = {
    loading: 'Loading documents...',
    empty: 'Upload a document to start asking questions',
    indexing: 'Waiting for your documents to finish indexing...',
    failed: 'Upload a document that can be indexed to start asking',
    ready: `Ask a question about ${collection.name}...`,
  }[docState];

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      <div className="border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Chat</p>
          <p className="text-sm text-ink truncate">{collection.name}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {documents !== null && (
            <span className="hidden sm:inline text-[11px] font-mono text-ink-faint">
              {indexedDocs.length} of {docs.length} {docs.length === 1 ? 'doc' : 'docs'} searchable
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing || isStreaming}
            aria-label="Refresh chat and documents"
            title="Refresh"
            className="w-8 h-8 rounded-lg border border-border text-ink-dim hover:text-ink hover:bg-surface2 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setConfirmingNewChat(true)}
            disabled={messages.length === 0 || isStreaming}
            title={messages.length === 0 ? 'This chat is already empty' : 'Start a new chat'}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <Plus size={14} /> New chat
          </button>
        </div>
      </div>

      {refreshError && (
        <div className="mx-6 mt-3 flex items-start justify-between gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
          <p className="text-xs text-danger">Refresh failed: {refreshError}</p>
          <button onClick={() => setRefreshError(null)} aria-label="Dismiss" className="text-danger shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingNewChat}
        title="Start a new chat?"
        message={`Your current conversation (${
          questionCount === 1 ? '1 question and its answer' : `${questionCount} questions and their answers`
        }) will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete and start new"
        busy={deletingChat}
        error={newChatError}
        onConfirm={startNewChat}
        onCancel={closeNewChatDialog}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {loadingHistory && (
          <div className="h-full flex items-center justify-center text-ink-faint text-sm gap-2">
            <Loader2 size={14} className="animate-spin" /> Restoring conversation...
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <ChatEmptyState
            collection={collection}
            docState={docState}
            indexedDocs={indexedDocs}
            pendingCount={pendingCount}
            onAsk={sendMessage}
          />
        )}

        {!loadingHistory &&
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {pendingSources && (
          <div className="flex items-center gap-2 text-xs text-ink-faint font-mono pl-1">
            <Loader2 size={12} className="animate-spin" />
            retrieved {pendingSources.length} sources — generating answer...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            className="input-field"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming || !canAsk}
            aria-label="Ask a question"
          />
          <button
            type="submit"
            disabled={isStreaming || !canAsk || !input.trim()}
            className="btn-primary shrink-0"
            aria-label="Send question"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[11px] text-ink-faint mt-2">
          Answers come only from the documents in this collection and cite their sources.
        </p>
      </form>
    </div>
  );
}

function ChatEmptyState({ collection, docState, indexedDocs, pendingCount, onAsk }) {
  return (
    <div className="max-w-2xl mx-auto py-4 animate-slideUp">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <Sparkles size={24} className="text-accent" />
        </div>
        <h2 className="font-display text-2xl font-semibold mb-2 break-words">
          Ask anything about {collection.name}
        </h2>
        <p className="text-ink-dim text-sm max-w-md mx-auto">
          Answers are grounded in the documents in this collection, with inline citations you can
          check.
        </p>
      </div>

      {docState === 'loading' && (
        <div className="flex justify-center text-ink-faint">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}

      {docState === 'empty' && (
        <StatusCard
          icon={<UploadCloud size={18} className="text-accent" />}
          title="Upload a document to get started"
          desc="Add a PDF, Word document, or text file in the Documents panel. Suggested questions will appear here once it is indexed."
        />
      )}

      {docState === 'indexing' && (
        <StatusCard
          icon={<Loader2 size={18} className="text-accent animate-spin" />}
          title={`Indexing ${pendingCount} ${pendingCount === 1 ? 'document' : 'documents'}`}
          desc="Suggested questions will appear here as soon as indexing finishes."
        />
      )}

      {docState === 'failed' && (
        <StatusCard
          icon={<AlertTriangle size={18} className="text-danger" />}
          title="No documents could be indexed"
          desc="Check the error next to each file in the Documents panel, then upload a text-based PDF, Word document, or text file."
        />
      )}

      {docState === 'ready' && (
        <>
          <p className="eyebrow mb-3">Try asking</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {suggestedQuestions(indexedDocs).map((q) => (
              <button
                key={q}
                onClick={() => onAsk(q)}
                className="card p-4 text-left text-sm text-ink-dim hover:text-ink hover:border-accent/50 transition-colors flex gap-3"
              >
                <MessageSquareText size={16} className="text-accent shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{q}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ icon, title, desc }) {
  return (
    <div className="card border-dashed p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-surface2 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium mb-1">{title}</p>
        <p className="text-xs text-ink-faint leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

const REDIRECT_LABELS = {
  off_topic: { icon: Info, label: 'Not related to this collection' },
  not_found: { icon: SearchX, label: 'Not found in your documents' },
};

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  // Off-topic / not-found replies are a polite redirect: no citations or quality scores
  const redirect = REDIRECT_LABELS[msg.kind];
  // Set by clicking a [n] badge in the answer; highlights that source in the list below.
  // A fresh object per click so clicking the same badge again re-scrolls to it.
  const [citeFocus, setCiteFocus] = useState(null);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl ${isUser ? 'bg-accent text-white rounded-2xl rounded-tr-sm px-4 py-3' : 'w-full'}`}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className={`card p-5 ${redirect ? 'border-warn/30 bg-warn/5' : ''}`}>
            {redirect && (
              <p className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-warn mb-2">
                <redirect.icon size={13} /> {redirect.label}
              </p>
            )}
            <MarkdownAnswer
              text={msg.content}
              citations={msg.citations}
              onCiteClick={(n) => setCiteFocus({ n })}
            />
            {msg.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-accent mt-1 animate-pulseSoft align-middle" />
            )}
            {msg.warning && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-warn">
                <AlertTriangle size={13} /> {msg.warning}
              </div>
            )}
            <CitationList citations={msg.citations} highlight={citeFocus} />
            {!redirect && (
              <EvalScoreBar scores={msg.eval} loading={!msg.isStreaming && msg.content.length > 0} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}