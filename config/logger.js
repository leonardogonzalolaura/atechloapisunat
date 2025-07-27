const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty', 
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname'
    }
  }
});

if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const logStream = fs.createWriteStream('./logs/app.log', { flags: 'a' });
  logger.info('Logging to file enabled');
}

module.exports = logger;