/**
 * Base Akamai API client with TypeScript generics and comprehensive error handling
 */

import { logger } from '@utils/logger';
import { z, type ZodSchema } from 'zod';

import { EdgeGridAuth, EdgeGridRequestConfig as _EdgeGridRequestConfig, EdgeGridAuthError } from '../auth/EdgeGridAuth';
import { type NetworkEnvironment, ConfigurationError as _ConfigurationError, ConfigErrorType as _ConfigErrorType } from '../types/config';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Request metadata */
  metadata: {
    /** Request ID for tracing */
    requestId: string;
    /** Request duration in milliseconds */
    duration: number;
    /** Number of retry attempts */
    retryCount: number;
    /** Customer context */
    customer: string;
  };
}

/**
 * Rate limiting information from response headers
 */
export interface RateLimitInfo {
  /** Maximum requests allowed */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Time when the rate limit resets (Unix timestamp) */
  reset: number;
  /** Rate limit window duration in seconds */
  window: number;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  /** Error type/code */
  type: string;
  /** Error title */
  title: string;
  /** Detailed error message */
  detail: string;
  /** Instance identifier */
  instance?: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  errors?: Array<{
    type?: string;
    title?: string;
    detail?: string;
    error?: string;
  }>;
  /** Rate limit information if applicable */
  rateLimit?: RateLimitInfo;
}

/**
 * Request configuration options
 */
export interface RequestConfig<T = unknown> {
  /** API endpoint path */
  path: string;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request body */
  body?: unknown;
  /** Query parameters */
  queryParams?: Record<string, string | number | boolean>;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Whether to parse response as JSON */
  parseJson?: boolean;
  /** Zod schema for response validation */
  schema?: ZodSchema<T>;
  /** Network environment */
  network?: NetworkEnvironment;
}

/**
 * HTTP status code categories
 */
export enum HttpStatusCategory {
  INFORMATIONAL = '1xx',
  SUCCESS = '2xx',
  REDIRECTION = '3xx',
  CLIENT_ERROR = '4xx',
  SERVER_ERROR = '5xx',
}

/**
 * Typed HTTP errors for different status codes
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly statusText: string,
    public readonly response?: ApiErrorResponse,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  get category(): HttpStatusCategory {
    if (this.statusCode >= 100 && this.statusCode < 200) {
return HttpStatusCategory.INFORMATIONAL;
}
    if (this.statusCode >= 200 && this.statusCode < 300) {
return HttpStatusCategory.SUCCESS;
}
    if (this.statusCode >= 300 && this.statusCode < 400) {
return HttpStatusCategory.REDIRECTION;
}
    if (this.statusCode >= 400 && this.statusCode < 500) {
return HttpStatusCategory.CLIENT_ERROR;
}
    if (this.statusCode >= 500 && this.statusCode < 600) {
return HttpStatusCategory.SERVER_ERROR;
}
    throw new Error(`Invalid status code: ${this.statusCode}`);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, response?: ApiErrorResponse, requestId?: string) {
    super(message, 400, 'Bad Request', response, requestId);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string, response?: ApiErrorResponse, requestId?: string) {
    super(message, 401, 'Unauthorized', response, requestId);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string, response?: ApiErrorResponse, requestId?: string) {
    super(message, 403, 'Forbidden', response, requestId);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string, response?: ApiErrorResponse, requestId?: string) {
    super(message, 404, 'Not Found', response, requestId);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, response?: ApiErrorResponse, requestId?: string) {
    super(message, 409, 'Conflict', response, requestId);
  }
}

export class RateLimitError extends HttpError {
  constructor(
    message: string,
    public readonly rateLimit: RateLimitInfo,
    response?: ApiErrorResponse,
    requestId?: string,
  ) {
    super(message, 429, 'Too Many Requests', response, requestId);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string, response?: ApiErrorResponse, requestId?: string) {
    super(message, 500, 'Internal Server Error', response, requestId);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message: string, response?: ApiErrorResponse, requestId?: string) {
    super(message, 503, 'Service Unavailable', response, requestId);
  }
}

/**
 * Request/response logging interface
 */
export interface LogContext {
  requestId: string;
  customer: string;
  method: string;
  path: string;
  duration?: number;
  status?: number;
  retryCount?: number;
  error?: Error;
}

/**
 * Base Akamai API client with generic typing support
 */
export class BaseAkamaiClient {
  protected readonly auth: EdgeGridAuth;
  protected readonly customer: string;
  private requestCounter = 0;

  constructor(customer = 'default') {
    this.customer = customer;
    this.auth = EdgeGridAuth.getInstance({ customer });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const counter = ++this.requestCounter;
    return `${this.customer}-${timestamp}-${counter}`;
  }

  /**
   * Parse rate limit headers
   */
  private parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo | undefined {
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    const window = headers['x-ratelimit-window'];

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        window: window ? parseInt(window, 10) : 3600,
      };
    }

    return undefined;
  }

  /**
   * Create appropriate HTTP error based on status code
   */
  private createHttpError(
    status: number,
    message: string,
    response?: ApiErrorResponse,
    requestId?: string,
  ): HttpError {
    switch (status) {
      case 400:
        return new BadRequestError(message, response, requestId);
      case 401:
        return new UnauthorizedError(message, response, requestId);
      case 403:
        return new ForbiddenError(message, response, requestId);
      case 404:
        return new NotFoundError(message, response, requestId);
      case 409:
        return new ConflictError(message, response, requestId);
      case 429: {
        const rateLimit = response?.rateLimit || {
          limit: 0,
          remaining: 0,
          reset: Date.now() / 1000 + 60,
          window: 60,
        };
        return new RateLimitError(message, rateLimit, response, requestId);
      }
      case 500:
        return new InternalServerError(message, response, requestId);
      case 503:
        return new ServiceUnavailableError(message, response, requestId);
      default:
        return new HttpError(message, status, `HTTP ${status}`, response, requestId);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (_error instanceof HttpError) {
      // Retry on 5xx errors and rate limits
      return _error.statusCode >= 500 || _error.statusCode === 429;
    }
    if (_error instanceof EdgeGridAuthError) {
      // Retry on network errors
      return _error.code === 'NO_RESPONSE' || _error.code === 'REQUEST_ERROR';
    }
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, baseDelay: number, _error?: Error): number {
    // For rate limit errors, use the reset time if available
    if (_error instanceof RateLimitError && _error.rateLimit.reset) {
      const resetTime = _error.rateLimit.reset * 1000;
      const now = Date.now();
      const delay = Math.max(resetTime - now, 0);
      return delay + 1000; // Add 1 second buffer
    }

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  /**
   * Validate response data with Zod schema
   */
  private validateResponse<T>(data: unknown, schema?: ZodSchema<T>): T {
    if (!schema) {
      return data as T;
    }

    try {
      return schema.parse(data);
    } catch (error) {
      if (_error instanceof z.ZodError) {
        throw new Error(
          `Response validation failed: ${_error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      throw error;
    }
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  protected async request<T = unknown>(config: RequestConfig<T>): Promise<ApiResponse<T>> {
    const {
      path,
      method = 'GET',
      body,
      queryParams,
      headers = {},
      timeout: _timeout,
      maxRetries = 3,
      retryDelay = 1000,
      parseJson: _parseJson = true,
      schema,
    } = config;

    const requestId = this.generateRequestId();
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;

    const logContext: LogContext = {
      requestId,
      customer: this.customer,
      method,
      path,
    };

    logger.info('Starting API request', logContext);

    while (retryCount <= maxRetries) {
      try {
        // Make request using EdgeGrid auth
        const response = await this.auth._request<T>({
          path,
          method: method as any,
          body,
          queryParams,
          headers: {
            ...headers,
            'X-Request-ID': requestId,
          },
        });

        // Calculate duration
        const duration = Date.now() - startTime;

        // Parse rate limit info
        const rateLimitInfo = this.parseRateLimitHeaders(headers);

        // Log successful request
        logger.info('API request successful', {
          ...logContext,
          duration,
          status: 200,
          retryCount,
          rateLimit: rateLimitInfo,
        });

        // Validate response if schema provided
        const validatedData = this.validateResponse(response, schema);

        return {
          data: validatedData,
          status: 200,
          headers,
          metadata: {
            requestId,
            duration,
            retryCount,
            customer: this.customer,
          },
        };
      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - startTime;

        logger.error('API request failed', {
          ...logContext,
          duration,
          retryCount,
          error: lastError,
        });

        // Check if error is retryable
        if (retryCount < maxRetries && this.isRetryableError(lastError)) {
          const delay = this.calculateRetryDelay(retryCount, retryDelay, lastError);

          logger.info(`Retrying request after ${delay}ms`, {
            ...logContext,
            retryCount: retryCount + 1,
            delay,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        // Transform error to appropriate HTTP error
        if (lastError instanceof EdgeGridAuthError) {
          const errorDetails = lastError.details
            ? {
                type: lastError.details.type || 'EdgeGrid Error',
                title: lastError.details.title || 'Authentication Error',
                detail: lastError.details.detail || lastError.message,
                instance: lastError.details.instance,
                status: lastError.statusCode || 500,
              }
            : undefined;

          const httpError = this.createHttpError(
            lastError.statusCode || 500,
            lastError.message,
            errorDetails,
            requestId,
          );
          throw httpError;
        }

        throw lastError;
      }
    }

    // Should not reach here, but throw last error if we do
    throw lastError || new Error('Unknown error occurred');
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    path: string,
    config?: Omit<RequestConfig<T>, 'path' | 'method'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      path,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<RequestConfig<T>, 'path' | 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      path,
      method: 'POST',
      body,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<RequestConfig<T>, 'path' | 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      path,
      method: 'PUT',
      body,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    path: string,
    config?: Omit<RequestConfig<T>, 'path' | 'method'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      path,
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<RequestConfig<T>, 'path' | 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      ...config,
      path,
      method: 'PATCH',
      body,
    });
  }

  /**
   * Get customer name
   */
  getCustomer(): string {
    return this.customer;
  }

  /**
   * Check if account switching is enabled
   */
  hasAccountSwitching(): boolean {
    return this.auth.isAccountSwitchingEnabled();
  }
}
