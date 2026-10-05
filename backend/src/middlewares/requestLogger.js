const logger = require('../config/logger');
const { httpRequestDurationMicroseconds, httpRequestsTotal } = require('../utils/metrics');

function requestLogger(req, res, next) {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInSeconds = elapsedHrTime[0] + elapsedHrTime[1] / 1e9;
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    const code = res.statusCode;

    // Record Prometheus metrics
    httpRequestDurationMicroseconds
      .labels(req.method, route, code)
      .observe(elapsedTimeInSeconds);
    
    httpRequestsTotal
      .labels(req.method, route, code)
      .inc();

    // Log request
    const level = code >= 500 ? 'error' : code >= 400 ? 'warn' : 'info';
    logger[level]({
      method: req.method,
      url: req.originalUrl,
      status: code,
      durationMs: Math.round(elapsedTimeInSeconds * 1000),
      ip: req.ip
    }, `${req.method} ${req.originalUrl} ${code} in ${(elapsedTimeInSeconds * 1000).toFixed(2)}ms`);
  });

  next();
}

module.exports = requestLogger;
