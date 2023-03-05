const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const nurseAuth = require('../controllers/nurseAuth.controller');
const hostAuth = require('../controllers/hostAuth.controller');
const nurseController = require('../controllers/nurse.controller');
const nursePropertySaveRouter = require('./nursePropertySave.routes');
const { restrictTo } = require('../common/midlewares/restrict');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const CONST = require('../common/constants');

const router = Router();

router.use('/property/saves', nursePropertySaveRouter);

// auth routes
router.post(CONST.SIGNUP, nurseAuth.signup);

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
  restrictTo(CONST.NURSE_ROLE),
  nurseAuth.sendVerifyAccountEmail
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
  restrictTo(CONST.NURSE_ROLE),
  nurseAuth.verify
);

router.post(CONST.SIGNIN, nurseAuth.signin);

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
  restrictTo(CONST.NURSE_ROLE),
  nurseAuth.refresh
);

router.post(CONST.FORGOTPASSWORD, nurseAuth.forgotPassword);
router.post(`${CONST.RESETPASSWORD}/:token`, nurseAuth.resetPassword);

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
  restrictTo(CONST.NURSE_ROLE),
  nurseAuth.updatepassword
);

router.post(CONST.LOGOUT, nurseAuth.logOut);

// Subscriptions and payments
router.get(
  CONST.CREATE_SUBSCRIPTION_PLAN,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.NURSE_ROLE),
  nurseController.checkValidToSubscribe,
  nurseController.createSubscriptionPlan
);

router.get(
  `${CONST.CREATE_SUBSCRIPTION_CHECKOUT_SESSION}/:priceId`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.NURSE_ROLE),
  nurseController.checkValidToSubscribe,
  nurseController.getSubscriptionPlanPrice,
  nurseController.createSubCheckoutSession
);

router.get(
  `${CONST.CREATE_SUBSCRIPTION_BOOKING}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.NURSE_ROLE),
  nurseController.createSubscriptionBooking
);

router.route('/').get(nurseController.getAll);
// .post(nurseController.create);
router.route('/:id').get(nurseController.getOne);
// .patch(nurseController.updateOne)
// .delete(nurseController.deleteOne);

module.exports = router;
