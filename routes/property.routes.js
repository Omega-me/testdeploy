const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const propertyController = require('../controllers/property.controller');
const reviewRouter = require('./review.routes');
const { restrictTo } = require('../common/midlewares/restrict');
const hostAuth = require('../controllers/hostAuth.controller');
const nurseAuth = require('../controllers/nurseAuth.controller');
const CONST = require('../common/constants');
const { checkLoginType } = require('../common/midlewares/checkLoginType');

const router = Router({ mergeParams: true });

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
router.get(
  '/featured-properties',
  propertyController.findFeaturedProperties,
  propertyController.filter
);
router.get(
  '/featured-group',
  propertyController.findFeaturedGroup,
  propertyController.filter
);
// /property-within?distance=233&center=-40,45&unit=mi

router.get('/get-state-city', propertyController.getCountryAndCities);

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
  propertyController.checkIfPropertyBelongsToUser,
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
    propertyController.checkIfGroupExists,
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
    propertyController.checkIfPropertyBelongsToUser,
    propertyController.checkIfGroupExists,
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
    propertyController.checkIfPropertyBelongsToUser,
    propertyController.deleteOne
  );

module.exports = router;
