const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.ObjectId,
      ref: 'Host',
      required: [true, 'A chat must have a host'],
    },
    nurse: {
      type: mongoose.Schema.ObjectId,
      ref: 'Nurse',
      required: [true, 'A chat must have a nurse'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

chatSchema.virtual('messages', {
  ref: 'Message',
  foreignField: 'chat',
  localField: '_id',
});

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
