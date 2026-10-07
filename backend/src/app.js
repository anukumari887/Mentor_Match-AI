const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFound');
const apiRoutes = require('./routes');
const metricsRoutes = require('./routes/metrics');

const app = express();

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: [
          "'self'",
          env.CORS_ORIGIN || 'http://localhost:3000',
          'ws:',
          'wss:'
        ],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null
      }
    }
  })
);

// Permissions-Policy header allowing camera and microphone for self only
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self)');
  next();
});

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Cookie parsing
app.use(cookieParser());

// Request logging & Prometheus metric collection
app.use(requestLogger);

// Raw body parser for webhook endpoints BEFORE express.json()
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// Body parser with 100kb limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Prometheus metrics endpoint
app.use('/', metricsRoutes);

// Main API routes
app.use('/api', apiRoutes);

// Serve compiled frontend in production when available
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/metrics') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    if (req.method === 'GET' && req.accepts('html')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    return next();
  });
}

// Catch-all 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
