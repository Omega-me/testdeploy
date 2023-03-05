const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const handlerFactory = require('../common/midlewares/handlerFactory');
const Host = require('../models/host.model');
const SubscriptionPricing = require('../models/subscriptionsPricing.model');
const Subscription = require('../models/subscription.model');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');
const catchAsync = require('../common/utils/catchAsync');

exports.checkValidToSubscribe = catchAsync(async (req, res, next) => {
  if (!req.user.stripeCustomerId) {
    return next(new AppError('This user is not valid.', CONST.FORBIDDEN));
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: req.user.stripeCustomerId,
    limit: 1,
  });

  if (
    subscriptions.data.length > 0 &&
    subscriptions.data[0].status === 'active'
  ) {
    return next(new AppError('This user has an active plan.', CONST.FORBIDDEN));
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
  try {
    // Retrieve the subscription plan from stripe for the host
    hostPlan = await stripe.plans.retrieve(subscriptionPricing[0].stripePlanId);
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

    // Update the pricing id on database
    await SubscriptionPricing.findByIdAndUpdate(
      subscriptionPricing[0]._id,
      {
        stripePlanId: hostPlan.id,
        stripeProductId: hostPlan.product,
      },
      { new: true, runValidators: true }
    );
  }

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      productId: hostPlan.product,
    },
  });
});

exports.getSubscriptionPlanPrice = catchAsync(async (req, res, next) => {
  // get the subscription plan price
  const { productId } = req.params;
  const price = await stripe.prices.search({
    query: `product:'${productId}'`,
  });

  req.subscriptionPrice = price.data[0];

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
    currency: req.subscriptionPrice.currency,
    customer: req.user.stripeCustomerId,
    client_reference_id: req.user._id,
    payment_method_types: ['card'],
    line_items: [
      {
        price: req.subscriptionPrice.id,
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

exports.listendToSubscriptionWebhook = catchAsync(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_SUBSCRIPTION_WEBHOOK_WECRET
    );
  } catch (err) {
    return res.status(CONST.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  // eslint-disable-next-line no-console
  console.log(event);
  // create the booking record after getting the webhook event

  // Return a 200 res to acknowledge receipt of the event
  res.status(CONST.OK).json({
    recieved: true,
  });
});

// Temporary
exports.createSubscriptionBooking = catchAsync(async (req, res, next) => {
  // TODO: Do not recreate the subscription booking if the booking already exists
  // TODO: it should not work if user has not paid the plan because it causes propgramming errors of undefined (it will be fixed using webhooks paid event)
  const host = await Host.findById(req.user._id);
  if (!host) {
    return next(new AppError('User does not exist.', CONST.FORBIDDEN));
  }
  if (host.isSubscriber || req.user.isSubscriber) {
    return next(new AppError('This user is a subscriber.', CONST.FORBIDDEN));
  }
  if (!host.customerId || !req.user.stripeCustomerId) {
    return next(new AppError('This user is not valid.', CONST.FORBIDDEN));
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: req.user.stripeCustomerId,
    limit: 1,
  });
  let subscription;
  if (subscriptions.data[0]) {
    subscription = subscriptions.data[0];
  }

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
    priceAmount: subscription.plan.amount,
    currency: subscription.plan.currency,
    productId: subscription.plan.product,
    customerId: subscription.customer,
    userId: req.user._id,
    customerRole: req.user.role,
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
    userId: req.user._id,
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

  res.json({
    subscriptionBooking,
  });
});
// TODO: Create a function that deletes the booking for mthe database when the user cancel the subscription

exports.create = handlerFactory.createOne(Host);
exports.getAll = handlerFactory.getAll(Host);
exports.getOne = handlerFactory.getOne(Host, [
  'subscription',
  'properties',
  //   payments,
]); // TODO: fix  payments
exports.updateOne = handlerFactory.updateOne(Host);
exports.deleteOne = handlerFactory.deleteOne(Host);
