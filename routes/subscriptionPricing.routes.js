const { Router } = require('express');
const subscriptionPricingController = require('../controllers/subscriptionPricing.controller');
// const CONST = require('../common/constants');

const router = Router();

// router.post(CONST.FILTER, subscriptionPricingController.filter);
router
  .route('/')
  .get(subscriptionPricingController.getAll)
  .post(subscriptionPricingController.create); // TODO: remove create route in the end
router.route('/:id').get(subscriptionPricingController.getOne);
// .patch(subscriptionPricingController.updateOne)
// .delete(subscriptionPricingController.deleteOne);

module.exports = router;
