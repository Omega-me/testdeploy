/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const handlerFactory = require('../common/midlewares/handlerFactory');
const Property = require('../models/property.model');
const AppError = require('../common/utils/AppError');
const catchAsync = require('../common/utils/catchAsync');
const CONST = require('../common/constants');

const multerStorage = multer.memoryStorage();

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
  { name: 'images', minCount: 4, maxCount: 10 },
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
    .jpeg({ quality: 95 })
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
        _id: { $toUpper: '$propertyType.type' }, // TODO: group by property type
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
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
      ]
    }`,
    sort: `ratingsAverage`,
    limit: '4',
    skip: '0',
  };
  next();
});

exports.findTop2Groups = catchAsync(async (req, res, next) => {
  req.body = {
    filter: `{
      "propertyType.type":"Group rental"
    }`,
    sort: `ratingsAverage`,
    limit: '2',
    skip: '0',
  };
  next();
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
exports.filter = handlerFactory.filter(Property);
