/* eslint-disable no-console */
/* eslint-disable no-case-declarations */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const handlerFactory = require('../common/midlewares/handlerFactory');
const SubscriptionPricing = require('../models/subscriptionsPricing.model');
const Subscription = require('../models/subscription.model');
const catchAsync = require('../common/utils/catchAsync');
const Nurse = require('../models/nurse.model');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');

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
    return next(new AppError('This user is a subscriber.', CONST.FORBIDDEN));
  }

  next();
});

exports.createSubscriptionPlan = catchAsync(async (req, res, next) => {
  // Get pricing object for the nurse from the database
  const subscriptionPricing = await SubscriptionPricing.find({
    userRole: 'Nurse',
  });

  if (subscriptionPricing.length === 0)
    return next(
      new AppError(
        'No subscription pricing exists for nurse users.',
        CONST.BAD_REQUEST
      )
    );

  let nursePlan;
  let price;
  try {
    // Retrieve the subscription plan from stripe for the host
    nursePlan = await stripe.plans.retrieve(
      subscriptionPricing[0].stripePlanId
    );
    price = await stripe.prices.retrieve(subscriptionPricing[0].stripePriceId);
  } catch (_) {
    // Create a subscription plan for the host on stripe
    nursePlan = await stripe.plans.create({
      amount: subscriptionPricing[0].amount * 100,
      currency: subscriptionPricing[0].currency,
      interval: subscriptionPricing[0].interval,
      product: {
        name: subscriptionPricing[0].product.name,
      },
    });

    // create a one time price for the one time subscription
    price = await stripe.prices.create({
      unit_amount: subscriptionPricing[0].amount * 100,
      currency: subscriptionPricing[0].currency,
      product: nursePlan.product,
    });

    // Update the pricing id on database
    await SubscriptionPricing.findByIdAndUpdate(
      subscriptionPricing[0]._id,
      {
        stripePlanId: nursePlan.id,
        stripeProductId: nursePlan.product,
        stripePriceId: price.id,
      },
      { new: true, runValidators: true }
    );
  }

  req.price = price;

  next();
});

exports.createSubCheckoutSession = catchAsync(async (req, res, next) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    cancel_url: process.env.FRONTEND_URL,
    success_url: process.env.FRONTEND_URL,
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

const createSubscriptionBookingProd = async (event) => {
  const nurse = await Nurse.findById(event.data.object.client_reference_id);

  const subscriptionPricing = await SubscriptionPricing.find({
    userRole: 'Nurse',
  });

  const charges = await stripe.charges.list({
    customer: nurse.stripeCustomerId,
    limit: 1,
  });
  let charge;
  if (charges.data[0]) {
    charge = charges.data[0];
  }

  let defaultPayment;
  if (charge) {
    defaultPayment = await stripe.paymentMethods.retrieve(
      charge.payment_method
    );
  }

  const plan = await stripe.plans.retrieve(subscriptionPricing[0].stripePlanId);

  const subscriptionBookingData = {
    subscriptionId: charge.id,
    subscriptionproductId: plan.id,
    subscriptionStatus: 'active',
    priceAmount: charge.amount / 100,
    currency: charge.currency,
    productId: plan.product,
    customerId: charge.customer,
    userId: nurse._id,
    customerRole: nurse.role,
    latestInvoiceId: charge.invoice,
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
    oneTimeSubscription: true,
    startedAt: new Date(charge.created * 1000),
    endsAt: new Date('9999-12-31T23:59:59'),
  };

  // // Create a subscription booking
  const foundedSubsciptionBooking = await Subscription.find({
    userId: nurse._id,
  });

  if (foundedSubsciptionBooking.length > 0) {
    await Subscription.findByIdAndDelete(foundedSubsciptionBooking[0]._id);
  }

  const subscriptionBooking = await Subscription.create(
    subscriptionBookingData
  );

  // update user and make it subscriber
  nurse.isSubscriber = true;
  nurse.subscription = subscriptionBooking._id;
  await nurse.save({ validateBeforeSave: false });
};

exports.listendToSubscriptionWebhook = catchAsync(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_NURSE_SUBSCRIPTION_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(CONST.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createSubscriptionBookingProd(event);
  }

  res.status(CONST.OK).json({
    recieved: true,
  });
});

const nurseSelectedFields = [
  '-stripeAccountId',
  '-stripeCustomerId',
  '-passwordResetToken',
  '-verificationToken',
  '-passwordChangetAt',
  '-passwordResetExpires',
  '-refreshToken',
];
exports.create = handlerFactory.createOne(Nurse, nurseSelectedFields);
exports.getAll = handlerFactory.getAll(Nurse, {
  select: nurseSelectedFields,
});
exports.getOne = handlerFactory.getOne(Nurse, {
  populate: [
    'reviews',
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
  select: nurseSelectedFields,
});
exports.updateOne = handlerFactory.updateOne(Nurse, nurseSelectedFields);
exports.deleteOne = handlerFactory.deleteOne(Nurse);
