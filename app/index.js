'use-strict';

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

// webhooks controllers
const hostController = require('../controllers/host.controller');

// init app
const app = express();
// const limiter = rateLimit({
//     max: 100,
//     windowMs: 60 * 60 * 1000,
//     message: 'To many request from this IP, please try again in one hour!',
// });

// middlewares
app.use(helmet()); // set security HTTP headers
process.env.NODE_ENV === 'development' && app.use(logger('dev'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(cors({ origin: true, credentials: true }));
// app.use(`${CONST.API_ROUTE}/${CONST.USERS}`, limiter); // limit requests from the same api
app.use('/public', express.static(path.join(__dirname, '../public')));
// Stripe webhook endpoints
app.use(
  '/host/subscribe-webhook',
  express.raw({ type: 'application/json' }),
  hostController.listendToSubscriptionWebhook
);
app.use(express.json());
app.use(cookieParser());
app.use(
  mongoSanitize({
    allowDots: true,
  })
); // Data sanitization againts NsSQL injection
app.use(xss()); // Data sanitization againts XSS
app.use(hpp()); // Prevent parameterr pollution

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
