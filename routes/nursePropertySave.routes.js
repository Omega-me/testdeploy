const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const { restrictTo } = require('../common/midlewares/restrict');
const hostAuth = require('../controllers/hostAuth.controller');
const nurseAuth = require('../controllers/nurseAuth.controller');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const CONST = require('../common/constants');
const nursePropertySaveController = require('../controllers/nursePropertySave.controller');

const router = Router({ mergeParams: true });

router.post(
  CONST.FILTER,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.NURSE_ROLE),
  nursePropertySaveController.filter
);

router
  .route('/')
  .get(
    checkLoginType,
    conditional(
      function (req, res, next) {
        return req.role === CONST.NURSE_ROLE;
      },
      nurseAuth.protect,
      hostAuth.protect
    ),
    restrictTo(CONST.NURSE_ROLE),
    nursePropertySaveController.getAll
  )
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
    nursePropertySaveController.create
  );
router
  .route('/:id')
  .get(
    checkLoginType,
    conditional(
      function (req, res, next) {
        return req.role === CONST.NURSE_ROLE;
      },
      nurseAuth.protect,
      hostAuth.protect
    ),
    restrictTo(CONST.NURSE_ROLE),
    nursePropertySaveController.getOne
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
    nursePropertySaveController.deleteOne
  );

module.exports = router;
