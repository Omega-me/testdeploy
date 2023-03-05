const handlerFactory = require('../common/midlewares/handlerFactory');
const AppError = require('../common/utils/AppError');
const catchAsync = require('../common/utils/catchAsync');
const GroupRental = require('../models/groupRental.model');
const Property = require('../models/property.model');
const CONST = require('../common/constants');

exports.checkPropertyType = catchAsync(async (req, _, next) => {
  const property = await Property.findById(req.body.property);

  if (!property)
    return next(
      new AppError(
        'No property exists with the given property ID',
        CONST.BAD_REQUEST
      )
    );

  if (!property.propertyType.isGroup)
    return next(
      new AppError(
        'Property must be of type Group Rental to be part of a group',
        CONST.BAD_REQUEST
      )
    );

  next();
});

exports.create = handlerFactory.createOne(GroupRental);
exports.getAll = handlerFactory.getAll(GroupRental, ['property']);
exports.getOne = handlerFactory.getOne(GroupRental, ['property']);
exports.updateOne = handlerFactory.updateOne(GroupRental);
exports.deleteOne = handlerFactory.deleteOne(GroupRental);
exports.filter = handlerFactory.filter(GroupRental, ['property']);
