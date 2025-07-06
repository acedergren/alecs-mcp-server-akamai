/**
 * Consolidated Error Handling Module - CODE KAI Implementation
 * 
 * KEY: Unified error handling with user-friendly messages
 * APPROACH: Consistent error format with actionable guidance
 * IMPLEMENTATION: Zero dependencies, type-safe errors
 * 
 * Consolidates error handling from:
 * - 8 duplicate formatError functions
 * - Multiple handleApiError implementations
 * - Various inline error handling patterns
 */

import { AxiosError } from 'axios';

/**
 * Standard error codes used across the application
 */
export enum ErrorCode {
  // Client errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Business logic errors
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_FAILED = 'OPERATION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: string;
    suggestion?: string;
    docLink?: string;
    timestamp: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Application error class with rich context
 */
export class ApplicationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: string,
    public suggestion?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
  
  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        suggestion: this.suggestion,
        timestamp: new Date().toISOString(),
        context: this.context,
      },
    };
  }
}

/**
 * Format any error into a consistent structure
 * Replaces 8 duplicate formatError functions
 */
export function formatError(error: unknown): string {
  if (error instanceof ApplicationError) {
    return formatApplicationError(error);
  }
  
  if (error instanceof AxiosError) {
    return formatAxiosError(error);
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

/**
 * Format application errors with full context
 */
function formatApplicationError(error: ApplicationError): string {
  let message = error.message;
  
  if (error.details) {
    message += `\nDetails: ${error.details}`;
  }
  
  if (error.suggestion) {
    message += `\n💡 Suggestion: ${error.suggestion}`;
  }
  
  if (error.context) {
    message += `\nContext: ${JSON.stringify(error.context, null, 2)}`;
  }
  
  return message;
}

/**
 * Format Axios errors from Akamai API calls
 */
function formatAxiosError(error: AxiosError): string {
  const status = error.response?.status;
  const data = error.response?.data as any;
  
  // Handle RFC 7807 Problem Details format
  if (data?.type && data?.title) {
    return formatRFC7807Error(data);
  }
  
  // Handle standard Akamai error format
  if (data?.detail) {
    return `${data.title || 'API Error'}: ${data.detail}`;
  }
  
  // Handle legacy error formats
  if (data?.message) {
    return data.message;
  }
  
  // Fallback to status-based messages
  return getStatusMessage(status) || error.message;
}

/**
 * Format RFC 7807 Problem Details errors
 */
function formatRFC7807Error(problem: any): string {
  let message = `${problem.title}: ${problem.detail || 'No details provided'}`;
  
  if (problem.instance) {
    message += `\nInstance: ${problem.instance}`;
  }
  
  if (problem.errors?.length > 0) {
    message += '\nErrors:';
    problem.errors.forEach((err: any) => {
      message += `\n  - ${err.detail || err.message}`;
    });
  }
  
  return message;
}

/**
 * Get user-friendly message for HTTP status codes
 */
function getStatusMessage(status?: number): string | null {
  switch (status) {
    case 400:
      return 'Bad Request: The request was invalid. Please check your parameters.';
    case 401:
      return 'Unauthorized: Authentication failed. Please check your credentials.';
    case 403:
      return 'Forbidden: You don\'t have permission to perform this operation.';
    case 404:
      return 'Not Found: The requested resource does not exist.';
    case 409:
      return 'Conflict: The operation conflicts with the current state.';
    case 429:
      return 'Rate Limited: Too many requests. Please wait before retrying.';
    case 500:
      return 'Internal Server Error: Akamai API encountered an error.';
    case 502:
      return 'Bad Gateway: Unable to reach Akamai API.';
    case 503:
      return 'Service Unavailable: Akamai API is temporarily unavailable.';
    case 504:
      return 'Gateway Timeout: Request to Akamai API timed out.';
    default:
      return null;
  }
}

/**
 * Enhanced API error handler with suggestions
 * Consolidates multiple handleApiError implementations
 */
export function handleApiError(error: unknown, operation: string): never {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const suggestion = getErrorSuggestion(status, operation);
    
    throw new ApplicationError(
      getErrorCode(status),
      formatError(error),
      error.response?.data?.detail,
      suggestion,
      {
        operation,
        status,
        url: error.config?.url,
        method: error.config?.method,
      }
    );
  }
  
  throw new ApplicationError(
    ErrorCode.INTERNAL_ERROR,
    formatError(error),
    undefined,
    'Please check the error details and try again',
    { operation }
  );
}

/**
 * Get error code from HTTP status
 */
function getErrorCode(status?: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.INVALID_PARAMETER;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    case 429:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.API_ERROR;
  }
}

/**
 * Get contextual suggestions for errors
 */
function getErrorSuggestion(status: number | undefined, operation: string): string {
  switch (status) {
    case 401:
      return 'Verify your .edgerc file has valid credentials for this customer';
    case 403:
      return 'Check if your API credentials have permission for this operation';
    case 404:
      return 'Verify the resource ID is correct and exists in this account';
    case 429:
      return 'Wait a few minutes before retrying, or implement request throttling';
    case 500:
    case 502:
    case 503:
      return 'This appears to be a temporary issue. Please try again in a few minutes';
    default:
      return `Check the parameters for ${operation} and try again`;
  }
}

/**
 * Create user-friendly error messages for common scenarios
 */
export const ErrorMessages = {
  // Validation errors
  invalidId: (type: string, id: string) => 
    `Invalid ${type} ID format: "${id}"`,
  
  missingParameter: (param: string) => 
    `Required parameter '${param}' is missing`,
  
  invalidParameter: (param: string, value: unknown, expected: string) =>
    `Invalid ${param}: "${value}". Expected: ${expected}`,
  
  // Permission errors
  noPermission: (resource: string) =>
    `You don't have permission to access ${resource}`,
  
  accountMismatch: (expected: string, actual: string) =>
    `This resource belongs to account ${expected}, but you're using ${actual}`,
  
  // State errors
  invalidState: (current: string, required: string) =>
    `Invalid state: ${current}. Required state: ${required}`,
  
  operationInProgress: (operation: string) =>
    `Cannot proceed: ${operation} is already in progress`,
  
  // Network errors
  timeout: (operation: string, seconds: number) =>
    `${operation} timed out after ${seconds} seconds`,
  
  networkError: (operation: string) =>
    `Network error during ${operation}. Please check your connection`,
} as const;

/**
 * Error recovery suggestions
 */
export const RecoverySuggestions = {
  401: 'Run "akamai auth verify" to check your credentials',
  403: 'Contact your Akamai administrator to request access',
  404: 'Use the list operation to find valid resource IDs',
  429: 'Implement exponential backoff or reduce request rate',
  500: 'Report this issue if it persists',
} as const;

/**
 * Wrap async functions with consistent error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error, operation);
    }
  }) as T;
}

/**
 * Create a formatted error response for MCP tools
 */
export function createErrorResponse(error: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{
      type: 'text',
      text: `❌ Error: ${formatError(error)}`,
    }],
  };
}