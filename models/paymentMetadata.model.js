const mongoose = require('mongoose');

const paymentMetadataSchema = new mongoose.Schema(
  {
    sessionId: String,
    host: mongoose.Schema.ObjectId,
    nurse: mongoose.Schema.ObjectId,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

const PaymentMetadata = mongoose.model(
  'PaymentMetadata',
  paymentMetadataSchema
);
module.exports = PaymentMetadata;
