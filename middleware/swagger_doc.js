const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Sunat',
      version: '1.0.0',
      description: 'Documentación de la API de servicios de ATECHLO',
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      ApiKeyAuth: []
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



