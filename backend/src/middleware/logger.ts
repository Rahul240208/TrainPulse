import type { MiddlewareHandler } from 'hono';

export const devLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const statusColor =
    status >= 500
      ? '\x1b[31m' // Red
      : status >= 400
      ? '\x1b[33m' // Yellow
      : status >= 300
      ? '\x1b[36m' // Cyan
      : '\x1b[32m'; // Green
  const reset = '\x1b[0m';

  console.log(
    `[${timestamp}] ${method.padEnd(6)} ${path} ${statusColor}${status}${reset} - ${duration}ms`
  );
};

