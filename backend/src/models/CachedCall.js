const mongoose = require('mongoose');

const cachedCallSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    callId:      { type: String, required: true }, // timestamp as ID
    phoneNumber: { type: String, required: true, trim: true },
    duration:    { type: Number, default: 0 },
    callDate:    { type: Date, required: true },
    callType:    { type: String, default: 'INCOMING' },
    callerName:  { type: String, default: null },
    riskLevel:   { type: String, enum: ['low', 'medium', 'high', 'unknown'], default: 'unknown' },
  },
  { timestamps: true }
);

// Unique per user + callId — prevents duplicates
cachedCallSchema.index({ userId: 1, callId: 1 }, { unique: true });
// Index for getting latest call timestamp
cachedCallSchema.index({ userId: 1, callDate: -1 });

module.exports = mongoose.model('CachedCall', cachedCallSchema);