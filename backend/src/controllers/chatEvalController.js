const ChatEvalLog = require('../models/ChatEvalLog');

/**
 * GET /api/eval/chat-logs
 * Query: ?page=1&limit=20&collectionId=optional
 * Returns paginated logs (most recent first), lightweight (no contexts/answer body).
 */
async function listChatEvalLogs(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = { owner: req.user._id };
    if (req.query.collectionId) filter.collection = req.query.collectionId;

    const [logs, total] = await Promise.all([
      ChatEvalLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-contexts'),
      ChatEvalLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/eval/chat-logs/average
 * Returns the running average of each metric across all of the user's logs.
 */
async function getChatEvalAverage(req, res) {
  try {
    const filter = { owner: req.user._id };
    if (req.query.collectionId) filter.collection = req.query.collectionId;

    const result = await ChatEvalLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgFaithfulness: { $avg: '$faithfulness' },
          avgAnswerRelevancy: { $avg: '$answerRelevancy' },
          avgContextPrecision: { $avg: '$contextPrecision' },
          avgContextRecall: { $avg: '$contextRecall' },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = result[0] || {
      avgFaithfulness: 0,
      avgAnswerRelevancy: 0,
      avgContextPrecision: 0,
      avgContextRecall: 0,
      count: 0,
    };
    delete stats._id;

    return res.json({ success: true, average: stats });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/eval/chat-logs/:id
 * Full detail for a single log (includes contexts + full answer).
 */
async function getChatEvalLog(req, res) {
  try {
    const log = await ChatEvalLog.findOne({ _id: req.params.id, owner: req.user._id });
    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }
    return res.json({ success: true, log });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/eval/chat-logs/:id
 */
async function deleteChatEvalLog(req, res) {
  try {
    const log = await ChatEvalLog.findOne({ _id: req.params.id, owner: req.user._id });
    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }
    await log.deleteOne();
    return res.json({ success: true, message: 'Log deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  listChatEvalLogs,
  getChatEvalAverage,
  getChatEvalLog,
  deleteChatEvalLog,
};