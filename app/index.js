'use-strict';

/* eslint-disable import/no-extraneous-dependencies */

// core mdoules
const path = require('path');
// npm modules
const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
// const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

// my modules
const CONST = require('../common/constants');
const globalErrorHandler = require('../common/midlewares/globalErrorHandler');
const AppError = require('../common/utils/AppError');

// routers
const propertyRouter = require('../routes/property.routes');
const reviewRouter = require('../routes/review.routes');
const hostRouter = require('../routes/host.routes');
const nurseRouter = require('../routes/nurse.routes');
const nursePropertySaveRouter = require('../routes/nursePropertySave.routes');
const groupRentalRouter = require('../routes/groupRental.routes');
const subscriptionPricingRouter = require('../routes/subscriptionPricing.routes');
const subscriptionRouter = require('../routes/subscription.routes');
const bookingRouter = require('../routes/booking.routes');
const bookingRequestRouter = require('../routes/bookingRequest.routes');
const paymentMetadataRouter = require('../routes/paymentMetadata.routes');

// webhooks controllers
const bookingController = require('../controllers/booking.controller');
const hostController = require('../controllers/host.controller');
const nurseController = require('../controllers/nurse.controller');

// init app
const app = express();
app.enable('trust proxy');

// middlewares
app.use(
  cors({ origin: true, credentials: true, exposedHeaders: ['set-cookie'] })
);
app.options('*', cors());
process.env.NODE_ENV === 'development' && app.use(logger('dev'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use(helmet());
app.use(
  '/property-boooking-webhook',
  express.raw({ type: 'application/json' }),
  bookingController.listenTopropertyBookingWebhook
);
app.use(
  '/host/subscribe-webhook',
  express.raw({ type: 'application/json' }),
  hostController.listendToSubscriptionWebhook
);
app.use(
  '/subscribe/nurse',
  express.raw({ type: 'application/json' }),
  nurseController.listendToSubscriptionWebhook
);
// app.use(
//   '/nurse/subscribe-webhook',
//   express.raw({ type: 'application/json' }),
//   nurseController.listendToSubscriptionWebhook
// );
app.use(express.json());
app.use(cookieParser());
app.use(
  mongoSanitize({
    allowDots: true,
  })
);
app.use(xss());
app.use(hpp());
app.use(compression());

// routes
app.get('/', (req, res) => {
  res.status(200).json({
    status: CONST.SUCCESS,
    message: 'Welcome to nurses rent api!',
  });
});
app.get(CONST.BASE, (req, res) => {
  res.status(200).json({
    status: CONST.SUCCESS,
    message: 'Welcome to nurses rent api!',
  });
});

app.use(`${CONST.BASE}/${CONST.PROPERTIES}`, propertyRouter);
app.use(`${CONST.BASE}/${CONST.REVIEWS}`, reviewRouter);
app.use(`${CONST.BASE}/${CONST.HOST}`, hostRouter);
app.use(`${CONST.BASE}/${CONST.NURSE}`, nurseRouter);
app.use(`${CONST.BASE}/${CONST.SAVES}`, nursePropertySaveRouter);
app.use(`${CONST.BASE}/${CONST.GROUPS}`, groupRentalRouter);
app.use(`${CONST.BASE}/${CONST.PRICINGS}`, subscriptionPricingRouter);
app.use(`${CONST.BASE}/${CONST.SUBSCRIBTIONS}`, subscriptionRouter);
app.use(`${CONST.BASE}/${CONST.BOOKINGS}`, bookingRouter);
app.use(`${CONST.BASE}/${CONST.BOOKING_REQUESTS}`, bookingRequestRouter);
app.use(`${CONST.BASE}/${CONST.PAYMENT_METADATA}`, paymentMetadataRouter);

app.all('*', (req, res, next) => {
  next(
    new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      CONST.NOT_FOUND
    )
  );
});
// global error handler middleware
app.use(globalErrorHandler);

module.exports = app;
