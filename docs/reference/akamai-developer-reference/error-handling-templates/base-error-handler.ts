/**
 * Base Error Handler Template for Akamai APIs
 * 
 * Provides consistent error handling across all Akamai API integrations
 * with retry logic, user-friendly messages, and proper logging.
 */

interface AkamaiErrorResponse {
  type?: string;
  title: string;
  detail?: string;
  status?: number;
  instance?: string;
  requestId?: string;
  errors?: Array<{
    type?: string;
    title: string;
    detail?: string;
    field?: string;
  }>;
}

interface ErrorHandlerResult {
  success: false;
  error: string;
  userMessage: string;
  shouldRetry: boolean;
  retryAfter?: number;
  requestId?: string;
  context: {
    httpStatus: number;
    errorType: string;
    retryable: boolean;
  };
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: boolean;
}

export class AkamaiErrorHandler {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true
  };

  /**
   * Handle API errors with retry logic and user-friendly messages
   */
  handle(error: any, context?: { endpoint?: string; operation?: string }): ErrorHandlerResult {
    const httpStatus = this.extractHttpStatus(error);
    const akamaiError = this.parseAkamaiError(error);
    const errorType = this.categorizeError(httpStatus, akamaiError);
    
    return {
      success: false,
      error: this.formatTechnicalError(akamaiError, httpStatus),
      userMessage: this.formatUserMessage(httpStatus, akamaiError, context),
      shouldRetry: this.isRetryable(httpStatus, akamaiError),
      retryAfter: this.extractRetryAfter(error),
      requestId: akamaiError?.requestId,
      context: {
        httpStatus,
        errorType,
        retryable: this.isRetryable(httpStatus, akamaiError)
      }
    };
  }

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: { endpoint?: string; operation?: string }
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorResult = this.handle(error, context);

        // Don't retry if error is not retryable
        if (!errorResult.shouldRetry) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, retryConfig, errorResult.retryAfter);
        
        console.error(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
          error: errorResult.error,
          requestId: errorResult.requestId,
          context
        });

        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Extract HTTP status code from various error formats
   */
  private extractHttpStatus(error: any): number {
    if (error.response?.status) return error.response.status;
    if (error.status) return error.status;
    if (error.statusCode) return error.statusCode;
    if (error.code === 'ECONNREFUSED') return 503;
    if (error.code === 'ETIMEDOUT') return 504;
    return 500;
  }

  /**
   * Parse Akamai-specific error format (RFC 7807)
   */
  private parseAkamaiError(error: any): AkamaiErrorResponse | null {
    let errorData = error.response?.data || error.data || error;

    // Handle string responses
    if (typeof errorData === 'string') {
      try {
        errorData = JSON.parse(errorData);
      } catch {
        return {
          title: 'API Error',
          detail: errorData,
          status: this.extractHttpStatus(error)
        };
      }
    }

    // Check if it's RFC 7807 format
    if (errorData && typeof errorData === 'object' && errorData.title) {
      return errorData as AkamaiErrorResponse;
    }

    return null;
  }

  /**
   * Categorize error for handling strategy
   */
  private categorizeError(httpStatus: number, akamaiError: AkamaiErrorResponse | null): string {
    if (httpStatus === 401) return 'authentication';
    if (httpStatus === 403) return 'authorization';
    if (httpStatus === 404) return 'not_found';
    if (httpStatus === 409) return 'conflict';
    if (httpStatus === 422) return 'validation';
    if (httpStatus === 429) return 'rate_limit';
    if (httpStatus >= 500) return 'server_error';
    if (httpStatus >= 400) return 'client_error';
    return 'unknown';
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(httpStatus: number, akamaiError: AkamaiErrorResponse | null): boolean {
    // Retryable status codes
    const retryableCodes = [429, 500, 502, 503, 504];
    return retryableCodes.includes(httpStatus);
  }

  /**
   * Extract retry-after value from error
   */
  private extractRetryAfter(error: any): number | undefined {
    const retryAfter = error.response?.headers?.['retry-after'] || 
                      error.headers?.['retry-after'];
    
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? undefined : seconds * 1000; // Convert to milliseconds
    }

    return undefined;
  }

  /**
   * Format technical error message for logging
   */
  private formatTechnicalError(akamaiError: AkamaiErrorResponse | null, httpStatus: number): string {
    if (akamaiError) {
      let message = `${akamaiError.title}`;
      if (akamaiError.detail) {
        message += `: ${akamaiError.detail}`;
      }
      if (akamaiError.errors?.length) {
        const details = akamaiError.errors.map(e => 
          e.field ? `${e.field}: ${e.detail || e.title}` : e.detail || e.title
        ).join(', ');
        message += ` (${details})`;
      }
      return message;
    }

    return `HTTP ${httpStatus} error`;
  }

  /**
   * Format user-friendly error message
   */
  private formatUserMessage(
    httpStatus: number, 
    akamaiError: AkamaiErrorResponse | null,
    context?: { endpoint?: string; operation?: string }
  ): string {
    const operation = context?.operation || 'operation';

    switch (httpStatus) {
      case 401:
        return 'Authentication failed. Please check your Akamai API credentials and try again.';
      
      case 403:
        return `You don't have permission to perform this ${operation}. Please contact your Akamai administrator.`;
      
      case 404:
        return 'The requested resource could not be found. Please verify the ID and try again.';
      
      case 409:
        if (akamaiError?.detail?.includes('already exists')) {
          return 'A resource with this name already exists. Please choose a different name.';
        }
        return `This ${operation} conflicts with the current state. Please refresh and try again.`;
      
      case 422:
        if (akamaiError?.errors?.length) {
          const fieldErrors = akamaiError.errors
            .filter(e => e.field)
            .map(e => `${e.field}: ${e.detail || e.title}`)
            .join(', ');
          
          if (fieldErrors) {
            return `Please fix the following issues: ${fieldErrors}`;
          }
        }
        return `There's an issue with your request. Please check the provided information and try again.`;
      
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      
      case 500:
      case 502:
      case 503:
      case 504:
        return `The Akamai service is temporarily unavailable. Please try again in a few minutes.`;
      
      default:
        return `An unexpected error occurred during ${operation}. Please try again.`;
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig, retryAfter?: number): number {
    // Use Retry-After header if provided
    if (retryAfter) {
      return Math.min(retryAfter, config.maxDelay);
    }

    // Calculate exponential backoff
    const exponentialDelay = config.baseDelay * Math.pow(config.multiplier, attempt - 1);
    let delay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitter = Math.random() * 0.1 * delay;
      delay += jitter;
    }

    return Math.floor(delay);
  }

  /**
   * Utility function to create delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log error with context for debugging
   */
  logError(
    error: any, 
    context: { 
      endpoint?: string; 
      operation?: string; 
      customer?: string; 
      requestId?: string;
    }
  ): void {
    const errorResult = this.handle(error, context);
    
    console.error('Akamai API Error:', {
      timestamp: new Date().toISOString(),
      operation: context.operation,
      endpoint: context.endpoint,
      customer: context.customer,
      httpStatus: errorResult.context.httpStatus,
      errorType: errorResult.context.errorType,
      requestId: errorResult.requestId,
      error: errorResult.error,
      retryable: errorResult.shouldRetry
    });
  }
}

/**
 * Convenience function to create error handler with retry
 */
export async function withAkamaiErrorHandling<T>(
  operation: () => Promise<T>,
  context?: { endpoint?: string; operation?: string; customer?: string },
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const handler = new AkamaiErrorHandler();
  
  try {
    return await handler.withRetry(operation, retryConfig, context);
  } catch (error) {
    handler.logError(error, context || {});
    throw error;
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { AkamaiErrorHandler, withAkamaiErrorHandling } from './base-error-handler';
 * 
 * // Using error handler directly
 * const errorHandler = new AkamaiErrorHandler();
 * 
 * try {
 *   const result = await apiCall();
 * } catch (error) {
 *   const errorResult = errorHandler.handle(error, {
 *     operation: 'create property',
 *     endpoint: '/papi/v1/properties'
 *   });
 *   
 *   if (errorResult.shouldRetry) {
 *     // Implement retry logic
 *   } else {
 *     // Show user message
 *     console.error(errorResult.userMessage);
 *   }
 * }
 * 
 * // Using convenience wrapper with automatic retry
 * const result = await withAkamaiErrorHandling(
 *   () => client.createProperty(params),
 *   {
 *     operation: 'create property',
 *     endpoint: '/papi/v1/properties',
 *     customer: 'customer1'
 *   },
 *   { maxAttempts: 5 }
 * );
 * ```
 */