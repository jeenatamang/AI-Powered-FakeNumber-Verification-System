// backend/src/routes/admin.routes.js
const express = require('express');
const {
  getPendingMessages,
  reviewPendingMessage,
  getDashboardStats,
  getCommunityStats,
  getSpamNumbers,
} = require('../controllers/admin.controller');
const { protect } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/roleCheck');

const router = express.Router();

// ── Public (any logged-in user) — for mobile home screen ──────────────────
router.get('/community-stats', protect, getCommunityStats);

// ── Admin-only routes ──────────────────────────────────────────────────────
router.get('/stats',                              protect, restrictTo('admin'), getDashboardStats);
router.get('/pending-messages',                   protect, restrictTo('admin'), getPendingMessages);
router.patch('/pending-messages/:id/review',      protect, restrictTo('admin'), reviewPendingMessage);
router.get('/spam-numbers',                       protect, restrictTo('admin'), getSpamNumbers);

router.get('/reports', async (req, res) => {
  try {
    const Report = require('../models/Report');
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Report.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Report.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/spam-numbers/:id', async (req, res) => {
  try {
    const PhoneNumber = require('../models/PhoneNumber');
    await PhoneNumber.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;