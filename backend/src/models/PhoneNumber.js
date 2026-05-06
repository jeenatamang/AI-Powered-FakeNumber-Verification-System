// backend/src/models/PhoneNumber.js
const mongoose = require('mongoose');

const phoneNumberSchema = new mongoose.Schema(
  {
    number: {
      type: String, required: true, unique: true, trim: true,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    spamCount:         { type: Number, default: 0 },
    reportCount:       { type: Number, default: 0 },
    uniqueVictimCount: { type: Number, default: 0 },
    // Array of user IDs who have reported this number — ensures uniqueness per user
    victimUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isConfirmedSpam: { type: Boolean, default: false },
    firstSeen:       { type: Date, default: Date.now },
    lastSeen:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Unified rule: 0-4 low, 5-9 medium, 10+ high
phoneNumberSchema.methods.updateRiskLevel = function () {
  const total = this.spamCount + this.reportCount;
  if (total >= 10) {
    this.riskLevel = 'high';
  } else if (total >= 5) {
    this.riskLevel = 'medium';
  } else {
    this.riskLevel = 'low';
  }
  this.isConfirmedSpam = this.riskLevel !== 'low';
};

module.exports = mongoose.model('PhoneNumber', phoneNumberSchema);