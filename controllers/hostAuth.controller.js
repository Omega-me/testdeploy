const { promisify } = require('util');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const Host = require('../models/host.model');
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
    if (process.env.NODE_ENV === CONST.DEV && !user.isVerified) {
      return res.status(CONST.OK).json({
        status: CONST.SUCCESS,
        message: 'We have sent an e-mail with verification instructions.',
      });
    }
    res.status(CONST.OK).json({
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

  if (user.stripeAccountId && user.stripeCustomerId) {
    return next(new AppError('This user is connected', CONST.FORBIDDEN));
  }

  if (!user.stripeAccountId) {
    const { dateOfBirth, address, ssnLast4, tosAcceptanceIp } = req.body;
    if (!tosAcceptanceIp) {
      return next(
        new AppError('You need to accept terms and conditions', CONST.FORBIDDEN)
      );
    }
    const dob = new Date(dateOfBirth);

    // create a stripe account
    const account = await stripe.accounts.create({
      type: 'custom',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      company: {
        name: `${user.firstName} ${user.lastName}`,
      },
      business_type: 'individual',
      business_profile: {
        mcc: 8931,
        url: 'https://nursesrent.com/',
      },
      tos_acceptance: {
        ip: tosAcceptanceIp,
        date: Math.floor(Date.now() / 1000),
      },
      individual: {
        first_name: user.firstName,
        last_name: user.lastName,
        dob: {
          day: dob.getDay(),
          month: dob.getMonth(),
          year: dob.getFullYear(),
        },
        address: {
          line1: address.line1,
          postal_code: address.postalCode,
          city: address.city,
          state: address.state,
        },
        email: user.email,
        phone: user.phone,
        ssn_last_4: ssnLast4,
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

  await user.save({ validateBeforeSave: false });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      messagge: 'User connected successfuly',
    },
  });
});

exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(
      new AppError('Please enter your e-mail or password!', CONST.BAD_REQUEST)
    );
  }

  const host = await Host.findOne({ email }).select('+password');
  if (!host) {
    return next(
      new AppError('E-mail or password is not correct!', CONST.BAD_REQUEST)
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
      if (process.env.NODE_ENV === CONST.DEV) {
        return res.status(CONST.OK).json({
          status: CONST.SUCCESS,
          message:
            'We have sent an email with instructions on how to change your password.',
        });
      }

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
