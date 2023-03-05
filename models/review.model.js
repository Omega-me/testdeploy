const mongoose = require('mongoose');
const Property = require('./property.model');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty.'],
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    // relations
    nurse: {
      type: mongoose.Schema.ObjectId,
      ref: 'Nurse',
      required: [true, 'Reviw must be from a nurse!'],
    },
    property: {
      type: mongoose.Schema.ObjectId,
      ref: 'Property',
      required: [true, 'Review must be writed for a property!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

// makes sure that a nurse can create only one review per property
reviewSchema.index({ property: 1, nurse: 1 }, { unique: true });

// calculating rating average and count ////
reviewSchema.statics.calcAverageRatings = async function (propertyId) {
  const stats = await this.aggregate([
    {
      $match: { property: propertyId },
    },
    {
      $group: {
        _id: '$property',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Property.findByIdAndUpdate(propertyId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Property.findByIdAndUpdate(propertyId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.property);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.property);
}); // ////////////////////////////////////////////

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
