const CONST = require('../constants');
const LABELS = require('../labels');
const AppError = require('../utils/AppError');
const ApiFeatures = require('../utils/ApiFeatures');
const catchAsync = require('../utils/catchAsync');

/**
 *
 * @param {*} Model
 * @returns
 */
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    // checkId(id, next);

    const doc = await Model.findByIdAndDelete(id);

    if (!doc) {
      return next(new AppError(LABELS.NO_DOC_FOUND, CONST.NOT_FOUND));
    }

    res.status(CONST.NO_CONTENT).json({
      status: CONST.SUCCESS,
      data: null,
    });
  });

/**
 *
 * @param {*} Model
 * @returns
 */
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    // checkId(id, next);

    const doc = await Model.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError(LABELS.NO_DOC_FOUND, CONST.NOT_FOUND));
    }

    res.status(CONST.OK).json({
      status: CONST.SUCCESS,
      data: doc,
    });
  });

/**
 *
 * @param {*} Model
 * @returns
 */
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(CONST.CREATED).json({
      status: CONST.SUCCESS,
      data: doc,
    });
  });

/**
 *
 * @param {*} Model
 * @param {*} popOptions
 * @returns
 */
exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;

    let query = Model.findById(id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError(LABELS.NO_DOC_FOUND, CONST.NOT_FOUND));
    }

    res.status(CONST.OK).json({
      status: CONST.SUCCESS,
      data: doc,
    });
  });

/**
 *
 * @param {*} Model
 * @param {*} popOptions
 * @returns
 */
exports.getAll = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const data = await Model.find();
    let queryData = Model.find();
    if (popOptions) queryData = queryData.populate(popOptions);
    const features = new ApiFeatures(queryData, req.query)
      .populate()
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(CONST.OK).json({
      status: CONST.SUCCESS,
      results: doc.length,
      data: doc,
      totalResults: data.length,
      pages: Math.ceil(data.length / req.query.limit),
    });
  });

/**
 *
 * @param {*} Model
 * @param {*} popOptions
 * @returns
 */
exports.filter = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let queryData = Model.find();
    if (popOptions) queryData = queryData.populate(popOptions);
    const features = new ApiFeatures(queryData, req.body)
      .advancedFilter()
      .populate();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(CONST.OK).json({
      status: CONST.SUCCESS,
      results: doc.length,
      data: doc,
    });
  });
