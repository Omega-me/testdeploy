const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const bookingRequestController = require('../controllers/bookingRequest.controller');
const { restrictTo } = require('../common/midlewares/restrict');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const nurseAuth = require('../controllers/nurseAuth.controller');
const hostAuth = require('../controllers/hostAuth.controller');
const CONST = require('../common/constants');

const router = Router({ mergeParams: true });

router.post(
  `/:id${CONST.REJECT}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  bookingRequestController.checkIsSubscriber,
  bookingRequestController.checkPropertyBelongsToHost,
  bookingRequestController.reject,
  bookingRequestController.updateOne
);
router.post(
  `/:id${CONST.APPROVE}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  bookingRequestController.checkIsSubscriber,
  bookingRequestController.checkPropertyBelongsToHost,
  bookingRequestController.approve,
  bookingRequestController.updateOne
);
router.post(
  `/:id${CONST.ARCHIVE}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  bookingRequestController.checkIsSubscriber,
  bookingRequestController.checkPropertyBelongsToHost,
  bookingRequestController.archive,
  bookingRequestController.updateOne
);
router.post(
  `/:id${CONST.RESTORE}`,
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  restrictTo(CONST.HOST_ROLE),
  bookingRequestController.checkIsSubscriber,
  bookingRequestController.checkPropertyBelongsToHost,
  bookingRequestController.restore,
  bookingRequestController.updateOne
);

router.post(CONST.FILTER, bookingRequestController.filter);
router
  .route('/')
  .get(bookingRequestController.getAll)
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
    bookingRequestController.checkIsSubscriber,
    bookingRequestController.checkPropertyAvailable,
    bookingRequestController.create
  );
router
  .route('/:id')
  .get(bookingRequestController.getOne)
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
    bookingRequestController.checkIsSubscriber,
    bookingRequestController.checkRequestBelongsToNurse,
    bookingRequestController.controllUpdateData,
    bookingRequestController.updateOne
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
    bookingRequestController.checkIsSubscriber,
    bookingRequestController.checkRequestBelongsToNurse,
    bookingRequestController.deleteOne
  );

module.exports = router;
