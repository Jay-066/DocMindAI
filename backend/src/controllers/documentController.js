const fs = require('fs');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const Collection = require('../models/Collection');
const { resolveFileType } = require('../middleware/upload');
const { ingestDocument } = require('../services/ingestionOrchestrator');
const { removeDocumentFromBM25Index } = require('../services/bm25');
const { getOrCreateCollection } = require('../config/chroma');

async function uploadDocument(req, res) {
  const { collectionId } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  if (!collectionId) {
    return res.status(400).json({ error: 'collectionId is required' });
  }

  const collection = await Collection.findOne({ _id: collectionId, owner: req.user._id });
  if (!collection) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Collection not found' });
  }

  const fileType = resolveFileType(req.file.originalname);
  if (!fileType) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  const document = await Document.create({
    owner: req.user._id,
    collection: collection._id,
    originalName: req.file.originalname,
    storedPath: req.file.path,
    fileType,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    status: 'queued',
  });

  collection.documentCount += 1;
  await collection.save();

  // Fire ingestion asynchronously; client polls GET /documents/:id for status
  ingestDocument(document._id).catch((err) => {
    console.error(`[ingestion] failed for document ${document._id}:`, err.message);
  });

  res.status(202).json({ document, message: 'Upload received, processing started' });
}

async function listDocuments(req, res) {
  const { collectionId } = req.query;
  const filter = { owner: req.user._id };
  if (collectionId) filter.collection = collectionId;

  const documents = await Document.find(filter).sort({ createdAt: -1 });
  res.json({ documents });
}

async function getDocumentStatus(req, res) {
  const document = await Document.findOne({ _id: req.params.id, owner: req.user._id });
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ document });
}

async function deleteDocument(req, res) {
  const document = await Document.findOne({ _id: req.params.id, owner: req.user._id });
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const chunks = await Chunk.find({ document: document._id }, '_id');
  const chunkIds = chunks.map((c) => c._id.toString());

  if (chunkIds.length > 0) {
    const chromaCollection = await getOrCreateCollection(document.collection.toString());
    await chromaCollection.delete({ ids: chunkIds });
    removeDocumentFromBM25Index(document.collection.toString(), chunkIds, false);
  }

  await Chunk.deleteMany({ document: document._id });

  if (fs.existsSync(document.storedPath)) {
    fs.unlinkSync(document.storedPath);
  }

  const collection = await Collection.findById(document.collection);
  if (collection) {
    collection.documentCount = Math.max(0, collection.documentCount - 1);
    collection.chunkCount = Math.max(0, collection.chunkCount - document.chunkCount);
    await collection.save();
  }

  await document.deleteOne();
  res.json({ message: 'Document deleted' });
}

module.exports = { uploadDocument, listDocuments, getDocumentStatus, deleteDocument };
