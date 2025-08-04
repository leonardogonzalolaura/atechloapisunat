const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Facturación Electrónica SUNAT',
      version: '1.0.0',
      description: 'API completa para sistema de facturación electrónica con integración SUNAT',
    },
    tags: [
      {
        name: 'Autenticación',
        description: 'Endpoints de registro, login y OAuth'
      },
      {
        name: 'Usuarios',
        description: 'Gestión de perfiles de usuario'
      },
      {
        name: 'Empresas',
        description: 'Gestión de empresas y configuración'
      },
      {
        name: 'Productos',
        description: 'Gestión de productos y servicios'
      },
      {
        name: 'Correlativos',
        description: 'Gestión de numeración de documentos'
      },
      {
        name: 'Consultas Públicas',
        description: 'Consultas a APIs oficiales (DNI, RUC)'
      },
      {
        name: 'Email',
        description: 'Servicios de correo electrónico'
      },
      {
        name: 'Facturas',
        description: 'Gestión de facturas y documentos'
      },
      {
        name: 'Integración SUNAT',
        description: 'Envío y validación con SUNAT'
      },
      {
        name: 'Notificaciones',
        description: 'Sistema de notificaciones de usuario'
      },
      {
        name: 'Clientes',
        description: 'Gestión de clientes'
      },
      {
        name: 'Sistema',
        description: 'Endpoints de salud y configuración'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        },
        BearerAuth: {
          type: 'http',
          description: 'JWT Authorization header using the Bearer scheme.',
          scheme: 'bearer',
          bearerFormat: 'JWT'

        }
      }
    },
    security: [{
      BearerAuth: []
    }],
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? process.env.SERVER_URL_PRODUCTION 
          : process.env.SERVER_URL_LOCAL,
        description: process.env.NODE_ENV === 'production' 
          ? 'Servidor  de producción' 
          : 'Servidor local',
      },
    ],
  },
  apis: [
    './routes.js',
    './handlers/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerServe = swaggerUi.serve;
const swaggerSetup = swaggerUi.setup(swaggerSpec);

module.exports = { swaggerServe, swaggerSetup };



