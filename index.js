'use strict'
const express = require('express')
const helmet = require('helmet');
const compression = require('compression');
const httpErrors = require('http-errors')
const logger = require('./config/logger');
const pinoHttp = require('pino-http')
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000;
module.exports = function main (options, cb) {
  // Server state
  let server
  let serverStarted = false
  let serverClosing = false

  // Create the express app
  const app = express()
  // Common middleware
  app.use(helmet());
  app.use(compression());
  app.use(express.json())
  //app.use(pinoHttp({ logger }))
  
  // Register routes
  require('./routes')(app)

  // Start server
  server = app.listen(PORT, ()=> {
    const serverUrl = process.env.NODE_ENV === 'production' 
    ? process.env.SERVER_URL_PRODUCTION 
    : `http://localhost:${PORT}`;
    const addr = server.address()
    logger.info(`Started at ${ addr.host || 'localhost'}:${addr.port}`);
    
  })
}

