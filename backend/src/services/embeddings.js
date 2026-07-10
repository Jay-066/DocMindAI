const config = require('../config/env');
const { getCohereClient } = require('./aiClients');

const BATCH_SIZE = 96; // Cohere embed API batch limit is generous, keep well under it

/**
 * Embeds an array of document chunk texts. Uses input_type "search_document"
 * so Cohere optimizes the vectors for being retrieved against later.
 */
async function embedDocuments(texts) {
  if (!texts || texts.length === 0) return [];
  const cohere = getCohereClient();

  const allEmbeddings = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await cohere.embed({
      texts: batch,
      model: config.cohere.embedModel,
      inputType: 'search_document',
    });
    allEmbeddings.push(...response.embeddings);
  }
  return allEmbeddings;
}

/**
 * Embeds a single search query. Uses input_type "search_query" which
 * Cohere's v3 embedding models use to asymmetrically optimize retrieval.
 */
async function embedQuery(query) {
  const cohere = getCohereClient();
  const response = await cohere.embed({
    texts: [query],
    model: config.cohere.embedModel,
    inputType: 'search_query',
  });
  return response.embeddings[0];
}

module.exports = { embedDocuments, embedQuery };
