const mongoose = require('mongoose');

/**
 * Chunk text + metadata is kept here in MongoDB (source of truth, and
 * what the local BM25 index is built from). The dense vector itself is
 * stored in ChromaDB under the same id (this document's _id as string),
 * so the two stores stay in lockstep via a shared id.
 */
const chunkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    text: { type: String, required: true },
    chunkIndex: { type: Number, required: true },

    // Where this chunk came from, for citation + source highlighting
    sourceLabel: { type: String, default: '' }, // e.g. "Page 4" or "Slide 2" or "00:03:12"
    pageNumber: { type: Number, default: null },
    slideNumber: { type: Number, default: null },
    sheetName: { type: String, default: null },
    timestampStart: { type: Number, default: null }, // seconds, for audio/video
    timestampEnd: { type: Number, default: null },

    embedded: { type: Boolean, default: false },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

chunkSchema.index({ collection: 1 });
chunkSchema.index({ document: 1 });

module.exports = mongoose.model('Chunk', chunkSchema);
