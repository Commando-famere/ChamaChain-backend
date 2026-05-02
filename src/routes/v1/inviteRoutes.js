const express = require('express');
const router = express.Router();
const { generateInviteLink, acceptInvite, rejectInvite } = require('../../controllers/inviteController');
const { verifyToken } = require('../../middleware/auth');

// Generate invite link (protected)
router.post('/chamas/:chamaId/invite', verifyToken, generateInviteLink);

// Accept invite (public)
router.post('/accept/:token', acceptInvite);

// Decline/Reject invite (public)
router.post('/reject/:token', rejectInvite);

module.exports = router;
