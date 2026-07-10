const mongoose = require('mongoose');
const config = require('../config/env');
const Chunk = require('../models/Chunk');
const { embedQuery } = require('./embeddings');
const { getOrCreateCollection } = require('../config/chroma');
const { searchBM25 } = require('./bm25');
const { getCohereClient } = require('./aiClients');

/**
 * Dense vector search against ChromaDB for a given collection.
 * Returns [{ chunkId, score }] ranked by similarity (higher = better).
 */
async function denseSearch(collectionId, queryEmbedding, topK) {
  const chromaCollection = await getOrCreateCollection(collectionId.toString());
  const results = await chromaCollection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  const ids = results.ids?.[0] || [];
  const distances = results.distances?.[0] || [];

  // Chroma cosine "distance" is 1 - similarity; convert back to a similarity score
  return ids.map((id, i) => ({
    chunkId: id,
    score: 1 - (distances[i] ?? 1),
  }));
}

/**
 * Reciprocal Rank Fusion: combines two ranked lists into one ranking
 * using only rank position (not raw scores), which is robust to the
 * very different score scales of BM25 vs cosine similarity.
 * score(doc) = sum over lists of 1 / (k + rank)
 */
function reciprocalRankFusion(rankedLists, k = config.retrieval.rrfK) {
  const fused = new Map(); // chunkId -> combined score

  for (const list of rankedLists) {
    list.forEach((item, rank) => {
      const prev = fused.get(item.chunkId) || 0;
      fused.set(item.chunkId, prev + 1 / (k + rank + 1));
    });
  }

  return Array.from(fused.entries())
    .map(([chunkId, score]) => ({ chunkId, score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Reranks a shortlist of chunks against the query using Cohere's
 * cross-encoder rerank model. Returns the top N re-ordered by true
 * relevance rather than the approximate fusion score.
 */
async function rerankChunks(query, chunks, topN) {
  if (chunks.length === 0) return [];
  const cohere = getCohereClient();

  try {
    const response = await cohere.rerank({
      query,
      documents: chunks.map((c) => c.text),
      model: config.cohere.rerankModel,
      topN: Math.min(topN, chunks.length),
    });

    console.log(`[rerank] input=${chunks.length} output=${response.results.length}`);

    return response.results.map((r) => ({
      ...chunks[r.index],
      rerankScore: r.relevanceScore,
    }));
  } catch (err) {
    console.error(`[rerank] FAILED: ${err.message}`);
    throw err;
  }
}

/**
 * Full hybrid retrieval pipeline:
 * 1. Embed query, run dense search in Chroma
 * 2. Run BM25 sparse search
 * 3. Fuse both rankings with RRF
 * 4. Fetch chunk text/metadata for the fused shortlist from MongoDB
 * 5. Rerank the shortlist with Cohere's cross-encoder
 * 6. Return the final top-N chunks with full metadata + scores
 */
async function hybridRetrieve(collectionId, query) {
  const queryEmbedding = await embedQuery(query);

  const [denseResults, bm25Results] = await Promise.all([
    denseSearch(collectionId, queryEmbedding, config.retrieval.denseTopK),
    Promise.resolve(searchBM25(collectionId, query, config.retrieval.bm25TopK)),
  ]);

  console.log(
    `[retrieval] collection=${collectionId} query="${query}" dense=${denseResults.length} bm25=${bm25Results.length}`
  );

  const fused = reciprocalRankFusion([denseResults, bm25Results]);
  const shortlistIds = fused.slice(0, Math.max(config.retrieval.denseTopK, 20)).map((f) => f.chunkId);

  if (shortlistIds.length === 0) {
    console.warn(`[retrieval] EMPTY shortlist for collection=${collectionId} - both dense and BM25 returned nothing`);
    return [];
  }

  const validIds = shortlistIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  const chunkDocs = await Chunk.find({ _id: { $in: validIds } })
    .populate('document', 'originalName')
    .lean();

  console.log(
    `[retrieval] shortlistIds=${shortlistIds.length} validIds=${validIds.length} chunkDocsFound=${chunkDocs.length}`
  );

  const chunkMap = new Map(chunkDocs.map((c) => [c._id.toString(), c]));

  const shortlist = shortlistIds
    .map((id) => chunkMap.get(id))
    .filter(Boolean)
    .map((c) => ({
      chunkId: c._id.toString(),
      text: c.text,
      sourceLabel: c.sourceLabel,
      documentName: c.document?.originalName || 'Unknown document',
      pageNumber: c.pageNumber,
      slideNumber: c.slideNumber,
      sheetName: c.sheetName,
      timestampStart: c.timestampStart,
      timestampEnd: c.timestampEnd,
    }));

  const reranked = await rerankChunks(query, shortlist, config.retrieval.rerankTopN);
  console.log(`[retrieval] FINAL reranked chunks returned=${reranked.length}`);
  return reranked;
}

module.exports = { hybridRetrieve, denseSearch, reciprocalRankFusion, rerankChunks };
