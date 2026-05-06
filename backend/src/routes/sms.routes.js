const express = require('express');
const { analyzeMessage, reportMessage } = require('../controllers/sms.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.post('/analyze', protect, analyzeMessage);
router.post('/report', protect, reportMessage);

module.exports = router;