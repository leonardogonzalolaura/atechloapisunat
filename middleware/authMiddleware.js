// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

module.exports = (req, res, next) => {
  // Lista blanca de rutas públicas
  const publicRoutes = [
    { path: '/apisunat/login', method: 'POST' },
    { path: '/apisunat/validate', method: 'POST' },
    { path: '/apisunat/swaggerUI', method: 'GET' },
    { path: '/apisunat/register', method: 'POST' },
    { path: '/apisunat/health', method: 'GET' },
    // Google OAuth
    { path: '/apisunat/google/login', method: 'GET' },
    { path: '/apisunat/google/callback', method: 'GET' },
    { path: '/apisunat/google/test', method: 'GET' },
    // Consultas públicas
    { path: '/dni', method: 'GET' },
    { path: '/ruc', method: 'GET' },
    // Email
    { path: '/apisunat/trial-welcome', method: 'POST' }
  ];

  // Verifica si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(
    route => route.path === req.path && route.method === req.method
  );

  if (isPublicRoute) {
    return next(); 
  }

  // Verifica el token para rutas protegidas
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    logger.warn('Intento de acceso sin token', { route: req.path });
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    logger.info(`Acceso autorizado a ${req.path} para usuario: ${decoded.id}`);
    next();
  } catch (err) {
    logger.error('Token inválido', { error: err.message });
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};