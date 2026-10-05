const pino = require('pino');
const { env } = require('./env');

const isDev = (env && env.NODE_ENV === 'development') || process.env.NODE_ENV === 'development';

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
  : undefined;

const logger = pino({
  level: (env && env.LOG_LEVEL) || process.env.LOG_LEVEL || 'info',
  transport
});

module.exports = logger;
