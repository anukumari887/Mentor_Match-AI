const client = require('prom-client');

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'mentor-match-backend'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

const bookingsCreatedTotal = new client.Counter({
  name: 'bookings_created_total',
  help: 'Total number of bookings created'
});

const paymentsConfirmedTotal = new client.Counter({
  name: 'payments_confirmed_total',
  help: 'Total number of payments successfully confirmed'
});

const webhookFailuresTotal = new client.Counter({
  name: 'webhook_failures_total',
  help: 'Total number of payment webhook processing failures'
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(bookingsCreatedTotal);
register.registerMetric(paymentsConfirmedTotal);
register.registerMetric(webhookFailuresTotal);

module.exports = {
  register,
  httpRequestDurationMicroseconds,
  httpRequestsTotal,
  bookingsCreatedTotal,
  paymentsConfirmedTotal,
  webhookFailuresTotal
};
