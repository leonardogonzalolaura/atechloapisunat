'use strict'
const authMiddleware = require('./middleware/authMiddleware');
const security = require('./handlers/security')
const health = require('./handlers/health')
//const configured = require('./handlers/configured')
const { swaggerServe, swaggerSetup } = require('./middleware/swagger_doc');

module.exports = function (app) {
  // Setup routes, middleware, and handlers
  app.use('/apisunat/swaggerUI', swaggerServe , swaggerSetup );
  app.get('/apisunat/health', health)
  app.use(authMiddleware);
  app.post('/apisunat/login', security)
  //app.get('/apisunat/configured', configured(opts))
}
