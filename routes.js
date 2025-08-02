'use strict'
const authMiddleware = require('./middleware/authMiddleware');
const health = require('./handlers/health')
const { login, verifyToken } = require('./handlers/security')
const register = require('./handlers/register')
const { consultarDNI } = require('./handlers/dni')
const { consultarRUC } = require('./handlers/ruc')
const { sendTrialWelcomeEmail } = require('./handlers/email')
const { swaggerServe, swaggerSetup } = require('./middleware/swagger_doc');

module.exports = function (app) {
  // Setup routes, middleware, and handlers
  app.use('/apisunat/swaggerUI', swaggerServe , swaggerSetup );
  app.get('/apisunat/health', health)
  app.post('/apisunat/register', register);
  
  // Consultas oficiales (sin autenticación)
  app.get('/dni/:dni', consultarDNI);
  app.get('/ruc/:ruc', consultarRUC);
  
  // Email services
  app.post('/apisunat/trial-welcome', sendTrialWelcomeEmail);
  
  app.use(authMiddleware);
  app.post('/apisunat/login', login);
  app.post('/apisunat/validate', verifyToken);
  
}
