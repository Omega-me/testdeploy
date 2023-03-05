const mongoose = require('mongoose');

const subscriptionPricingSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    userRole: {
      type: String,
      enum: ['Nurse', 'Host'],
      required: true,
      unique: true,
    },
    interval: {
      type: String,
      enum: ['day', 'week', 'month', 'year'],
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
      enum: ['usd'],
    },
    product: {
      name: {
        type: String,
        required: true,
      },
    },
    recurring: {
      type: String,
      required: true,
      enum: ['one_time', 'recurring'],
    },
    stripePlanId: String,
    stripePriceId: String,
    stripeProductId: String,
  },
  {
    timestamps: true,
  }
);

const SubscriptionPricing = mongoose.model(
  'SubscriptionPricing',
  subscriptionPricingSchema
);

module.exports = SubscriptionPricing;
