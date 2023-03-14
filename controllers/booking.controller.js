/* eslint-disable no-console */
/* eslint-disable no-case-declarations */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const handlerFactory = require('../common/midlewares/handlerFactory');
const catchAsync = require('../common/utils/catchAsync');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');
const Booking = require('../models/booking.model');
const Property = require('../models/property.model');
const Host = require('../models/host.model');

exports.checkPropertyExistsAndValid = catchAsync(async (req, res, next) => {
  const { propertyId } = req.params;

  const property = await Property.findById(propertyId);
  if (!property) {
    return next(
      new AppError(`No property exists with Id ${propertyId}`, CONST.FORBIDDEN)
    );
  }

  if (!property.isAvailable) {
    return next(
      new AppError('This property is rented by another nurse.', CONST.FORBIDDEN)
    );
  }

  if (!property.details.price) {
    return next(
      new AppError(
        'Property is invalid, contact the administrator, no price',
        CONST.FORBIDDEN
      )
    );
  }

  const propertyOwner = await Host.findById(property.host);
  if (!propertyOwner) {
    return next(
      new AppError(
        'Property is invalid, contact the administrator, no owner',
        CONST.FORBIDDEN
      )
    );
  }

  if (!propertyOwner.stripeAccountId) {
    return next(
      new AppError(
        'Property is invalid, contact the administrator, no owner payment account',
        CONST.FORBIDDEN
      )
    );
  }

  req.owner = propertyOwner;
  req.property = property;
  next();
});

exports.cratePropertyBookingCheckout = catchAsync(async (req, res, next) => {
  const { property, owner } = req;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: property.title,
            description: property.description,
            images: [
              `${process.env.IMAGES_URL}/properties/${property.imageCover}`,
            ],
            metadata: {},
          },
          unit_amount: property.details.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: process.env.FRONTEND_URL,
    cancel_url: process.env.FRONTEND_URL,
    client_reference_id: req.user.id,
    currency: 'usd',
    customer: req.user.stripeCustomerId,
    payment_method_types: ['card'],
    payment_intent_data: {
      application_fee_amount: 10038,
      receipt_email: owner.email,
      transfer_data: {
        destination: owner.stripeAccountId,
        amount: 1846,
      },
    },

    // application_fee_amount: ((property.details.price * 100) / 100) * 10, // 10% fee
    // stripeAccount: owner.stripeAccountId,
  });

  const userStripeAccount = await stripe.accounts.retrieve(
    owner.stripeAccountId
  );

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      session,
      userStripeAccount,
    },
  });
});

// exports.create = handlerFactory.createOne(Booking);
exports.getAll = handlerFactory.getAll(Booking);
exports.getOne = handlerFactory.getOne(Booking);
// exports.updateOne = handlerFactory.updateOne(Booking);
// exports.deleteOne = handlerFactory.deleteOne(Booking);
exports.filter = handlerFactory.filter(Booking);
