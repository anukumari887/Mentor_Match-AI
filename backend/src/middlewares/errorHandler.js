const { ZodError } = require('zod');
const logger = require('../config/logger');
const { env } = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred.';
  let details = err.details || [];

  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
  } else if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON in request body.';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid format for field: ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'A resource with this key already exists.';
  }

  if (statusCode >= 500) {
    logger.error({
      err: {
        message: err.message,
        stack: err.stack,
        code: err.code
      },
      req: {
        method: req.method,
        url: req.originalUrl
      }
    }, 'Unhandled server error');

    if (env.NODE_ENV === 'production') {
      message = 'An unexpected server error occurred.';
    }
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details
    }
  });
}

module.exports = errorHandler;
