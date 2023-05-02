const { Router } = require('express');
const conditional = require('express-conditional-middleware');
const chatController = require('../controllers/chat.controller');
const { checkLoginType } = require('../common/midlewares/checkLoginType');
const messageRouter = require('./message.routes');
const nurseAuth = require('../controllers/nurseAuth.controller');
const hostAuth = require('../controllers/hostAuth.controller');
const CONST = require('../common/constants');

const router = Router();

router.use('/:chatId/messages', messageRouter);

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
    chatController.getMyChats
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
    chatController.createChat,
    chatController.create
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
    chatController.checkifChatBelongsToUser,
    chatController.getOne
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
    chatController.checkifChatBelongsToUser,
    chatController.deleteOne
  );

module.exports = router;
