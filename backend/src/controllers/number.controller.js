// backend/src/controllers/number.controller.js
const PhoneNumber = require('../models/PhoneNumber');

const cleanNumber = (num) => {
  if (!num) return '';
  let cleaned = String(num).replace(/\D/g, '');
  if (cleaned.startsWith('977') && cleaned.length >= 12) {
    cleaned = cleaned.slice(3);
  }
  return cleaned;
};

const lookupNumber = async (req, res) => {
  try {
    const raw     = req.params.number;
    const cleaned = cleanNumber(raw);

    // Search by cleaned number only
    const phoneRecord = await PhoneNumber.findOne({ number: cleaned });

    if (!phoneRecord) {
      return res.status(200).json({
        success: true,
        result: {
          number:            cleaned,
          riskLevel:         'unknown',
          spamCount:         0,
          reportCount:       0,
          uniqueVictimCount: 0,
          message: 'No data found for this number.',
        },
      });
    }

    res.status(200).json({
      success: true,
      result: phoneRecord,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { lookupNumber };