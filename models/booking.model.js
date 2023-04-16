const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      require: [true, 'Booking must have a price!'],
    },
    applicationFee: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    checkInDate: Date,
    checkOutDate: Date,
    status: {
      type: String,
      enum: ['Pending', 'Checked in', 'Checked out'],
      default: 'Pending',
    },
    paymentId: {
      type: String,
      required: true,
    },
    isArchivedForHost: {
      type: Boolean,
      default: false,
    },
    isArchivedForNurse: {
      type: Boolean,
      default: false,
    },

    // relations
    nurse: {
      type: mongoose.Schema.ObjectId,
      ref: 'Nurse',
      required: [true, 'A booking must have been made by a nurse.'],
    },
    host: {
      type: mongoose.Schema.ObjectId,
      ref: 'Host',
      required: [true, 'A booking must have been made by a host included.'],
    },
    property: {
      type: mongoose.Schema.ObjectId,
      ref: 'Property',
      required: [true, 'A booking must have a property.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
