const mongoose = require('mongoose');
const Nurse = require('./nurse.model');
const CONST = require('../common/constants');

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: 'Chat',
    },
    sender: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    typeSender: {
      type: String,
      enum: [CONST.NURSE_ROLE, CONST.NURSE_ROLE],
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

messageSchema.pre('save', async function (next) {
  const nurse = await Nurse.findById(this.sender);

  if (!nurse) {
    this.typeSender = CONST.HOST_ROLE;
    return next();
  }
  this.typeSender = CONST.NURSE_ROLE;
  next();
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
