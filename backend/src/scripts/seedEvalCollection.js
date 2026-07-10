/**
 * Seeds a minimal collection + document for CI so the eval gate has
 * real indexed content to retrieve against. In real usage, you'd
 * instead point CI at a persistent "golden" collection maintained
 * alongside your eval dataset — this is a fallback so `npm run eval:ci`
 * works out of the box on a fresh database.
 *
 * Usage: node src/scripts/seedEvalCollection.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Collection = require('../models/Collection');
const Document = require('../models/Document');
const { ingestDocument } = require('../services/ingestionOrchestrator');
const { uploadDir } = require('../middleware/upload');

const SAMPLE_TEXT = `DocMind AI Sample Document

This is a sample document seeded for CI evaluation purposes.
DocMind AI is a production-grade multimodal retrieval-augmented generation system.
It supports hybrid retrieval combining BM25 sparse search with dense vector search from ChromaDB, fused using Reciprocal Rank Fusion.
Retrieved chunks are reranked using Cohere's cross-encoder reranking model before being passed to the language model.
The system enforces citations: every claim in a generated answer must reference a numbered source.
Answer quality is evaluated automatically using four metrics: faithfulness, answer relevancy, context precision, and context recall.
A CI pipeline gates merges on these evaluation scores staying above configured thresholds.
Supported document types include PDF, DOCX, PPTX, XLSX, images via OCR, and audio or video via transcription.
Known limitations include reliance on third-party APIs for embeddings, reranking, and generation, and the eval dataset currently being generic rather than domain-specific.
`;

async function main() {
  await mongoose.connect(config.mongoUri);

  let user = await User.findOne({ email: 'ci@docmind.ai' });
  if (!user) {
    user = await User.create({ name: 'CI Runner', email: 'ci@docmind.ai', password: 'ci_password_123', role: 'admin' });
  }

  let collection = await Collection.findOne({ owner: user._id, name: 'CI Eval Collection' });
  if (!collection) {
    collection = await Collection.create({
      name: 'CI Eval Collection',
      description: 'Auto-seeded collection for CI-gated evaluation',
      owner: user._id,
    });
  }

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const sampleFilePath = path.join(uploadDir, 'ci_sample_document.txt');
  fs.writeFileSync(sampleFilePath, SAMPLE_TEXT);

  // Reuse the DOCX-style plain-text path by writing directly as a
  // "document" record; since our parsers expect real file formats,
  // we bypass parsing here and insert pre-chunked content directly
  // via the ingestion orchestrator's underlying pieces would require
  // a real pptx/docx/pdf. Simplest robust approach for CI: write a
  // minimal one-page PDF-free path using the docx parser's chunker
  // directly on this plain text.
  const { chunkUnits } = require('../services/chunking');
  const { embedDocuments } = require('../services/embeddings');
  const { getOrCreateCollection } = require('../config/chroma');
  const { addChunkToBM25Index } = require('../services/bm25');
  const Chunk = require('../models/Chunk');

  const existingDoc = await Document.findOne({ collection: collection._id });
  if (existingDoc) {
    console.log('[seed-eval] CI collection already has a document, skipping re-seed');
    await mongoose.disconnect();
    process.exit(0);
  }

  const document = await Document.create({
    owner: user._id,
    collection: collection._id,
    originalName: 'ci_sample_document.txt',
    storedPath: sampleFilePath,
    fileType: 'docx', // treated as generic text for chunking purposes
    mimeType: 'text/plain',
    sizeBytes: Buffer.byteLength(SAMPLE_TEXT),
    status: 'processing',
  });

  const units = [{ text: SAMPLE_TEXT, sourceLabel: 'Document' }];
  const chunks = chunkUnits(units);
  const texts = chunks.map((c) => c.text);
  const embeddings = await embedDocuments(texts);

  const chunkDocs = await Chunk.insertMany(
    chunks.map((c) => ({
      document: document._id,
      collection: collection._id,
      owner: user._id,
      text: c.text,
      chunkIndex: c.chunkIndex,
      sourceLabel: c.sourceLabel || '',
    }))
  );

  const chromaCollection = await getOrCreateCollection(collection._id.toString());
  await chromaCollection.add({
    ids: chunkDocs.map((c) => c._id.toString()),
    embeddings,
    documents: texts,
    metadatas: chunkDocs.map((c) => ({
      documentId: document._id.toString(),
      documentName: document.originalName,
      sourceLabel: c.sourceLabel,
      chunkId: c._id.toString(),
    })),
  });

  for (const chunkDoc of chunkDocs) {
    addChunkToBM25Index(collection._id.toString(), chunkDoc._id.toString(), chunkDoc.text);
  }

  document.status = 'indexed';
  document.chunkCount = chunkDocs.length;
  await document.save();

  collection.documentCount = 1;
  collection.chunkCount = chunkDocs.length;
  await collection.save();

  console.log(`[seed-eval] seeded collection ${collection._id} with ${chunkDocs.length} chunks`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-eval] failed:', err.message);
  process.exit(1);
});
