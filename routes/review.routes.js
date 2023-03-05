const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const reviewController = require('../controllers/review.controller');
const { restrictTo } = require('../common/midlewares/restrict');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const nurseAuth = require('../controllers/nurseAuth.controller');
const hostAuth = require('../controllers/hostAuth.controller');
const CONST = require('../common/constants');

const router = Router({ mergeParams: true });

router.post(CONST.FILTER, reviewController.filter);
router
  .route('/')
  .get(reviewController.getAll)
  .post(
    checkLoginType,
    conditional(
      function (req, res, next) {
        return req.role === CONST.NURSE_ROLE;
      },
      nurseAuth.protect,
      hostAuth.protect
    ),
    restrictTo(CONST.NURSE_ROLE),
    reviewController.checkPropertyExistance,
    reviewController.create
  );
router
  .route('/:id')
  .get(reviewController.getOne)
  .patch(
    checkLoginType,
    conditional(
      function (req, res, next) {
        return req.role === CONST.NURSE_ROLE;
      },
      nurseAuth.protect,
      hostAuth.protect
    ),
    restrictTo(CONST.NURSE_ROLE),
    reviewController.checkPropertyExistance,
    reviewController.updateOne
  )
  .delete(
    checkLoginType,
    conditional(
      function (req, res, next) {
        return req.role === CONST.NURSE_ROLE;
      },
      nurseAuth.protect,
      hostAuth.protect
    ),
    restrictTo(CONST.NURSE_ROLE),
    reviewController.checkPropertyExistance,
    reviewController.deleteOne
  );

module.exports = router;
