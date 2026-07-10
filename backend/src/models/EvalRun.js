const mongoose = require('mongoose');

const evalCaseResultSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    groundTruth: { type: String, default: '' },
    contexts: { type: [String], default: [] },
    faithfulness: { type: Number, required: true },
    answerRelevancy: { type: Number, required: true },
    contextPrecision: { type: Number, required: true },
    contextRecall: { type: Number, required: true },
  },
  { _id: false }
);

const evalRunSchema = new mongoose.Schema(
  {
    triggeredBy: { type: String, enum: ['manual', 'ci'], default: 'manual' },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null },

    // Aggregate scores (averages across all cases)
    avgFaithfulness: { type: Number, required: true },
    avgAnswerRelevancy: { type: Number, required: true },
    avgContextPrecision: { type: Number, required: true },
    avgContextRecall: { type: Number, required: true },

    passed: { type: Boolean, required: true },
    thresholds: {
      faithfulness: Number,
      answerRelevancy: Number,
      contextPrecision: Number,
      contextRecall: Number,
    },

    caseResults: { type: [evalCaseResultSchema], default: [] },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

module.exports = mongoose.model('EvalRun', evalRunSchema);
