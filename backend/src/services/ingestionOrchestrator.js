const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const { chunkUnits } = require('./chunking');
const { embedDocuments } = require('./embeddings');
const { getOrCreateCollection } = require('../config/chroma');
const { addChunkToBM25Index } = require('./bm25');

const { parsePDF } = require('./ingestion/pdfParser');
const { parseDOCX } = require('./ingestion/docxParser');
const { parsePPTX } = require('./ingestion/pptxParser');
const { parseXLSX } = require('./ingestion/xlsxParser');
const { parseImage } = require('./ingestion/imageParser');
const { parseAudio } = require('./ingestion/audioParser');
const { parseVideo } = require('./ingestion/videoParser');

const PARSERS = {
  pdf: parsePDF,
  docx: parseDOCX,
  pptx: parsePPTX,
  xlsx: parseXLSX,
  image: parseImage,
  audio: parseAudio,
  video: parseVideo,
};

/**
 * Full ingestion pipeline for one document:
 * parse -> chunk -> embed (Cohere) -> upsert into Chroma -> add to BM25
 * -> persist Chunk records in Mongo -> mark Document as indexed.
 *
 * Runs asynchronously after upload; the Document record's `status`
 * field is how the frontend polls progress.
 */
async function ingestDocument(documentId) {
  const document = await Document.findById(documentId);
  if (!document) throw new Error('Document not found');

  document.status = 'processing';
  await document.save();

  try {
    const parser = PARSERS[document.fileType];
    if (!parser) throw new Error(`No parser registered for file type: ${document.fileType}`);

    const { units, pageCount, durationSeconds } = await parser(document.storedPath);

    if (!units || units.length === 0) {
      throw new Error('No extractable text found in this file');
    }

    const chunks = chunkUnits(units);
    if (chunks.length === 0) {
      throw new Error('Parsed content produced zero chunks');
    }

    const texts = chunks.map((c) => c.text);
    const embeddings = await embedDocuments(texts);

    const chunkDocs = await Chunk.insertMany(
      chunks.map((c) => ({
        document: document._id,
        collection: document.collection,
        owner: document.owner,
        text: c.text,
        chunkIndex: c.chunkIndex,
        sourceLabel: c.sourceLabel || '',
        pageNumber: c.pageNumber ?? null,
        slideNumber: c.slideNumber ?? null,
        sheetName: c.sheetName ?? null,
        timestampStart: c.timestampStart ?? null,
        timestampEnd: c.timestampEnd ?? null,
        embedded: true,
      }))
    );

    const chromaCollection = await getOrCreateCollection(document.collection.toString());

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
      addChunkToBM25Index(document.collection.toString(), chunkDoc._id.toString(), chunkDoc.text);
    }

    document.status = 'indexed';
    document.chunkCount = chunkDocs.length;
    document.pageCount = pageCount ?? null;
    document.durationSeconds = durationSeconds ?? null;
    document.processedAt = new Date();
    document.errorMessage = null;
    await document.save();

    return { chunkCount: chunkDocs.length };
  } catch (err) {
    document.status = 'failed';
    document.errorMessage = err.message;
    await document.save();
    throw err;
  }
}

module.exports = { ingestDocument };
