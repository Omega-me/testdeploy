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
  restrictTo(CONST.NURSE_ROLE),
  nurseAuth.connectToStripe
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
  restrictTo(CONST.NURSE_ROLE),
  nurseController.checkValidToSubscribe,
  nurseController.createSubscriptionPlan,
  nurseController.createSubCheckoutSession
);
router.post(
  '/subscription-booking',
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
  restrictTo(CONST.NURSE_ROLE),
  nurseController.getMe,
  nurseController.getOne
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
  restrictTo(CONST.NURSE_ROLE),
  nurseController.uploadUserPhoto,
  nurseController.resizeUserPhoto,
  nurseController.updateMe
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
  restrictTo(CONST.NURSE_ROLE),
  nurseController.updateMe
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
  restrictTo(CONST.NURSE_ROLE),
  nurseController.deleteMe
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
  restrictTo(CONST.NURSE_ROLE),
  nurseAuth.changeEmail
);

router.route('/').get(nurseController.getAll);
router.route('/:id').get(nurseController.getOne);

module.exports = router;
