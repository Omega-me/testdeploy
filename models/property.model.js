const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const NursePropertySaveModel = require('./nursePropertySave.model');

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Property must have a title!'],
      trim: true,
      maxlength: [
        40,
        'A Property name must have less or equal then 40 characters',
      ],
      minlength: [
        10,
        'A Property name must have more or equal then 10 characters',
      ],
    },
    contactInformation: {
      firstName: {
        type: String,
        required: [true, 'Property must have a contact first name!'],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, 'Property must have a contact last name!'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Property must have a contact email!'],
        lowercase: true,
        validate: [
          validator.isEmail,
          'Property must have a valid contact email!',
        ],
      },
      phone: {
        type: String,
        required: [true, 'Property must have a contact phone number!'],
        validate: [
          validator.isMobilePhone,
          'Property must have a valid contact phone number!',
        ],
      },
    },
    propertyType: {
      type: {
        type: String,
        required: [true, 'Property must have a type!'],
        enum: ['Entire unit', 'Room', 'Hotel', 'Apartment'],
      },
      isGroup: {
        type: Boolean,
        default: false,
      },
      units: {
        type: Number,
        required: [true, 'Property must have units specified!'],
      },
      isSubtle: {
        type: Boolean,
        default: false,
      },
    },
    location: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        required: [true, 'Property must have location coordinates!'],
      },
      address: {
        type: String,
        required: [true, 'Property must have a location address!'],
      },
      description: {
        type: String,
        required: [true, 'Property must have a location description!'],
      },
    },
    details: {
      price: {
        type: Number,
        require: [true, 'Property must have a price!'],
      },
      bedroom: {
        type: Number,
        required: [true, 'Property must have bedrooms informations!'],
        enum: [0, 1, 2, 3],
      },
      bathroom: {
        type: Number,
        required: [true, 'Property must have a bathrooms informations!'],
        enum: [1, 2, 3],
      },
      features: {
        isBathroomPrivate: {
          type: Boolean,
          default: false,
        },
        utitlitiesIncluded: {
          type: Boolean,
          default: true,
        },
        furnitureIncluded: {
          type: Boolean,
          default: true,
        },
        hasCarParkang: {
          type: Boolean,
          default: true,
        },
        isPetFriendly: {
          type: Boolean,
          default: false,
        },
        hasPool: {
          type: Boolean,
          default: false,
        },
        ofersBreakfast: {
          type: Boolean,
          default: true,
        },
        hasLoundary: {
          type: Boolean,
          default: true,
        },
      },
    },
    minimumDuration: {
      type: Number,
      default: 1,
      enum: [1, 2, 3],
    },
    imageCover: {
      type: String,
      // required: [true, 'A Property must have a cover image!'],
    },
    images: {
      type: [String],
      // required: [true, 'A Property must have three images!'],
    },
    numberOfLikes: {
      type: Number,
      default: 0,
    },
    likedBy: [mongoose.Schema.ObjectId],
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // 4.666666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      required: [true, 'Property must have a description!'],
    },
    availableFrom: {
      type: Date,
      required: true,
    },
    availableTo: {
      type: Date,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    amenities: [String],
    slug: String,

    // payment: {},

    // relations
    host: {
      type: mongoose.Schema.ObjectId,
      ref: 'Host',
      required: [true, 'A property must be created by a host user!'],
    },
    booking: {
      type: mongoose.Schema.ObjectId,
      ref: 'Booking',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

propertySchema.index({ price: 1, ratingsAverage: -1 });
propertySchema.index({ slug: 1 });

// Virtual populate
propertySchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'property',
  localField: '_id',
});

propertySchema.pre('save', function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});
propertySchema.pre('update', function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

propertySchema.pre('init', async function (doc) {
  const likes = await NursePropertySaveModel.find({
    property: doc._id.toString(),
  });
  likes.forEach((like) => {
    this.likedBy.push(like.nurse);
  });
  this.numberOfLikes = likes.length;
});

module.exports = mongoose.model('Property', propertySchema);
