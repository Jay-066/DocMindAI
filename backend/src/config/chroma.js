const { ChromaClient } = require('chromadb');
const config = require('./env');

let client = null;

function getChromaClient() {
  if (!client) {
    client = new ChromaClient({ path: config.chroma.url });
    console.log(`[chroma] client initialized -> ${config.chroma.url}`);
  }
  return client;
}

/**
 * Chroma requires embeddings to be supplied manually (we use Cohere),
 * so every collection is created with embeddingFunction: null and we
 * pass vectors explicitly on add/query.
 */
async function getOrCreateCollection(name) {
  const c = getChromaClient();
  const fullName = `${config.chroma.collectionPrefix}_${name}`;
  const collection = await c.getOrCreateCollection({
    name: fullName,
    metadata: { 'hnsw:space': 'cosine' },
  });
  return collection;
}

async function deleteCollection(name) {
  const c = getChromaClient();
  const fullName = `${config.chroma.collectionPrefix}_${name}`;
  try {
    await c.deleteCollection({ name: fullName });
  } catch (err) {
    // Collection may not exist yet - safe to ignore
    console.warn(`[chroma] delete skipped for ${fullName}: ${err.message}`);
  }
}

async function pingChroma() {
  const c = getChromaClient();
  try {
    await c.heartbeat();
    return true;
  } catch (err) {
    console.error('[chroma] heartbeat failed:', err.message);
    return false;
  }
}

module.exports = {
  getChromaClient,
  getOrCreateCollection,
  deleteCollection,
  pingChroma,
};
