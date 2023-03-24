const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const CONST = require('../common/constants');
const hostAuth = require('../controllers/hostAuth.controller');
const hostController = require('../controllers/host.controller');
const nurseAuth = require('../controllers/nurseAuth.controller');
const { restrictTo } = require('../common/midlewares/restrict');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const propertyRouter = require('./property.routes');
const groupRouter = require('./groupRental.routes');

const router = Router();

router.use('/:hostId/properties', propertyRouter);
router.use('/:hostId/groups', groupRouter);

// auth routes
router.post(CONST.SIGNUP, hostAuth.signup);

router.post(
  CONST.VERIFYACCOUNT,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.sendVerifyAccountEmail
);

router.post(
  `${CONST.VERIFYACCOUNT}/:verificationToken`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.verify
);
router.post(
  `${CONST.CONNECT_TO_STRIPE}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.connectToStripe
);

router.post(CONST.SIGNIN, hostAuth.signin);

router.post(
  CONST.REFRESHUSER,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.refresh
);

router.post(CONST.FORGOTPASSWORD, hostAuth.forgotPassword);

router.post(`${CONST.RESETPASSWORD}/:token`, hostAuth.resetPassword);

router.post(
  CONST.UPDATEPASSWORD,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.updatepassword
);

router.post(CONST.LOGOUT, hostAuth.logOut);

// Subscriptions and payments
router.get(
  CONST.SUBSCRIBE,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostController.checkValidToSubscribe,
  hostController.createSubscriptionPlan,
  hostController.createSubCheckoutSession
);
router.get(
  `${CONST.SUBSCRIBE}/${CONST.CANCEL}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostController.cancelSubscription
);

router.route('/').get(hostController.getAll);
// .post(hostController.create);
router.route('/:id').get(hostController.getOne);
// .patch(hostController.updateOne)
// .delete(hostController.deleteOne);

module.exports = router;
