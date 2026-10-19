const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },

    originalName: { type: String, required: true },
    storedPath: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'text'],
      required: true,
    },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    contentHash: { type: String, default: null }, // sha256 of the file, for duplicate detection

    status: {
      type: String,
      enum: ['queued', 'processing', 'indexed', 'failed'],
      default: 'queued',
    },
    errorMessage: { type: String, default: null },

    chunkCount: { type: Number, default: 0 },
    pageCount: { type: Number, default: null },

    processedAt: { type: Date, default: null },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

documentSchema.index({ owner: 1, collection: 1 });
documentSchema.index({ collection: 1, contentHash: 1 });
documentSchema.index({ status: 1 });

module.exports = mongoose.model('Document', documentSchema);
