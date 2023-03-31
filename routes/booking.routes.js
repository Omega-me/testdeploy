const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const bookingController = require('../controllers/booking.controller');
const nurseAuth = require('../controllers/nurseAuth.controller');
const hostAuth = require('../controllers/hostAuth.controller');
const { restrictTo } = require('../common/midlewares/restrict');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const CONST = require('../common/constants');

const router = Router();

router.get(
  `${CONST.CREATE_BOOKING_CHECKOUT_SESSION}/:propertyId`,
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
// router.get(
//   `${CONST.CREATE_BOOKING}/:sessionId`,
//   checkLoginType,
//   conditional(
//     function (req, res, next) {
//       return req.role === CONST.NURSE_ROLE;
//     },
//     nurseAuth.protect,
//     hostAuth.protect
//   ),
//   restrictTo(CONST.NURSE_ROLE),
//   bookingController.createPropertyBooking
// );
router.patch(
  `${CONST.CREATE_BOOKING}${CONST.CHECK_IN}/:bookingId`,
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
  `${CONST.CREATE_BOOKING}${CONST.CHECK_OUT}/:bookingId`,
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

router.post(CONST.FILTER, bookingController.filter);
router.route('/').get(bookingController.getAll);
router.route('/:id').get(bookingController.getOne);

module.exports = router;
