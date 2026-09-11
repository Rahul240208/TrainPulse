export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TrainNotFoundError extends AppError {
  constructor(trainNumber: string, message?: string) {
    super(
      message || `Train ${trainNumber} not found on Indian Railways network.`,
      404,
      'TRAIN_NOT_FOUND'
    );
  }
}

export class RateLimitError extends AppError {
  constructor(message?: string) {
    super(
      message || 'Upstream railway data quota limit reached. Please try again shortly.',
      429,
      'UPSTREAM_RATE_LIMITED'
    );
  }
}

export class UpstreamTimeoutError extends AppError {
  constructor(message?: string) {
    super(
      message || 'Upstream railway telemetry request timed out (8s limit exceeded).',
      504,
      'UPSTREAM_TIMEOUT'
    );
  }
}

export class UpstreamAuthError extends AppError {
  constructor(message?: string) {
    super(
      message || 'Upstream railway service authentication failed. Check backend configuration.',
      502,
      'UPSTREAM_AUTH_ERROR'
    );
  }
}

export class InvalidUpstreamResponseError extends AppError {
  constructor(message?: string, details?: unknown) {
    super(
      message || 'Invalid or malformed response structure from upstream railway data provider.',
      502,
      'INVALID_UPSTREAM_RESPONSE',
      details
    );
  }
}

export class UpstreamError extends AppError {
  constructor(message?: string, statusCode: number = 502, code: string = 'UPSTREAM_ERROR') {
    super(
      message || 'An error occurred while communicating with the upstream railway provider.',
      statusCode,
      code
    );
  }
}

export class UpstreamUnavailableError extends UpstreamError {
  constructor(message?: string) {
    super(
      message || 'The upstream railway service is temporarily unavailable. Please try again shortly.',
      503,
      'UPSTREAM_UNAVAILABLE'
    );
  }
}

