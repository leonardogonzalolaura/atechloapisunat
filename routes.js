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
const { getProducts, createProduct, updateProduct, deleteProduct } = require('./handlers/products')
const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = require('./handlers/customers')
const { getNotificationSettings, updateNotificationSettings, getNotifications, createNotification, markAsRead, markAllAsRead, deleteNotification } = require('./handlers/notifications')
const { getInvoices, createInvoice, getInvoiceById } = require('./handlers/invoices')
const { generateXML, sendToSunat, getSunatStatus, downloadPDF } = require('./handlers/sunatIntegration')
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
  
  // Products
  app.get('/apisunat/companies/:companyId/products', getProducts);
  app.post('/apisunat/companies/:companyId/products', createProduct);
  app.put('/apisunat/companies/:companyId/products/:id', updateProduct);
  app.delete('/apisunat/companies/:companyId/products/:id', deleteProduct);
  
  // Customers
  app.get('/apisunat/companies/:companyId/customers', getCustomers);
  app.post('/apisunat/companies/:companyId/customers', createCustomer);
  app.put('/apisunat/companies/:companyId/customers/:id', updateCustomer);
  app.delete('/apisunat/companies/:companyId/customers/:id', deleteCustomer);
  
  // Notifications
  app.get('/apisunat/user/notification-settings', getNotificationSettings);
  app.put('/apisunat/user/notification-settings', updateNotificationSettings);
  app.get('/apisunat/user/notifications', getNotifications);
  app.post('/apisunat/user/notifications', createNotification);
  app.put('/apisunat/user/notifications/:notificationId/read', markAsRead);
  app.put('/apisunat/user/notifications/mark-all-read', markAllAsRead);
  app.delete('/apisunat/user/notifications/:notificationId', deleteNotification);
  
  // Invoices
  app.get('/apisunat/companies/:companyId/invoices', getInvoices);
  app.post('/apisunat/companies/:companyId/invoices', createInvoice);
  app.get('/apisunat/companies/:companyId/invoices/:id', getInvoiceById);
  
  // SUNAT Integration
  app.post('/apisunat/companies/:companyId/invoices/:invoiceId/generate-xml', generateXML);
  app.post('/apisunat/companies/:companyId/invoices/:invoiceId/send-sunat', sendToSunat);
  app.get('/apisunat/companies/:companyId/invoices/:invoiceId/sunat-status', getSunatStatus);
  app.get('/apisunat/companies/:companyId/invoices/:invoiceId/download-pdf', downloadPDF);
}
