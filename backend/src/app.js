import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();

app.use(express.json());
app.use(requestId);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', request_id: req.id });
});

app.use('/api/v1', apiRouter);

app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Route not found',
    request_id: req.id,
  });
});

app.use(errorHandler);

export default app;
