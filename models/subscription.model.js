const mongoose = require('mongoose');
const CONST = require('../common/constants');

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: String,
    subscriptionPlanId: String,
    subscriptionStatus: String,
    priceAmount: Number,
    currency: String,
    productId: String,
    customerId: String,
    userId: String,
    customerRole: {
      type: String,
      required: true,
      enum: [CONST.HOST_ROLE, CONST.NURSE_ROLE],
    },
    latestInvoiceId: String,
    email: String,
    name: String,
    brand: String,
    country: String,
    expMonth: Number,
    expYear: Number,
    funding: String,
    last4: Number,
    created: Date,
    type: String,
    oneTimeSubscription: Boolean,
    startedAt: Date,
    endsAt: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
