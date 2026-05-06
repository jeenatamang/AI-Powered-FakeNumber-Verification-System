// backend/src/controllers/sms.controller.js
const axios = require('axios');
const Report = require('../models/Report');
const PhoneNumber = require('../models/PhoneNumber');
const PendingMessage = require('../models/PendingMessage');
// NEW: import cache helper to set waiting_verification on CachedMessage
const { updateLabelByMessageId } = require('./cache.controller');

// ── Clean number ───────────────────────────────────────────────────────────
const cleanNumber = (num) => {
  if (!num) return '';
  let cleaned = String(num).replace(/\D/g, '');
  if (cleaned.startsWith('977') && cleaned.length >= 12) {
    cleaned = cleaned.slice(3);
  }
  return cleaned;
};

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

// ── Upsert PhoneNumber ─────────────────────────────────────────────────────
const upsertPhoneNumber = async (rawNumber, { addSpam = 0, addReport = 0, userId = null } = {}) => {
  const number = cleanNumber(rawNumber);
  if (!number || number.length < 7) return null;

  try {
    let record = await PhoneNumber.findOne({ number });
    if (!record) {
      record = new PhoneNumber({ number, victimUserIds: [] });
    }

    if (addSpam > 0) record.spamCount += addSpam;

    if (addReport > 0) {
      record.reportCount += addReport;
      if (userId) {
        const userIdStr = String(userId);
        if (!record.victimUserIds) record.victimUserIds = [];
        const alreadyCounted = record.victimUserIds
          .map(String).includes(userIdStr);
        if (!alreadyCounted) {
          record.victimUserIds.push(userId);
          record.uniqueVictimCount = record.victimUserIds.length;
        }
      }
    }

    record.lastSeen = Date.now();
    record.updateRiskLevel();
    await record.save();
    console.log(
      `[PhoneNumber] ${number} → ` +
      `spam:${record.spamCount} ` +
      `report:${record.reportCount} ` +
      `victims:${record.uniqueVictimCount} ` +
      `risk:${record.riskLevel}`
    );
    return record;
  } catch (e) {
    console.error('[PhoneNumber] Error:', e.message);
    return null;
  }
};

// ── analyzeMessage — AI auto-detection ────────────────────────────────────
// Rules:
// - AI confirms spam  → spamCount +1 only (NO reportCount change)
// - AI says uncertain → goes to admin queue (NO counts change yet)
// - AI says ham       → nothing changes
const analyzeMessage = async (req, res) => {
  try {
    const { message, phoneNumber } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required.',
      });
    }

    const aiResponse = await axios.post(
      `${process.env.AI_ENGINE_URL}/predict`,
      { message },
      { timeout: 10000 }
    );

    const classification = aiResponse.data.classification;
    const confidenceRaw  = aiResponse.data.confidence;
    const isScam         = aiResponse.data.isScam;
    const confidence     = confidenceRaw / 100;
    const label          = isScam ? 'spam' : 'ham';

    // "probably spam" → send to admin queue
    if (classification === 'probably spam') {
      await PendingMessage.create({
        phoneNumber:    cleanNumber(phoneNumber) || 'unknown',
        messageContent: maskSensitiveContent(message),
        aiConfidence:   confidence,
        // messageId not set here — AI uncertain path doesn't have it
        // admin decision will fall back to phone number matching
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        result: {
          label:          'uncertain',
          confidence,
          classification,
        },
      });
    }

    // AI confirmed spam → spamCount +1 ONLY
    if (label === 'spam' && phoneNumber) {
      await upsertPhoneNumber(phoneNumber, {
        addSpam:   1,
        addReport: 0,
        userId:    null,
      });

      await Report.create({
        reportedBy:        req.user._id,
        phoneNumber:       cleanNumber(phoneNumber),
        messageContent:    maskSensitiveContent(message),
        aiClassification:  label,
        aiConfidence:      confidence,
        userConfirmedSpam: false,
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      result: {
        label,
        confidence,
        classification,
        details: aiResponse.data.details,
      },
    });

  } catch (error) {
    console.error('[SMS Analyze] Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'AI engine is not running.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── reportMessage — USER manually reports a message ────────────────────────
// Rules:
// - User reports spam  → reportCount +1, victim tracked
// - Creates PendingMessage for admin to verify
// - Sets CachedMessage label → 'waiting_verification' so mobile shows correct state
//
// CHANGED: now accepts messageId in body, stores it on PendingMessage,
// and updates CachedMessage label → 'waiting_verification'
const reportMessage = async (req, res) => {
  try {
    const { phoneNumber, messageContent, messageId } = req.body; // messageId is NEW

    if (!phoneNumber || !messageContent) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message content are required.',
      });
    }

    const cleanedNumber = cleanNumber(phoneNumber);
    const maskedContent = maskSensitiveContent(messageContent);

    // Save report with userConfirmedSpam = true
    const report = await Report.create({
      reportedBy:        req.user._id,
      phoneNumber:       cleanedNumber,
      messageContent:    maskedContent,
      userConfirmedSpam: true,
    });

    // NEW: Create PendingMessage with messageId so admin decision can sync back
    await PendingMessage.create({
      phoneNumber:    cleanedNumber || 'unknown',
      messageContent: maskedContent,
      aiConfidence:   1.0,       // user is certain
      messageId:      messageId || null,  // NEW — links to CachedMessage
    }).catch((e) => {
      console.log('[SMS Report] PendingMessage create warning:', e.message);
    });

    // NEW: Update CachedMessage label → 'waiting_verification'
    // This is what the mobile reads on next getCachedMessages call
    if (messageId) {
      await updateLabelByMessageId(messageId, 'waiting_verification');
      console.log(`[SMS Report] CachedMessage ${messageId} → waiting_verification`);
    }

    // reportCount +1 — human action, track unique victim
    const record = await upsertPhoneNumber(phoneNumber, {
      addSpam:   0,
      addReport: 1,
      userId:    req.user._id,
    });

    res.status(201).json({
      success: true,
      report,
      phoneRecord: {
        number:            record?.number,
        riskLevel:         record?.riskLevel,
        spamCount:         record?.spamCount,
        reportCount:       record?.reportCount,
        uniqueVictimCount: record?.uniqueVictimCount,
      },
    });
  } catch (error) {
    console.error('[SMS Report] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { analyzeMessage, reportMessage };