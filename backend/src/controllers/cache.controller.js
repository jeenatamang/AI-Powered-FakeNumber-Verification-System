// backend/src/controllers/cache.controller.js
const CachedMessage = require('../models/CachedMessage');
const CachedCall    = require('../models/CachedCall');
const PhoneNumber   = require('../models/PhoneNumber');

// ── OTP masking ────────────────────────────────────────────────────────────
const maskSensitiveContent = (text) => {
  if (!text) return text;
  return text
    .replace(
      /(otp|code|pin|password|passcode|verification)\s*(?:is|:|-|=)?\s*(\d+)/gi,
      (_, keyword, code) => `${keyword} ${'*'.repeat(code.length)}`
    )
    .replace(/\b(\d{4,8})\b/g, (match) => '*'.repeat(match.length));
};

// ── Strip country code ─────────────────────────────────────────────────────
const cleanNumber = (num) => {
  if (!num) return '';
  let cleaned = String(num).replace(/\D/g, '');
  if (cleaned.startsWith('977') && cleaned.length >= 12) {
    cleaned = cleaned.slice(3);
  }
  return cleaned;
};

// ── Get last message timestamp ─────────────────────────────────────────────
const getLastMessageTimestamp = async (req, res) => {
  try {
    const latest = await CachedMessage
      .findOne({ userId: req.user._id })
      .sort({ smsDate: -1 })
      .select('smsDate');
    res.status(200).json({
      success:       true,
      lastTimestamp: latest ? latest.smsDate.getTime() : 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get last call timestamp ────────────────────────────────────────────────
const getLastCallTimestamp = async (req, res) => {
  try {
    const latest = await CachedCall
      .findOne({ userId: req.user._id })
      .sort({ callDate: -1 })
      .select('callDate');
    res.status(200).json({
      success:       true,
      lastTimestamp: latest ? latest.callDate.getTime() : 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get all cached messages for this user ──────────────────────────────────
const getCachedMessages = async (req, res) => {
  try {
    const messages = await CachedMessage
      .find({ userId: req.user._id })
      .sort({ smsDate: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get all cached calls for this user ────────────────────────────────────
const getCachedCalls = async (req, res) => {
  try {
    const calls = await CachedCall
      .find({ userId: req.user._id })
      .sort({ callDate: -1 });
    res.status(200).json({ success: true, data: calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Save new messages — skip duplicates ────────────────────────────────────
const saveMessages = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false, message: 'messages array required',
      });
    }

    let savedCount   = 0;
    let skippedCount = 0;

    for (const msg of messages) {
      try {
        const result = await CachedMessage.updateOne(
          { userId: req.user._id, messageId: String(msg._id) },
          {
            $setOnInsert: {
              userId:         req.user._id,
              messageId:      String(msg._id),
              phoneNumber:    cleanNumber(msg.address),
              messageContent: maskSensitiveContent(msg.body || ''),
              label:          'ham',
              analyzed:       false,
              smsDate:        new Date(parseInt(msg.date) || Date.now()),
            },
          },
          { upsert: true }
        );
        if (result.upsertedCount > 0) savedCount++;
        else skippedCount++;
      } catch (e) {
        if (e.code === 11000) skippedCount++;
        else console.error('[Cache] saveMessages error:', e.message);
      }
    }

    console.log(`[Cache] Saved ${savedCount} new, skipped ${skippedCount}`);
    res.status(200).json({ success: true, savedCount, skippedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update message label after AI analysis or user review ─────────────────
const updateMessageLabel = async (req, res) => {
  try {
    const { messageId, label, confidence, classification } = req.body;

    if (!messageId || !label) {
      return res.status(400).json({
        success: false,
        message: 'messageId and label are required',
      });
    }

    const result = await CachedMessage.updateOne(
      {
        userId:    req.user._id,
        messageId: String(messageId),
      },
      {
        $set: {
          label:          label,
          confidence:     confidence     || 0,
          classification: classification || '',
          analyzed:       true,
        },
      }
    );

    if (result.matchedCount === 0) {
      console.log(`[Cache] messageId ${messageId} not found in DB — will save on next sync`);
    } else {
      console.log(`[Cache] Updated label for ${messageId} → ${label}`);
    }

    res.status(200).json({ success: true, updated: result.matchedCount > 0 });
  } catch (error) {
    console.error('[Cache] updateMessageLabel error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Save new calls — skip duplicates ──────────────────────────────────────
const saveCalls = async (req, res) => {
  try {
    const { calls } = req.body;
    if (!calls || !Array.isArray(calls)) {
      return res.status(400).json({
        success: false, message: 'calls array required',
      });
    }

    let savedCount   = 0;
    let skippedCount = 0;

    for (const call of calls) {
      try {
        const cleaned = cleanNumber(call.address);
        let riskLevel = 'unknown';

        if (cleaned.length >= 7) {
          const phoneRecord = await PhoneNumber.findOne({ number: cleaned });
          if (phoneRecord) {
            riskLevel = phoneRecord.riskLevel;
          }
        }

        const result = await CachedCall.updateOne(
          { userId: req.user._id, callId: String(call._id) },
          {
            $setOnInsert: {
              userId:      req.user._id,
              callId:      String(call._id),
              phoneNumber: cleaned,
              duration:    parseInt(call.duration) || 0,
              callDate:    new Date(parseInt(call.date) || Date.now()),
              callType:    call.type || 'INCOMING',
              callerName:  call.name || null,
              riskLevel,
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) savedCount++;
        else skippedCount++;
      } catch (e) {
        if (e.code === 11000) skippedCount++;
        else console.error('[Cache] saveCalls error:', e.message);
      }
    }

    console.log(`[Cache] Calls saved ${savedCount} new, skipped ${skippedCount}`);
    res.status(200).json({ success: true, savedCount, skippedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update call risk level ─────────────────────────────────────────────────
const updateCallRisk = async (req, res) => {
  try {
    const { callId, riskLevel } = req.body;

    if (!callId || !riskLevel) {
      return res.status(400).json({
        success: false, message: 'callId and riskLevel are required',
      });
    }

    await CachedCall.updateOne(
      { userId: req.user._id, callId: String(callId) },
      { $set: { riskLevel } }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── NEW: Get ALL cached messages — admin only ──────────────────────────────
// Used by admin Messages page to show all messages across all users
// sorted by smsDate descending (newest first)
const getAllCachedMessages = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 200;
    const skip  = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      CachedMessage.find()
        .sort({ smsDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CachedMessage.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data:    messages,
      total,
      page,
      pages:   Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── NEW: Update CachedMessage label by messageId — admin only ─────────────
// Called by admin.controller after reviewing a pending message
// so the mobile app label syncs on next getCachedMessages call
const updateLabelByMessageId = async (messageId, label) => {
  try {
    const result = await CachedMessage.updateMany(
      { messageId: String(messageId) },
      {
        $set: {
          label,
          analyzed:       true,
          classification: `admin_${label}`,
          confidence:     label === 'spam' ? 0.99 : 0.01,
        },
      }
    );
    console.log(`[Cache] Admin updated messageId ${messageId} → ${label} (${result.modifiedCount} docs)`);
    return result.modifiedCount;
  } catch (e) {
    console.error('[Cache] updateLabelByMessageId error:', e.message);
    return 0;
  }
};

// ── NEW: Update CachedMessage labels by phoneNumber — admin fallback ───────
// Used when messageId is not stored on the PendingMessage
const updateLabelByPhoneNumber = async (phoneNumber, label) => {
  try {
    const result = await CachedMessage.updateMany(
      { phoneNumber, label: 'waiting_verification' },
      {
        $set: {
          label,
          analyzed:       true,
          classification: `admin_${label}`,
          confidence:     label === 'spam' ? 0.99 : 0.01,
        },
      }
    );
    console.log(`[Cache] Admin updated phone ${phoneNumber} → ${label} (${result.modifiedCount} docs)`);
    return result.modifiedCount;
  } catch (e) {
    console.error('[Cache] updateLabelByPhoneNumber error:', e.message);
    return 0;
  }
};

module.exports = {
  getLastMessageTimestamp,
  getLastCallTimestamp,
  getCachedMessages,
  getCachedCalls,
  saveMessages,
  updateMessageLabel,
  saveCalls,
  updateCallRisk,
  // New exports for admin use
  getAllCachedMessages,
  updateLabelByMessageId,
  updateLabelByPhoneNumber,
};