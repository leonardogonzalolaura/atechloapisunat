'use strict'
const express = require('express')
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const httpErrors = require('http-errors')
const logger = require('./config/logger');
const pinoHttp = require('pino-http')
const dotenv = require('dotenv');
const sequelize = require('./config/database');
dotenv.config();

const PORT = process.env.PORT || 3000;
module.exports = function main (options, cb) {
  // Server state
  let server

  // Create the express app
  const app = express()
  // Common middleware
  app.use(cors());
  app.use(helmet());
  app.use(compression());
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }));
  //app.use(pinoHttp({ logger }))
  
  // Register routes
  require('./routes')(app)

  // Start server
  server = app.listen(PORT, async ()=> {
    try {
      await sequelize.authenticate();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Unable to connect to database:', error.message);
    }
    
    const serverUrl = process.env.NODE_ENV === 'production' 
    ? process.env.SERVER_URL_PRODUCTION 
    : `https://localhost:${PORT}`;
    const addr = server.address()
    logger.info(`Started at ${ addr.host || 'localhost'}:${addr.port}`);
    
  })
}

