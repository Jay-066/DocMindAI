/**
 * Lightweight BM25 implementation, no external service required.
 * One index is kept per collection in memory, keyed by collectionId.
 * Each index entry maps a chunkId -> tokenized text, plus the doc-frequency
 * stats needed for scoring. Indexes are rebuilt from MongoDB on server
 * start (see rebuildAllIndexes) and updated incrementally on ingestion.
 */

const K1 = 1.5;
const B = 0.75;

// collectionId -> { chunks: Map(chunkId -> {tokens, length}), df: Map(term->count), N, avgLen }
const indexes = new Map();

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function getOrCreateIndex(collectionId) {
  const key = collectionId.toString();
  if (!indexes.has(key)) {
    indexes.set(key, {
      chunks: new Map(),
      df: new Map(),
      N: 0,
      totalLen: 0,
    });
  }
  return indexes.get(key);
}

function addChunkToBM25Index(collectionId, chunkId, text) {
  const idx = getOrCreateIndex(collectionId);
  const tokens = tokenize(text);
  const key = chunkId.toString();

  if (idx.chunks.has(key)) return; // already indexed

  const termFreq = new Map();
  for (const t of tokens) termFreq.set(t, (termFreq.get(t) || 0) + 1);

  idx.chunks.set(key, { termFreq, length: tokens.length });
  idx.N += 1;
  idx.totalLen += tokens.length;

  for (const term of termFreq.keys()) {
    idx.df.set(term, (idx.df.get(term) || 0) + 1);
  }
}

function removeDocumentFromBM25Index(collectionId, documentChunkIds, clearAll = false) {
  const key = collectionId.toString();
  if (clearAll) {
    indexes.delete(key);
    return;
  }
  const idx = indexes.get(key);
  if (!idx || !documentChunkIds) return;

  for (const chunkId of documentChunkIds) {
    const ck = chunkId.toString();
    const entry = idx.chunks.get(ck);
    if (!entry) continue;
    for (const term of entry.termFreq.keys()) {
      const df = idx.df.get(term) || 1;
      if (df <= 1) idx.df.delete(term);
      else idx.df.set(term, df - 1);
    }
    idx.totalLen -= entry.length;
    idx.N -= 1;
    idx.chunks.delete(ck);
  }
}

/**
 * Returns top-K { chunkId, score } for the given query within a collection.
 */
function searchBM25(collectionId, query, topK = 20) {
  const idx = indexes.get(collectionId.toString());
  if (!idx || idx.N === 0) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const avgLen = idx.totalLen / idx.N || 1;
  const scores = [];

  for (const [chunkId, entry] of idx.chunks.entries()) {
    let score = 0;
    for (const term of queryTerms) {
      const tf = entry.termFreq.get(term);
      if (!tf) continue;
      const df = idx.df.get(term) || 0;
      if (df === 0) continue;

      const idf = Math.log(1 + (idx.N - df + 0.5) / (df + 0.5));
      const numerator = tf * (K1 + 1);
      const denominator = tf + K1 * (1 - B + B * (entry.length / avgLen));
      score += idf * (numerator / denominator);
    }
    if (score > 0) scores.push({ chunkId, score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

function getIndexStats(collectionId) {
  const idx = indexes.get(collectionId.toString());
  if (!idx) return { indexed: 0 };
  return { indexed: idx.N };
}

module.exports = {
  addChunkToBM25Index,
  removeDocumentFromBM25Index,
  searchBM25,
  getIndexStats,
};
