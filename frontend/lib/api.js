const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'docmind_token';

// "Remember me" keeps the token in localStorage so it survives closing the browser;
// otherwise it goes in sessionStorage, which the browser clears when the session ends.
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token, remember = true) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

/**
 * Fired when the backend rejects a stored token (expired, user deleted, or
 * JWT_SECRET changed). AuthProvider listens for it and drops the session,
 * so protected pages redirect to /login instead of failing on every call.
 */
const UNAUTHORIZED_EVENT = 'docmind:unauthorized';

function handleUnauthorized() {
  setToken(null);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

// fetch() rejects with a bare "Failed to fetch" when the server can't be reached at all
// (down, restarting, or the connection dropped mid-request); say that in plain words.
const UNREACHABLE_MESSAGE =
  "Couldn't reach the DocMind server. Check that the backend is running, then try again.";

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // /auth/* 401s are wrong-password or the initial session check, handled by their callers
    if (res.status === 401 && token && !path.startsWith('/auth/')) handleUnauthorized();
    const err = new Error(data.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  googleLogin: (payload) => request('/auth/google', { method: 'POST', body: payload }),
  getAuthConfig: () => request('/auth/config'),
  me: () => request('/auth/me'),

  // Collections
  listCollections: () => request('/collections'),
  createCollection: (payload) => request('/collections', { method: 'POST', body: payload }),
  getCollection: (id) => request(`/collections/${id}`),
  deleteCollection: (id) => request(`/collections/${id}`, { method: 'DELETE' }),

  // Documents
  listDocuments: (collectionId) =>
    request(`/documents${collectionId ? `?collectionId=${collectionId}` : ''}`),
  uploadDocument: (file, collectionId) => {
    const form = new FormData();
    form.append('file', file);
    form.append('collectionId', collectionId);
    return request('/documents/upload', { method: 'POST', body: form, isForm: true });
  },
  getDocument: (id) => request(`/documents/${id}`),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  // Conversations
  listConversations: (collectionId) =>
    request(`/chat/conversations${collectionId ? `?collectionId=${collectionId}` : ''}`),
  getConversation: (id) => request(`/chat/conversations/${id}`),
  deleteConversation: (id) => request(`/chat/conversations/${id}`, { method: 'DELETE' }),

  // Eval
  triggerEval: (collectionId) => request('/eval/run', { method: 'POST', body: { collectionId } }),
  listEvalRuns: () => request('/eval/runs'),
  getEvalRun: (id) => request(`/eval/runs/${id}`),
  getLatestEval: () => request('/eval/latest'),
  deleteEvalRun: (id) => request(`/eval/runs/${id}`, { method: 'DELETE' }),

  // Admin
  listUsers: () => request('/admin/users'),
  updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  getSystemStats: () => request('/admin/stats'),

  // Public (no auth required - used on landing page)
  getPublicStats: () => request('/public/stats'),
};

/**
 * Streams a chat response via Server-Sent Events. Calls the provided
 * handlers as each event type arrives. Returns a function to abort
 * the stream early.
 */
export function streamChat({ collectionId, conversationId, message }, handlers) {
  const controller = new AbortController();
  const token = getToken();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ collectionId, conversationId, message }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 && token) handleUnauthorized();
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      if (!res.body) throw new Error('No response stream available');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.split('\n');
          let eventType = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            if (line.startsWith('data: ')) data = line.slice(6);
          }
          try {
            const parsed = JSON.parse(data);
            handlers[eventType]?.(parsed);
          } catch (err) {
            // ignore malformed event
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // TypeError = network failure (server unreachable or connection dropped mid-stream)
        handlers.error?.({ error: err instanceof TypeError ? UNREACHABLE_MESSAGE : err.message });
      }
    }
  })();

  return () => controller.abort();
}

export { getToken, setToken, API_BASE, UNAUTHORIZED_EVENT };