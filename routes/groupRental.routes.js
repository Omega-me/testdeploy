const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const groupRentalController = require('../controllers/groupRental.controller');
const CONST = require('../common/constants');
const { restrictTo } = require('../common/midlewares/restrict');
const hostAuth = require('../controllers/hostAuth.controller');
const nurseAuth = require('../controllers/nurseAuth.controller');
const { checkLoginType } = require('../common/midlewares/checkLoginType');

const router = Router();

router.post(CONST.FILTER, groupRentalController.filter);
router
  .route('/')
  .get(groupRentalController.getAll)
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
    groupRentalController.checkPropertyType,
    groupRentalController.create
  );
router
  .route('/:id')
  .get(groupRentalController.getOne)
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
    groupRentalController.checkPropertyType,
    groupRentalController.updateOne
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
    groupRentalController.deleteOne
  );

module.exports = router;
