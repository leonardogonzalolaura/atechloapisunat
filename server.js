'use strict';
const main = require('./index'); 
const options = {
  port: process.env.PORT || 5000, 
  host: process.env.HOST || '0.0.0.0'
};

// Inicia el servidor
main(options, (err, app, server) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log('Server started successfully');
});