/* eslint-disable no-console */
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const multer = require('multer');
const sharp = require('sharp');
const handlerFactory = require('../common/midlewares/handlerFactory');
const SubscriptionPricing = require('../models/subscriptionsPricing.model');
const Subscription = require('../models/subscription.model');
// const PaymentMetadata = require('../models/paymentMetadata.model');
const catchAsync = require('../common/utils/catchAsync');
const Nurse = require('../models/nurse.model');
const AppError = require('../common/utils/AppError');
const {
  filterBodyObject,
  createNurseDataForUpdate,
  isObjectEmpty,
} = require('../common/utils');
const CONST = require('../common/constants');

exports.checkValidToSubscribe = catchAsync(async (req, res, next) => {
  if (!req.user.stripeCustomerId) {
    return next(
      new AppError(
        'User not valid, please connect your account for subscription.',
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
    // Retrieve the subscription plan from stripe for the nurse
    nursePlan = await stripe.plans.retrieve(
      subscriptionPricing[0].stripePlanId
    );
    price = await stripe.prices.retrieve(subscriptionPricing[0].stripePriceId);
  } catch (_) {
    // Create a subscription plan for the nurse on stripe
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
      subscriptionPricing[0]?._id,
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
  let successUrl = `${process.env.FRONTEND_URL}?sessionId={CHECKOUT_SESSION_ID}`;
  if (process.env.NODE_ENV === CONST.PROD) {
    successUrl = process.env.FRONTEND_URL;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
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
  // const session = await stripe.checkout.sessions.retrieve(sessionId, {
  //   expand: ['payment_intent', 'customer'],
  // });

  // const nurse = await Nurse.findById(session.client_reference_id);

  // const subscriptionPricing = await SubscriptionPricing.find({
  //   userRole: 'Nurse',
  // });

  // const charges = await stripe.charges.list({
  //   customer: nurse?.stripeCustomerId,
  //   limit: 1,
  // });

  // let charge;
  // if (charges?.data[0]) {
  //   charge = charges?.data[0];
  // }

  // let defaultPayment;
  // if (charge) {
  //   defaultPayment = await stripe.paymentMethods.retrieve(
  //     charge?.payment_method
  //   );
  // }

  // const plan = await stripe.plans.retrieve(
  //   subscriptionPricing[0]?.stripePlanId
  // );

  // const subscriptionBookingData = {
  //   subscriptionId: charge?.id,
  //   subscriptionproductId: plan?.id,
  //   subscriptionStatus: 'active',
  //   priceAmount: charge?.amount && charge.amount / 100,
  //   currency: charge?.currency,
  //   productId: plan?.product,
  //   customerId: charge?.customer,
  //   userId: nurse?._id,
  //   customerRole: nurse?.role,
  //   latestInvoiceId: charge?.invoice,
  //   email: defaultPayment?.billing_details?.email,
  //   name: defaultPayment?.billing_details?.name,
  //   brand: defaultPayment?.card.brand,
  //   country: defaultPayment?.card?.country,
  //   expMonth: defaultPayment?.card?.exp_month,
  //   expYear: defaultPayment?.card?.exp_year,
  //   funding: defaultPayment?.card?.funding,
  //   last4: defaultPayment?.card?.last4,
  //   created: defaultPayment?.created && new Date(defaultPayment.created * 1000),
  //   type: defaultPayment?.type,
  //   oneTimeSubscription: true,
  //   startedAt: charge?.created && new Date(charge.created * 1000),
  //   endsAt: new Date('9999-12-31T23:59:59'),
  // };

  // // Create a subscription booking
  // const foundedSubsciptionBooking = await Subscription.find({
  //   userId: nurse._id,
  // });

  // if (foundedSubsciptionBooking.length > 0) {
  //   await Subscription.findByIdAndDelete(foundedSubsciptionBooking[0]._id);
  // }

  // const subscriptionBooking = await Subscription.create(
  //   subscriptionBookingData
  // );

  // // update user and make it subscriber
  // nurse.isSubscriber = true;
  // nurse.subscription = subscriptionBooking._id;
  // await nurse.save({ validateBeforeSave: false });
  console.log(sessionId);
};

const createSaveMetadata = async (session) => {
  const nurse = await Nurse.findById(session.client_reference_id);

  console.log(nurse);

  // if (!nurse.paymentMetadata.toString()) {
  //   console.log('no payment');
  // } else {
  //   console.log('2', nurse.paymentMetadata);
  // }
};

exports.createSubscriptionBookingTestSolution = catchAsync(
  async (req, res, next) => {
    const { sessionId } = req.query;
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });

    const nurse = await Nurse.findById(session.client_reference_id);

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

    const plan = await stripe.plans.retrieve(
      subscriptionPricing[0].stripePlanId
    );

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

    res.status(CONST.OK).json({
      status: CONST.SUCCESS,
      data: { session, nurse },
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
      process.env.STRIPE_NURSE_SUBSCRIPTION_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(CONST.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('session completed');
    createSubscriptionBooking(event.data.object.id);
    createSaveMetadata(event.data.object);
  }

  res.status(CONST.OK).json({
    recieved: true,
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req?.user?._id;
  req.query.populate = [
    'reviews',
    {
      path: 'bookings',
      select: ['-payment_id', '-__v'],
    },
  ];
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

  req.file.filename = `user-${req?.user?._id}-${Date.now()}.jpeg`;
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
    'displayName',
    'firstName',
    'lastName',
    'phone',
    'dateOfBirth',
    'state',
    'homeTown',
    'dreamJob',
    'travelWithPet',
    'about',
    'speciality',
    'favouriteStateToWork',
    'certification',
    'professionalTravelingSince',
    'current',
    'currentEmployer',
    'favouriteUnitType',
    'transportationMethod',
    'reviewAndPreferences',
    'myCity',
    'topThreeCities',
    'licenseType',
    'licenseNumber'
  );
  const data = createNurseDataForUpdate(filteredBody);
  if (req.file) data.profilePicture = req.file.filename;

  if (isObjectEmpty(data.propertyRental.workExperience)) {
    delete data.propertyRental.workExperience;
  }
  if (isObjectEmpty(data.propertyRental.travelingPreferences)) {
    delete data.propertyRental.travelingPreferences;
  }
  if (isObjectEmpty(data.propertyRental)) {
    delete data.propertyRental;
  }
  if (isObjectEmpty(data.favouriteProperties)) {
    delete data.favouriteProperties;
  }

  const updatedUser = await Nurse.findByIdAndUpdate(req?.user?._id, data, {
    new: true,
    runValidators: true,
  });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await Nurse.findByIdAndUpdate(req?.user?._id, { isActive: false });

  res.status(CONST.NO_CONTENT).json({
    status: CONST.SUCCESS,
    data: null,
  });
});

const nurseSelectedFields = [
  '-passwordResetToken',
  '-verificationToken',
  '-passwordChangetAt',
  '-passwordResetExpires',
  '-refreshToken',
];
exports.getAll = handlerFactory.getAll(Nurse, {
  select: nurseSelectedFields,
});
exports.getOne = handlerFactory.getOne(Nurse, {
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
  select: nurseSelectedFields,
});
