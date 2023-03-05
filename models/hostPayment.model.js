const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // relations
    host: {
      type: mongoose.Schema.ObjectId,
      required: [true, 'Payment should belong to a nurse!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

const HostPayment = mongoose.model('HostPayment', paymentSchema);
module.exports = HostPayment;
