const express = require('express');
const { lookupNumber } = require('../controllers/number.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.get('/lookup/:number', protect, lookupNumber);

module.exports = router;