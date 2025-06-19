/**
 * Enhanced Error Handling for Akamai APIs
 *
 * Comprehensive error handling with retry logic, categorization,
 * and user-friendly messaging based on documented error patterns.
 */

import { type AkamaiErrorResponse } from './response-parsing';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: boolean;
}

export interface ErrorContext {
  endpoint?: string;
  operation?: string;
  customer?: string;
  apiType?: 'papi' | 'dns' | 'cps' | 'purge' | 'network-lists' | 'security';
  requestId?: string;
}

export interface EnhancedErrorResult {
  success: false;
  error: string;
  userMessage: string;
  shouldRetry: boolean;
  retryAfter?: number;
  requestId?: string;
  errorCode?: string;
  errorType: ErrorType;
  suggestions: string[];
  context: ErrorContext;
}

export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  VALIDATION = 'validation',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

export class EnhancedErrorHandler {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
  };

  /**
   * Handle error with comprehensive analysis and suggestions
   */
  handle(error: any, context: ErrorContext = {}): EnhancedErrorResult {
    const httpStatus = this.extractHttpStatus(error);
    const akamaiError = this.parseAkamaiErrorResponse(error);
    const errorType = this.categorizeError(httpStatus, akamaiError, context);

    // Extract request ID and add to context for suggestions
    const requestId = akamaiError?.requestId || this.extractRequestId(error);
    if (requestId && !context.requestId) {
      context.requestId = requestId;
    }

    const suggestions = this.generateSuggestions(httpStatus, akamaiError, errorType, context);

    return {
      success: false,
      error: this.formatTechnicalError(akamaiError, httpStatus),
      userMessage: this.formatUserMessage(httpStatus, akamaiError, errorType, context),
      shouldRetry: this.isRetryable(httpStatus, errorType),
      retryAfter: this.extractRetryAfter(error),
      requestId,
      errorCode: akamaiError?.type,
      errorType,
      suggestions,
      context,
    };
  }

  /**
   * Execute operation with intelligent retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {},
    retryConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: any;
    const attempts: Array<{ attempt: number; error: any; delay: number }> = [];

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorResult = this.handle(error, context);

        attempts.push({
          attempt,
          error: errorResult,
          delay:
            attempt < config.maxAttempts
              ? this.calculateDelay(attempt, config, errorResult.retryAfter)
              : 0,
        });

        // Don't retry if error is not retryable
        if (!errorResult.shouldRetry) {
          this.logFailure(attempts, context);
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          this.logFailure(attempts, context);
          break;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, config, errorResult.retryAfter);

        this.logRetryAttempt(attempt, delay, errorResult, context);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Extract HTTP status from various error formats
   */
  private extractHttpStatus(error: any): number {
    if (error.response?.status) {
return error.response.status;
}
    if (error.status) {
return error.status;
}
    if (error.statusCode) {
return error.statusCode;
}
    if (error.code === 'ECONNREFUSED') {
return 503;
}
    if (error.code === 'ETIMEDOUT') {
return 408;
}
    if (error.code === 'ENOTFOUND') {
return 503;
}
    if (error.code === 'ECONNRESET') {
return 503;
}
    return 500;
  }

  /**
   * Parse Akamai error response with enhanced extraction
   */
  private parseAkamaiErrorResponse(error: any): AkamaiErrorResponse | null {
    let errorData = error.response?.data || error.data || error;

    // Handle string responses
    if (typeof errorData === 'string') {
      try {
        errorData = JSON.parse(errorData);
      } catch {
        return {
          title: 'API Error',
          detail: errorData,
          status: this.extractHttpStatus(error),
        };
      }
    }

    // RFC 7807 Problem Details format
    if (errorData && typeof errorData === 'object' && errorData.title) {
      return {
        type: errorData.type,
        title: errorData.title,
        detail: errorData.detail,
        status: errorData.status || this.extractHttpStatus(error),
        instance: errorData.instance,
        requestId: errorData.requestId || this.extractRequestId(error),
        errors: errorData.errors,
      };
    }

    return null;
  }

  /**
   * Categorize error for appropriate handling
   */
  private categorizeError(
    httpStatus: number,
    akamaiError: AkamaiErrorResponse | null,
    context: ErrorContext,
  ): ErrorType {
    // Network/connection errors
    if (httpStatus >= 500 && httpStatus <= 599) {
      return ErrorType.SERVER_ERROR;
    }

    // Client errors
    switch (httpStatus) {
      case 401:
        return ErrorType.AUTHENTICATION;
      case 403:
        return ErrorType.AUTHORIZATION;
      case 404:
        return ErrorType.NOT_FOUND;
      case 409:
        return ErrorType.CONFLICT;
      case 422:
        return ErrorType.VALIDATION;
      case 429:
        return ErrorType.RATE_LIMIT;
      case 408:
      case 504:
        return ErrorType.TIMEOUT;
    }

    // Check error type from Akamai error response
    if (akamaiError?.type) {
      if (akamaiError.type.includes('authentication')) {
return ErrorType.AUTHENTICATION;
}
      if (akamaiError.type.includes('authorization')) {
return ErrorType.AUTHORIZATION;
}
      if (akamaiError.type.includes('validation')) {
return ErrorType.VALIDATION;
}
      if (akamaiError.type.includes('rate-limit')) {
return ErrorType.RATE_LIMIT;
}
    }

    // Check for validation errors in errors array
    if (akamaiError?.errors && akamaiError.errors.length > 0) {
      const hasFieldErrors = akamaiError.errors.some(
        (err: any) => err.field || err.type === 'field-error',
      );
      if (hasFieldErrors) {
return ErrorType.VALIDATION;
}
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Generate actionable suggestions based on error type and context
   */
  private generateSuggestions(
    httpStatus: number,
    akamaiError: AkamaiErrorResponse | null,
    errorType: ErrorType,
    context: ErrorContext,
  ): string[] {
    const suggestions: string[] = [];

    switch (errorType) {
      case ErrorType.AUTHENTICATION:
        suggestions.push('Verify your .edgerc credentials are correct and not expired');
        suggestions.push('Check that the client_token, client_secret, and access_token are valid');
        suggestions.push('Ensure the host URL matches your credential configuration');
        if (context.customer) {
          suggestions.push(
            `Verify the customer section '${context.customer}' exists in your .edgerc file`,
          );
        }
        break;

      case ErrorType.AUTHORIZATION:
        suggestions.push('Check that your API credentials have the necessary permissions');
        suggestions.push('Verify you have access to the specified contract and group');
        if (context.apiType === 'papi') {
          suggestions.push('Ensure you have Property Manager API access');
        }
        if (context.apiType === 'dns') {
          suggestions.push('Ensure you have Edge DNS API access');
        }
        break;

      case ErrorType.NOT_FOUND:
        if (context.endpoint?.includes('properties')) {
          suggestions.push('Verify the property ID exists and you have access to it');
          suggestions.push('Check that the contract ID and group ID are correct');
        }
        if (context.endpoint?.includes('zones')) {
          suggestions.push('Verify the DNS zone exists and is associated with your contract');
        }
        suggestions.push('Double-check all resource IDs are in the correct format');
        break;

      case ErrorType.VALIDATION:
        if (akamaiError?.errors) {
          akamaiError.errors.forEach((err) => {
            if (err.field) {
              suggestions.push(`Fix the '${err.field}' field: ${err.detail || err.title}`);
            } else {
              suggestions.push(err.detail || err.title);
            }
          });
        } else {
          suggestions.push('Review all required parameters and their formats');
          suggestions.push('Check parameter constraints (min/max values, length limits)');
        }
        break;

      case ErrorType.CONFLICT:
        if (akamaiError?.detail?.includes('already exists')) {
          suggestions.push('Choose a different name for the resource');
          suggestions.push('Check if a resource with the same name already exists');
        }
        if (akamaiError?.detail?.includes('activation')) {
          suggestions.push('Wait for the current activation to complete');
          suggestions.push('Check the activation status before retrying');
        }
        break;

      case ErrorType.RATE_LIMIT:
        suggestions.push('Wait before making additional requests');
        suggestions.push('Implement exponential backoff in your retry logic');
        suggestions.push('Consider batching operations to reduce API call frequency');
        break;

      case ErrorType.SERVER_ERROR:
        suggestions.push('Wait a few minutes and retry the operation');
        suggestions.push('Check Akamai status page for service disruptions');
        if (context.requestId) {
          suggestions.push(`Contact Akamai support with request ID: ${context.requestId}`);
        }
        break;

      case ErrorType.TIMEOUT:
        suggestions.push('Increase timeout values for long-running operations');
        suggestions.push('For activations, use polling to check status periodically');
        suggestions.push('Consider breaking large operations into smaller chunks');
        break;
    }

    // Add API-specific suggestions
    if (context.apiType === 'papi' && context.endpoint?.includes('activations')) {
      suggestions.push('Production activations require notification emails');
      suggestions.push('Ensure the property version exists before activating');
    }

    if (context.apiType === 'dns' && context.operation?.includes('record')) {
      suggestions.push('DNS record changes require changelist workflow');
      suggestions.push('Submit the changelist after making record changes');
    }

    return suggestions;
  }

  /**
   * Format technical error message for logging
   */
  private formatTechnicalError(
    akamaiError: AkamaiErrorResponse | null,
    httpStatus: number,
  ): string {
    if (akamaiError) {
      let message = `${akamaiError.title} (HTTP ${httpStatus})`;
      if (akamaiError.detail) {
        message += `: ${akamaiError.detail}`;
      }
      if (akamaiError.type) {
        message += ` [${akamaiError.type}]`;
      }
      if (akamaiError.errors?.length) {
        const details = akamaiError.errors
          .map((e) => (e.field ? `${e.field}: ${e.detail || e.title}` : e.detail || e.title))
          .join(', ');
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
    errorType: ErrorType,
    context: ErrorContext,
  ): string {
    const operation = context.operation || 'operation';

    switch (errorType) {
      case ErrorType.AUTHENTICATION:
        return `Authentication failed for ${operation}. Please check your Akamai API credentials and ensure they are valid and not expired.`;

      case ErrorType.AUTHORIZATION:
        return `You don't have permission to perform this ${operation}. Please contact your Akamai administrator to verify your API access rights.`;

      case ErrorType.NOT_FOUND:
        if (context.endpoint?.includes('properties')) {
          return 'The requested property could not be found. Please verify the property ID and ensure you have access to it.';
        }
        if (context.endpoint?.includes('zones')) {
          return 'The requested DNS zone could not be found. Please verify the zone name and contract access.';
        }
        return 'The requested resource could not be found. Please verify the ID and try again.';

      case ErrorType.VALIDATION:
        if (akamaiError?.errors?.length) {
          const fieldErrors = akamaiError.errors
            .filter((e) => e.field)
            .map((e) => `${e.field}: ${e.detail || e.title}`)
            .slice(0, 3) // Limit to first 3 errors
            .join(', ');

          if (fieldErrors) {
            return `Please fix the following issues: ${fieldErrors}${akamaiError.errors.length > 3 ? ' (and others)' : ''}`;
          }
        }
        return `There are validation issues with your ${operation} request. Please check all required parameters and their formats.`;

      case ErrorType.CONFLICT:
        if (akamaiError?.detail?.includes('already exists')) {
          return 'A resource with this name already exists. Please choose a different name or check if you want to update the existing resource.';
        }
        if (akamaiError?.detail?.includes('activation')) {
          return 'This operation conflicts with a pending activation. Please wait for the current activation to complete.';
        }
        return `This ${operation} conflicts with the current state. Please refresh the resource information and try again.`;

      case ErrorType.RATE_LIMIT:
        return 'Too many requests have been made. Please wait a moment before trying again to avoid hitting rate limits.';

      case ErrorType.SERVER_ERROR:
        return `The Akamai service is temporarily unavailable. Please try your ${operation} again in a few minutes.`;

      case ErrorType.TIMEOUT:
        return `The ${operation} request timed out. For long-running operations like activations, please check the status separately.`;

      default:
        return `An unexpected error occurred during ${operation}. Please try again or contact support if the issue persists.`;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(httpStatus: number, errorType: ErrorType): boolean {
    const retryableTypes = [
      ErrorType.RATE_LIMIT,
      ErrorType.SERVER_ERROR,
      ErrorType.TIMEOUT,
      ErrorType.NETWORK_ERROR,
    ];

    return retryableTypes.includes(errorType) || httpStatus >= 500;
  }

  /**
   * Extract retry-after value from error response
   */
  private extractRetryAfter(error: any): number | undefined {
    const retryAfter = error.response?.headers?.['retry-after'] || error.headers?.['retry-after'];

    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? undefined : seconds * 1000; // Convert to milliseconds
    }

    return undefined;
  }

  /**
   * Extract request ID for support tracking
   */
  private extractRequestId(error: any): string | undefined {
    return (
      error.response?.headers?.['x-request-id'] ||
      error.headers?.['x-request-id'] ||
      error.response?.headers?.['x-trace-id'] ||
      error.headers?.['x-trace-id'] ||
      error.response?.data?.requestId
    );
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
   * Create delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log retry attempt with context
   */
  private logRetryAttempt(
    attempt: number,
    delay: number,
    errorResult: EnhancedErrorResult,
    context: ErrorContext,
  ): void {
    console.warn(`Retry attempt ${attempt} after ${delay}ms:`, {
      timestamp: new Date().toISOString(),
      operation: context.operation,
      endpoint: context.endpoint,
      customer: context.customer,
      errorType: errorResult.errorType,
      error: errorResult.error,
      requestId: errorResult.requestId,
    });
  }

  /**
   * Log final failure with all attempts
   */
  private logFailure(
    attempts: Array<{ attempt: number; error: any; delay: number }>,
    context: ErrorContext,
  ): void {
    console.error('Operation failed after all retry attempts:', {
      timestamp: new Date().toISOString(),
      operation: context.operation,
      endpoint: context.endpoint,
      customer: context.customer,
      totalAttempts: attempts.length,
      attempts: attempts.map((a) => ({
        attempt: a.attempt,
        errorType: a.error.errorType,
        delay: a.delay,
      })),
      finalError: attempts[attempts.length - 1]?.error,
    });
  }
}

/**
 * Convenience function for enhanced error handling with retry
 */
export async function withEnhancedErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {},
  retryConfig?: Partial<RetryConfig>,
): Promise<T> {
  const handler = new EnhancedErrorHandler();
  return handler.withRetry(operation, context, retryConfig);
}

/**
 * Convenience function for handling single errors
 */
export function handleAkamaiError(error: any, context: ErrorContext = {}): EnhancedErrorResult {
  const handler = new EnhancedErrorHandler();
  return handler.handle(error, context);
}
