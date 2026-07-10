const mongoose = require('mongoose');

const chatEvalLogSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },

    question: { type: String, required: true },
    answer: { type: String, required: true },
    contexts: { type: [String], default: [] },

    faithfulness: { type: Number, required: true },
    answerRelevancy: { type: Number, required: true },
    contextPrecision: { type: Number, required: true },
    contextRecall: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatEvalLog', chatEvalLogSchema);