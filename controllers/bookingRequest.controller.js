const handlerFactory = require('../common/midlewares/handlerFactory');
const BookingRequest = require('../models/bookingRequest.model');
const catchAsync = require('../common/utils/catchAsync');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');
const Property = require('../models/property.model');

exports.checkIsSubscriber = catchAsync(async (req, res, next) => {
  if (!req.user.isSubscriber && !req.user.subscribtion) {
    return next(new AppError('You are not a subscriber.', CONST.FORBIDDEN));
  }
  next();
});

exports.checkPropertyBelongsToHost = catchAsync(async (req, res, next) => {
  const bookingRequest = await BookingRequest.findById(req.params.id);
  const property = await Property.findById(bookingRequest.property);

  if (!bookingRequest) {
    return next(
      new AppError(
        `No booking request exists with id ${req.params.id}`,
        CONST.NOT_FOUND
      )
    );
  }
  if (!property) {
    return next(
      new AppError(
        `No property exists on this booking request`,
        CONST.NOT_FOUND
      )
    );
  }

  if (req.user.id.toString() !== property.host.toString()) {
    return next(
      new AppError(
        'You are not allowed to approve or reject this booking request.',
        CONST.BAD_REQUEST
      )
    );
  }

  next();
});

exports.checkRequestBelongsToNurse = catchAsync(async (req, res, next) => {
  const bookingRequest = await BookingRequest.findById(req.params.id);

  if (!bookingRequest) {
    return next(
      new AppError(
        `Booking request with ${req.params.id} does not exists`,
        CONST.NOT_FOUND
      )
    );
  }

  if (bookingRequest.nurse.toString() !== req.user._id.toString()) {
    return next(
      new AppError(
        'You are not allowed to delete this booking request.',
        CONST.BAD_REQUEST
      )
    );
  }
  next();
});

exports.reject = catchAsync(async (req, res, next) => {
  req.body.status = 'Rejected';
  next();
});

exports.approve = catchAsync(async (req, res, next) => {
  req.body.status = 'Approved';
  next();
});

exports.archive = catchAsync(async (req, res, next) => {
  req.body.isArchived = true;
  next();
});

exports.restore = catchAsync(async (req, res, next) => {
  req.body.isArchived = false;
  next();
});

const options = {
  populate: [
    {
      path: 'nurse',
      select: ['displayName', 'email'],
    },
    'property',
  ],
};
exports.create = handlerFactory.createOne(BookingRequest);
exports.getAll = handlerFactory.getAll(BookingRequest, options);
exports.getOne = handlerFactory.getOne(BookingRequest, options);
exports.updateOne = handlerFactory.updateOne(BookingRequest);
exports.deleteOne = handlerFactory.deleteOne(BookingRequest);
exports.filter = handlerFactory.filter(BookingRequest, options);
