const mongoose = require('mongoose');
const Property = require('./property.model');
const AppError = require('../common/utils/AppError');
const CONST = require('../common/constants');

const groupRentalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    numberOfPersons: {
      type: Number,
      required: [
        true,
        'You need to specify how many people will rent the group.',
      ],
    },

    // relations
    host: {
      type: mongoose.Schema.ObjectId,
      ref: 'Host',
      required: [true, 'A group rental should have an owner'],
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

// prevent group delte if it has been used on properties
groupRentalSchema.pre('findOneAndDelete', async function (next) {
  try {
    const properties = await Property.find({ group: this._id });
    if (properties.length !== 0) {
      properties.forEach((property) => {
        if (property.group.toString() === this._id.toString()) {
          throw new AppError(
            'You can not delete this group because it has been used on a property listing',
            CONST.FORBIDDEN
          );
        }
      });
    }
  } catch (error) {
    throw new AppError(
      'There was a problem removing the groups',
      CONST.INTERNAL_SERVER_ERROR
    );
  }
  next();
});

const GroupRental = mongoose.model('GroupRental', groupRentalSchema);
module.exports = GroupRental;
