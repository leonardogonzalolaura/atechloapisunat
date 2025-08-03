'use strict'

const { Sequelize } = require('sequelize');
const logger = require('./logger');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'atechlo_einvoice',
  process.env.DB_USER || 'atechlo_admin', 
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // Desactivar logging SQL para producción
    pool: {
      max: 10,        // Máximo 10 conexiones
      min: 2,         // Mínimo 2 conexiones activas
      acquire: 30000, // Tiempo máximo para obtener conexión (30s)
      idle: 5000,     // Tiempo antes de cerrar conexión inactiva (5s)
      evict: 1000,    // Intervalo para verificar conexiones inactivas (1s)
      handleDisconnects: true // Manejar desconexiones automáticamente
    },
    dialectOptions: {
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000,
      // Configuraciones para evitar conexiones sleeping
      charset: 'utf8mb4',
      timezone: '+00:00'
    },
    // Configuraciones adicionales para estabilidad
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ],
      max: 3
    }
  }
);

// Monitoreo de conexiones
setInterval(async () => {
  try {
    await sequelize.authenticate();
    const poolInfo = sequelize.connectionManager.pool;
    if (poolInfo) {
      logger.debug(`Pool status - Used: ${poolInfo.used}, Available: ${poolInfo.available}, Pending: ${poolInfo.pending}`);
    }
  } catch (error) {
    logger.error('Error en health check de BD:', error.message);
  }
}, 60000); // Cada minuto

// Manejar cierre graceful de conexiones
process.on('SIGINT', async () => {
  logger.info('Cerrando conexiones de base de datos...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Cerrando conexiones de base de datos...');
  await sequelize.close();
  process.exit(0);
});

module.exports = sequelize;