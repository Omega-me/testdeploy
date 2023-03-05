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
exports.sendUserTokenSuccess = async (user, res, stausCode = CONST.OK) => {
  const token = signJWTToken(user);

  const jwtCookieOptions = {
    // todo
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  };
  if (process.env.NODE_ENV !== CONST.PROD) jwtCookieOptions.secure = true;
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
