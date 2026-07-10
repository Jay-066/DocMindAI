'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { streamChat, api } from '@/lib/api';
import CitationList from './CitationList';
import EvalScoreBar from './EvalScoreBar';

function storageKey(collectionId) {
  return `docmind_conversation_${collectionId}`;
}

export default function ChatPanel({ collectionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingSources, setPendingSources] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingSources]);

  // When the collection changes (or on first mount), try to restore the
  // last conversation for THIS collection from localStorage + backend,
  // instead of always starting blank. This is what keeps chat visible
  // across navigating to Home/Evaluation and back.
  const restoreConversation = useCallback(async () => {
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

    setLoadingHistory(true);
    try {
      const { conversation } = await api.getConversation(savedConvId);
      setConversationId(conversation._id);
      setMessages(
        conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
          citations: m.citations || [],
          eval: m.eval || {},
          isStreaming: false,
        }))
      );
    } catch (err) {
      // Saved conversation no longer exists/accessible - start fresh
      localStorage.removeItem(storageKey(collectionId));
      setMessages([]);
      setConversationId(null);
    } finally {
      setLoadingHistory(false);
    }
  }, [collectionId]);

  useEffect(() => {
    restoreConversation();
  }, [restoreConversation]);

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !collectionId || isStreaming) return;

    const userMessage = { role: 'user', content: input, citations: [] };
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

    const query = input;
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
        citations: ({ citations, warning }) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], citations, warning };
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

  function handleNewChat() {
    localStorage.removeItem(storageKey(collectionId));
    setConversationId(null);
    setMessages([]);
  }

  if (!collectionId) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-faint text-sm">
        Select or create a collection to start chatting with your documents.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {messages.length > 0 && (
        <div className="border-b border-border px-4 py-2 flex justify-end">
          <button
            onClick={handleNewChat}
            className="text-xs text-ink-faint hover:text-accent transition-colors"
          >
            New Chat
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {loadingHistory && (
          <div className="h-full flex items-center justify-center text-ink-faint text-sm gap-2">
            <Loader2 size={14} className="animate-spin" /> Restoring conversation...
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Sparkles size={24} className="text-accent" />
            </div>
            <p className="text-ink-dim text-sm max-w-sm">
              Ask a question about the documents in this collection. Every answer is grounded in
              your sources with inline citations.
            </p>
          </div>
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

      <form onSubmit={handleSend} className="border-t border-border p-4 flex items-center gap-3">
        <input
          className="input-field"
          placeholder="Ask a question about your documents..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()} className="btn-primary shrink-0">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl ${isUser ? 'bg-accent text-white rounded-2xl rounded-tr-sm px-4 py-3' : 'w-full'}`}>
        {isUser ? (
          <p className="text-sm">{msg.content}</p>
        ) : (
          <div className="card p-4">
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {msg.content}
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulseSoft align-middle" />
              )}
            </p>
            {msg.warning && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-warn">
                <AlertTriangle size={13} /> {msg.warning}
              </div>
            )}
            <CitationList citations={msg.citations} />
            <EvalScoreBar scores={msg.eval} loading={!msg.isStreaming && msg.content.length > 0} />
          </div>
        )}
      </div>
    </div>
  );
}