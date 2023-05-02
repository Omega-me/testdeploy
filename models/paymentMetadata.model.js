const mongoose = require('mongoose');
const Host = require('./host.model');
const Nurse = require('./nurse.model');

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

paymentMetadataSchema.post('save', async function (doc) {
  let host;
  let nurse;
  if (doc.host) {
    host = await Host.findById(doc.host);
    host.paymentMetadata = doc._id;
    await host.save({ validateBeforeSave: false });
  }
  if (doc.nurse) {
    nurse = await Nurse.findById(doc.nurse);
    nurse.paymentMetadata = doc._id;
    await nurse.save({ validateBeforeSave: false });
  }
});

const PaymentMetadata = mongoose.model(
  'PaymentMetadata',
  paymentMetadataSchema
);
module.exports = PaymentMetadata;
