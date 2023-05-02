const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const messagesController = require('../controllers/message.controller');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const nurseAuth = require('../controllers/nurseAuth.controller');
const hostAuth = require('../controllers/hostAuth.controller');
const CONST = require('../common/constants');

const router = Router({ mergeParams: true });

router.route('/').post(
  checkLoginType,
  conditional(
    function (req, res, next) {
      return req.role === CONST.NURSE_ROLE;
    },
    nurseAuth.protect,
    hostAuth.protect
  ),
  messagesController.createMessage,
  messagesController.create
);

module.exports = router;
