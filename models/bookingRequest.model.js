const mongoose = require('mongoose');
const Property = require('./property.model');

const bookingRequestSchema = new mongoose.Schema(
  {
    travelingFrom: {
      type: Date,
      required: true,
    },
    travelingTo: {
      type: Date,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },

    // relations
    nurse: {
      type: mongoose.Schema.ObjectId,
      ref: 'Nurse',
      required: true,
    },
    host: {
      type: mongoose.Schema.ObjectId,
      ref: 'Nurse',
    },
    property: {
      type: mongoose.Schema.ObjectId,
      ref: 'Property',
      required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

bookingRequestSchema.pre('save', async function (next) {
  const property = await Property.findById(this.property);
  this.host = property.host;
  next();
});

const BookingRequest = mongoose.model('BookingRequest', bookingRequestSchema);
module.exports = BookingRequest;
