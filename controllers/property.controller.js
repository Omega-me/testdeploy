/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs');
const axios = require('axios');
const multer = require('multer');
const sharp = require('sharp');
const handlerFactory = require('../common/midlewares/handlerFactory');
const Property = require('../models/property.model');
const AppError = require('../common/utils/AppError');
const GroupRental = require('../models/groupRental.model');
const Host = require('../models/host.model');
const catchAsync = require('../common/utils/catchAsync');
const CONST = require('../common/constants');

const multerStorage = multer.memoryStorage({
  fileSize: 'Infinity',
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Not an image! Please upload only images.',
        CONST.BAD_REQUEST
      ),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadPropertyImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]);

exports.resizePropertyImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  const path = 'public/images/properties';
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {
      recursive: true,
    });
  }

  // 1) Cover image
  req.body.imageCover = `property-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 100 })
    .toFile(`${path}/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `property-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 95 })
        .toFile(`${path}/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.getPropertyStats = catchAsync(async (req, res, next) => {
  const stats = await Property.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$propertyType.type' },
        numProperties: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$details.price' },
        minPrice: { $min: '$details.price' },
        maxPrice: { $max: '$details.price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getPropertiesWithin = catchAsync(async (req, res, next) => {
  const { distance, center, unit } = req.query;
  const [lat, lng] = center.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitute and longitude in the format lat,lng.',
        CONST.BAD_REQUEST
      )
    );
  }

  const properties = await Property.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    results: properties.length,
    data: {
      properties,
    },
  });
});

exports.findTop4Rooms = catchAsync(async (req, res, next) => {
  req.body = {
    filter: `{
      "@or": [
        { "propertyType.type": "Room" },
        { "propertyType.type": "Hotel" }
      ],
      "propertyType.isGroup":false
    }`,
    sort: `-ratingsAverage`,
    limit: '4',
    skip: '0',
  };
  next();
});

exports.findTop2Groups = catchAsync(async (req, res, next) => {
  req.body = {
    filter: `{"propertyType.isGroup":true}`,
    sort: `-ratingsAverage`,
    limit: '2',
    skip: '0',
  };
  next();
});

exports.findFeaturedProperties = catchAsync(async (req, res, next) => {
  req.body = {
    filter: `{"propertyType.isGroup":false}`,
    sort: `-ratingsAverage`,
    limit: '6',
    skip: '0',
  };
  next();
});

exports.findFeaturedGroup = catchAsync(async (req, res, next) => {
  req.body = {
    filter: `{"propertyType.isGroup":true}`,
    sort: `-ratingsAverage`,
    limit: '1',
    skip: '0',
  };
  next();
});

exports.checkIfGroupExists = catchAsync(async (req, res, next) => {
  if (req.body.propertyType.isGroup) {
    if (!req.body.group) {
      return next(
        new AppError(
          'You cant save a property with group active without assigning a group.',
          CONST.BAD_REQUEST
        )
      );
    }
    const group = await GroupRental.findById(req.body.group);
    if (!group) {
      return next(
        new AppError(
          'Group does not exists please use or create another one.',
          CONST.BAD_REQUEST
        )
      );
    }
    if (group.host.toString() !== req.user._id.toString()) {
      return next(
        new AppError(
          'You cannot assigne to the property a group that is not created by you.',
          CONST.BAD_REQUEST
        )
      );
    }
  }

  next();
});

exports.checkIfPropertyBelongsToUser = catchAsync(async (req, res, next) => {
  const { hostId } = req.params;
  if (!hostId) {
    return next(new AppError('Please provide host id.', CONST.BAD_REQUEST));
  }
  const host = await Host.findById(hostId);
  if (!host) {
    return next(new AppError('user does not exist.', CONST.BAD_REQUEST));
  }

  if (hostId !== req.user._id.toString()) {
    return next(
      new AppError(
        'You cannot modify or delete this property because it does not belong to you.',
        CONST.BAD_REQUEST
      )
    );
  }

  next();
});

exports.searchForLocations = catchAsync(async (req, res, next) => {
  const { search } = req.query;

  const locations = await axios.get(
    `https://nominatim.openstreetmap.org/search?format=geojson&limit=5&q=${search}`
  );

  res.status(CONST.OK).json({
    status: CONST.SUCCESS,
    results: locations?.data?.features.length,
    data: locations?.data?.features,
  });
});

exports.create = handlerFactory.createOne(Property);
exports.getAll = handlerFactory.getAll(Property);
exports.getOne = handlerFactory.getOne(Property, {
  populate: [
    {
      path: 'host',
      select: [
        '-stripeAccountId',
        '-stripeCustomerId',
        '-passwordResetToken',
        '-verificationToken',
        '-passwordChangetAt',
        '-passwordResetExpires',
        '-refreshToken',
      ],
    },
    {
      path: 'group',
    },
    'booking',
    'reviews',
    {
      path: 'reviews',
      populate: {
        path: 'nurse',
        model: 'Nurse',
        select: ['displayName', 'profilPicture'],
      },
    },
  ],
});
exports.updateOne = handlerFactory.updateOne(Property);
exports.deleteOne = handlerFactory.deleteOne(Property);
exports.filter = handlerFactory.filter(Property, {
  populate: [
    {
      path: 'host',
      select: [
        '-stripeAccountId',
        '-stripeCustomerId',
        '-passwordResetToken',
        '-verificationToken',
        '-passwordChangetAt',
        '-passwordResetExpires',
        '-refreshToken',
      ],
    },
    {
      path: 'group',
      populate: {
        path: 'host',
        model: 'Host',
        select: ['displayName', 'profilPicture'],
      },
    },
    'booking',
    'reviews',
    {
      path: 'reviews',
      populate: {
        path: 'nurse',
        model: 'Nurse',
        select: ['displayName', 'profilPicture'],
      },
    },
  ],
});
