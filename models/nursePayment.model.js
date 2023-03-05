const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // relations
    nurse: {
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

const NursePayment = mongoose.model('NursePayment', paymentSchema);
module.exports = NursePayment;
