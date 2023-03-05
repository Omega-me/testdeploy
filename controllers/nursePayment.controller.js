const handlerFactory = require('../common/midlewares/handlerFactory');
const HostPayment = require('../models/hostPayment.model');
const NursePayment = require('../models/nursePayment.model');

exports.create = handlerFactory.createOne(NursePayment);
exports.getAll = handlerFactory.getAll(NursePayment);
exports.getOne = handlerFactory.getOne(NursePayment);
exports.updateOne = handlerFactory.updateOne(NursePayment);
exports.deleteOne = handlerFactory.deleteOne(NursePayment);
exports.filter = handlerFactory.filter(HostPayment);
