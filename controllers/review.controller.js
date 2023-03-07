const handlerFactory = require('../common/midlewares/handlerFactory');
const AppError = require('../common/utils/AppError');
const catchAsync = require('../common/utils/catchAsync');
const Review = require('../models/review.model');
const LABELS = require('../common/labels/index');
const CONST = require('../common/constants/index');
const Property = require('../models/property.model');

exports.checkPropertyExistance = catchAsync(async (req, _, next) => {
  const { propertyId } = req.params;
  if (!propertyId)
    return next(new AppError('Please specify a valid ID', CONST.BAD_REQUEST));

  const property = await Property.findById(propertyId);
  if (!property)
    return next(new AppError(LABELS.NO_DOC_FOUND, CONST.NOT_FOUND));

  next();
});

exports.create = handlerFactory.createOne(Review);
exports.getAll = handlerFactory.getAll(Review);
exports.getOne = handlerFactory.getOne(Review, {
  populate: [
    {
      path: 'nurse',
      select: [
        '-stripeAccountId',
        '-stripeCustomerId',
        '-passwordResetExpires',
        '-passwordResetToken',
        '-refreshToken',
      ],
    },
    'property',
  ],
});
exports.updateOne = handlerFactory.updateOne(Review);
exports.deleteOne = handlerFactory.deleteOne(Review);
exports.filter = handlerFactory.filter(Review);
