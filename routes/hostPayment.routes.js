const { Router } = require('express');
const CONST = require('../common/constants');
const hostPaymentController = require('../controllers/hostPayment.controller');

const router = Router();

router.post(CONST.FILTER, hostPaymentController.filter);
router
  .route('/')
  .get(hostPaymentController.getAll)
  .post(hostPaymentController.create);
router
  .route('/:id')
  .get(hostPaymentController.getOne)
  .patch(hostPaymentController.updateOne)
  .delete(hostPaymentController.deleteOne);

module.exports = router;
