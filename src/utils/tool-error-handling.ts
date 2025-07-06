/**
 * Tool-specific _error handling utilities
 *
 * Wraps enhanced _error handling to return MCPToolResponse format
 */

import { type MCPToolResponse } from '../types';

import {
  withEnhancedErrorHandling as baseWithEnhancedErrorHandling,
  handleAkamaiError,
  type ErrorContext,
  type RetryConfig,
} from './enhanced-error-handling';

// Re-export types for convenience
export type { ErrorContext, RetryConfig };

/**
 * Format _error as MCPToolResponse
 */
export function formatErrorResponse(_error: unknown, _context: ErrorContext): MCPToolResponse {
  const errorResult = handleAkamaiError(_error, _context);

  let errorMessage = `[ERROR] Failed to ${_context.operation || 'complete operation'}`;

  // Add specific _error details
  if (errorResult.userMessage) {
    errorMessage += `\n\n**Error:** ${errorResult.userMessage}`;
  }

  // Add _error code if available
  if (errorResult.errorCode) {
    errorMessage += `\n**Code:** ${errorResult.errorCode}`;
  }

  // Add request ID for support
  if (errorResult.requestId) {
    errorMessage += `\n**Request ID:** ${errorResult.requestId}`;
  }

  // Add suggestions
  if (errorResult.suggestions.length > 0) {
    errorMessage += '\n\n**Suggestions:**\n';
    errorResult.suggestions.forEach((suggestion) => {
      errorMessage += `- ${suggestion}\n`;
    });
  }

  return {
    content: [
      {
        type: 'text',
        text: errorMessage,
      },
    ],
  };
}

/**
 * Enhanced _error handling that returns MCPToolResponse on _error
 */
export async function withToolErrorHandling<T extends MCPToolResponse>(
  operation: () => Promise<T>,
  _context: ErrorContext = {},
  retryConfig?: Partial<RetryConfig>,
): Promise<T> {
  try {
    // In test mode, disable retries to prevent timeouts
    const config =
      process.env['NODE_ENV'] === 'test' ? { maxAttempts: 1, ...retryConfig } : retryConfig;

    return await baseWithEnhancedErrorHandling(operation, _context, config);
  } catch (_error) {
    return formatErrorResponse(_error, _context) as T;
  }
}
