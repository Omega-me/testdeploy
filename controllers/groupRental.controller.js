const handlerFactory = require('../common/midlewares/handlerFactory');
const GroupRental = require('../models/groupRental.model');
const Property = require('../models/property.model');
const catchAsync = require('../common/utils/catchAsync');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');

exports.addHostToGroup = catchAsync(async (req, res, next) => {
  req.body.host = req.user._id.toString();
  next();
});

exports.checkValidityforDeleteUpdate = catchAsync(async (req, res, next) => {
  const { id } = req.params;

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
        'You cannot delete or update this group because it does not belong to you.',
        CONST.BAD_REQUEST
      )
    );
  }

  const properties = await Property.find({ group: id });
  if (properties.length > 0) {
    return next(
      new AppError(
        'Cannot delete or update this group because is used on a property',
        CONST.BAD_REQUEST
      )
    );
  }

  next();
});

const options = {
  populate: [
    {
      path: 'host',
      select: ['isSubscriber', 'isVerified', 'firstName', 'lastName'],
    },
  ],
};
exports.create = handlerFactory.createOne(GroupRental);
exports.getAll = handlerFactory.getAll(GroupRental, options);
exports.getOne = handlerFactory.getOne(GroupRental, options);
exports.updateOne = handlerFactory.updateOne(GroupRental);
exports.deleteOne = handlerFactory.deleteOne(GroupRental);
exports.filter = handlerFactory.filter(GroupRental, options);
