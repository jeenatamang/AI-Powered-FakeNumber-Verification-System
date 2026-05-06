const express = require('express');
const { getWeeklyStats } = require('../controllers/analytics.controller');
const { protect } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/roleCheck');

const router = express.Router();
router.use(protect, restrictTo('admin'));
router.get('/weekly', getWeeklyStats);

module.exports = router;