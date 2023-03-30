const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const CONST = require('../constants');

/**
 *
 * @param {*} user the signed user
 * @returns the signed JWT token with user id as payload
 */
const signJWTToken = (user) => {
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.JWT_TOKEN_EXPIRES_IN,
    }
  );

  return token;
};
exports.signJWTToken;

/**
 *
 * @param {*} user
 * @param {*} req
 * @param {*} res
 * @param {*} stausCode
 * @returns
 */
exports.sendUserTokenSuccess = async (user, req, res, stausCode = CONST.OK) => {
  const token = signJWTToken(user);

  const jwtCookieOptions = {
    // TODO: Change expire time after implementing refresh token
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };
  res.cookie('jwt', token, jwtCookieOptions);

  if (!user.isVerified) {
    return res.status(stausCode).json({
      status: CONST.SUCCESS,
      data: {
        token,
      },
      message: 'Please verify your email account!',
    });
  }

  return res.status(stausCode).json({
    status: CONST.SUCCESS,
    data: { token },
  });
};

/**
 *
 * @param {*} tokenToHash pass a token if you need to hash it (if no token is passed a token will be generated ranomly)
 * @returns an object that contains token and hashed token
 */
exports.signOrEncryptTokens = async (tokenToHash) => {
  if (!tokenToHash) {
    const generatedToken = crypto.randomBytes(32).toString('hex');

    return {
      token: generatedToken,
      hashedToken: crypto
        .createHash('sha256')
        .update(generatedToken)
        .digest('hex'),
    };
  }
  return {
    token: tokenToHash,
    hashedToken: crypto.createHash('sha256').update(tokenToHash).digest('hex'),
  };
};

/**
 *
 * @param req
 * @returns app url
 */
exports.generateUrl = (req) => {
  const baseFrontUrl = `${req.protocol}://${req.get('host')}`;
  const baseApiUrl = `${req.protocol}://${req.get('host')}/api/v1`;

  return {
    baseFrontUrl,
    baseApiUrl,
  };
};

/**
 *
 * @param {*} obj
 * @param  {...any} allowedFields
 * @returns
 */
exports.filterBodyObject = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/**
 *
 * @param {*} data
 * @returns
 */
exports.createNurseDataForUpdate = (data) => {
  let nurseData = {
    propertyRental: {
      workExperience: {},
      travelingPreferences: {},
    },
    favouriteProperties: {},
  };

  if (data.displayName) {
    nurseData.displayName = data.displayName;
  }
  if (data.firstName) {
    nurseData.firstName = data.firstName;
  }
  if (data.lastName) {
    nurseData.lastName = data.lastName;
  }
  if (data.phone) {
    nurseData.phone = data.phone;
  }
  if (data.dateOfBirth) {
    nurseData.dateOfBirth = data.dateOfBirth;
  }
  if (data.state) {
    nurseData.state = data.state;
  }
  if (data.homeTown) {
    nurseData.homeTown = data.homeTown;
  }
  if (data.dreamJob) {
    nurseData.dreamJob = data.dreamJob;
  }
  if (data.travelWithPet) {
    nurseData.travelWithPet = data.travelWithPet;
  }
  if (data.about) {
    nurseData.about = data.about;
  }
  if (data.licenseType) {
    nurseData.licenseType = data.licenseType;
  }
  if (data.licenseNumber) {
    nurseData.licenseNumber = data.licenseNumber;
  }

  if (data.speciality) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        workExperience: {
          ...nurseData.propertyRental.workExperience,
          speciality: data.speciality,
        },
      },
    };
  }
  if (data.favouriteStateToWork) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        workExperience: {
          ...nurseData.propertyRental.workExperience,
          favouriteStateToWork: data.favouriteStateToWork,
        },
      },
    };
  }
  if (data.certification) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        workExperience: {
          ...nurseData.propertyRental.workExperience,
          certification: data.certification,
        },
      },
    };
  }
  if (data.professionalTravelingSince) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        workExperience: {
          ...nurseData.propertyRental.workExperience,
          professionalTravelingSince: data.professionalTravelingSince,
        },
      },
    };
  }
  if (data.current) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        workExperience: {
          ...nurseData.propertyRental.workExperience,
          current: data.current,
        },
      },
    };
  }
  if (data.currentEmployer) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        workExperience: {
          ...nurseData.propertyRental.workExperience,
          currentEmployer: data.currentEmployer,
        },
      },
    };
  }

  if (data.favouriteUnitType) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        travelingPreferences: {
          ...nurseData.propertyRental.travelingPreferences,
          favouriteUnitType: data.favouriteUnitType,
        },
      },
    };
  }
  if (data.transportationMethod) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        travelingPreferences: {
          ...nurseData.propertyRental.travelingPreferences,
          transportationMethod: data.transportationMethod,
        },
      },
    };
  }
  if (data.reviewAndPreferences) {
    nurseData = {
      ...nurseData,
      propertyRental: {
        ...nurseData.propertyRental,
        reviewAndPreferences: data.reviewAndPreferences,
      },
    };
  }
  if (data.myCity) {
    nurseData = {
      ...nurseData,
      favouriteProperties: {
        ...nurseData.favouriteProperties,
        myCity: data.myCity,
      },
    };
  }
  if (data.topThreeCities) {
    nurseData = {
      ...nurseData,
      favouriteProperties: {
        ...nurseData.favouriteProperties,
        topThreeCities: data.topThreeCities,
      },
    };
  }

  return nurseData;
};

/**
 *
 * @param {*} obj
 * @returns
 */
exports.isObjectEmpty = (obj) => Object.keys(obj).length === 0;
