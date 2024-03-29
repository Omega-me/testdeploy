const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const bookingController = require('../controllers/booking.controller');
const nurseAuth = require('../controllers/nurseAuth.controller');
const hostAuth = require('../controllers/hostAuth.controller');
const { restrictTo } = require('../common/midlewares/restrict');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const CONST = require('../common/constants');

const router = Router();

router.post(
  `${CONST.CREATE_BOOKING_CHECKOUT_SESSION}/:bookingRequestId`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.NURSE_ROLE),
  bookingController.checkPropertyExistsAndValid,
  bookingController.cratePropertyBookingCheckout
);
router.post(
  `/create-booking-test/:sessionId`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.NURSE_ROLE),
  bookingController.createPropertyBookingTest
);
router.patch(
  `/:bookingId${CONST.CHECK_IN}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  bookingController.checkIn
);
router.patch(
  `/:bookingId${CONST.CHECK_OUT}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  bookingController.checkOut
);
router.post(
  `/:bookingId/${CONST.NURSE_ROLE}/:operationParam`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.NURSE_ROLE),
  bookingController.archiveRestoreBookingNurse
);
router.post(
  `/:bookingId/${CONST.HOST_ROLE}/:operationParam`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  bookingController.archiveRestoreBookingHost
);

router.post(CONST.FILTER, bookingController.filter);
router.route('/').get(bookingController.getAll);
router.route('/:id').get(bookingController.getOne);

module.exports = router;
