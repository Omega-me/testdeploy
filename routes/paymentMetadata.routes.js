const { Router } = require('express');
const CONST = require('../common/constants');
const paymentMetadataController = require('../controllers/paymentMetadata.controller');

const router = Router();

router.post(CONST.FILTER, paymentMetadataController.filter);
router
  .route('/')
  .get(paymentMetadataController.getAll)
  .post(paymentMetadataController.create);
router
  .route('/:id')
  .get(paymentMetadataController.getOne)
  .patch(paymentMetadataController.updateOne)
  .delete(paymentMetadataController.deleteOne);

module.exports = router;
