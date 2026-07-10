const Collection = require('../models/Collection');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const Conversation = require('../models/Conversation');
const { deleteCollection: deleteChromaCollection } = require('../config/chroma');
const { removeDocumentFromBM25Index } = require('../services/bm25');
const fs = require('fs');

async function createCollection(req, res) {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Collection name is required' });
  }

  const collection = await Collection.create({
    name: name.trim(),
    description: description || '',
    owner: req.user._id,
  });

  res.status(201).json({ collection });
}

async function listCollections(req, res) {
  const collections = await Collection.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ collections });
}

async function getCollection(req, res) {
  const collection = await Collection.findOne({ _id: req.params.id, owner: req.user._id });
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  res.json({ collection });
}

async function updateCollection(req, res) {
  const { name, description } = req.body;
  const collection = await Collection.findOne({ _id: req.params.id, owner: req.user._id });
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  if (name) collection.name = name.trim();
  if (description !== undefined) collection.description = description;
  await collection.save();
  res.json({ collection });
}

async function deleteCollectionHandler(req, res) {
  const collection = await Collection.findOne({ _id: req.params.id, owner: req.user._id });
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const documents = await Document.find({ collection: collection._id });

  // Clean up uploaded files from disk
  for (const doc of documents) {
    try {
      if (fs.existsSync(doc.storedPath)) fs.unlinkSync(doc.storedPath);
    } catch (err) {
      console.warn(`[collections] failed to remove file ${doc.storedPath}: ${err.message}`);
    }
  }

  await Chunk.deleteMany({ collection: collection._id });
  await Document.deleteMany({ collection: collection._id });
  await Conversation.deleteMany({ collection: collection._id });
  await deleteChromaCollection(collection._id.toString());
  removeDocumentFromBM25Index(collection._id.toString(), null, true); // clear entire collection index
  await collection.deleteOne();

  res.json({ message: 'Collection and all associated data deleted' });
}

module.exports = {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection: deleteCollectionHandler,
};
