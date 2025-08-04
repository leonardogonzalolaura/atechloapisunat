'use strict'
const authMiddleware = require('./middleware/authMiddleware');
const health = require('./handlers/health')
const { login, verifyToken } = require('./handlers/security')
const register = require('./handlers/register')
const { consultarDNI } = require('./handlers/dni')
const { consultarRUC } = require('./handlers/ruc')
const { sendTrialWelcomeEmail } = require('./handlers/email')
const { googleLogin, googleCallback, testGoogleAuth } = require('./handlers/googleAuth')
const { getUserProfile, updateUserProfile, registerCompany, updateCompany } = require('./handlers/userProfile')
const { getCompanySequences, createSequence, getNextNumber } = require('./handlers/documentSequence')
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
  
  // Google OAuth
  app.get('/apisunat/google/login', googleLogin);
  app.get('/apisunat/google/callback', googleCallback);
  app.get('/apisunat/google/test', testGoogleAuth);
  
 
  

  app.use(authMiddleware);
  app.post('/apisunat/login', login);
  app.post('/apisunat/validate', verifyToken);
  // User profile and companies (requieren autenticación)
  app.get('/apisunat/user/profile', getUserProfile);
  app.put('/apisunat/user/profile', updateUserProfile);
  app.post('/apisunat/user/companies', registerCompany);
  app.put('/apisunat/user/companies/:id', updateCompany);
  
  // Document sequences (correlativos)
  app.get('/apisunat/companies/:companyId/sequences', getCompanySequences);
  app.post('/apisunat/companies/:companyId/sequences', createSequence);
  app.post('/apisunat/companies/:companyId/sequences/next', getNextNumber);
}
