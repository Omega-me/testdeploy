/* eslint-disable import/no-extraneous-dependencies */
const aqp = require('api-query-params');

class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = [
      'page',
      'sort',
      'limit',
      'fields',
      'filter',
      'populate',
    ];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  populate() {
    if (this.queryString.populate) {
      const { population } = aqp(`populate=${this.queryString.populate}`);
      this.query = this.query.populate(population);
    }

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }

  advancedFilter() {
    const queryObj = { ...this.queryString };
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/@/g, '$');
    const queryObject = JSON.parse(queryStr);

    let filterString = '';
    if (queryObject.filter) {
      if (filterString !== '')
        filterString = `${filterString}&filter=${queryObject.filter}`;
      else filterString = `filter=${queryObject.filter}`;
    }
    if (queryObject.sort) {
      if (filterString !== '')
        filterString = `${filterString}&sort=${queryObject.sort}`;
      else filterString = `sort=${queryObject.sort}`;
    }
    if (queryObject.skip) {
      if (filterString !== '')
        filterString = `${filterString}&skip=${JSON.parse(queryObject.skip)}`;
      else filterString = `skip=${JSON.parse(queryObject.skip)}`;
    }
    if (queryObject.limit) {
      if (filterString !== '')
        filterString = `${filterString}&limit=${queryObject.limit}`;
      else filterString = `limit=${queryObject.limit}`;
    }

    const query = aqp(filterString);

    this.query = this.query
      .find(query.filter)
      .sort(query.sort)
      .limit(query.limit)
      .skip(query.skip);

    return this;
  }
}
module.exports = ApiFeatures;
