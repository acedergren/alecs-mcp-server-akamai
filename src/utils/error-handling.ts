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
export function formatApiError(error: any, operation: string): string {
  const context: ErrorContext = {
    operation,
    timestamp: new Date(),
  };

  return errorTranslator.formatConversationalError(error, context);
}

/**
 * Handle API errors and return proper MCP response
 */
export function handleApiError(error: any, operation: string): MCPToolResponse {
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
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error.response?.statusText) {
    return error.response.statusText;
  }

  return 'Unknown error occurred';
}
