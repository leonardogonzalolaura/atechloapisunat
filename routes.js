'use strict'
const authMiddleware = require('./middleware/authMiddleware');
const security = require('./handlers/security')
const configured = require('./handlers/configured')
const { swaggerServe, swaggerSetup } = require('./middleware/swagger_doc');

module.exports = function (app, opts) {
  // Setup routes, middleware, and handlers
  app.use('/apisunat/swaggerUI', swaggerServe , swaggerSetup );
  app.use(authMiddleware);
  app.post('/apisunat/login', security)
  app.get('/apisunat/configured', configured(opts))
}
