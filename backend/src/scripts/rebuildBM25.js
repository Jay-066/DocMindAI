const Chunk = require('../models/Chunk');
const { addChunkToBM25Index } = require('../services/bm25');

/**
 * BM25's index lives in memory (see services/bm25.js), so every time
 * the server restarts it needs to be rehydrated from the Chunk
 * documents already persisted in MongoDB. Called once at startup.
 */
async function rebuildAllIndexes() {
  console.log('[bm25] rebuilding index from MongoDB...');
  const startTime = Date.now();

  const cursor = Chunk.find({}, 'text collection').lean().cursor();
  let count = 0;

  for await (const chunk of cursor) {
    addChunkToBM25Index(chunk.collection.toString(), chunk._id.toString(), chunk.text);
    count += 1;
  }

  console.log(`[bm25] rebuilt index with ${count} chunks in ${Date.now() - startTime}ms`);
}

module.exports = { rebuildAllIndexes };
