// Unified Error Handler for ALECS MCP Server
// Combines structured logging, Akamai error extraction, retry logic, categorization, user-friendly messages, and MCP-compliant responses

import { createLogger } from '../utils/pino-logger';
import type { Logger } from 'pino';

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

export interface ErrorContext {
  tool?: string;
  operation?: string;
  params?: Record<string, any>;
  customer?: string;
  requestId?: string;
  apiType?: string;
}

export interface MCPToolResponse {
  success: boolean;
  error?: string;
  userMessage?: string;
  errorType?: ErrorType;
  suggestions?: string[];
  requestId?: string;
  statusCode?: number;
  details?: any;
}

export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  multiplier?: number;
  jitter?: boolean;
}

export class UnifiedErrorHandler {
  private logger: Logger;
  private context: ErrorContext;
  private defaultRetryConfig: Required<RetryConfig> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
  };

  constructor(context: ErrorContext) {
    this.context = context;
    this.logger = createLogger(`${context.tool || 'unified'}-errors`);
  }

  handle(error: any): MCPToolResponse {
    const statusCode = this.extractStatusCode(error);
    const akamaiError = this.extractAkamaiError(error);
    const errorType = this.categorizeError(statusCode, akamaiError);
    const requestId = akamaiError?.requestId || error?.requestId;
    const suggestions = this.generateSuggestions(statusCode, akamaiError, errorType);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage = this.formatUserMessage(statusCode, akamaiError, errorType);

    this.logger.error({
      ...this.context,
      statusCode,
      errorMessage,
      akamaiError,
      requestId,
      stack: error instanceof Error ? error.stack : undefined,
    }, `${this.context.tool || 'Tool'} operation failed: ${this.context.operation}`);

    return {
      success: false,
      error: errorMessage,
      userMessage,
      errorType,
      suggestions,
      requestId,
      statusCode,
      details: akamaiError,
    };
  }

  async withRetry<T>(operation: () => Promise<T>, retryConfig?: RetryConfig): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: any;
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const result = this.handle(error);
        if (!this.isRetryable(result.statusCode, result.errorType) || attempt === config.maxAttempts) {
          throw error;
        }
        const delay = this.calculateDelay(attempt, config);
        this.logger.warn({ attempt, delay, error: result }, 'Retrying operation after error');
        await this.delay(delay);
      }
    }
    throw lastError;
  }

  private extractStatusCode(error: any): number | undefined {
    return error?.statusCode || error?.response?.status || error?.status;
  }

  private extractAkamaiError(error: any): any {
    return error?.akamaiError || error?.response?.data || (typeof error?.message === 'string' && error.message.includes('Akamai API Error') ? this.parseErrorMessage(error.message) : undefined);
  }

  private parseErrorMessage(message: string): any {
    try {
      const jsonMatch = message.match(/Full error response: ({.*})/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }

  private categorizeError(statusCode?: number, _akamaiError?: any): ErrorType {
    if (!statusCode) {return ErrorType.UNKNOWN;}
    if (statusCode >= 500) {return ErrorType.SERVER_ERROR;}
    switch (statusCode) {
      case 400: return ErrorType.VALIDATION;
      case 401: return ErrorType.AUTHENTICATION;
      case 403: return ErrorType.AUTHORIZATION;
      case 404: return ErrorType.NOT_FOUND;
      case 409: return ErrorType.CONFLICT;
      case 429: return ErrorType.RATE_LIMIT;
      case 408:
      case 504: return ErrorType.TIMEOUT;
      default: return ErrorType.UNKNOWN;
    }
  }

  private generateSuggestions(_statusCode?: number, akamaiError?: any, errorType?: ErrorType): string[] {
    const suggestions: string[] = [];
    switch (errorType) {
      case ErrorType.AUTHENTICATION:
        suggestions.push('Check your API credentials and .edgerc configuration.');
        break;
      case ErrorType.AUTHORIZATION:
        suggestions.push('Verify your account permissions and access rights.');
        break;
      case ErrorType.NOT_FOUND:
        suggestions.push('Ensure the resource exists and the ID is correct.');
        break;
      case ErrorType.VALIDATION:
        suggestions.push('Check request parameters and required fields.');
        if (akamaiError?.errors) {
          akamaiError.errors.forEach((err: any) => {
            suggestions.push(`${err.field ? `Field '${err.field}': ` : ''}${err.detail || err.title}`);
          });
        }
        break;
      case ErrorType.CONFLICT:
        suggestions.push('Check for existing resources or pending operations.');
        break;
      case ErrorType.RATE_LIMIT:
        suggestions.push('Wait before retrying or implement exponential backoff.');
        break;
      case ErrorType.SERVER_ERROR:
        suggestions.push('Try again later. If the problem persists, contact support.');
        break;
      case ErrorType.TIMEOUT:
        suggestions.push('Check your network connection and try again.');
        break;
      default:
        suggestions.push('Review the error details and logs for more information.');
    }
    return suggestions;
  }

  private formatUserMessage(_statusCode?: number, _akamaiError?: any, errorType?: ErrorType): string {
    switch (errorType) {
      case ErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your credentials.';
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this operation.';
      case ErrorType.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorType.VALIDATION:
        return 'There was a problem with your request. Please check the input.';
      case ErrorType.CONFLICT:
        return 'There is a conflict with the current state of the resource.';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait and try again.';
      case ErrorType.SERVER_ERROR:
        return 'A server error occurred. Please try again later.';
      case ErrorType.TIMEOUT:
        return 'The request timed out. Please try again.';
      default:
        return 'An unknown error occurred.';
    }
  }

  private isRetryable(_statusCode?: number, errorType?: ErrorType): boolean {
    return [ErrorType.SERVER_ERROR, ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT, ErrorType.RATE_LIMIT].includes(errorType!);
  }

  private calculateDelay(attempt: number, config: Required<RetryConfig>): number {
    let delay = config.baseDelay * Math.pow(config.multiplier, attempt - 1);
    if (config.jitter) {
      delay = delay * (0.8 + Math.random() * 0.4);
    }
    return Math.min(delay, config.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createUnifiedErrorHandler(context: ErrorContext) {
  return new UnifiedErrorHandler(context);
}

export async function withUnifiedErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {},
  retryConfig?: RetryConfig
): Promise<T> {
  const handler = new UnifiedErrorHandler(context);
  return handler.withRetry(operation, retryConfig);
} 