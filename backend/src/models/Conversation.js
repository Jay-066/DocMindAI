const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema(
  {
    chunkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' },
    documentName: { type: String },
    sourceLabel: { type: String },
    snippet: { type: String },
    score: { type: Number },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    citations: { type: [citationSchema], default: [] },
    eval: {
      faithfulness: { type: Number, default: null },
      answerRelevancy: { type: Number, default: null },
      contextPrecision: { type: Number, default: null },
      contextRecall: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
    title: { type: String, default: 'New conversation' },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

conversationSchema.index({ owner: 1, collection: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
