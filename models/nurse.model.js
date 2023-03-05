const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const { signOrEncryptTokens } = require('../common/utils');
const CONST = require('../common/constants');

const nurseSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: [true, 'Please enter your first name!'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'An email address is required!'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please eneter a valid email address!'],
    },
    phone: {
      type: String,
      required: [true, 'A phone number is reuired!'],
      validate: [
        validator.isMobilePhone,
        'Please eneter a valid phone number!',
      ],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Please specify date of birth!'],
    },
    state: {
      type: String,
      required: [true, 'Please specify the state!'],
    },
    firstName: String,
    lastName: String,
    homeTown: String,
    dreamJob: String,
    travelWithPet: Boolean,
    about: String,
    propertyRental: {
      workExperience: {
        occupation: {
          type: String,
          enum: ['OC1', 'OC2'],
        },
        speciality: {
          type: String,
          enum: ['SP1', 'SP2'],
        },
        favouriteStateToWork: {
          type: String,
          enum: ['FSTW1', 'FSTW2'],
        },
        certification: String,
        professionalTravelingSince: Date,
        current: Date,
        currentEmployer: String,
      },
      travelingPreferences: {
        favouriteUnitType: [String],
        transportationMethod: [String],
      },
      reviewAndPreferences: String,
    },
    favouriteProperties: {
      myCity: String,
      topThreeCities: [String],
    },
    password: {
      type: String,
      required: [true, 'Please enter your password!'],
      minlength: [8, 'Password should be at least 8 characters long!'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirn your password!'],
      validate: {
        validator: function (passwordConfirm) {
          return passwordConfirm === this.password;
        },
        message: 'Passwords are not the same!',
      },
    },
    licenseType: {
      type: String,
      required: [true, 'Nurse must have a licence type!'],
      enum: ['LT1', 'LT2'],
    },
    licenseNumber: {
      type: Number,
      required: [true, 'Nurse must have a licence number!'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: CONST.NURSE_ROLE,
      enum: [CONST.NURSE_ROLE],
    },
    isSubscriber: {
      type: String,
      default: false,
    },
    stripeCustomerId: String,
    stripeAccountId: String,
    profilPicture: String,
    passwordResetToken: String,
    verificationToken: String,
    passwordChangetAt: Date,
    passwordResetExpires: Date,
    refreshToken: String,

    subscription: {
      type: mongoose.Schema.ObjectId,
      ref: 'Subscription',
    },

    // relations
    // reviews: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Review',
    //   },
    // ],
    // bookings: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Booking',
    //   },
    // ],
    // payments: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'NursePayment',
    //   },
    // ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

// virtual population ////////////////
nurseSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'nurse',
  localField: '_id',
});
nurseSchema.virtual('bookings', {
  ref: 'Booking',
  foreignField: 'nurse',
  localField: '_id',
});
nurseSchema.virtual('payments', {
  ref: 'NursePayment',
  foreignField: 'nurse',
  localField: '_id',
});
// /////////////////////////////////////

// pre save middlewaree for changing passwordChangetAt field to the date where password is changed
nurseSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangetAt = Date.now() - 1000;
  next();
});

// pre save middleware for hashing and persisting the hashed password to the database
nurseSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const password = await bcrypt.hash(this.password, 12);
  this.password = password;
  this.passwordConfirm = undefined;

  next();
});

nurseSchema.pre('save', async function (next) {
  const randomToken = uuidv4();
  const refreshToken = await bcrypt.hash(randomToken, 8);
  this.refreshToken = refreshToken;

  next();
});

nurseSchema.methods.checkPassword = async function (
  candidatePassword,
  password
) {
  return bcrypt.compareSync(candidatePassword, password);
};

nurseSchema.methods.passwordChangetAfter = function (JwtTimestamp) {
  if (this.passwordChangetAt) {
    const changedTimestamp = parseInt(
      this.passwordChangetAt.getTime() / 1000,
      10
    );
    return JwtTimestamp < changedTimestamp;
  }
  return false;
};

nurseSchema.methods.createPasswordResetToken = async function () {
  const resetToken = await signOrEncryptTokens();

  this.passwordResetToken = resetToken.hashedToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken.token;
};

nurseSchema.methods.createverifyToken = async function () {
  const verifyToken = await signOrEncryptTokens();

  this.verificationToken = verifyToken.hashedToken;

  return verifyToken.token;
};

const Nurse = mongoose.model('Nurse', nurseSchema);
module.exports = Nurse;
