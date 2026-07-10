const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const EvalRun = require('../models/EvalRun');

/**
 * GET /api/public/stats
 * No authentication required - powers the landing page's live stats
 * row (Avg. Faithfulness, Documents Indexed, Avg. Context Precision,
 * Questions Answered). Pulls from the same data the Evaluation
 * dashboard uses, so the two stay consistent.
 */
async function getPublicStats(req, res) {
  const [documentCount, latestEval, conversations] = await Promise.all([
    Document.countDocuments({ status: 'indexed' }),
    EvalRun.findOne().sort({ createdAt: -1 }).select('avgFaithfulness avgContextPrecision'),
    Conversation.find({}, 'messages').lean(),
  ]);

  const questionsAnswered = conversations.reduce((total, conv) => {
    const userMessageCount = (conv.messages || []).filter((m) => m.role === 'user').length;
    return total + userMessageCount;
  }, 0);

  res.json({
    avgFaithfulness: latestEval?.avgFaithfulness ?? null,
    documentsIndexed: documentCount,
    avgContextPrecision: latestEval?.avgContextPrecision ?? null,
    questionsAnswered,
  });
}

module.exports = { getPublicStats };