/**
 * Error handling utilities for translating API errors into conversational responses
 */

export interface ErrorContext {
  operation: string;
  parameters?: Record<string, unknown>;
  customer?: string;
  timestamp: Date;
}

export interface TranslatedError {
  message: string;
  suggestions: string[];
  technicalDetails?: string;
  supportReference?: string;
}

export class ErrorTranslator {
  /**
   * Translate API errors into user-friendly messages
   */
  translateError(_error: unknown, context?: ErrorContext): TranslatedError {
    // Handle different error types
    if (_error.response) {
      return this.translateHTTPError(_error.response, context);
    } else if (_error.code) {
      return this.translateSystemError(_error, context);
    } else if (_error.message) {
      return this.translateGenericError(_error, context);
    }

    return {
      message: 'An unexpected error occurred',
      suggestions: ['Please try again', 'If the issue persists, contact support'],
    };
  }

  private translateHTTPError(response: unknown, context?: ErrorContext): TranslatedError {
    const { status, data } = response;

    switch (status) {
      case 400:
        return this.translateValidationError(data, context);
      case 401:
        return this.translateAuthenticationError(data, context);
      case 403:
        return this.translatePermissionError(data, context);
      case 404:
        return this.translateNotFoundError(data, context);
      case 409:
        return this.translateConflictError(data, context);
      case 429:
        return this.translateRateLimitError(response, context);
      case 500:
      case 502:
      case 503:
        return this.translateServerError(data, context);
      default:
        return this.translateGenericHTTPError(status, data, context);
    }
  }

  private translateValidationError(data: unknown, _context?: ErrorContext): TranslatedError {
    const errors = data.errors || [{ detail: data.detail || data.message }];
    const messages: string[] = [];
    const suggestions: string[] = [];

    errors.forEach((_error: unknown) => {
      if (_error.detail) {
        messages.push(this.cleanErrorMessage(_error.detail));
      }

      // Add specific suggestions based on error type
      if (_error.type === 'missing_required_field') {
        suggestions.push(
          `Please provide the required field: ${_error.errorLocation || _error.field}`,
        );
      } else if (_error.type === 'invalid_format') {
        suggestions.push(this.getFormatSuggestion(_error));
      } else if (_error.type === 'value_out_of_range') {
        suggestions.push(`Value must be between ${_error.min} and ${_error.max}`);
      }
    });

    return {
      message: messages.join('. ') || 'Validation failed',
      suggestions: suggestions.length > 0 ? suggestions : ['Check your input values and try again'],
      supportReference: data.reference,
    };
  }

  private translateAuthenticationError(data: unknown, context?: ErrorContext): TranslatedError {
    const message = data.detail || data.message || 'Authentication failed';

    const suggestions = [
      'Check your .edgerc file configuration',
      'Verify your client credentials are correct',
      "Ensure your authentication token hasn't expired",
    ];

    if (context?.customer && context.customer !== 'default') {
      suggestions.push(`Check that the [${context.customer}] section exists in .edgerc`);
    }

    return { message: this.cleanErrorMessage(message), suggestions };
  }

  private translatePermissionError(data: unknown, _context?: ErrorContext): TranslatedError {
    const message = data.detail || "You don't have permission to perform this action";
    const suggestions = ['Contact your administrator to request access'];

    if (data.requiredPermissions) {
      suggestions.push(`Required permissions: ${data.requiredPermissions.join(', ')}`);
    }

    if (data.contractId) {
      suggestions.push(`Ensure you have access to contract ${data.contractId}`);
    }

    return { message: this.cleanErrorMessage(message), suggestions };
  }

  private translateNotFoundError(data: unknown, context?: ErrorContext): TranslatedError {
    const resource = this.extractResourceType(context?.operation || '');
    const message = data.detail || `${resource} not found`;

    const suggestions = [
      `Check that the ${resource} ID is correct`,
      `Ensure the ${resource} exists and hasn't been deleted`,
    ];

    if (context?.parameters?.['propertyId']) {
      suggestions.push('Use property.list to see available properties');
    }

    return { message: this.cleanErrorMessage(message), suggestions };
  }

  private translateConflictError(data: unknown, _context?: ErrorContext): TranslatedError {
    const message = data.detail || 'Resource already exists';
    const suggestions = [];

    if (data.existingResource || data.conflictingResource) {
      const resourceId = data.existingResource || data.conflictingResource;
      suggestions.push(`A resource with this name already exists: ${resourceId}`);
      suggestions.push('Use a different name or update the existing resource');
    } else {
      suggestions.push('Choose a different name or identifier');
    }

    return { message: this.cleanErrorMessage(message), suggestions };
  }

  private translateRateLimitError(response: unknown, _context?: ErrorContext): TranslatedError {
    const retryAfter = response.headers?.['retry-after'] || '60';
    const message = 'Rate limit exceeded';

    const suggestions = [
      `Wait ${retryAfter} seconds before trying again`,
      'Reduce the frequency of your requests',
      'Consider batching multiple operations together',
    ];

    return { message, suggestions };
  }

  private translateServerError(data: unknown, _context?: ErrorContext): TranslatedError {
    const message = 'The service is temporarily unavailable';
    const suggestions = [
      'This appears to be a temporary issue',
      'Please try again in a few moments',
      'If the problem persists, contact support',
    ];

    if (data.reference) {
      suggestions.push(`Reference for support: ${data.reference}`);
    }

    return {
      message,
      suggestions,
      supportReference: data.reference,
    };
  }

  private translateSystemError(_error: unknown, _context?: ErrorContext): TranslatedError {
    const errorMap: Record<string, TranslatedError> = {
      ECONNREFUSED: {
        message: 'Connection refused',
        suggestions: [
          'Check your network connectivity',
          'Ensure the Akamai API endpoints are accessible',
          'Verify firewall settings',
        ],
      },
      ETIMEDOUT: {
        message: 'Request timed out',
        suggestions: [
          'The operation is taking longer than expected',
          'Try again with a smaller dataset',
          'Check the status of the operation separately',
        ],
      },
      ENOTFOUND: {
        message: 'DNS resolution failed',
        suggestions: [
          'Check your internet connection',
          'Verify DNS settings',
          'Ensure you can reach api.akamai.com',
        ],
      },
    };

    return (
      errorMap[_error.code] || {
        message: _error.message || 'System error occurred',
        suggestions: ['Check your system configuration', 'Try again'],
      }
    );
  }

  private translateGenericError(_error: unknown, _context?: ErrorContext): TranslatedError {
    return {
      message: this.cleanErrorMessage(_error.message || 'An error occurred'),
      suggestions: ['Please try again', 'Check your input parameters'],
    };
  }

  private translateGenericHTTPError(
    status: number,
    _data: unknown,
    _context?: ErrorContext,
  ): TranslatedError {
    const statusMessages: Record<number, string> = {
      408: 'Request timeout',
      413: 'Request too large',
      415: 'Unsupported media type',
      422: 'Invalid request data',
      504: 'Gateway timeout',
    };

    return {
      message: statusMessages[status] || `HTTP ${status} error`,
      suggestions: ['Check the API documentation', 'Verify your request format'],
    };
  }

  private cleanErrorMessage(message: string): string {
    // Remove technical jargon and API paths
    return message
      .replace(/\/\w+\/v\d+\/\w+/g, '') // Remove API paths
      .replace(/\b(type|errorLocation|field):\s*/g, '') // Remove field names
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private getFormatSuggestion(_error: unknown): string {
    const field = _error.field || _error.errorLocation || 'value';
    const format = _error.expectedFormat || _error.format;

    const formatSuggestions: Record<string, string> = {
      hostname: 'Use only the domain name without protocol or path (e.g., example.com)',
      email: 'Use a valid email format (e.g., user@example.com)',
      ipv4: 'Use a valid IPv4 address (e.g., 192.0.2.1)',
      ipv6: 'Use a valid IPv6 address (e.g., 2001:db8::1)',
      url: 'Use a complete URL with protocol (e.g., https://example.com)',
      date: 'Use ISO 8601 date format (e.g., 2024-01-20)',
    };

    return formatSuggestions[format] || `Check the format of ${field}`;
  }

  private extractResourceType(operation: string): string {
    const resourceMap: Record<string, string> = {
      property: 'property',
      zone: 'DNS zone',
      record: 'DNS record',
      certificate: 'certificate',
      cpcode: 'CP code',
      activation: 'activation',
      enrollment: 'certificate enrollment',
    };

    for (const [key, value] of Object.entries(resourceMap)) {
      if (operation.includes(key)) {
        return value;
      }
    }

    return 'resource';
  }

  /**
   * Format error for conversational response
   */
  formatConversationalError(_error: unknown, context?: ErrorContext): string {
    const translated = this.translateError(_error, context);

    let response = `Error: ${translated.message}\n\n`;

    if (translated.suggestions.length > 0) {
      response += 'What you can do:\n';
      translated.suggestions.forEach((suggestion, index) => {
        response += `${index + 1}. ${suggestion}\n`;
      });
    }

    if (translated.supportReference) {
      response += `\nIf you need to contact support, reference: ${translated.supportReference}`;
    }

    return response;
  }

  /**
   * Extract actionable next steps from error
   */
  getNextSteps(_error: unknown, context?: ErrorContext): string[] {
    const translated = this.translateError(_error, context);
    return translated.suggestions;
  }
}

/**
 * Helper to format bulk operation results with errors
 */
export function formatBulkOperationResults(results: unknown[]): string {
  const successful = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'failed');

  let response = `Completed: ${successful.length} successful, ${failed.length} failed\n\n`;

  if (successful.length > 0) {
    response += 'Successful:\n';
    successful.forEach((result) => {
      response += `[EMOJI] ${result.resource || result.name}\n`;
    });
    response += '\n';
  }

  if (failed.length > 0) {
    response += 'Failed:\n';
    failed.forEach((result) => {
      response += `[EMOJI] ${result.resource || result.name}: ${result.error}\n`;
    });
    response += '\n';

    if (failed.length <= 5) {
      response += 'To fix these errors:\n';
      const uniqueErrors = [...new Set(failed.map((r) => r.error))];
      uniqueErrors.forEach((_error, index) => {
        response += `${index + 1}. ${getFixSuggestion(_error)}\n`;
      });
    } else {
      response += 'Multiple errors occurred. Common issues:\n';
      response += '- Check for duplicate names\n';
      response += '- Verify all required fields are provided\n';
      response += '- Ensure you have necessary permissions\n';
    }
  }

  return response;
}

function getFixSuggestion(_error: string): string {
  const fixMap: Record<string, string> = {
    'already exists': 'Use a different name or skip existing resources',
    'not found': 'Verify the resource ID is correct',
    permission: 'Request access from your administrator',
    invalid: 'Check the format and try again',
    required: 'Provide all required fields',
  };

  for (const [key, suggestion] of Object.entries(fixMap)) {
    if (_error.toLowerCase().includes(key)) {
      return suggestion;
    }
  }

  return 'Review the error details and adjust your request';
}

/**
 * Custom error class for Akamai API errors
 */
export class AkamaiError extends Error {
  statusCode?: number;
  errorCode?: string;
  code?: string;
  reference?: string;
  details?: unknown;

  constructor(message: string, statusCode?: number, errorCode?: string, details?: unknown) {
    super(message);
    this.name = 'AkamaiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.code = errorCode; // Alias for compatibility
    this.details = details;

    // Extract reference if present in details
    if (details?.reference) {
      this.reference = details.reference;
    }
  }
}

/**
 * Error recovery helper
 */
export class ErrorRecovery {
  static canRetry(_error: unknown): boolean {
    // Retryable error codes
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    if (_error.code && retryableCodes.includes(_error.code)) {
      return true;
    }

    // Retryable HTTP status codes
    const retryableStatus = [408, 429, 502, 503, 504];
    if (_error.response?.status && retryableStatus.includes(_error.response.status)) {
      return true;
    }

    return false;
  }

  static getRetryDelay(attempt: number, _error: unknown): number {
    // Check for Retry-After header
    if (_error.response?.headers?.['retry-after']) {
      const retryAfter = _error.response.headers['retry-after'];
      return parseInt(retryAfter) * 1000; // Convert to milliseconds
    }

    // Exponential backoff
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter
    return delay + Math.random() * 1000;
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    onRetry?: (attempt: number, _error: unknown) => void,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (_error) {
        lastError = _error;

        if (!this.canRetry(_error) || attempt === maxAttempts - 1) {
          throw _error;
        }

        const delay = this.getRetryDelay(attempt, _error);

        if (onRetry) {
          onRetry(attempt + 1, _error);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
