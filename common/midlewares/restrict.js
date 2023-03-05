const AppError = require('../utils/AppError');
const CONST = require('../constants');

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.params.verificationToken && !req.user.isVerified) {
      return next(
        new AppError('Please Verify your email!', CONST.UNAUTHORIZED)
      );
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You are not authorised!', CONST.FORBIDDEN));
    }
    next();
  };
