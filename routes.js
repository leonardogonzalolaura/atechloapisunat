'use strict'
const authMiddleware = require('./middleware/authMiddleware');
const security = require('./handlers/security')
const configured = require('./handlers/configured')
const { swaggerServe, swaggerSetup } = require('./middleware/swagger_doc');

module.exports = function (app, opts) {
  // Setup routes, middleware, and handlers
  app.use('/api/swaggerUI', swaggerServe , swaggerSetup );
  app.use(authMiddleware);
  app.post('/api/login', security)
  app.get('/configured', configured(opts))
}
