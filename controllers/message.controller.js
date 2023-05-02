const handlerFactory = require('../common/midlewares/handlerFactory');
const AppError = require('../common/utils/AppError');
const catchAsync = require('../common/utils/catchAsync');
const Messages = require('../models/message.model');
const Chat = require('../models/chat.model');
const CONST = require('../common/constants');

exports.createMessage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { chatId } = req.params;

  const chatRoom = await Chat.findById(chatId);

  if (!chatRoom) {
    return next(new AppError('No such chat exists', CONST.NOT_FOUND));
  }

  if (user.role === CONST.NURSE_ROLE) {
    if (chatRoom.nurse.toString() !== user._id.toString()) {
      return next(
        new AppError('This chat does not belongs to you', CONST.FORBIDDEN)
      );
    }
  } else if (user.role === CONST.HOST_ROLE) {
    if (chatRoom.host.toString() !== user._id.toString()) {
      return next(
        new AppError('This chat does not belongs to you', CONST.FORBIDDEN)
      );
    }
  }

  req.body.sender = user._id;
  req.body.chat = chatId;

  next();
});

exports.create = handlerFactory.createOne(Messages);
