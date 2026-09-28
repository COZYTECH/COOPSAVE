const crypto = require('crypto');

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

const requestId = (req, res, next) => {
  const supplied = req.get('x-request-id');
  const id = supplied && REQUEST_ID_PATTERN.test(supplied)
    ? supplied
    : crypto.randomUUID();

  req.requestId = id;
  res.setHeader('x-request-id', id);
  return next();
};

module.exports = requestId;
