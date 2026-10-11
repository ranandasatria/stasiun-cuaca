import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Weather Station Monitoring API',
      version: '1.0.0',
      description: 'REST API for the IoT weather station monitoring platform.',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local development' },
    ],
    tags: [
      { name: 'Health', description: 'Service health' },
      { name: 'Devices', description: 'Device management' },
      { name: 'Sensors', description: 'Sensor management' },
      { name: 'Ingestion', description: 'Telemetry ingestion from devices' },
      { name: 'Readings', description: 'Time-series queries' },
      { name: 'Dashboard', description: 'Dashboard aggregates' },
    ],
    paths: {
      '/healthz': {
        get: {
          tags: ['Health'],
          summary: 'Service health check',
          responses: {
            200: { description: 'Service is up' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
