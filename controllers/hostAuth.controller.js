const { promisify } = require('util');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const Host = require('../models/host.model');
const PaymentMetadata = require('../models/paymentMetadata.model');
const CONST = require('../common/constants');
const catchAsync = require('../common/utils/catchAsync');
const {
  sendUserTokenSuccess,
  signOrEncryptTokens,
} = require('../common/utils/index');
const AppError = require('../common/utils/AppError');
const Email = require('../common/utils/Email');

exports.signup = catchAsync(async (req, res, next) => {
  const {
    firstName,
    lastName,
    phone,
    email,
    password,
    passwordConfirm,
    dlNumber,
    expirationDate,
    state,
  } = req.body;
  const userData = {
    firstName,
    lastName,
    phone,
    email,
    password,
    passwordConfirm,
    dlNumber,
    expirationDate,
    state,
  };
  // create the user
  let isSuccess = false;
  const createdUser = new Host(userData);
  if (createdUser) {
    const verificationToken = await createdUser.createverifyToken();
    const user = await createdUser.save();
    if (user) {
      // send welcome email
      isSuccess = await new Email(
        createdUser,
        `${process.env.FRONTEND_URL}/verifyEmail/${verificationToken}`,
        'Currently we cannot create an account, please try again latter!',
        next
      ).sendWelcome();
      if (!isSuccess) {
        await Host.findByIdAndDelete(createdUser.id);
      } else {
        sendUserTokenSuccess(createdUser, req, res, CONST.CREATED);
      }
    }
  }
});

exports.sendVerifyAccountEmail = catchAsync(async (req, res, next) => {
  const { user } = req;

  if (user.isVerified) {
    return next(new AppError('This user e-mail is verified!', CONST.FORBIDDEN));
  }
  const verificationToken = await user.createverifyToken();
  const isSuccess = await new Email(
    user,
    `${process.env.FRONTEND_URL}/verifyEmail/${verificationToken}`,
    'E-mail sent failed, please try again latter!',
    next
  ).sendEmailVerification();

  if (isSuccess) {
    await user.save({ validateBeforeSave: false });
    return res.status(CONST.OK).json({
      status: CONST.SUCCESS,
      message: 'We have sent an e-mail with verification instructions.',
    });
  }
});

exports.verify = catchAsync(async (req, res, next) => {
  const { verificationToken } = req.params;

  const encryptedToken = await signOrEncryptTokens(verificationToken);

  const host = await Host.findOne({
    verificationToken: encryptedToken.hashedToken,
  });

  if (!host) {
    return next(
      new AppError('Verification failed, please try again!', CONST.UNAUTHORIZED)
    );
  }

  if (host.isVerified) {
    return next(new AppError('This host is verified', CONST.FORBIDDEN));
  }

  host.verificationToken = undefined;
  host.isVerified = true;

  const customer = await stripe.customers.create({
    email: host.email,
    name: `${host.firstName} ${host.lastName}`,
  });
  host.stripeCustomerId = customer.id;

  const paymentMetadata = await PaymentMetadata.create({
    host: req.user._id.toString(),
  });
  host.paymentMetadata = paymentMetadata._id.toString();

  await host.save({ validateBeforeSave: false });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'Host verified successfuly!',
  });
});

exports.connectToStripe = catchAsync(async (req, res, next) => {
  const user = await Host.findById(req.user._id);
  if (!user) {
    return next(
      new AppError(
        'Please login to add payment information!',
        CONST.UNAUTHORIZED
      )
    );
  }

  if (!user.isVerified) {
    return next(new AppError('Please verify email!', CONST.FORBIDDEN));
  }

  if (!user.stripeAccountId) {
    // create a stripe account
    const account = await stripe.accounts.create({
      type: 'custom',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: 8931,
        url: 'https://nursesrent.com/',
      },
    });
    user.stripeAccountId = account.id;
  }

  if (!user.stripeCustomerId) {
    // create a stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    });
    user.stripeCustomerId = customer.id;
  }

  const accountLink = await stripe.accountLinks.create({
    account: user.stripeAccountId,
    refresh_url: 'https://nursesrent.com/',
    return_url: 'https://nursesrent.com/',
    type: 'account_onboarding',
    collect: 'eventually_due',
  });

  user.isConnected = true;
  await user.save({ validateBeforeSave: false });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      connectUrl: accountLink.url,
    },
  });
});

exports.addDebitCard = catchAsync(async (req, res, next) => {
  const { user, body } = req;

  if (!user.stripeCustomerId) {
    return next(
      new AppError(
        'Please connect your account to stripe first',
        CONST.FORBIDDEN
      )
    );
  }

  const cardToken = await stripe.tokens.create({
    card: {
      name: body.nameOnCard,
      number: body.number,
      exp_month: body.expMonth,
      exp_year: body.expYear,
      cvc: body.cvc,
      currency: 'usd',
      default_for_currency: true,
    },
  });

  await stripe.accounts.createExternalAccount(user.stripeAccountId, {
    external_account: cardToken.id,
  });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'Debit card successfuly added to account',
  });
});

exports.removePaymentMethode = catchAsync(async (req, res, next) => {
  const { user, body } = req;

  if (!body.cardId) {
    return next(
      new AppError('Please send your card or bank account Id', CONST.FORBIDDEN)
    );
  }

  await stripe.accounts.deleteExternalAccount(
    user.stripeAccountId,
    body.cardId
  );

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'Successfuly removed.',
  });
});

exports.setDefaultPaymentMethode = catchAsync(async (req, res, next) => {
  const { user, body } = req;

  if (!body.cardId) {
    return next(
      new AppError('Please send your card or bank account Id', CONST.FORBIDDEN)
    );
  }

  await stripe.accounts.updateExternalAccount(
    user.stripeAccountId,
    body.cardId,
    {
      default_for_currency: true,
    }
  );

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'Successfuly set to default',
  });
});

exports.getStripePaymentMethods = catchAsync(async (req, res, next) => {
  if (!req.user.stripeAccountId) {
    return next(
      new AppError(
        'Please connect your account to stripe first',
        CONST.FORBIDDEN
      )
    );
  }

  const account = await stripe.accounts.retrieve(req.user.stripeAccountId);

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: { paymentMethodes: account.external_accounts.data },
  });
});

exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(
      new AppError('Please enter your e-mail or password!', CONST.BAD_REQUEST)
    );
  }

  const host = await Host.findOne({ email }).select('+password +isActive');
  if (!host) {
    return next(
      new AppError('E-mail or password is not correct!', CONST.BAD_REQUEST)
    );
  }

  if (!host.isActive) {
    return next(
      new AppError(
        'This account is disabled and not active, to enable it please contact the administrator.',
        CONST.UNAUTHORIZED
      )
    );
  }

  if (!(await host.schema.methods.checkPassword(password, host.password))) {
    return next(
      new AppError('E-mail or password is not correct!', CONST.BAD_REQUEST)
    );
  }

  sendUserTokenSuccess(host, req, res);
});

exports.logOut = (_req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 0.1 * 1000),
    httpOnly: true,
  });
  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
  });
};

// protect routes controller
exports.protect = catchAsync(async (req, res, next) => {
  let token = '';
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in, please log in!', CONST.UNAUTHORIZED)
    );
  }

  const decodedToken = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_KEY
  );

  const freshHost = await Host.findById(decodedToken.id);

  if (!freshHost) {
    return next(
      new AppError(
        'This token has expired, please login again!',
        CONST.UNAUTHORIZED
      )
    );
  }

  if (freshHost.passwordChangetAfter(decodedToken.iat)) {
    return next(
      new AppError(
        'This host has changed the password lattely, please login again with the new password!',
        CONST.UNAUTHORIZED
      )
    );
  }

  req.user = freshHost;
  next();
});

// password reset functionality
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const host = await Host.findOne({ email: req.body.email });
  if (!host) {
    return next(
      new AppError('Host with this email does not exists!', CONST.NOT_FOUND)
    );
  }

  if (!host.isActive) {
    return next(
      new AppError(
        'This account is blocked, to unblock it please contact the administrator.',
        CONST.UNAUTHORIZED
      )
    );
  }

  if (host.isVerified === false) {
    return next(
      new AppError('Please verify your account!', CONST.UNAUTHORIZED)
    );
  }

  const passwordResetToken = await host.createPasswordResetToken();

  try {
    const isSuccess = await new Email(
      host,
      `${process.env.FRONTEND_URL}/changepassword/host/${passwordResetToken}`,
      'Failed to sent e-mail, please try again latter!',
      next
    ).sendPasswordReset();
    if (isSuccess) {
      await host.save({ validateBeforeSave: false });
      res.status(CONST.OK).json({
        status: CONST.SUCCESS,
        message:
          'We have sent an email with instructions on how to change your password.',
      });
    }
  } catch (err) {
    host.passwordResetToken = undefined;
    host.passwordResetExpires = undefined;
    await host.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'Failed to sent e-mail, please try again latter!',
        CONST.INTERNAL_SERVER_ERROR
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const token = await signOrEncryptTokens(req.params.token);

  const host = await Host.findOne({
    passwordResetToken: token.hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!host) {
    return next(new AppError('Token is expired!', CONST.BAD_REQUEST));
  }

  if (host.isVerified === false) {
    return next(
      new AppError('Please verify your account!', CONST.UNAUTHORIZED)
    );
  }

  host.password = req.body.password;
  host.passwordConfirm = req.body.passwordConfirm;
  host.passwordResetExpires = undefined;
  host.passwordResetToken = undefined;
  await host.save();

  sendUserTokenSuccess(host, req, res);
});

// update password even if the user has not forget it
exports.updatepassword = catchAsync(async (req, res, next) => {
  const host = await Host.findById(req.user.id).select('+password');

  if (host.isVerified === false) {
    return next(
      new AppError('Please verify your account!', CONST.UNAUTHORIZED)
    );
  }

  const { password, passwordConfirm } = req.body;

  if (!host.checkPassword(passwordConfirm, host.password)) {
    return next(new AppError('Incorrect password!', CONST.BAD_REQUEST));
  }

  host.password = password;
  host.passwordConfirm = passwordConfirm;
  await host.save();

  sendUserTokenSuccess(host, req, res);
});

exports.changeEmail = catchAsync(async (req, res, next) => {
  const host = req.user;
  const { email } = req.body;

  if (email === host.email) {
    return next(
      new AppError(
        'Please use a different email address, this one is your actual email',
        CONST.BAD_REQUEST
      )
    );
  }

  const user = await Host.findById(host._id);
  if (!user) {
    return next(new AppError('User does not exists.', CONST.NOT_FOUND));
  }

  user.isVerified = false;
  user.email = email;

  const verificationToken = await user.createverifyToken();
  const isSuccess = await new Email(
    user,
    `${process.env.FRONTEND_URL}/verifyEmail/${verificationToken}`,
    'E-mail sent failed, please try again latter!',
    next
  ).sendEmailVerification();

  if (isSuccess) {
    await user.save({ validateBeforeSave: false });
    return sendUserTokenSuccess(user, req, res);
  }
});

// refresh user token
exports.refresh = catchAsync(async (req, res, next) => {
  if (!req.user || !req.user.refreshToken) {
    return next(
      new AppError('You are not logged in, please login!', CONST.UNAUTHORIZED)
    );
  }
  const freshHost = await Host.findOne({ refreshToken: req.user.refreshToken });
  await freshHost.save({ validateBeforeSave: false });

  if (!freshHost) {
    return next(
      new AppError('You are not logged in, please login!', CONST.UNAUTHORIZED)
    );
  }

  sendUserTokenSuccess(freshHost, req, res);
});
