const handlerFactory = require('../common/midlewares/handlerFactory');
const PaymentMetadata = require('../models/paymentMetadata.model');

exports.create = handlerFactory.createOne(PaymentMetadata);
exports.getAll = handlerFactory.getAll(PaymentMetadata);
exports.getOne = handlerFactory.getOne(PaymentMetadata);
exports.updateOne = handlerFactory.updateOne(PaymentMetadata);
exports.deleteOne = handlerFactory.deleteOne(PaymentMetadata);
exports.filter = handlerFactory.filter(PaymentMetadata);
