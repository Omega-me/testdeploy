const handlerFactory = require('../common/midlewares/handlerFactory');
const NursePropertyLike = require('../models/nursePropertySave.model');

exports.create = handlerFactory.createOne(NursePropertyLike);
exports.getAll = handlerFactory.getAll(NursePropertyLike);
exports.getOne = handlerFactory.getOne(NursePropertyLike);
exports.updateOne = handlerFactory.updateOne(NursePropertyLike);
exports.deleteOne = handlerFactory.deleteOne(NursePropertyLike);
exports.filter = handlerFactory.filter(NursePropertyLike);
