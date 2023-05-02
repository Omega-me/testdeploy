/* eslint-disable no-console */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const moment = require('moment');
const handlerFactory = require('../common/midlewares/handlerFactory');
const catchAsync = require('../common/utils/catchAsync');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');
const Booking = require('../models/booking.model');
const Property = require('../models/property.model');
const Host = require('../models/host.model');
const BookingRequest = require('../models/bookingRequest.model');

exports.checkPropertyExistsAndValid = catchAsync(async (req, res, next) => {
  const { bookingRequestId } = req.params;

  const bookingRequest = await BookingRequest.findById(bookingRequestId);
  if (!bookingRequest) {
    return next(
      new AppError(`No such request for booking exists`, CONST.BAD_REQUEST)
    );
  }
  if (bookingRequest.isArchived) {
    return next(new AppError(`This request is archived`, CONST.BAD_REQUEST));
  }
  if (!bookingRequest.isArchived && bookingRequest.status !== 'Approved') {
    return next(
      new AppError(
        `This request is not approved for booking`,
        CONST.BAD_REQUEST
      )
    );
  }

  const propertyId = bookingRequest.property;
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
  req.bookingRequestId = bookingRequestId;
  next();
});

exports.cratePropertyBookingCheckout = catchAsync(async (req, res, next) => {
  const { property, owner, bookingRequestId } = req;

  let successUrl = `${process.env.FRONTEND_URL}?sessionId={CHECKOUT_SESSION_ID}`;
  if (process.env.NODE_ENV === CONST.PROD) {
    successUrl = process.env.FRONTEND_URL;
  }

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
              tenantId: req.user.id,
            },
          },
          unit_amount: property.details.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: process.env.FRONTEND_URL,
    client_reference_id: bookingRequestId,
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
  try {
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
    const nurseId = propertyItemData?.price?.product?.metadata?.tenantId;

    const bookingData = {
      price,
      applicationFee,
      totalAmount: price + applicationFee,
      paymentId: session?.payment_intent?.id,
      nurse: nurseId,
      property: propertyId,
      host: hostId,
    };

    await Booking.create(bookingData);
    const property = await Property.findById(propertyId);
    property.isAvailable = false;
    await property.save({ validateBeforeSave: false });
    await BookingRequest.findByIdAndDelete(session?.client_reference_id);
  } catch (error) {
    console.log(error);
  }
};

exports.createPropertyBookingTest = catchAsync(async (req, res, next) => {
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
  const nurseId = propertyItemData?.price?.product?.metadata?.tenantId;

  const bookingData = {
    price,
    applicationFee,
    totalAmount: price + applicationFee,
    paymentId: session?.payment_intent?.id,
    nurse: nurseId,
    property: propertyId,
    host: hostId,
  };

  const booking = await Booking.create(bookingData);
  const property = await Property.findById(propertyId);
  property.isAvailable = false;
  await property.save({ validateBeforeSave: false });
  await BookingRequest.findByIdAndDelete(session?.client_reference_id);

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      session,
      lineItems,
      booking,
    },
  });
});

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
      createPropertyBookingFromWebhook(event.data.object.id);
      break;
    case 'checkout.session.expired':
      console.log('session expired');
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(CONST.OK).json({
    recieved: true,
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

  if (booking.host.toString() !== req.user._id.toString()) {
    return next(
      new AppError(
        `You are not allowed to check-in this tenant`,
        CONST.FORBIDDEN
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
    status: 'Checked in',
  };

  const updatedBooking = await Booking.findByIdAndUpdate(bookingId, data, {
    new: true,
    runValidators: true,
  });

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

  if (booking.host.toString() !== req.user._id.toString()) {
    return next(
      new AppError(
        `You are not allowed to check-out this tenant`,
        CONST.FORBIDDEN
      )
    );
  }

  const property = await Property.findById(booking.property);

  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    {
      status: 'Checked out',
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

exports.archiveRestoreBookingNurse = catchAsync(async (req, res, next) => {
  const { bookingId, operationParam } = req.params;

  if (
    !operationParam ||
    (operationParam !== CONST.ARCHIVE_PARAM &&
      operationParam !== CONST.RESTORE_PARAM)
  ) {
    return next(
      new AppError(
        `Parameter should have a value ${CONST.ARCHIVE_PARAM} or ${CONST.RESTORE_PARAM}.`,
        CONST.BAD_REQUEST
      )
    );
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(
      new AppError(
        `No booking exists with the Id ${bookingId}`,
        CONST.BAD_REQUEST
      )
    );
  }

  if (booking.nurse.toString() !== req.user._id.toString()) {
    return next(
      new AppError(
        `You are not allowed to archive this booking`,
        CONST.FORBIDDEN
      )
    );
  }
  booking.isArchivedForNurse = operationParam === CONST.ARCHIVE_PARAM;

  await booking.save({ validateBeforeSave: false });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'Operation was made succesfuly',
  });
});

exports.archiveRestoreBookingHost = catchAsync(async (req, res, next) => {
  const { bookingId, operationParam } = req.params;

  if (
    !operationParam ||
    (operationParam !== CONST.ARCHIVE_PARAM &&
      operationParam !== CONST.RESTORE_PARAM)
  ) {
    return next(
      new AppError(
        `Parameter should have a value ${CONST.ARCHIVE_PARAM} or ${CONST.RESTORE_PARAM}.`,
        CONST.BAD_REQUEST
      )
    );
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(
      new AppError(
        `No booking exists with the Id ${bookingId}`,
        CONST.BAD_REQUEST
      )
    );
  }

  if (booking.host.toString() !== req.user._id.toString()) {
    return next(
      new AppError(
        `You are not allowed to do archive or restore this tenant`,
        CONST.FORBIDDEN
      )
    );
  }
  booking.isArchivedForHost = operationParam === CONST.ARCHIVE_PARAM;

  await booking.save({ validateBeforeSave: false });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'Operation was made succesfuly',
  });
});

const options = {
  select: ['-payment_id'],
  populate: [
    'property',
    {
      path: 'host',
      select: ['firstName', 'lastName', 'email', 'phone'],
    },
    {
      path: 'nurse',
      select: ['displayName', 'email'],
    },
  ],
};
exports.getAll = handlerFactory.getAll(Booking, options);
exports.getOne = handlerFactory.getOne(Booking, options);
exports.filter = handlerFactory.filter(Booking, options);
