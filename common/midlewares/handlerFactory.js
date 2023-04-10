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
 * @param {*} select
 * @returns
 */
exports.updateOne = (Model, select) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;

    let doc = await Model.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError(LABELS.NO_DOC_FOUND, CONST.NOT_FOUND));
    }

    if (select) doc = doc.select(select);

    res.status(CONST.OK).json({
      status: CONST.SUCCESS,
      data: doc,
    });
  });

/**
 *
 * @param {*} Model
 * @param {*} select
 * @returns
 */
exports.createOne = (Model, select) =>
  catchAsync(async (req, res, next) => {
    let doc = await Model.create(req.body);
    if (select) doc = doc.select(select);

    res.status(CONST.CREATED).json({
      status: CONST.SUCCESS,
      data: doc,
    });
  });

/**
 *
 * @param {*} Model
 * @param {*} options
 * @returns
 */
exports.getOne = (Model, options) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { populate } = req.query;
    const { select } = req.query;
    let query = Model.findById(id);

    if (populate) {
      query = query.populate(populate);
    }
    if (select) {
      query = query.select(select);
    }
    if (options) {
      if (options.populate) query = query.populate(options.populate);
      if (options.select) query = query.select(options.select);
    }
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
 * @param {*} options
 * @returns
 */
exports.getAll = (Model, options) =>
  catchAsync(async (req, res, next) => {
    const data = await Model.find();
    let queryData = Model.find();

    if (options) {
      if (options.populate) queryData = queryData.populate(options.populate);
      if (options.select) queryData = queryData.select(options.select);
    }
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
 * @param {*} options
 * @returns
 */
exports.filter = (Model, options) =>
  catchAsync(async (req, res, next) => {
    let queryData = Model.find();

    if (options) {
      if (options.populate) queryData = queryData.populate(options.populate);
      if (options.select) queryData = queryData.select(options.select);
    }
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
