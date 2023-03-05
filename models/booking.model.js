const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      require: [true, 'Booking must have a price!'],
    },
    startDate: {
      type: Number,
      required: [true, 'Booking must have a duration!'],
    },
    endDate: {
      type: Number,
      required: [true, 'Booking must have a duration!'],
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },
    payment_id: {
      type: String,
      required: true,
    },

    // relations
    nurse: {
      type: mongoose.Schema.ObjectId,
      ref: 'Nurse',
      required: [true, 'A booking must have been made by a nurse!'],
    },
    property: {
      type: mongoose.Schema.ObjectId,
      ref: 'Property',
      required: [true, 'A property should be booked!'],
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
