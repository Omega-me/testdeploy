const handlerFactory = require('../common/midlewares/handlerFactory');
const GroupRental = require('../models/groupRental.model');
const Host = require('../models/host.model');
const Property = require('../models/property.model');
const catchAsync = require('../common/utils/catchAsync');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');

exports.checkHostValidity = catchAsync(async (req, res, next) => {
  req.body.host = req.user._id.toString();
  next();
});

exports.checkValidityforDeleteUpdate = catchAsync(async (req, res, next) => {
  const { hostId, id } = req.params;

  if (!hostId) {
    return next(new AppError('Please provide host id.', CONST.BAD_REQUEST));
  }

  const host = await Host.findById(hostId);
  if (!host) {
    return next(new AppError('User does not exist.', CONST.BAD_REQUEST));
  }

  if (req.params.hostId.toString() !== req.user._id.toString()) {
    return next(
      new AppError('Invalid id, please provide your id', CONST.BAD_REQUEST)
    );
  }

  if (!id) {
    return next(new AppError('Please provide group id.', CONST.BAD_REQUEST));
  }

  const group = await GroupRental.findById(id);
  if (!group) {
    return next(new AppError('Invalid id', CONST.BAD_REQUEST));
  }

  if (req.user._id.toString() !== group.host.toString()) {
    return next(
      new AppError(
        'You cannot delete this property because it does not belong to you.',
        CONST.BAD_REQUEST
      )
    );
  }

  next();
});

exports.checkBeforeDelete = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const properties = await Property.find({ group: id });
  if (properties.length > 0) {
    return next(
      new AppError(
        'Cannot delete this group because is used on a property',
        CONST.BAD_REQUEST
      )
    );
  }
  next();
});

exports.create = handlerFactory.createOne(GroupRental);
exports.getAll = handlerFactory.getAll(GroupRental, {
  populate: [
    {
      path: 'host',
      select: ['isSubscriber', 'isVerified', 'firstName', 'lastName'],
    },
  ],
});
exports.getOne = handlerFactory.getOne(GroupRental, {
  populate: [
    {
      path: 'host',
      select: ['isSubscriber', 'isVerified', 'firstName', 'lastName'],
    },
  ],
});
exports.updateOne = handlerFactory.updateOne(GroupRental);
exports.deleteOne = handlerFactory.deleteOne(GroupRental);
exports.filter = handlerFactory.filter(GroupRental, {
  populate: [
    {
      path: 'host',
      select: ['isSubscriber', 'isVerified', 'firstName', 'lastName'],
    },
  ],
});
