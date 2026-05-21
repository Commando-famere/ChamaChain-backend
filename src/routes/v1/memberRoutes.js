const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const memberController = require('../../controllers/memberController');

// All member routes require authentication
router.use(verifyToken);

// Get all members (chairperson only)
router.get('/chamas/:chamaId/members/all', memberController.getAllMembers);

// Update member role (chairperson only)
router.put('/chamas/:chamaId/members/:memberId/role', memberController.updateMemberRole);

// Remove member (chairperson only)
router.delete('/chamas/:chamaId/members/:memberId', memberController.removeMember);

// Get member details
router.get('/chamas/:chamaId/members/:memberId', memberController.getMemberDetails);

module.exports = router;
