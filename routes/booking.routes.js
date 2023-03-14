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
  `${CONST.CREATE_BOOKING_CHECKOUT}/:propertyId`,
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

router.post(CONST.FILTER, bookingController.filter);
router.route('/').get(bookingController.getAll);
// .post(bookingController.create);
router.route('/:id').get(bookingController.getOne);
// .patch(bookingController.updateOne)
// .delete(bookingController.deleteOne);

module.exports = router;
