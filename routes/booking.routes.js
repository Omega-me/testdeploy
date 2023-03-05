const { Router } = require('express');
const bookingController = require('../controllers/booking.controller');
const CONST = require('../common/constants');

const router = Router();

router.post(CONST.FILTER, bookingController.filter);
router.route('/').get(bookingController.getAll).post(bookingController.create);
router
  .route('/:id')
  .get(bookingController.getOne)
  .patch(bookingController.updateOne)
  .delete(bookingController.deleteOne);

module.exports = router;
