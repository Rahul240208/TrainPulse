import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config } from './config.js';
import { corsMiddleware } from './middleware/cors.js';
import { devLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { liveTrainRouter } from './routes/liveTrain.js';
import { stationsRouter } from './routes/stations.js';
import { searchRouter } from './routes/search.js';

export const app = new Hono();

// Global Middlewares
app.use('*', corsMiddleware);
if (config.NODE_ENV !== 'test') {
  app.use('*', devLogger);
}

// Global Error & 404 Handlers
app.onError(errorHandler);
app.notFound(notFoundHandler);

// Health Check Endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.NODE_ENV,
  });
});

// API Root Information
app.get('/', (c) => {
  return c.json({
    name: 'TrainPulse API',
    description: 'Live Indian Railway Tracking Backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      liveTracking: '/api/v1/trains/:trainNumber/live',
      trainsBetween: '/api/v1/trains/between?from=:from&to=:to',
      stationsSearch: '/api/v1/stations/search?q=:query',
      platformInfo: '/api/v1/trains/:trainNumber/platform',
      coachLayout: '/api/v1/trains/:trainNumber/coaches',
    },
  });
});

// Mount Routes
app.route('/api/v1/trains', liveTrainRouter);
app.route('/api/v1/stations', stationsRouter);
app.route('/api/v1/search', searchRouter);


// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  serve(
    {
      fetch: app.fetch,
      port: config.PORT,
    },
    (info) => {
      console.log(`🚂 TrainPulse Backend running at http://localhost:${info.port}`);
      console.log(`📡 Live Tracking: http://localhost:${info.port}/api/v1/trains/12301/live`);
      console.log(`🩺 Health Check:  http://localhost:${info.port}/health`);
    }
  );
}

