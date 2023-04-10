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
router.get(
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
router.post(
  `${CONST.ADD_CARD}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.addDebitCard
);
router.post(
  `${CONST.REMOVE_CARD}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.removePaymentMethode
);
router.get(
  `${CONST.GET_PAYMENT_METHODES}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.getStripePaymentMethods
);
router.post(
  `${CONST.SET_DEFAULT_CARD}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.setDefaultPaymentMethode
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
router.post(
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
router.post(
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

router.get(
  CONST.ME,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostController.getMe,
  hostController.getOne
);
router.patch(
  CONST.UPDATE_ME_PROFIL_PICTURE,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostController.uploadUserPhoto,
  hostController.resizeUserPhoto,
  hostController.updateMe
);
router.patch(
  CONST.UPDATE_ME,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostController.updateMe
);
router.delete(
  CONST.DELETE_ME,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostController.deleteMe
);
router.post(
  CONST.EMAIL_UPDATE,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  hostAuth.changeEmail
);

router.route('/').get(hostController.getAll);

router.route('/:id').get(hostController.getOne);

module.exports = router;
