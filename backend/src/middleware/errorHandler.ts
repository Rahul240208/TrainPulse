import type { ErrorHandler, NotFoundHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../services/errors.js';
import { config } from '../config.js';

function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'An unexpected error occurred.';
  let sanitized = msg;
  if (config.RAILRADAR_API_KEY && config.RAILRADAR_API_KEY.length > 5) {
    sanitized = sanitized.replaceAll(config.RAILRADAR_API_KEY, '[REDACTED]');
  }
  sanitized = sanitized.replace(/rg_[a-zA-Z0-9_-]+/g, '[REDACTED]');
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  // Strip file paths like C:\... or /usr/... or file://
  sanitized = sanitized.replace(/([a-zA-Z]:\\[^:\s\n]+|\/(?:home|usr|var|app|node_modules)[^\s\n]+)/g, '[INTERNAL_PATH]');
  return sanitized;
}

export const errorHandler: ErrorHandler = (err, c) => {
  // If it's an expected AppError (404, 429, 502, 503, 504), log info rather than full stack
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error(`🚨 [Upstream ${err.code}]:`, sanitizeErrorMessage(err.message));
    }
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: sanitizeErrorMessage(err.message),
        },
      },
      err.statusCode as any
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: sanitizeErrorMessage(err.errors[0]?.message || 'Input validation failed.'),
        },
      },
      400
    );
  }

  // Unexpected runtime errors: Never expose stack trace or internal server details to client
  console.error('🚨 [Unhandled Error]:', err);
  const status = 'status' in err && typeof (err as any).status === 'number' ? (err as any).status : 500;
  const userMessage = status === 500 
    ? 'An internal error occurred while processing your request. Please try again later.'
    : sanitizeErrorMessage(err instanceof Error ? err.message : 'Invalid request.');

  return c.json(
    {
      success: false,
      error: {
        code: status === 400 ? 'BAD_REQUEST' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
        message: userMessage,
      },
    },
    status as any
  );
};

export const notFoundHandler: NotFoundHandler = (c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint not found: ${c.req.method} ${c.req.path}`,
      },
    },
    404
  );
};
