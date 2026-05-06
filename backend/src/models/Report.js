const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    messageContent: {
      type: String,
      required: true,
    },
    aiClassification: {
      type: String,
      enum: ['spam', 'ham', 'uncertain'],
    },
    aiConfidence: {
      type: Number, // 0 to 1
    },
    userConfirmedSpam: {
      type: Boolean, // null = not confirmed yet
      default: null,
    },
    adminReviewed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);