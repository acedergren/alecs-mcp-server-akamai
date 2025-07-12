/**
 * MCP Error Code Mapping for Akamai API Errors
 * 
 * Maps Akamai HTTP status codes and error types to MCP protocol error codes
 * to ensure proper error handling in Claude Desktop and other MCP clients
 */

import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ErrorType } from '../services/error-handler';

/**
 * Map HTTP status and error type to MCP error code
 */
export function mapToMcpErrorCode(httpStatus: number, errorType: ErrorType): ErrorCode {
  // First check specific HTTP status codes
  switch (httpStatus) {
    case 400:
      return ErrorCode.InvalidParams;
    case 401:
      return ErrorCode.InvalidRequest; // Authentication issues
    case 403:
      return ErrorCode.InvalidRequest; // Authorization issues
    case 404:
      return ErrorCode.MethodNotFound; // Resource not found
    case 409:
      return ErrorCode.InvalidRequest; // Conflict
    case 422:
      return ErrorCode.InvalidParams; // Validation error
    case 429:
      return ErrorCode.InvalidRequest; // Rate limit
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorCode.InternalError; // Server errors
  }

  // Then check error type for more specific mapping
  switch (errorType) {
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
      return ErrorCode.InvalidRequest;
    case ErrorType.NOT_FOUND:
      return ErrorCode.MethodNotFound;
    case ErrorType.VALIDATION:
      return ErrorCode.InvalidParams;
    case ErrorType.CONFLICT:
    case ErrorType.RATE_LIMIT:
      return ErrorCode.InvalidRequest;
    case ErrorType.SERVER_ERROR:
    case ErrorType.NETWORK_ERROR:
    case ErrorType.TIMEOUT:
      return ErrorCode.InternalError;
    default:
      return ErrorCode.InternalError;
  }
}

/**
 * Create MCP-compliant error message from Akamai error
 */
export function createMcpErrorMessage(
  userMessage: string,
  errorCode?: string,
  requestId?: string
): string {
  let message = userMessage;
  
  if (errorCode) {
    message += ` (Error Code: ${errorCode})`;
  }
  
  if (requestId) {
    message += ` [Request ID: ${requestId}]`;
  }
  
  return message;
}