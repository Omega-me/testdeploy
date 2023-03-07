const handlerFactory = require('../common/midlewares/handlerFactory');
const Subscription = require('../models/subscription.model');

// exports.create = handlerFactory.createOne(Subscription);
exports.getAll = handlerFactory.getAll(Subscription, {
  select: [
    '-subscriptionId',
    '-subscriptionPlanId',
    '-productId',
    '-customerId',
  ],
});
exports.getOne = handlerFactory.getOne(Subscription, {
  select: [
    '-subscriptionId',
    '-subscriptionPlanId',
    '-productId',
    '-customerId',
  ],
});
// exports.updateOne = handlerFactory.updateOne(Subscription);
exports.deleteOne = handlerFactory.deleteOne(Subscription);
exports.filter = handlerFactory.filter(Subscription, {
  select: [
    '-subscriptionId',
    '-subscriptionPlanId',
    '-productId',
    '-customerId',
  ],
});
