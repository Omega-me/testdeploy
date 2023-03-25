const { promisify } = require('util');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const Nurse = require('../models/nurse.model');
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
    displayName,
    email,
    dateOfBirth,
    licenseNumber,
    licenseType,
    password,
    passwordConfirm,
    phone,
    state,
  } = req.body;

  const userData = {
    displayName,
    email,
    dateOfBirth,
    licenseNumber,
    licenseType,
    password,
    passwordConfirm,
    phone,
    state,
  };
  let isSuccess = false;
  const createdUser = new Nurse(userData);
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
        await Nurse.findByIdAndDelete(createdUser.id);
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

  const nurse = await Nurse.findOne({
    verificationToken: encryptedToken.hashedToken,
  });

  if (!nurse) {
    return next(
      new AppError('Verification failed, invalid token!', CONST.BAD_REQUEST)
    );
  }

  if (nurse.isVerified) {
    return next(new AppError('This nurse is verified', CONST.FORBIDDEN));
  }

  nurse.verificationToken = undefined;
  nurse.isVerified = true;

  let customerName;
  if (nurse.firstName && nurse.lastName) {
    customerName = `${nurse.firstName} ${nurse.lastName}`;
  } else {
    customerName = nurse.displayName;
  }

  // create a stripe customer
  const customer = await stripe.customers.create({
    email: nurse.email,
    name: customerName,
  });
  nurse.stripeCustomerId = customer.id;

  await nurse.save({ validateBeforeSave: false });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    message: 'Nurse verified successfuly!',
  });
});

exports.connectToStripe = catchAsync(async (req, res, next) => {
  const user = await Nurse.findById(req.user._id);

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

  if (user.stripeCustomerId) {
    return next(new AppError('This user is connected', CONST.FORBIDDEN));
  }

  let customerName;
  if (user.firstName && user.lastName) {
    customerName = `${user.firstName} ${user.lastName}`;
  } else {
    customerName = user.displayName;
  }

  // create a stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: customerName,
  });
  user.stripeCustomerId = customer.id;

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

  const nurse = await Nurse.findOne({ email }).select('+password');
  if (!nurse) {
    return next(
      new AppError('E-mail or password is not correct!', CONST.BAD_REQUEST)
    );
  }
  if (!(await nurse.schema.methods.checkPassword(password, nurse.password))) {
    return next(
      new AppError('E-mail or password is not correct!', CONST.BAD_REQUEST)
    );
  }

  sendUserTokenSuccess(nurse, req, res);
});

exports.logOut = (_req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: {
      token: null,
    },
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

  const freshNurse = await Nurse.findById(decodedToken.id);
  if (!freshNurse) {
    return next(
      new AppError(
        'This token has expired, please login again!',
        CONST.UNAUTHORIZED
      )
    );
  }

  if (freshNurse.passwordChangetAfter(decodedToken.iat)) {
    return next(
      new AppError(
        'This nurse has changed the password lattely, please login again with the new password!',
        CONST.UNAUTHORIZED
      )
    );
  }

  req.user = freshNurse;
  next();
});

// password reset functionality
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const nurse = await Nurse.findOne({ email: req.body.email });
  if (!nurse) {
    return next(
      new AppError('Nurse with this email does not exists!', CONST.NOT_FOUND)
    );
  }

  if (nurse.isVerified === false) {
    return next(
      new AppError('Please verify your account!', CONST.UNAUTHORIZED)
    );
  }

  const passwordResetToken = await nurse.createPasswordResetToken();

  try {
    const isSuccess = await new Email(
      nurse,
      `${process.env.FRONTEND_URL}/changepassword/nurse/${passwordResetToken}`,
      'Failed to sent e-mail, please try again latter!',
      next
    ).sendPasswordReset();
    if (isSuccess) {
      await nurse.save({ validateBeforeSave: false });
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
    nurse.passwordResetToken = undefined;
    nurse.passwordResetExpires = undefined;
    await nurse.save({ validateBeforeSave: false });
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

  const nurse = await Nurse.findOne({
    passwordResetToken: token.hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!nurse) {
    return next(new AppError('Token is expired!', CONST.BAD_REQUEST));
  }

  if (nurse.isVerified === false) {
    return next(
      new AppError('Please verify your account!', CONST.UNAUTHORIZED)
    );
  }

  nurse.password = req.body.password;
  nurse.passwordConfirm = req.body.passwordConfirm;
  nurse.passwordResetExpires = undefined;
  nurse.passwordResetToken = undefined;
  await nurse.save();

  sendUserTokenSuccess(nurse, req, res);
});

// update password even if the user has not forget it
exports.updatepassword = catchAsync(async (req, res, next) => {
  const nurse = await Nurse.findById(req.user.id).select('+password');

  if (nurse.isVerified === false) {
    return next(
      new AppError('Please verify your account!', CONST.UNAUTHORIZED)
    );
  }

  const { password, passwordConfirm } = req.body;

  if (!nurse.checkPassword(passwordConfirm, nurse.password)) {
    return next(new AppError('Incorrect password!', CONST.BAD_REQUEST));
  }

  nurse.password = password;
  nurse.passwordConfirm = passwordConfirm;
  await nurse.save();

  sendUserTokenSuccess(nurse, req, res);
});

// refresh user token
exports.refresh = catchAsync(async (req, res, next) => {
  if (!req.user || !req.user.refreshToken) {
    return next(
      new AppError('You are not logged in, please login!', CONST.UNAUTHORIZED)
    );
  }
  const freshNurse = await Nurse.findOne({
    refreshToken: req.user.refreshToken,
  });
  await freshNurse.save({ validateBeforeSave: false });

  if (!freshNurse) {
    return next(
      new AppError('You are not logged in, please login!', CONST.UNAUTHORIZED)
    );
  }

  sendUserTokenSuccess(freshNurse, req, res);
});
