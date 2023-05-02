const handlerFactory = require('../common/midlewares/handlerFactory');
const catchAsync = require('../common/utils/catchAsync');
const Chat = require('../models/chat.model');
const CONST = require('../common/constants');
const AppError = require('../common/utils/AppError');

exports.checkifChatBelongsToUser = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { id } = req.params;

  const chat = await Chat.findById(id);

  if (user.role === CONST.NURSE_ROLE) {
    if (chat.nurse.toString() !== user._id.toString()) {
      return next(
        new AppError('This chat does not belongs to you', CONST.FORBIDDEN)
      );
    }
  } else if (user.role === CONST.HOST_ROLE) {
    if (chat.host.toString() !== user._id.toString()) {
      return next(
        new AppError('This chat does not belongs to you', CONST.FORBIDDEN)
      );
    }
  }
  next();
});

exports.getMyChats = catchAsync(async (req, res, next) => {
  const { user } = req;
  const populateOptions = [
    'messages',
    { path: 'nurse', select: ['displayName', 'profilePicture'] },
    { path: 'host', select: ['firstName', 'lastName', 'profilePicture'] },
  ];

  let chats;
  if (req.role === CONST.NURSE_ROLE) {
    chats = await Chat.find({ nurse: user._id }).populate(populateOptions);
  } else if (req.role === CONST.HOST_ROLE) {
    chats = await Chat.find({ host: user._id }).populate(populateOptions);
  }

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    data: chats,
    results: chats.length,
  });
});

exports.createChat = catchAsync(async (req, res, next) => {
  const { user } = req;

  if (req.role === CONST.NURSE_ROLE) {
    req.body.nurse = user._id;
  } else if (req.role === CONST.HOST_ROLE) {
    req.body.host = user._id;
  }

  const chats = await Chat.find({ host: req.body.host, nurse: req.body.nurse });
  if (chats.length > 0) {
    return next(
      new AppError('A chat between this host and nurse exists', CONST.FORBIDDEN)
    );
  }

  next();
});

const option = {
  populate: [
    { path: 'messages', select: ['sender', 'createdAt', 'message'] },
    { path: 'nurse', select: ['displayName', 'profilePicture'] },
    { path: 'host', select: ['firstName', 'lastName', 'profilePicture'] },
  ],
};
exports.create = handlerFactory.createOne(Chat);
exports.getOne = handlerFactory.getOne(Chat, option);
exports.deleteOne = handlerFactory.deleteOne(Chat);
