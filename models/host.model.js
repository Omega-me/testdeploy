const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const { signOrEncryptTokens } = require('../common/utils');
const Property = require('./property.model');
const Subscription = require('./subscription.model');
const GroupRental = require('./groupRental.model');
const CONST = require('../common/constants');

const hostSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please enter your first name.'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Please enter your last name.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'An email address is required.'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please eneter a valid email address.'],
    },
    phone: {
      type: String,
      required: [true, 'A phone number is reuired.'],
      validate: [
        validator.isMobilePhone,
        'Please eneter a valid phone number.',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please enter your password.'],
      minlength: [8, 'Password should be at least 8 characters long.'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirn your password.'],
      validate: {
        validator: function (passwordConfirm) {
          return passwordConfirm === this.password;
        },
        message: 'Passwords are not the same.',
      },
    },
    dlNumber: {
      type: Number,
      required: [true, 'Please enter the DL number.'],
    },
    expirationDate: {
      type: Date,
      required: [true, 'Please enter the expiration number.'],
    },
    state: {
      type: String,
      required: [true, 'Please specify the state.'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      default: CONST.HOST_ROLE,
      enum: [CONST.HOST_ROLE],
    },
    isSubscriber: {
      type: Boolean,
      default: false,
    },
    isConnected: {
      type: Boolean,
      default: false,
    },
    stripeAccountId: String,
    stripeCustomerId: String,
    responseTime: String,
    numberOfReports: Number,
    responseRate: String,
    profilePicture: String,
    passwordResetToken: String,
    verificationToken: String,
    passwordChangetAt: Date,
    passwordResetExpires: Date,
    refreshToken: String,
    // relations
    subscription: {
      type: mongoose.Schema.ObjectId,
      ref: 'Subscription',
    },
    paymentMetadata: {
      type: mongoose.Schema.ObjectId,
      ref: 'PaymentMetadata',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

// Virtual populate
hostSchema.virtual('properties', {
  ref: 'Property',
  foreignField: 'host',
  localField: '_id',
});
hostSchema.virtual('payments', {
  ref: 'HostPayment',
  foreignField: 'host',
  localField: '_id',
});

// pre save middlewaree for changing passwordChangetAt field to the date where password is changed
hostSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangetAt = Date.now() - 1000;
  next();
});

// pre save middleware for hashing and persisting the hashed password to the database
hostSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const password = await bcrypt.hash(this.password, 12);
  this.password = password;
  this.passwordConfirm = undefined;

  next();
});

hostSchema.pre('save', async function (next) {
  const token = uuidv4();
  const refreshToken = await bcrypt.hash(token, 8);
  this.refreshToken = refreshToken;

  next();
});

// cascade delete
hostSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await Property.deleteMany({ host: doc?._id }).exec();
    await GroupRental.deleteMany({ host: doc?._id }).exec();
    await Subscription.deleteOne({ userId: doc?._id }).exec();
  }
});

hostSchema.methods.checkPassword = async function (
  candidatePassword,
  password
) {
  return bcrypt.compareSync(candidatePassword, password);
};

hostSchema.methods.passwordChangetAfter = function (JwtTimestamp) {
  if (this.passwordChangetAt) {
    const changedTimestamp = parseInt(
      this.passwordChangetAt.getTime() / 1000,
      10
    );
    return JwtTimestamp < changedTimestamp;
  }
  return false;
};

hostSchema.methods.createPasswordResetToken = async function () {
  const resetToken = await signOrEncryptTokens();

  this.passwordResetToken = resetToken.hashedToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken.token;
};

hostSchema.methods.createverifyToken = async function () {
  const verifyToken = await signOrEncryptTokens();

  this.verificationToken = verifyToken.hashedToken;

  return verifyToken.token;
};

const Host = mongoose.model('Host', hostSchema);
module.exports = Host;
