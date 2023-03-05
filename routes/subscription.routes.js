const { Router } = require('express');
const CONST = require('../common/constants');
const subscriptiontController = require('../controllers/subscription.controller');

const router = Router();

router.post(CONST.FILTER, subscriptiontController.filter);
router
  .route('/')
  .get(subscriptiontController.getAll)
  .post(subscriptiontController.create);
router
  .route('/:id')
  .get(subscriptiontController.getOne)
  .patch(subscriptiontController.updateOne)
  .delete(subscriptiontController.deleteOne);

module.exports = router;
