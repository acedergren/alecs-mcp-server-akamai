/**
 * Tool-specific _error handling utilities
 *
 * Wraps enhanced _error handling to return MCPToolResponse format
 */

import { type MCPToolResponse } from '../types';

import { UnifiedErrorHandler, withUnifiedErrorHandling } from '../services/error-handler';
import type { ErrorContext, RetryConfig } from '../services/error-handler';

// Re-export types for convenience
export type { ErrorContext, RetryConfig };

/**
 * Format _error as MCPToolResponse
 */
export function formatErrorResponse(_error: any, _context: ErrorContext): MCPToolResponse {
  const handler = new UnifiedErrorHandler(_context);
  const errorResult = handler.handle(_error);

  let errorMessage = `[ERROR] Failed to ${_context.operation || 'complete operation'}`;

  // Add specific _error details
  if (errorResult.userMessage) {
    errorMessage += `\n\n**Error:** ${errorResult.userMessage}`;
  }

  // Add _error code if available
  if (errorResult.requestId) {
    errorMessage += `\n**Request ID:** ${errorResult.requestId}`;
  }

  // Add suggestions
  if (errorResult.suggestions?.length) {
    errorMessage += '\nSuggestions:';
    for (const suggestion of errorResult.suggestions) {
      errorMessage += `\n- ${suggestion}`;
    }
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

    return await withUnifiedErrorHandling(operation, _context, config);
  } catch (_error) {
    return formatErrorResponse(_error, _context) as T;
  }
}
