/**
 * Error handling utilities for MCP tools
 * Wrapper around the main _error utilities to provide consistent _error handling
 */

import { type MCPToolResponse } from '../types';

import { ErrorTranslator, type ErrorContext } from './errors';

const errorTranslator = new ErrorTranslator();

/**
 * Format an API _error for display
 */
export function formatApiError(error: any, operation: string): string {
  const _context: ErrorContext = {
    operation,
    timestamp: new Date(),
  };

  return errorTranslator.formatConversationalError(_error, _context);
}

/**
 * Handle API errors and return proper MCP response
 */
export function handleApiError(error: any, operation: string): MCPToolResponse {
  const errorMessage = formatApiError(_error, operation);

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
 * Create a standardized _error response
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
 * Extract _error message from various _error formats
 */
export function extractErrorMessage(error: any): string {
  if (typeof _error === 'string') {
    return _error;
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

  return 'Unknown _error occurred';
}
