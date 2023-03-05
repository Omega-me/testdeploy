const handlerFactory = require('../common/midlewares/handlerFactory');
const Booking = require('../models/booking.model');

exports.create = handlerFactory.createOne(Booking);
exports.getAll = handlerFactory.getAll(Booking);
exports.getOne = handlerFactory.getOne(Booking);
exports.updateOne = handlerFactory.updateOne(Booking);
exports.deleteOne = handlerFactory.deleteOne(Booking);
exports.filter = handlerFactory.filter(Booking);
