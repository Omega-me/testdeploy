const { Router } = require('express');
const CONST = require('../common/constants');
const nursePaymentController = require('../controllers/nursePayment.controller');

const router = Router();

router.post(CONST.FILTER, nursePaymentController.filter);
router
  .route('/')
  .get(nursePaymentController.getAll)
  .post(nursePaymentController.create);
router
  .route('/:id')
  .get(nursePaymentController.getOne)
  .patch(nursePaymentController.updateOne)
  .delete(nursePaymentController.deleteOne);

module.exports = router;
