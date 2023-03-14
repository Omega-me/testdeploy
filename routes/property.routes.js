const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const propertyController = require('../controllers/property.controller');
const reviewRouter = require('./review.routes');
const { restrictTo } = require('../common/midlewares/restrict');
const hostAuth = require('../controllers/hostAuth.controller');
const nurseAuth = require('../controllers/nurseAuth.controller');
const CONST = require('../common/constants');
const { checkLoginType } = require('../common/midlewares/checkLoginType');

const router = Router();

router.post(CONST.FILTER, propertyController.filter);
router.get('/property-stats', propertyController.getPropertyStats);
router.get('/property-within', propertyController.getPropertiesWithin);
router.get(
  '/top-4-rooms',
  propertyController.findTop4Rooms,
  propertyController.filter
);
router.get(
  '/top-2-groups',
  propertyController.findTop2Groups,
  propertyController.filter
);
// /property-within?distance=233&center=-40,45&unit=mi

router.use('/:propertyId/reviews', reviewRouter);

router.patch(
  '/photo/:id',
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  propertyController.uploadPropertyImages,
  propertyController.resizePropertyImages,
  propertyController.updateOne
);
router
  .route('/')
  .get(propertyController.getAll)
  .post(
    checkLoginType,
    conditional(
      function (req, res, next) {
        return req.role === CONST.NURSE_ROLE;
      },
      nurseAuth.protect,
      hostAuth.protect
    ),
    restrictTo(CONST.HOST_ROLE),
    propertyController.create
  );
router
  .route('/:id')
  .get(propertyController.getOne)
  .patch(
    checkLoginType,
    conditional(
      function (req, res, next) {
        return req.role === CONST.NURSE_ROLE;
      },
      nurseAuth.protect,
      hostAuth.protect
    ),
    restrictTo(CONST.HOST_ROLE),
    propertyController.updateOne
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
    restrictTo(CONST.HOST_ROLE),
    propertyController.deleteOne
  );

module.exports = router;
