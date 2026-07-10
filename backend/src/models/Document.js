const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },

    originalName: { type: String, required: true },
    storedPath: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'pptx', 'xlsx', 'image', 'audio', 'video'],
      required: true,
    },
    mimeType: { type: String },
    sizeBytes: { type: Number },

    status: {
      type: String,
      enum: ['queued', 'processing', 'indexed', 'failed'],
      default: 'queued',
    },
    errorMessage: { type: String, default: null },

    chunkCount: { type: Number, default: 0 },
    pageCount: { type: Number, default: null },
    durationSeconds: { type: Number, default: null }, // for audio/video

    processedAt: { type: Date, default: null },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

documentSchema.index({ owner: 1, collection: 1 });
documentSchema.index({ status: 1 });

module.exports = mongoose.model('Document', documentSchema);
