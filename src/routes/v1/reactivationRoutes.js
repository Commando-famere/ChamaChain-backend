const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { checkReactivationStatus, reactivateChama } = require('../../controllers/reactivationController');

// All routes require authentication
router.use(verifyToken);

// Check if chama needs reactivation
router.get('/chamas/:chamaId/status', checkReactivationStatus);

// Reactivate chama (pay KES 50)
router.post('/chamas/:chamaId/reactivate', reactivateChama);

module.exports = router;
