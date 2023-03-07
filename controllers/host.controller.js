/* eslint-disable no-console */
/* eslint-disable no-case-declarations */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const handlerFactory = require('../common/midlewares/handlerFactory');
const Host = require('../models/host.model');
const SubscriptionPricing = require('../models/subscriptionsPricing.model');
const Subscription = require('../models/subscription.model');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');
const catchAsync = require('../common/utils/catchAsync');

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
  const cuscessUrl =
    process.env.NODE_ENV !== 'development'
      ? process.env.FRONTEND_URL
      : `http://localhost:3333/api/v1/host/subscribtions?stripeCustomerId=${req.user.stripeCustomerId}`;
  // Create the subscription session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    cancel_url: process.env.FRONTEND_URL,
    success_url: cuscessUrl,
    currency: req.price.currency,
    customer: req.user.stripeCustomerId,
    client_reference_id: req.user._id,
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

const createSubscriptionBooking = async (event) => {
  const hosts = await Host.find({
    email: event.data.object.customer_details.email,
  });
  const host = hosts[0];

  const subscription = await stripe.subscriptions.retrieve(
    event.data.object.subscription
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
};

const deleteSubscriptionBooking = async (event) => {
  const hosts = await Host.find({
    email: event.data.object.customer_details.email,
  });
  const host = hosts[0];

  await Subscription.findByIdAndDelete(host.subscription);

  host.isSubscriber = false;
  host.subscription = null;

  await host.save({ validateBeforeSave: false });
  console.log(event);
};

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
      createSubscriptionBooking(event);
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
      console.log(event.data.object);
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

// Temporary
exports.developmentTestingMethode = catchAsync(async (req, res, next) => {
  res.json({
    test: 'test',
  });
});

exports.cancelSubscription = catchAsync(async (req, res, next) => {
  if (!req.user.isSubscriber && !req.user.subscription) {
    return next(
      new AppError('This user is not a subscriber.', CONST.FORBIDDEN)
    );
  }

  await stripe.subscriptions.del(req.user.subscription);

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'You are no longer a subscriber.',
  });
});
// TODO: Create a function that deletes the booking form the database when the user cancel the subscription and changes the user status to a non subscriber

const hostSelectedFields = [
  '-stripeAccountId',
  '-stripeCustomerId',
  '-passwordResetToken',
  '-verificationToken',
  '-passwordChangetAt',
  '-passwordResetExpires',
  '-refreshToken',
];
exports.create = handlerFactory.createOne(Host, hostSelectedFields);
exports.getAll = handlerFactory.getAll(Host, {
  select: hostSelectedFields,
});
exports.getOne = handlerFactory.getOne(Host, {
  populate: [
    'properties',
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
exports.updateOne = handlerFactory.updateOne(Host, hostSelectedFields);
exports.deleteOne = handlerFactory.deleteOne(Host);
