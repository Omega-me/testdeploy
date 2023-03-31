/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const moment = require('moment');
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
  if (!property || !property.isActive) {
    return next(
      new AppError(
        `No property exists with Id ${propertyId}`,
        CONST.BAD_REQUEST
      )
    );
  }

  if (!property.isAvailable) {
    return next(
      new AppError('This property is rented by another nurse.', CONST.FORBIDDEN)
    );
  }

  const propertyOwner = await Host.findById(property.host);
  if (
    !propertyOwner ||
    !propertyOwner.isActive ||
    !propertyOwner.stripeAccountId
  ) {
    return next(
      new AppError(
        'Invalid listing data, contact the administrator',
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
            metadata: {
              propertyId: property.id,
              ownerId: owner.id,
            },
          },
          unit_amount: property.details.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}?sessionId={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.FRONTEND_URL,
    client_reference_id: req.user.id,
    currency: 'usd',
    customer: req.user.stripeCustomerId,
    payment_method_types: ['card'],
    payment_intent_data: {
      application_fee_amount: (property.details.price * 100) / 10,
      receipt_email: owner.email,
      transfer_data: {
        destination: owner.stripeAccountId,
      },
    },
  });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      sessionUrl: session.url,
    },
  });
});

const createPropertyBookingFromWebhook = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'customer'],
  });
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 1,
    expand: ['data.price', 'data.price.product'],
  });

  const propertyItemData = lineItems?.data[0];
  const price = Number(propertyItemData?.amount_total) / 100;
  const applicationFee = Math.round((price / 100) * 10);
  const propertyId = propertyItemData?.price?.product?.metadata?.propertyId;
  const hostId = propertyItemData?.price?.product?.metadata?.ownerId;

  const bookingData = {
    price,
    applicationFee,
    totalAmount: price + applicationFee,
    payment_id: session?.payment_intent?.id,
    nurse: session?.client_reference_id,
    property: propertyId,
    host: hostId,
  };

  await Booking.create(bookingData);
};

exports.listenTopropertyBookingWebhook = catchAsync(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_PROPERTY_BOOKING_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(CONST.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      console.log(event);
      createPropertyBookingFromWebhook(event.data.object.id);
      break;
    case 'checkout.session.expired':
      console.log('session expired');
      break;
    case 'customer.subscription.created':
      console.log('susbcription created');
      // send email to notify user for subscription
      break;
    case 'customer.subscription.deleted':
      console.log('susbcripton deleted');
      break;
    case 'customer.subscription.paused':
      console.log('susbcripton paused');
      break;
    case 'customer.subscription.resumed':
      console.log('susbcripton resumed');
      break;
    case 'customer.subscription.updated':
      console.log('susbcripton updated');
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(CONST.OK).json({
    recieved: true,
  });
});
// TODO: create booking by using stripe webhooks latter
exports.createPropertyBooking = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'customer'],
  });
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    limit: 1,
    expand: ['data.price', 'data.price.product'],
  });

  const propertyItemData = lineItems?.data[0];
  const price = Number(propertyItemData?.amount_total) / 100;
  const applicationFee = Math.round((price / 100) * 10);
  const propertyId = propertyItemData?.price?.product?.metadata?.propertyId;
  const hostId = propertyItemData?.price?.product?.metadata?.ownerId;

  const bookingData = {
    price,
    applicationFee,
    totalAmount: price + applicationFee,
    payment_id: session?.payment_intent?.id,
    nurse: session?.client_reference_id,
    property: propertyId,
    host: hostId,
  };

  const booking = await Booking.create(bookingData);

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      booking,
    },
  });
});

exports.checkIn = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(
      new AppError(
        `No booking exists with the Id ${bookingId}`,
        CONST.BAD_REQUEST
      )
    );
  }

  const property = await Property.findById(booking.property);

  const currentDate = moment(Date.now());
  let futureMonth = moment(currentDate).add(property.minimumDuration, 'M');
  const futureMonthEnd = moment(futureMonth).endOf('month');

  if (
    currentDate.date() !== futureMonth.date() &&
    futureMonth.isSame(futureMonthEnd.format('YYYY-MM-DD'))
  ) {
    futureMonth = futureMonth.add(1, 'd');
  }

  const data = {
    checkInDate: moment(Date.now()).format(),
    checkOutDate: moment(futureMonth).format(),
    status: 'paid',
    isActive: true,
  };

  const updatedBooking = await Booking.findByIdAndUpdate(bookingId, data, {
    new: true,
    runValidators: true,
  });

  property.isAvailable = false;
  property.availableFrom = moment(futureMonth).format();
  await property.save({ validateBeforeSave: false });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      booking: updatedBooking,
    },
  });
});

exports.checkOut = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(
      new AppError(
        `No booking exists with the Id ${bookingId}`,
        CONST.BAD_REQUEST
      )
    );
  }

  const property = await Property.findById(booking.property);

  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    {
      isActive: false,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  property.isAvailable = true;
  property.availableFrom = undefined;
  await property.save({ validateBeforeSave: false });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      booking: updatedBooking,
    },
  });
});

exports.getAll = handlerFactory.getAll(Booking, {
  select: ['-payment_id'],
});
exports.getOne = handlerFactory.getOne(Booking, {
  populate: ['property'],
  select: ['-payment_id'],
});
exports.filter = handlerFactory.filter(Booking, {
  select: ['-payment_id'],
});
