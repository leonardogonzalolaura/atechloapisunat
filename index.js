'use strict'
const express = require('express')
const helmet = require('helmet');
const compression = require('compression');
const httpErrors = require('http-errors')
const logger = require('./config/logger');
const pinoHttp = require('pino-http')
const dotenv = require('dotenv');
dotenv.config();

module.exports = function main (options, cb) {
  // Set default options
  const ready = cb || function () {}
  const opts = Object.assign({
    // Default options
  }, options)

  // Server state
  let server
  let serverStarted = false
  let serverClosing = false

  // Setup error handling
  function unhandledError (err) {
    // Log the errors
    logger.error(err)

    // Only clean up once
    if (serverClosing) {
      return
    }
    serverClosing = true

    // If server has started, close it down
    if (serverStarted) {
      server.close(function () {
        process.exit(1)
      })
    }
  }
  process.on('uncaughtException', unhandledError)
  process.on('unhandledRejection', unhandledError)

  // Create the express app
  const app = express()
  // Common middleware
  app.use(helmet());
  app.use(compression());
  app.use(express.json())
  //app.use(pinoHttp({ logger }))
  
  // Register routes
  require('./routes')(app, opts)

  // Start server
  server = app.listen(opts.port, function (err) {
    if (err) {
      return ready(err, app, server)
    }
    // If some other error means we should close
    if (serverClosing) {
      return ready(new Error('Server was closed before it could start'))
    }

    serverStarted = true
    const addr = server.address()
    logger.info(`Started at ${ addr.host || 'localhost'}:${addr.port}`);
    ready(err, app, server)
  })
}

