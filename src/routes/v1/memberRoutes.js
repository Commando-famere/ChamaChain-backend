const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { requireActiveChama } = require('../../middleware/inactivityCheck');
const { getChamaMembers, updateMemberRole, removeMember, getMemberDetails } = require('../../controllers/memberController');

// All routes require authentication
router.use(verifyToken);

// Get all members of a chama
router.get('/:chamaId', getChamaMembers);

// Get single member details
router.get('/:chamaId/:memberId', getMemberDetails);

// Update member role (chairperson only)
router.put('/:chamaId/:memberId/role', updateMemberRole);

// Remove member (chairperson only)
router.delete('/:chamaId/:memberId', removeMember);

// Invite member (requires active chama)
router.post('/:chamaId/invite', requireActiveChama, (req, res) => {
    // This should call invite controller
    res.json({ success: true, message: 'Invite endpoint' });
});

module.exports = router;
