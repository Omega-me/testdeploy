/* eslint-disable no-console */
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const multer = require('multer');
const sharp = require('sharp');
const handlerFactory = require('../common/midlewares/handlerFactory');
const Host = require('../models/host.model');
const SubscriptionPricing = require('../models/subscriptionsPricing.model');
const Subscription = require('../models/subscription.model');
const AppError = require('../common/utils/AppError');
const catchAsync = require('../common/utils/catchAsync');
const { filterBodyObject } = require('../common/utils');
const CONST = require('../common/constants');
const Property = require('../models/property.model');

exports.checkValidToSubscribe = catchAsync(async (req, res, next) => {
  if (!req.user.stripeCustomerId && !req.user.stripeAccountId) {
    return next(
      new AppError(
        'User not valid, please connect for payment and subscription.',
        CONST.FORBIDDEN
      )
    );
  }

  if (req.user.isSubscriber) {
    return next(new AppError('This user has an active plan.', CONST.FORBIDDEN));
  }

  next();
});

exports.createSubscriptionPlan = catchAsync(async (req, res, next) => {
  // Get pricing object for the host from the database
  const subscriptionPricing = await SubscriptionPricing.find({
    userRole: 'Host',
  });

  if (subscriptionPricing.length === 0)
    return next(
      new AppError(
        'No subscription pricing exists for host users.',
        CONST.BAD_REQUEST
      )
    );

  let hostPlan;
  let price;
  try {
    // Retrieve the subscription plan from stripe for the host
    hostPlan = await stripe.plans.retrieve(subscriptionPricing[0].stripePlanId);
    price = await stripe.prices.retrieve(subscriptionPricing[0].stripePriceId);
  } catch (_) {
    // Create a subscription plan for the host on stripe
    hostPlan = await stripe.plans.create({
      amount: subscriptionPricing[0].amount * 100,
      currency: subscriptionPricing[0].currency,
      interval: subscriptionPricing[0].interval,
      product: {
        name: subscriptionPricing[0].product.name,
      },
    });

    price = await stripe.prices.retrieve(hostPlan.id);

    // Update the pricing id on database
    await SubscriptionPricing.findByIdAndUpdate(
      subscriptionPricing[0]._id,
      {
        stripePlanId: hostPlan.id,
        stripeProductId: hostPlan.product,
        stripePriceId: price.id,
      },
      { new: true, runValidators: true }
    );
  }

  req.price = price;
  next();
});

exports.createSubCheckoutSession = catchAsync(async (req, res, next) => {
  let successUrl = `${process.env.FRONTEND_URL}?sessionId={CHECKOUT_SESSION_ID}`;
  if (process.env.NODE_ENV === CONST.PROD) {
    successUrl = process.env.FRONTEND_URL;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    cancel_url: process.env.FRONTEND_URL,
    success_url: successUrl,
    currency: req.price.currency,
    customer: req.user.stripeCustomerId,
    client_reference_id: req.user.id,
    payment_method_types: ['card'],
    line_items: [
      {
        price: req.price.id,
        quantity: 1,
      },
    ],
  });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      sessionUrl: session.url,
    },
  });
});

const createSubscriptionBooking = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'customer'],
  });
  const host = await Host.findById(session.client_reference_id);

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription
  );

  let defaultPayment;
  if (subscription) {
    defaultPayment = await stripe.paymentMethods.retrieve(
      subscription.default_payment_method
    );
  }

  const subscriptionBookingData = {
    subscriptionId: subscription?.id,
    subscriptionPlanId: subscription?.plan?.id,
    subscriptionStatus: subscription?.status,
    priceAmount: subscription?.plan?.amount && subscription.plan.amount / 100,
    currency: subscription?.plan?.currency,
    productId: subscription?.plan?.product,
    customerId: subscription?.customer,
    userId: host?._id,
    customerRole: host?.role,
    latestInvoiceId: subscription?.latest_invoice,
    email: defaultPayment?.billing_details?.email,
    name: defaultPayment?.billing_details?.name,
    brand: defaultPayment?.card?.brand,
    country: defaultPayment?.card?.country,
    expMonth: defaultPayment?.card?.exp_month,
    expYear: defaultPayment?.card?.exp_year,
    funding: defaultPayment?.card?.funding,
    last4: defaultPayment?.card?.last4,
    created: defaultPayment?.created && new Date(defaultPayment.created * 1000),
    type: defaultPayment?.type,
    oneTimeSubscription: false,
    startedAt:
      subscription?.current_period_start &&
      new Date(subscription.current_period_start * 1000),
    endsAt:
      subscription?.current_period_end &&
      new Date(subscription.current_period_end * 1000),
  };

  // Create a subscription booking
  const foundedSubsciptionBooking = await Subscription.find({
    userId: host?._id,
  });

  if (foundedSubsciptionBooking.length > 0) {
    await Subscription.findByIdAndDelete(foundedSubsciptionBooking[0]?._id);
  }

  const subscriptionBooking = await Subscription.create(
    subscriptionBookingData
  );

  // update host
  host.isSubscriber = true;
  host.subscription = subscriptionBooking?._id;
  await host.save({ validateBeforeSave: false });
};

const deleteSubscriptionBooking = async (event) => {
  const subscriptions = await Subscription.find({
    subscriptionId: event.data.object.id,
  });
  const subscription = subscriptions[0];

  const host = await Host.findById(subscription.userId);

  await Subscription.findByIdAndDelete(subscription.id);

  host.isSubscriber = false;
  host.subscription = null;

  await host.save({ validateBeforeSave: false });
};

exports.createSubscriptionBookingTestSolution = catchAsync(
  async (req, res, next) => {
    const { sessionId } = req.query;
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });
    const host = await Host.findById(session.client_reference_id);

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    let defaultPayment;
    if (subscription) {
      defaultPayment = await stripe.paymentMethods.retrieve(
        subscription.default_payment_method
      );
    }

    const subscriptionBookingData = {
      subscriptionId: subscription.id,
      subscriptionPlanId: subscription.plan.id,
      subscriptionStatus: subscription.status,
      priceAmount: subscription.plan.amount / 100,
      currency: subscription.plan.currency,
      productId: subscription.plan.product,
      customerId: subscription.customer,
      userId: host._id,
      customerRole: host.role,
      latestInvoiceId: subscription.latest_invoice,
      email: defaultPayment.billing_details.email,
      name: defaultPayment.billing_details.name,
      brand: defaultPayment.card.brand,
      country: defaultPayment.card.country,
      expMonth: defaultPayment.card.exp_month,
      expYear: defaultPayment.card.exp_year,
      funding: defaultPayment.card.funding,
      last4: defaultPayment.card.last4,
      created: new Date(defaultPayment.created * 1000),
      type: defaultPayment.type,
      oneTimeSubscription: false,
      startedAt: new Date(subscription.current_period_start * 1000),
      endsAt: new Date(subscription.current_period_end * 1000),
    };

    // Create a subscription booking
    const foundedSubsciptionBooking = await Subscription.find({
      userId: host._id,
    });

    if (foundedSubsciptionBooking.length > 0) {
      await Subscription.findByIdAndDelete(foundedSubsciptionBooking[0]._id);
    }

    const subscriptionBooking = await Subscription.create(
      subscriptionBookingData
    );

    // update host
    host.isSubscriber = true;
    host.subscription = subscriptionBooking._id;
    await host.save({ validateBeforeSave: false });

    res.status(CONST.OK).json({
      status: CONST.SUCCESS,
      data: { session, host },
    });
  }
);

exports.listendToSubscriptionWebhook = catchAsync(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_HOST_SUBSCRIPTION_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(CONST.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      console.log('session completed');
      createSubscriptionBooking(event.data.object.id);
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
      deleteSubscriptionBooking(event);
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

exports.cancelSubscription = catchAsync(async (req, res, next) => {
  if (!req.user.isSubscriber && !req.user.subscription) {
    return next(
      new AppError('This user is not a subscriber.', CONST.FORBIDDEN)
    );
  }

  const susbcription = await Subscription.findById(req.user.subscription);
  await stripe.subscriptions.del(susbcription.subscriptionId);

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'You are no longer a subscriber.',
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req?.user?._id;
  req.query.populate = 'properties';
  next();
};

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Not an image! Please upload only images.',
        CONST.BAD_REQUEST
      ),
      false
    );
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhoto = upload.single('profilePicture');
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const path = 'public/images/users';
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {
      recursive: true,
    });
  }

  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 100 })
    .toFile(`${path}/${req.file.filename}`);

  next();
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('Can not change password', CONST.BAD_REQUEST));
  }

  if (req.body.email) {
    return next(new AppError('Can not change email.', CONST.BAD_REQUEST));
  }

  const filteredBody = filterBodyObject(
    req.body,
    'firstName',
    'lastName',
    'phone',
    'dlNumber',
    'expirationDate',
    'state'
  );
  if (req.file) filteredBody.profilePicture = req.file.filename;

  const updatedUser = await Host.findByIdAndUpdate(
    req?.user?._id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const host = await Host.findByIdAndUpdate(req?.user?._id, {
    isActive: false,
  });

  // deactivate all properties TODO: set it to false in the end
  await Property.updateMany({ host: host?._id }, { isActive: true });

  res.status(CONST.NO_CONTENT).json({
    status: CONST.SUCCESS,
    data: null,
  });
});

const hostSelectedFields = [
  '-stripeAccountId',
  '-stripeCustomerId',
  '-passwordResetToken',
  '-verificationToken',
  '-passwordChangetAt',
  '-passwordResetExpires',
  '-refreshToken',
];
exports.getAll = handlerFactory.getAll(Host, {
  select: hostSelectedFields,
});
exports.getOne = handlerFactory.getOne(Host, {
  populate: [
    {
      path: 'subscription',
      select: [
        '-subscriptionId',
        '-subscriptionPlanId',
        '-productId',
        '-customerId',
      ],
    },
  ],
  select: hostSelectedFields,
});
