const mongoose = require('mongoose');

const pendingMessageSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    messageContent: {
      type: String,
      required: true,
    },
    aiConfidence: {
      type: Number,
      required: true,
    },
    adminDecision: {
      type: String,
      enum: ['spam', 'ham'],
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PendingMessage', pendingMessageSchema);