const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { getOrCreateConversation, sendMessage, getGroupChat } = require('../../controllers/chatController');

router.use(verifyToken);

// Group chat
router.get('/chamas/:chamaId/group', getGroupChat);

// Private conversation
router.get('/chamas/:chamaId/members/:memberId/conversation', getOrCreateConversation);

// Send message
router.post('/conversations/:conversationId/messages', sendMessage);

module.exports = router;
