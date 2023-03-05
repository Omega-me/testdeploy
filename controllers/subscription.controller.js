const handlerFactory = require('../common/midlewares/handlerFactory');
const Subscription = require('../models/subscription.model');

exports.create = handlerFactory.createOne(Subscription);
exports.getAll = handlerFactory.getAll(Subscription);
exports.getOne = handlerFactory.getOne(Subscription);
exports.updateOne = handlerFactory.updateOne(Subscription);
exports.deleteOne = handlerFactory.deleteOne(Subscription);
exports.filter = handlerFactory.filter(Subscription);
