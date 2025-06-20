/**
 * Error handling utilities for MCP tools
 * Wrapper around the main error utilities to provide consistent error handling
 */

import { type MCPToolResponse } from '../types';

import { ErrorTranslator, type ErrorContext } from './errors';

const errorTranslator = new ErrorTranslator();

/**
 * Format an API error for display
 */
export function formatApiError(_error: any, operation: string): string {
  const _context: ErrorContext = {
    operation,
    timestamp: new Date(),
  };

  return errorTranslator.formatConversationalError(error, context);
}

/**
 * Handle API errors and return proper MCP response
 */
export function handleApiError(_error: any, operation: string): MCPToolResponse {
  const errorMessage = formatApiError(error, operation);

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
 * Create a standardized error response
 */
export function createErrorResponse(message: string, suggestions?: string[]): MCPToolResponse {
  let text = `Error: ${message}`;

  if (suggestions && suggestions.length > 0) {
    text += '\n\nWhat you can do:\n';
    suggestions.forEach((suggestion, index) => {
      text += `${index + 1}. ${suggestion}\n`;
    });
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Extract error message from various error formats
 */
export function extractErrorMessage(_error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (_error.message) {
    return _error.message;
  }

  if (_error.response?.data?.detail) {
    return _error.response.data.detail;
  }

  if (_error.response?.statusText) {
    return _error.response.statusText;
  }

  return 'Unknown error occurred';
}
