const handlerFactory = require('../common/midlewares/handlerFactory');
const HostPayment = require('../models/hostPayment.model');

exports.create = handlerFactory.createOne(HostPayment);
exports.getAll = handlerFactory.getAll(HostPayment);
exports.getOne = handlerFactory.getOne(HostPayment);
exports.updateOne = handlerFactory.updateOne(HostPayment);
exports.deleteOne = handlerFactory.deleteOne(HostPayment);
exports.filter = handlerFactory.filter(HostPayment);
