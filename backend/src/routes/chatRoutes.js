const express = require('express');
const {
  streamChat,
  listConversations,
  getConversation,
  deleteConversation,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

router.post('/stream', asyncHandler(streamChat));
router.get('/conversations', asyncHandler(listConversations));
router.get('/conversations/:id', asyncHandler(getConversation));
router.delete('/conversations/:id', asyncHandler(deleteConversation));

module.exports = router;
