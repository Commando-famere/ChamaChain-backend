const express = require('express');
const router = express.Router();

router.get('/:chamaId', (req, res) => {
    res.json({ success: true, message: 'Members list endpoint', chamaId: req.params.chamaId });
});

module.exports = router;
