const mongoose = require('mongoose');

const cachedMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageId: {
      // Android SMS _id — unique per device
      type: String,
      required: true,
    },
    phoneNumber:    { type: String, required: true, trim: true },
    messageContent: { type: String, required: true }, // masked version
    // CHANGED: added 'waiting_verification' to enum
    // This label is set when user reports a message — awaiting admin decision
    label:          { type: String, enum: ['spam', 'ham', 'uncertain', 'waiting_verification'], default: 'ham' },
    confidence:     { type: Number, default: 0 },
    classification: { type: String, default: '' },
    smsDate:        { type: Date, required: true }, // original SMS timestamp
    analyzed:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique per user + messageId — prevents duplicates
cachedMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });

module.exports = mongoose.model('CachedMessage', cachedMessageSchema);