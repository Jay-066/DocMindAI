const User = require('../models/User');
const Document = require('../models/Document');
const Collection = require('../models/Collection');
const Conversation = require('../models/Conversation');
const EvalRun = require('../models/EvalRun');

async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map((u) => u.toSafeJSON()) });
}

async function updateUserRole(req, res) {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be "user" or "admin"' });
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.role = role;
  await user.save();
  res.json({ user: user.toSafeJSON() });
}

async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  await user.deleteOne();
  res.json({ message: 'User deleted' });
}

/**
 * System-wide stats for the admin dashboard: totals across all users,
 * document processing health, and the latest eval snapshot.
 */
async function getSystemStats(req, res) {
  const [userCount, collectionCount, documentCount, conversationCount, docsByStatus, latestEval] =
    await Promise.all([
      User.countDocuments(),
      Collection.countDocuments(),
      Document.countDocuments(),
      Conversation.countDocuments(),
      Document.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      EvalRun.findOne().sort({ createdAt: -1 }).select('-caseResults'),
    ]);

  const statusBreakdown = { queued: 0, processing: 0, indexed: 0, failed: 0 };
  for (const row of docsByStatus) {
    statusBreakdown[row._id] = row.count;
  }

  res.json({
    userCount,
    collectionCount,
    documentCount,
    conversationCount,
    documentStatusBreakdown: statusBreakdown,
    latestEval,
  });
}

module.exports = { listUsers, updateUserRole, deleteUser, getSystemStats };
