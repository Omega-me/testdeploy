const mongoose = require('mongoose');

const groupRentalSchema = new mongoose.Schema(
  {
    numberOfPersons: {
      type: Number,
      required: [
        true,
        'You need to specify how many people will rent the group.',
      ],
    },
    // relations
    property: {
      type: mongoose.Schema.ObjectId,
      ref: 'Property',
      required: [true, 'A group rental should have a property'],
    },
    nurses: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Nurse',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

const GroupRental = mongoose.model('GroupRental', groupRentalSchema);

module.exports = GroupRental;
