/* eslint-disable no-console */
const CONST = require('../constants');
const AppError = require('../utils/AppError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, CONST.BAD_REQUEST);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, CONST.CONFLICT);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, CONST.CONFLICT);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', CONST.UNAUTHORIZED);

const handleJWTExpiredError = () =>
  new AppError(
    'Your token has expired! Please log in again.',
    CONST.UNAUTHORIZED
  );

const sendErrorDev = (err, req, res) => {
  const error = new AppError(err.message, err.statusCode);
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: error.status,
      error,
      statusCode: err.statusCode,
      message: error.message,
      stack: error.stack,
    });
  }

  // B) RENDERED WEBSITE
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went very wrong!',
    statusCode: err.statusCode,
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        statusCode: err.statusCode,
        message: err.message,
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(CONST.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      statusCode: CONST.INTERNAL_SERVER_ERROR,
      message: 'Something went very wrong!',
    });
  }

  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error('ERROR 💥', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went very wrong!',
    statusCode: err.statusCode,
    msg: 'Please try again later.',
  });
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || CONST.INTERNAL_SERVER_ERROR;
  err.status = err.status || CONST.ERROR;

  if (process.env.NODE_ENV === CONST.DEV) {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === CONST.PROD) {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    if (error.name === CONST.CASTERROR) error = handleCastErrorDB(error);
    if (error.code === CONST.DUBLICATEFIELDERROR)
      error = handleDuplicateFieldsDB(error);
    if (error.name === CONST.VALIDATIONERROR)
      error = handleValidationErrorDB(error);
    if (error.name === CONST.JSONWEBTOKENERROR) error = handleJWTError();
    if (error.name === CONST.TOKENEXPIREDERROR) error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

module.exports = globalErrorHandler;
