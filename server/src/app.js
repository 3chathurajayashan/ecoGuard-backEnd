import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createApiRouter } from './routes/apiRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Creates an Express application from injected application dependencies.
 * @param {object} dependencies Services, repositories and optional HTTP settings.
 * @returns {import('express').Express} Configured app.
 */
export function createApp(dependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin:
        dependencies.clientOrigin ??
        process.env.CLIENT_ORIGIN ??
        'http://localhost:5173',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-User-Id'],
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', createApiRouter(dependencies));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
