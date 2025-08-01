'use strict';
const main = require('./index');
const options = {
  port: process.env.PORT || 3000, 
  host: process.env.HOST || '0.0.0.0'
};

// Inicia el servidor de Express
main(options, (err, app, server) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log('Server started successfully');
});