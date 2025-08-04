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
require('./models/associations'); // Cargar asociaciones
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
    // Log database configuration (sin password)
    logger.info('Database config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD ? 'SET' : 'NOT SET'
    });
    
    try {
      logger.info('Attempting database connection...');
      await sequelize.authenticate();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Unable to connect to database:', error.message);
      logger.error('Error details:', {
        name: error.name,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      console.error('Full database error:', error);
      
      // Intentar conexión básica para diagnosticar
      logger.error('Connection string would be:', `mysql://${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    }
    
    const serverUrl = process.env.NODE_ENV === 'production' 
    ? process.env.SERVER_URL_PRODUCTION 
    : `https://localhost:${PORT}`;
    const addr = server.address()
    logger.info(`Started at ${ addr.host || 'localhost'}:${addr.port}`);
    
  })
}

