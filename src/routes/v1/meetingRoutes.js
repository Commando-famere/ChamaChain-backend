const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');

router.use(verifyToken);
router.get('/chamas/:chamaId/meetings', (req, res) => {
    res.json({ success: true, message: 'Meetings endpoint' });
});

module.exports = router;
