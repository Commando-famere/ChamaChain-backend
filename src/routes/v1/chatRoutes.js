const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');

router.use(verifyToken);
router.get('/conversations', (req, res) => {
    res.json({ success: true, data: [] });
});

module.exports = router;
