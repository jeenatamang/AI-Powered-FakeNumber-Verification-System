// backend/src/controllers/admin.controller.js
const PendingMessage = require('../models/PendingMessage');
const PhoneNumber    = require('../models/PhoneNumber');
const Report         = require('../models/Report');
const User           = require('../models/User');
// NEW: import cache helpers to sync mobile label after admin decision
const {
  updateLabelByMessageId,
  updateLabelByPhoneNumber,
} = require('./cache.controller');

// ── Clean number helper ────────────────────────────────────────────────────
const cleanNumber = (num) => {
  if (!num) return '';
  let cleaned = String(num).replace(/\D/g, '');
  if (cleaned.startsWith('977') && cleaned.length >= 12) {
    cleaned = cleaned.slice(3);
  }
  return cleaned;
};

// ── Get all pending messages ───────────────────────────────────────────────
const getPendingMessages = async (req, res) => {
  try {
    const pending = await PendingMessage.find({ status: 'pending' })
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count:   pending.length,
      data:    pending,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin reviews a pending message ───────────────────────────────────────
// Counting rules:
// - Admin says SPAM → spamCount +1 only (no reportCount change)
// - Admin says HAM  → no count changes at all
// reportCount is reserved for USER manual actions only
//
// NEW: After deciding, update CachedMessage label so mobile syncs
const reviewPendingMessage = async (req, res) => {
  try {
    const { id }       = req.params;
    const { decision } = req.body; // 'spam' or 'ham'

    if (!['spam', 'ham'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be 'spam' or 'ham'.",
      });
    }

    const pending = await PendingMessage.findById(id);
    if (!pending) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    pending.adminDecision = decision;
    pending.reviewedBy    = req.user._id;
    pending.reviewedAt    = new Date();
    pending.status        = 'reviewed';
    await pending.save();

    // ── NEW: Sync label back to CachedMessage so mobile picks it up ───────
    // Try by messageId first (set when user reports from mobile)
    // Fall back to phoneNumber if messageId not available (AI uncertain path)
    let synced = 0;
    if (pending.messageId) {
      synced = await updateLabelByMessageId(pending.messageId, decision);
    }
    if (synced === 0 && pending.phoneNumber && pending.phoneNumber !== 'unknown') {
      synced = await updateLabelByPhoneNumber(pending.phoneNumber, decision);
    }
    console.log(`[Admin] CachedMessage sync: ${synced} doc(s) updated → ${decision}`);
    // ── END NEW ────────────────────────────────────────────────────────────

    if (decision === 'spam' && pending.phoneNumber !== 'unknown') {
      const number = cleanNumber(pending.phoneNumber) || pending.phoneNumber;

      let phoneRecord = await PhoneNumber.findOne({ number });
      if (!phoneRecord) {
        phoneRecord = new PhoneNumber({ number });
      }

      // spamCount +1 ONLY — admin confirmation is same category as AI detection
      // reportCount stays unchanged — this is NOT a user report
      phoneRecord.spamCount += 1;
      phoneRecord.lastSeen   = Date.now();
      phoneRecord.updateRiskLevel();
      await phoneRecord.save();

      console.log(
        `[Admin] Confirmed spam: ${number} → ` +
        `spam:${phoneRecord.spamCount} ` +
        `report:${phoneRecord.reportCount} ` +
        `risk:${phoneRecord.riskLevel}`
      );
    }

    if (decision === 'ham') {
      console.log(
        `[Admin] Confirmed ham: ${pending.phoneNumber} — no counts changed`
      );
    }

    res.status(200).json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Dashboard stats ────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalNumbers,
      highRisk,
      mediumRisk,
      lowRisk,
      totalReports,
      pendingReviews,
      totalUsers,
    ] = await Promise.all([
      PhoneNumber.countDocuments(),
      PhoneNumber.countDocuments({ riskLevel: 'high' }),
      PhoneNumber.countDocuments({ riskLevel: 'medium' }),
      PhoneNumber.countDocuments({ riskLevel: 'low' }),
      Report.countDocuments(),
      PendingMessage.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'user' }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalNumbers,
        highRisk,
        mediumRisk,
        lowRisk,
        totalReports,
        pendingReviews,
        totalUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Community stats — no admin role required ───────────────────────────────
const getCommunityStats = async (req, res) => {
  try {
    const [highRisk, mediumRisk, safeNumbers, totalReports] = await Promise.all([
      PhoneNumber.countDocuments({ riskLevel: 'high' }),
      PhoneNumber.countDocuments({ riskLevel: 'medium' }),
      PhoneNumber.countDocuments({ riskLevel: 'low' }),
      Report.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      stats: { highRisk, mediumRisk, safeNumbers, totalReports },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get spam numbers paginated ─────────────────────────────────────────────
const getSpamNumbers = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [numbers, total] = await Promise.all([
      PhoneNumber.find()
        .sort({ spamCount: -1 })
        .skip(skip)
        .limit(limit),
      PhoneNumber.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data:  numbers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPendingMessages,
  reviewPendingMessage,
  getDashboardStats,
  getCommunityStats,
  getSpamNumbers,
};