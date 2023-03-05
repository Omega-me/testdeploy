const SubscriptionPricingModel = require('../models/subscriptionsPricing.model');
const handlerFactory = require('../common/midlewares/handlerFactory');

exports.create = handlerFactory.createOne(SubscriptionPricingModel);
exports.getAll = handlerFactory.getAll(SubscriptionPricingModel);
exports.getOne = handlerFactory.getOne(SubscriptionPricingModel);
// exports.updateOne = handlerFactory.updateOne(SubscriptionPricingModel);
// exports.deleteOne = handlerFactory.deleteOne(SubscriptionPricingModel);
// exports.filter = handlerFactory.filter(SubscriptionPricingModel);
