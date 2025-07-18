/**
 * UNIFIED ERROR HANDLER
 * 
 * ARCHITECTURAL PURPOSE:
 * Consolidates all error handling implementations into a single, comprehensive
 * error handling system that combines:
 * - RFC 7807 Problem Details standard from rfc7807-errors.ts
 * - Enhanced debugging and logging from error-handler.ts
 * - Domain-specific error handling from domain-errors.ts
 * - Conversational error formatting from errors.ts
 * 
 * KEY FEATURES:
 * 1. RFC 7807 compliant error responses
 * 2. Rich debugging information with Pino logging
 * 3. Human-friendly error messages with actionable suggestions
 * 4. Domain-specific error handling
 * 5. Automatic retry logic with exponential backoff
 * 6. Comprehensive error translation and formatting
 */

import { createLogger } from '../../utils/pino-logger';
import type { Logger } from 'pino';
import type { MCPToolResponse } from '../../types';
import { contractGroupDiscovery } from '../../services/contract-group-discovery-service';

/**
 * RFC 7807 Problem Details structure
 */
export interface ProblemDetails {
  /** URI identifying the problem type */
  type: string;
  /** Short, human-readable summary */
  title: string;
  /** Human-readable explanation */
  detail: string;
  /** HTTP status code */
  status: number;
  /** URI of the specific occurrence */
  instance?: string;
  /** Additional Akamai-specific errors */
  errors?: Array<{
    type: string;
    title: string;
    detail: string;
    messageId?: string;
    field?: string;
  }>;
  /** Request ID for support */
  requestId?: string;
  /** Any additional properties */
  [key: string]: unknown;
}

/**
 * Error context for enhanced debugging
 */
export interface ErrorContext {
  tool: string;
  operation: string;
  params?: Record<string, unknown>;
  customer?: string;
  requestId?: string;
  timestamp?: Date;
}

/**
 * Common Akamai API error types (RFC 7807 compliant)
 */
export const AkamaiErrorTypes = {
  // Resource errors
  PROPERTY_NOT_FOUND: 'https://problems.luna.akamaiapis.net/papi/v1/property_not_found',
  CONTRACT_NOT_FOUND: 'https://problems.luna.akamaiapis.net/papi/v1/contract_not_found',
  GROUP_NOT_FOUND: 'https://problems.luna.akamaiapis.net/papi/v1/group_not_found',
  VERSION_NOT_FOUND: 'https://problems.luna.akamaiapis.net/papi/v1/version_not_found',
  ZONE_NOT_FOUND: 'https://problems.luna.akamaiapis.net/config-dns/v2/zone_not_found',
  ENROLLMENT_NOT_FOUND: 'https://problems.luna.akamaiapis.net/cps/v2/enrollment_not_found',
  
  // Validation errors
  VALIDATION_FAILED: 'https://problems.luna.akamaiapis.net/papi/v1/validation_failed',
  INVALID_PARAMETERS: 'https://problems.luna.akamaiapis.net/papi/v1/invalid_parameters',
  INVALID_DNS_RECORD: 'https://problems.luna.akamaiapis.net/config-dns/v2/invalid_record',
  
  // Permission errors
  UNAUTHORIZED: 'https://problems.luna.akamaiapis.net/papi/v1/unauthorized',
  FORBIDDEN: 'https://problems.luna.akamaiapis.net/papi/v1/forbidden',
  INSUFFICIENT_PERMISSIONS: 'https://problems.luna.akamaiapis.net/papi/v1/insufficient_permissions',
  
  // Conflict errors
  CONCURRENT_MODIFICATION: 'https://problems.luna.akamaiapis.net/papi/v1/concurrent_modification',
  HOSTNAME_ALREADY_EXISTS: 'https://problems.luna.akamaiapis.net/papi/v1/hostname_already_exists',
  RESOURCE_CONFLICT: 'https://problems.luna.akamaiapis.net/papi/v1/resource_conflict',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'https://problems.luna.akamaiapis.net/papi/v1/rate_limit_exceeded',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'https://problems.luna.akamaiapis.net/papi/v1/internal_server_error',
  SERVICE_UNAVAILABLE: 'https://problems.luna.akamaiapis.net/papi/v1/service_unavailable',
  GATEWAY_TIMEOUT: 'https://problems.luna.akamaiapis.net/papi/v1/gateway_timeout',
  
  // Configuration errors
  CONFIGURATION_ERROR: 'https://problems.luna.akamaiapis.net/papi/v1/configuration_error',
  MISSING_CREDENTIALS: 'https://problems.luna.akamaiapis.net/papi/v1/missing_credentials',
  INVALID_CREDENTIALS: 'https://problems.luna.akamaiapis.net/papi/v1/invalid_credentials',
};

/**
 * Unified Akamai Error class implementing RFC 7807
 */
export class AkamaiError extends Error implements ProblemDetails {
  type: string;
  title: string;
  detail: string;
  status: number;
  instance?: string;
  errors?: Array<{
    type: string;
    title: string;
    detail: string;
    messageId?: string;
    field?: string;
  }>;
  requestId?: string;
  context?: ErrorContext;
  [key: string]: unknown;

  constructor(problem: ProblemDetails, context?: ErrorContext) {
    super(problem.detail);
    this.name = 'AkamaiError';
    this.type = problem.type;
    this.title = problem.title;
    this.detail = problem.detail;
    this.status = problem.status;
    this.instance = problem.instance;
    this.errors = problem.errors;
    this.requestId = problem.requestId;
    this.context = context;
    
    // Copy any additional properties
    Object.keys(problem).forEach(key => {
      if (!['type', 'title', 'detail', 'status', 'instance', 'errors', 'requestId'].includes(key)) {
        this[key] = problem[key];
      }
    });
  }

  /**
   * Convert to RFC 7807 compliant JSON structure
   */
  toProblemDetails(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      detail: this.detail,
      status: this.status,
      ...(this.instance && { instance: this.instance }),
      ...(this.errors && { errors: this.errors }),
      ...(this.requestId && { requestId: this.requestId }),
    };
  }
}

/**
 * Unified Error Handler combining all error handling capabilities
 */
export class UnifiedErrorHandler {
  private logger: Logger;
  private context: ErrorContext;

  constructor(context: ErrorContext) {
    this.context = context;
    this.logger = createLogger(`${context.tool}-errors`);
  }

  /**
   * Main error handling method
   */
  handleError(error: unknown, spinner?: any): MCPToolResponse {
    // Stop spinner if provided
    if (spinner) {
      spinner.fail(`Operation failed: ${this.context.operation}`);
    }

    // Parse error into AkamaiError
    const akamaiError = this.parseError(error);
    
    // Log structured error data
    this.logError(akamaiError);
    
    // Format and return MCP response
    return this.formatMCPResponse(akamaiError);
  }

  /**
   * Parse various error formats into unified AkamaiError
   */
  private parseError(error: unknown): AkamaiError {
    // If already an AkamaiError, enhance with context
    if (error instanceof AkamaiError) {
      error.context = this.context;
      return error;
    }
    
    // Extract error information
    const err = error as any;
    const statusCode = this.extractStatusCode(err);
    const errorData = this.extractErrorData(err);
    const requestId = this.extractRequestId(err);
    
    // Determine error type and create appropriate error
    if (err?.response?.data?.type) {
      // Akamai API error with type
      return new AkamaiError({
        type: err.response.data.type,
        title: err.response.data.title || this.getStatusTitle(statusCode),
        detail: err.response.data.detail || err.response.data.message || this.getStatusDetail(statusCode),
        status: statusCode || 500,
        instance: err.response.data.instance,
        errors: err.response.data.errors,
        requestId,
      }, this.context);
    }
    
    // Map status code to error type
    const errorType = this.getErrorTypeFromStatus(statusCode);
    const title = this.getStatusTitle(statusCode);
    const detail = errorData?.detail || errorData?.message || err?.message || this.getStatusDetail(statusCode);
    
    return new AkamaiError({
      type: errorType,
      title,
      detail,
      status: statusCode || 500,
      errors: errorData?.errors,
      requestId,
    }, this.context);
  }

  /**
   * Extract status code from various error formats
   */
  private extractStatusCode(error: any): number {
    return error?.statusCode || 
           error?.response?.status || 
           error?.status ||
           (error?.message?.match(/\((\d{3})\):/)?.[1] ? parseInt(error.message.match(/\((\d{3})\):/)[1]) : 500);
  }

  /**
   * Extract error data from various formats
   */
  private extractErrorData(error: any): any {
    return error?.response?.data || 
           error?.data || 
           error?.akamaiError ||
           (error?.message?.includes('Full error response:') ? this.parseErrorMessage(error.message) : null) ||
           {};
  }

  /**
   * Extract request ID for support
   */
  private extractRequestId(error: any): string | undefined {
    return error?.requestId || 
           error?.response?.data?.requestId || 
           error?.response?.headers?.['x-akamai-request-id'] ||
           error?.akamaiError?.requestId;
  }

  /**
   * Parse error details from error message
   */
  private parseErrorMessage(message: string): any {
    try {
      const jsonMatch = message.match(/Full error response: ({.*})/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }

  /**
   * Get error type URI from status code
   */
  private getErrorTypeFromStatus(status: number | undefined): string {
    const statusMap: Record<number, string> = {
      400: AkamaiErrorTypes.INVALID_PARAMETERS,
      401: AkamaiErrorTypes.UNAUTHORIZED,
      403: AkamaiErrorTypes.FORBIDDEN,
      404: AkamaiErrorTypes.PROPERTY_NOT_FOUND,
      409: AkamaiErrorTypes.RESOURCE_CONFLICT,
      429: AkamaiErrorTypes.RATE_LIMIT_EXCEEDED,
      500: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
      502: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
      503: AkamaiErrorTypes.SERVICE_UNAVAILABLE,
      504: AkamaiErrorTypes.GATEWAY_TIMEOUT,
    };
    
    return statusMap[status || 500] || AkamaiErrorTypes.INTERNAL_SERVER_ERROR;
  }

  /**
   * Get human-readable title for status code
   */
  private getStatusTitle(status: number | undefined): string {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Rate Limit Exceeded',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    
    return titles[status || 500] || 'Error';
  }

  /**
   * Get default detail message for status code
   */
  private getStatusDetail(status: number | undefined): string {
    const details: Record<number, string> = {
      400: 'The request was invalid or malformed',
      401: 'Authentication credentials are missing or invalid',
      403: 'You do not have permission to perform this operation',
      404: 'The requested resource was not found',
      409: 'The request conflicts with the current state',
      429: 'Too many requests, please try again later',
      500: 'An internal server error occurred',
      502: 'The server received an invalid response from an upstream server',
      503: 'The service is temporarily unavailable',
      504: 'The server did not receive a timely response from an upstream server',
    };
    
    return details[status || 500] || 'An unexpected error occurred';
  }

  /**
   * Log error with structured data
   */
  private logError(error: AkamaiError): void {
    const logData = {
      tool: this.context.tool,
      operation: this.context.operation,
      params: this.context.params,
      customer: this.context.customer,
      error: {
        type: error.type,
        title: error.title,
        detail: error.detail,
        status: error.status,
        instance: error.instance,
        errors: error.errors,
        requestId: error.requestId,
      },
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };
    
    // Log at appropriate level
    if (error.status >= 500) {
      this.logger.error(logData, `Server error in ${this.context.tool}.${this.context.operation}`);
    } else if (error.status >= 400) {
      this.logger.warn(logData, `Client error in ${this.context.tool}.${this.context.operation}`);
    } else {
      this.logger.info(logData, `Error in ${this.context.tool}.${this.context.operation}`);
    }
  }

  /**
   * Format error as MCP tool response
   */
  private formatMCPResponse(error: AkamaiError): MCPToolResponse {
    let text = `# Error: ${error.title}\n\n`;
    text += `**Status:** ${error.status}\n`;
    text += `**Details:** ${error.detail}\n`;
    
    if (error.instance) {
      text += `**Resource:** ${error.instance}\n`;
    }
    
    if (error.requestId) {
      text += `**Request ID:** \`${error.requestId}\`\n`;
    }
    
    text += `\n`;
    
    // Add detailed errors if present
    if (error.errors && error.errors.length > 0) {
      text += `## Detailed Errors\n\n`;
      error.errors.forEach((err, index) => {
        text += `${index + 1}. **${err.title}**\n`;
        if (err.field) {
          text += `   - Field: ${err.field}\n`;
        }
        text += `   - Detail: ${err.detail}\n`;
        if (err.messageId) {
          text += `   - Message ID: ${err.messageId}\n`;
        }
        text += `\n`;
      });
    }
    
    // Add context-specific guidance
    text += this.getContextualGuidance(error);
    
    // Add suggestions
    const suggestions = this.getSuggestions(error);
    if (suggestions.length > 0) {
      text += `## What To Do Next\n\n`;
      suggestions.forEach((suggestion, index) => {
        text += `${index + 1}. ${suggestion}\n`;
      });
      text += `\n`;
    }
    
    // Add quick fix commands if applicable
    const quickFixes = this.getQuickFixCommands(error);
    if (quickFixes.length > 0) {
      text += `## Quick Fix Commands\n\n`;
      quickFixes.forEach(fix => {
        text += `\`\`\`bash\n${fix.command}\n\`\`\`\n`;
        text += `${fix.description}\n\n`;
      });
    }
    
    // Add documentation links
    text += `## Relevant Documentation\n\n`;
    text += this.getDocumentationLinks(error);
    
    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  }

  /**
   * Get contextual guidance based on error and operation
   */
  private getContextualGuidance(error: AkamaiError): string {
    let guidance = '';
    
    // Extract error type from URI
    const errorType = error.type.split('/').pop() || '';
    
    switch (errorType) {
      case 'property_not_found':
        guidance += '**Possible Causes:**\n';
        guidance += '- The property ID is incorrect\n';
        guidance += '- The property has been deleted\n';
        guidance += '- You don\'t have access to this property\n';
        guidance += '- Wrong customer context selected\n\n';
        break;
        
      case 'contract_not_found':
        guidance += '**Possible Causes:**\n';
        guidance += '- The contract ID is incorrect\n';
        guidance += '- You don\'t have access to this contract\n';
        guidance += '- Account switching may be required\n\n';
        
        // Add contract discovery suggestions if available
        if (this.context.params?.['contractId'] && this.context.customer) {
          contractGroupDiscovery.validateContract(
            this.context.params['contractId'] as string,
            this.context.customer
          ).then(validation => {
            if (!validation.isValid && validation.suggestions) {
              guidance += `\n${validation.suggestions.message}\n`;
            }
          }).catch(() => {
            // Ignore discovery errors in error handler
          });
        }
        break;
        
      case 'validation_failed':
        guidance += '**Validation Issues:**\n';
        guidance += 'The configuration contains errors that must be fixed before proceeding.\n';
        guidance += 'Review the detailed errors above and correct each issue.\n\n';
        break;
        
      case 'unauthorized':
        guidance += '**Authentication Issues:**\n';
        guidance += '- Your API credentials may be invalid or expired\n';
        guidance += '- The .edgerc file may be misconfigured\n';
        guidance += '- The customer section may not exist\n\n';
        break;
        
      case 'forbidden':
        guidance += '**Permission Issues:**\n';
        guidance += '- Your API client lacks required permissions\n';
        guidance += '- The resource belongs to a different account\n';
        guidance += '- Account switching may be needed\n\n';
        break;
        
      case 'rate_limit_exceeded':
        guidance += '**Rate Limiting:**\n';
        guidance += 'You have exceeded the API rate limits.\n';
        guidance += 'Please wait before retrying your request.\n\n';
        break;
    }
    
    // Add tool-specific guidance
    guidance += this.getToolSpecificGuidance(error);
    
    return guidance;
  }

  /**
   * Get tool-specific guidance
   */
  private getToolSpecificGuidance(error: AkamaiError): string {
    let guidance = '';
    
    switch (this.context.tool) {
      case 'property':
        if (this.context.operation.includes('activation')) {
          guidance += '**Property Activation Tips:**\n';
          guidance += '- Ensure the property version is valid\n';
          guidance += '- Check for pending activations\n';
          guidance += '- Verify rule tree validation\n';
        } else if (this.context.operation.includes('create')) {
          guidance += '**Property Creation Tips:**\n';
          guidance += '- Verify contract and group IDs\n';
          guidance += '- Check product availability\n';
          guidance += '- Ensure unique property name\n';
        }
        break;
        
      case 'dns':
        if (this.context.operation.includes('zone')) {
          guidance += '**DNS Zone Tips:**\n';
          guidance += '- Zone names must be valid domains\n';
          guidance += '- Parent zones must exist\n';
          guidance += '- Check contract permissions\n';
        } else if (this.context.operation.includes('record')) {
          guidance += '**DNS Record Tips:**\n';
          guidance += '- Verify record syntax\n';
          guidance += '- Check TTL values\n';
          guidance += '- Ensure zone is active\n';
        }
        break;
        
      case 'certificate':
      case 'cps':
        if (this.context.operation.includes('create')) {
          guidance += '**Certificate Creation Tips:**\n';
          guidance += '- Verify domain ownership\n';
          guidance += '- Check contract CPS entitlements\n';
          guidance += '- Ensure domains are publicly accessible\n';
        } else if (this.context.operation.includes('validation')) {
          guidance += '**Domain Validation Tips:**\n';
          guidance += '- Create required DNS TXT records\n';
          guidance += '- Allow DNS propagation time\n';
          guidance += '- Check validation hasn\'t expired\n';
        }
        break;
    }
    
    return guidance ? guidance + '\n' : '';
  }

  /**
   * Get actionable suggestions based on error
   */
  private getSuggestions(error: AkamaiError): string[] {
    const suggestions: string[] = [];
    
    // Status-based suggestions
    switch (error.status) {
      case 400:
        suggestions.push('Review all parameters for correct format and values');
        suggestions.push('Check API documentation for required fields');
        suggestions.push('Try with minimal required parameters first');
        break;
        
      case 401:
        suggestions.push('Verify your .edgerc file has valid credentials');
        suggestions.push('Check if credentials have expired');
        if (this.context.customer) {
          suggestions.push(`Ensure the [${this.context.customer}] section exists in .edgerc`);
        }
        break;
        
      case 403:
        suggestions.push('Verify you have permissions for this operation');
        suggestions.push('Check if account switching is required');
        suggestions.push('Contact your administrator for access');
        break;
        
      case 404:
        suggestions.push('Verify the resource ID or name is correct');
        suggestions.push('Check if the resource exists in this account');
        suggestions.push('Use list operations to find available resources');
        break;
        
      case 409:
        suggestions.push('Check for existing resources with the same name');
        suggestions.push('Verify no pending operations on this resource');
        suggestions.push('Review current resource state');
        break;
        
      case 429:
        suggestions.push('Wait 60 seconds before retrying');
        suggestions.push('Implement exponential backoff for retries');
        suggestions.push('Consider batching operations');
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        suggestions.push('Wait a few minutes and retry');
        suggestions.push('Check Akamai status page for outages');
        suggestions.push('Contact support if issue persists');
        break;
    }
    
    // Add validation error suggestions
    if (error.errors && error.errors.length > 0) {
      error.errors.forEach(err => {
        if (err.field) {
          suggestions.push(`Fix field '${err.field}': ${err.detail}`);
        }
      });
    }
    
    return suggestions;
  }

  /**
   * Get quick fix commands
   */
  private getQuickFixCommands(error: AkamaiError): Array<{command: string, description: string}> {
    const fixes: Array<{command: string, description: string}> = [];
    
    switch (error.status) {
      case 401:
        fixes.push({
          command: 'cat ~/.edgerc | grep -A 4 "\\[default\\]"',
          description: 'Check your default credentials configuration'
        });
        if (this.context.customer && this.context.customer !== 'default') {
          fixes.push({
            command: `cat ~/.edgerc | grep -A 4 "\\[${this.context.customer}\\]"`,
            description: `Check ${this.context.customer} section configuration`
          });
        }
        break;
        
      case 404:
        if (this.context.tool === 'property') {
          fixes.push({
            command: 'alecs property_list --limit 10',
            description: 'List available properties to verify IDs'
          });
          if (this.context.params?.['contractId']) {
            fixes.push({
              command: 'alecs contract_list',
              description: 'List available contracts for this customer'
            });
          }
          if (this.context.params?.['groupId']) {
            fixes.push({
              command: 'alecs group_list',
              description: 'List available groups for this customer'
            });
          }
        } else if (this.context.tool === 'dns') {
          fixes.push({
            command: 'alecs dns_zone_list',
            description: 'List available DNS zones'
          });
        }
        break;
    }
    
    return fixes;
  }

  /**
   * Get documentation links
   */
  private getDocumentationLinks(error: AkamaiError): string {
    const baseDoc = 'https://techdocs.akamai.com/developer/docs/';
    const links: string[] = [];
    
    // General links
    links.push(`- [API Authentication](${baseDoc}authenticate-with-edgegrid)`);
    links.push(`- [API Error Codes](${baseDoc}api-error-codes)`);
    
    // Tool-specific links
    switch (this.context.tool) {
      case 'property':
        links.push(`- [Property Manager API](${baseDoc}property-manager-api)`);
        break;
      case 'dns':
        links.push(`- [Edge DNS API](${baseDoc}edge-dns-api)`);
        break;
      case 'cps':
      case 'certificate':
        links.push(`- [CPS API](${baseDoc}cps-api)`);
        break;
      case 'network_list':
        links.push(`- [Network Lists API](${baseDoc}network-lists-api)`);
        break;
      case 'purge':
        links.push(`- [Fast Purge API](${baseDoc}fast-purge-api)`);
        break;
    }
    
    return links.join('\n');
  }

  /**
   * Create a context-aware error handler for a specific operation
   */
  static create(tool: string, operation: string): (error: unknown, spinner?: unknown, params?: Record<string, unknown>) => MCPToolResponse {
    return (error: unknown, spinner?: any, params?: Record<string, unknown>) => {
      const handler = new UnifiedErrorHandler({
        tool,
        operation,
        params,
        timestamp: new Date(),
      });
      return handler.handleError(error, spinner);
    };
  }
}

/**
 * Error factory functions for common scenarios
 */
export function createPropertyNotFoundError(propertyId: string, context?: ErrorContext): AkamaiError {
  return new AkamaiError({
    type: AkamaiErrorTypes.PROPERTY_NOT_FOUND,
    title: 'Property Not Found',
    detail: `The property ${propertyId} does not exist or you don't have permission to access it`,
    status: 404,
    instance: `/papi/v1/properties/${propertyId}`,
  }, context);
}

export function createValidationError(
  resource: string,
  errors: Array<{ type: string; title: string; detail: string; field?: string }>,
  context?: ErrorContext
): AkamaiError {
  return new AkamaiError({
    type: AkamaiErrorTypes.VALIDATION_FAILED,
    title: 'Validation Failed',
    detail: `The ${resource} configuration contains validation errors`,
    status: 400,
    errors,
  }, context);
}

export function createConcurrentModificationError(
  resource: string,
  expectedEtag?: string,
  actualEtag?: string,
  context?: ErrorContext
): AkamaiError {
  return new AkamaiError({
    type: AkamaiErrorTypes.CONCURRENT_MODIFICATION,
    title: 'Concurrent Modification',
    detail: `The ${resource} was modified by another process. Please refresh and try again.`,
    status: 409,
    errors: [{
      type: 'etag_mismatch',
      title: 'ETag Mismatch',
      detail: expectedEtag && actualEtag
        ? `Expected ETag: ${expectedEtag}, Actual ETag: ${actualEtag}`
        : 'The resource was modified since you last retrieved it',
    }],
  }, context);
}

export function createConfigurationError(message: string, details?: string, context?: ErrorContext): AkamaiError {
  return new AkamaiError({
    type: AkamaiErrorTypes.CONFIGURATION_ERROR,
    title: 'Configuration Error',
    detail: message,
    status: 500,
    errors: details ? [{
      type: 'configuration',
      title: 'Configuration Issue',
      detail: details,
    }] : undefined,
  }, context);
}

/**
 * Quick error handler factory for tools
 */
export function createErrorHandler(tool: string) {
  return {
    handle: (operation: string, error: unknown, spinner?: unknown, params?: Record<string, unknown>) => {
      const handler = new UnifiedErrorHandler({
        tool,
        operation,
        params,
        timestamp: new Date(),
      });
      return handler.handleError(error, spinner);
    },
    
    wrap: (operation: string) => {
      return UnifiedErrorHandler.create(tool, operation);
    }
  };
}

/**
 * Error recovery helper with retry logic
 */
export class ErrorRecovery {
  static canRetry(error: unknown): boolean {
    if (error instanceof AkamaiError) {
      // Retryable status codes
      return [408, 429, 502, 503, 504].includes(error.status);
    }
    
    const err = error as any;
    
    // Retryable error codes
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    if (err?.code && retryableCodes.includes(err.code)) {
      return true;
    }
    
    // Retryable HTTP status codes
    const retryableStatus = [408, 429, 502, 503, 504];
    if (err?.response?.status && retryableStatus.includes(err.response.status)) {
      return true;
    }
    
    return false;
  }

  static getRetryDelay(attempt: number, error: unknown): number {
    const err = error as any;
    
    // Check for Retry-After header
    if (err?.response?.headers?.['retry-after']) {
      const retryAfter = err.response.headers['retry-after'];
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
    onRetry?: (attempt: number, error: unknown) => void,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!this.canRetry(error) || attempt === maxAttempts - 1) {
          throw error;
        }

        const delay = this.getRetryDelay(attempt, error);

        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Export parseAkamaiError for backward compatibility
 */
export function parseAkamaiError(error: unknown, context?: ErrorContext): AkamaiError {
  const handler = new UnifiedErrorHandler(context || {
    tool: 'unknown',
    operation: 'unknown',
    timestamp: new Date(),
  });
  return handler['parseError'](error);
}

/**
 * Export handleApiError for backward compatibility
 */
export function handleApiError(error: unknown, operation: string, tool = 'unknown'): MCPToolResponse {
  const handler = new UnifiedErrorHandler({
    tool,
    operation,
    timestamp: new Date(),
  });
  return handler.handleError(error);
}

/**
 * Domain-specific error handlers for backward compatibility
 */
export const DomainErrors = {
  property: {
    notFound: (propertyId: string, context?: ErrorContext) => createPropertyNotFoundError(propertyId, context),
    validation: (errors: Array<{ type: string; title: string; detail: string; field?: string }>, context?: ErrorContext) => 
      createValidationError('property', errors, context),
    accessDenied: (propertyId: string, operation: string, context?: ErrorContext) => 
      new AkamaiError({
        type: AkamaiErrorTypes.FORBIDDEN,
        title: 'Property Access Denied',
        detail: `Access denied: You do not have permission to ${operation} property '${propertyId}'`,
        status: 403,
        errors: [{
          type: 'access_denied',
          title: 'Insufficient Permissions',
          detail: `Required permission: property:${operation}. Contact your account administrator`
        }]
      }, context),
  },
  dns: {
    zoneNotFound: (zone: string, context?: ErrorContext) => 
      new AkamaiError({
        type: AkamaiErrorTypes.ZONE_NOT_FOUND,
        title: 'DNS Zone Not Found',
        detail: `DNS zone '${zone}' not found`,
        status: 404,
        errors: [{
          type: 'zone_not_found',
          title: 'Zone Not Found',
          detail: 'Use dns_zone_list to see available zones'
        }]
      }, context),
    invalidRecord: (zone: string, record: string, reason: string, context?: ErrorContext) => 
      new AkamaiError({
        type: AkamaiErrorTypes.INVALID_DNS_RECORD,
        title: 'Invalid DNS Record',
        detail: `Invalid DNS record ${record} in zone ${zone}: ${reason}`,
        status: 400,
        errors: [{
          type: 'invalid_record',
          title: 'Invalid Record Format',
          detail: reason
        }]
      }, context),
  },
  certificate: {
    enrollmentNotFound: (enrollmentId: number, context?: ErrorContext) => 
      new AkamaiError({
        type: AkamaiErrorTypes.ENROLLMENT_NOT_FOUND,
        title: 'Certificate Enrollment Not Found',
        detail: `Certificate enrollment ${enrollmentId} not found`,
        status: 404,
        errors: [{
          type: 'enrollment_not_found',
          title: 'Enrollment Not Found',
          detail: 'The enrollment may have been deleted or completed'
        }]
      }, context),
    validationPending: (domain: string, context?: ErrorContext) => 
      new AkamaiError({
        type: AkamaiErrorTypes.VALIDATION_FAILED,
        title: 'Domain Validation Pending',
        detail: `Domain validation pending for ${domain}`,
        status: 400,
        errors: [{
          type: 'validation_pending',
          title: 'Validation Required',
          detail: 'Complete domain validation before proceeding'
        }]
      }, context),
  },
  configuration: {
    missingCredentials: (customer: string, context?: ErrorContext) => 
      createConfigurationError(
        `Missing credentials for customer '${customer}'`,
        'Add credentials to .edgerc file',
        context
      ),
    invalidCredentials: (customer: string, context?: ErrorContext) => 
      createConfigurationError(
        `Invalid credentials for customer '${customer}'`,
        'Verify client_token, client_secret, and access_token in .edgerc',
        context
      ),
    missingAccountKey: (customer: string, context?: ErrorContext) => 
      createConfigurationError(
        `Account switching not configured for customer '${customer}'`,
        'Add account_key to .edgerc section for cross-account access',
        context
      ),
  },
};

/**
 * MCP-specific error formatting utilities
 */
export const MCPErrorUtils = {
  /**
   * Map HTTP status codes to MCP-appropriate error messages
   */
  statusToMCPMessage: (status: number): string => {
    const messages: Record<number, string> = {
      400: 'Invalid parameters provided',
      401: 'Authentication required',
      403: 'Access denied',
      404: 'Resource not found',
      409: 'Operation conflicts with current state',
      429: 'Rate limit exceeded',
      500: 'Server error occurred',
      502: 'Gateway error',
      503: 'Service unavailable',
      504: 'Request timeout',
    };
    return messages[status] || 'Unknown error occurred';
  },

  /**
   * Create a simple MCP error response
   */
  createSimpleError: (message: string): MCPToolResponse => ({
    content: [{
      type: 'text',
      text: `Error: ${message}`,
    }],
  }),

  /**
   * Create a detailed MCP error response
   */
  createDetailedError: (error: AkamaiError): MCPToolResponse => {
    const handler = new UnifiedErrorHandler({
      tool: 'unknown',
      operation: 'unknown',
      timestamp: new Date(),
    });
    return handler['formatMCPResponse'](error);
  },
};

/**
 * DOMAIN-SPECIFIC ERROR CLASSES
 * Consolidated from property-errors.ts, dns-errors.ts, and auth-errors.ts
 */

// Property-specific errors
export class PropertyNotFoundError extends AkamaiError {
  constructor(_propertyId: string, hint?: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.PROPERTY_NOT_FOUND,
      title: 'Property Not Found',
      detail: `Property '${_propertyId}' not found`,
      status: 404,
      errors: [{
        type: 'property_not_found',
        title: 'Property Not Found',
        detail: hint || 'Use property_list to see available properties'
      }]
    }, context);
    this.name = 'PropertyNotFoundError';
  }
}

export class PropertyVersionNotFoundError extends AkamaiError {
  constructor(propertyId: string, version: number, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.VERSION_NOT_FOUND,
      title: 'Property Version Not Found',
      detail: `Property version ${version} not found for property '${propertyId}'`,
      status: 404,
      errors: [{
        type: 'version_not_found',
        title: 'Version Not Found',
        detail: 'Use property_version_list to see available versions'
      }]
    }, context);
    this.name = 'PropertyVersionNotFoundError';
  }
}

export class PropertyValidationError extends AkamaiError {
  constructor(field: string, issue: string, context?: ErrorContext) {
    const message = `Property validation failed: ${field} ${issue}`;
    let detailMessage = 'Check the property configuration';
    
    if (field === 'propertyName') {
      detailMessage = 'Property names must be 1-85 characters, use only letters, numbers, spaces, and basic punctuation';
    } else if (field === 'hostname') {
      detailMessage = 'Hostnames must be valid domain names without protocol';
    } else if (field === 'cpcode') {
      detailMessage = 'CP codes must be numeric. Use property_cpcode_list to see available CP codes';
    }
    
    super({
      type: AkamaiErrorTypes.VALIDATION_FAILED,
      title: 'Property Validation Error',
      detail: message,
      status: 400,
      errors: [{
        type: 'validation_error',
        title: `Invalid ${field}`,
        detail: detailMessage,
        field: field
      }]
    }, context);
    this.name = 'PropertyValidationError';
  }
}

export class PropertyAccessDeniedError extends AkamaiError {
  constructor(propertyId: string, operation: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.FORBIDDEN,
      title: 'Property Access Denied',
      detail: `Access denied: You do not have permission to ${operation} property '${propertyId}'`,
      status: 403,
      errors: [{
        type: 'access_denied',
        title: 'Insufficient Permissions',
        detail: `Required permission: property:${operation}. Contact your account administrator`
      }]
    }, context);
    this.name = 'PropertyAccessDeniedError';
  }
}

export class PropertyActivationError extends AkamaiError {
  constructor(propertyId: string, version: number, network: string, reason: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.VALIDATION_FAILED,
      title: 'Property Activation Error',
      detail: `Failed to activate property '${propertyId}' v${version} to ${network}: ${reason}`,
      status: 400,
      errors: [{
        type: 'activation_failed',
        title: 'Activation Failed',
        detail: reason
      }]
    }, context);
    this.name = 'PropertyActivationError';
  }
}

export class ActivationInProgressError extends AkamaiError {
  constructor(propertyId: string, activationId: string, network: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.RESOURCE_CONFLICT,
      title: 'Activation In Progress',
      detail: `An activation is already in progress for property '${propertyId}' on ${network}`,
      status: 409,
      errors: [{
        type: 'conflict',
        title: 'Concurrent Activation',
        detail: `Activation ${activationId} is in progress. Wait for completion or cancel it`
      }]
    }, context);
    this.name = 'ActivationInProgressError';
  }
}

export class RuleValidationError extends AkamaiError {
  constructor(propertyId: string, errors: unknown[], context?: ErrorContext) {
    const errorSummary = errors.slice(0, 3).map(e => (e as any).detail || (e as any).title).join(', ');
    const formattedErrors = errors.slice(0, 10).map(e => ({
      type: (e as any).type || 'validation_error',
      title: (e as any).title || 'Validation Error',
      detail: (e as any).detail || (e as any).message || 'Unknown validation error'
    }));
    
    super({
      type: AkamaiErrorTypes.VALIDATION_FAILED,
      title: 'Rule Validation Error',
      detail: `Property rules validation failed: ${errorSummary}`,
      status: 400,
      errors: formattedErrors
    }, context);
    this.name = 'RuleValidationError';
  }
}

export class EdgeHostnameError extends AkamaiError {
  constructor(hostname: string, issue: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.VALIDATION_FAILED,
      title: 'Edge Hostname Error',
      detail: `Edge hostname error for '${hostname}': ${issue}`,
      status: 400,
      errors: [{
        type: 'edge_hostname_error',
        title: 'Invalid Edge Hostname',
        detail: issue
      }]
    }, context);
    this.name = 'EdgeHostnameError';
  }
}

export class ContractAccessError extends AkamaiError {
  constructor(contractId: string, operation: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.FORBIDDEN,
      title: 'Contract Access Error',
      detail: `No access to contract '${contractId}' for operation: ${operation}`,
      status: 403,
      errors: [{
        type: 'access_denied',
        title: 'Contract Access Denied',
        detail: 'Verify you have access to this contract or switch accounts'
      }]
    }, context);
    this.name = 'ContractAccessError';
  }
}

export class GroupAccessError extends AkamaiError {
  constructor(groupId: string, operation: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.FORBIDDEN,
      title: 'Group Access Error',
      detail: `No access to group '${groupId}' for operation: ${operation}`,
      status: 403,
      errors: [{
        type: 'access_denied',
        title: 'Group Access Denied',
        detail: 'Verify you have access to this group in your account'
      }]
    }, context);
    this.name = 'GroupAccessError';
  }
}

export class PropertyDependencyError extends AkamaiError {
  constructor(propertyId: string, dependencies: string[], context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.RESOURCE_CONFLICT,
      title: 'Property Dependency Error',
      detail: `Cannot delete property '${propertyId}': active dependencies exist`,
      status: 409,
      errors: [{
        type: 'dependency_conflict',
        title: 'Active Dependencies',
        detail: `Dependencies found: ${dependencies.join(', ')}. Deactivate the property first`
      }]
    }, context);
    this.name = 'PropertyDependencyError';
  }
}

// DNS-specific errors
export class ZoneNotFoundError extends AkamaiError {
  constructor(zone: string, hint?: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.ZONE_NOT_FOUND,
      title: 'DNS Zone Not Found',
      detail: `DNS zone '${zone}' not found`,
      status: 404,
      errors: [{
        type: 'zone_not_found',
        title: 'Zone Not Found',
        detail: hint || 'Use dns_zone_list to see available zones'
      }]
    }, context);
    this.name = 'ZoneNotFoundError';
  }
}

export class RecordNotFoundError extends AkamaiError {
  constructor(zone: string, recordName: string, recordType: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.ZONE_NOT_FOUND,
      title: 'DNS Record Not Found',
      detail: `DNS record '${recordName}' (type: ${recordType}) not found in zone '${zone}'`,
      status: 404,
      errors: [{
        type: 'record_not_found',
        title: 'Record Not Found',
        detail: 'Use dns_record_list to see existing records'
      }]
    }, context);
    this.name = 'RecordNotFoundError';
  }
}

export class ZoneAlreadyExistsError extends AkamaiError {
  constructor(zone: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.RESOURCE_CONFLICT,
      title: 'DNS Zone Already Exists',
      detail: `DNS zone '${zone}' already exists`,
      status: 409,
      errors: [{
        type: 'conflict',
        title: 'Zone Exists',
        detail: 'Use the existing zone or choose a different zone name'
      }]
    }, context);
    this.name = 'ZoneAlreadyExistsError';
  }
}

export class RecordAlreadyExistsError extends AkamaiError {
  constructor(zone: string, recordName: string, recordType: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.RESOURCE_CONFLICT,
      title: 'DNS Record Already Exists',
      detail: `DNS record '${recordName}' (type: ${recordType}) already exists in zone '${zone}'`,
      status: 409,
      errors: [{
        type: 'conflict',
        title: 'Record Exists',
        detail: 'Use dns_record_update to modify the existing record'
      }]
    }, context);
    this.name = 'RecordAlreadyExistsError';
  }
}

export class DNSValidationError extends AkamaiError {
  constructor(field: string, issue: string, context?: ErrorContext) {
    const message = `DNS validation failed: ${field} ${issue}`;
    let detailMessage = 'Check the DNS record format';
    
    if (field === 'recordName') {
      detailMessage = 'Ensure the record name is a valid hostname, use @ for zone apex';
    } else if (field === 'ttl') {
      detailMessage = 'TTL must be between 30 and 86400 seconds';
    } else if (field === 'rdata') {
      detailMessage = 'Check the record data format for the specific record type';
    }
    
    super({
      type: AkamaiErrorTypes.VALIDATION_FAILED,
      title: 'DNS Validation Error',
      detail: message,
      status: 400,
      errors: [{
        type: 'validation_error',
        title: `Invalid ${field}`,
        detail: detailMessage,
        field: field
      }]
    }, context);
    this.name = 'DNSValidationError';
  }
}

export class ZoneDependencyError extends AkamaiError {
  constructor(zone: string, dependencies: string[], context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.RESOURCE_CONFLICT,
      title: 'Zone Dependency Error',
      detail: `Cannot delete zone '${zone}': active dependencies exist`,
      status: 409,
      errors: [{
        type: 'dependency_conflict',
        title: 'Active Dependencies',
        detail: `Dependencies found: ${dependencies.join(', ')}. Remove all records first`
      }]
    }, context);
    this.name = 'ZoneDependencyError';
  }
}

export class DNSAccessDeniedError extends AkamaiError {
  constructor(resource: string, operation: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.FORBIDDEN,
      title: 'DNS Access Denied',
      detail: `Access denied: You do not have permission to ${operation} ${resource}`,
      status: 403,
      errors: [{
        type: 'access_denied',
        title: 'Insufficient Permissions',
        detail: `Required permission: dns:${operation}. Contact your administrator`
      }]
    }, context);
    this.name = 'DNSAccessDeniedError';
  }
}

export class ChangelistError extends AkamaiError {
  constructor(zone: string, reason: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.VALIDATION_FAILED,
      title: 'Changelist Error',
      detail: `Changelist operation failed for zone '${zone}': ${reason}`,
      status: 400,
      errors: [{
        type: 'changelist_error',
        title: 'Changelist Operation Failed',
        detail: reason
      }]
    }, context);
    this.name = 'ChangelistError';
  }
}

export class DNSSECError extends AkamaiError {
  constructor(zone: string, issue: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.VALIDATION_FAILED,
      title: 'DNSSEC Error',
      detail: `DNSSEC configuration error for zone '${zone}': ${issue}`,
      status: 400,
      errors: [{
        type: 'dnssec_error',
        title: 'DNSSEC Configuration Error',
        detail: issue
      }]
    }, context);
    this.name = 'DNSSECError';
  }
}

// Auth-specific errors
export class UnauthorizedError extends AkamaiError {
  constructor(message: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.UNAUTHORIZED,
      title: 'Unauthorized',
      detail: message,
      status: 401,
      errors: [{
        type: 'unauthorized',
        title: 'Authentication Required',
        detail: 'Please provide valid authentication credentials'
      }]
    }, context);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AkamaiError {
  constructor(message: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.FORBIDDEN,
      title: 'Forbidden',
      detail: message,
      status: 403,
      errors: [{
        type: 'forbidden',
        title: 'Access Denied',
        detail: 'You do not have permission to access this resource'
      }]
    }, context);
    this.name = 'ForbiddenError';
  }
}

export class AccountSwitchError extends AkamaiError {
  constructor(customer: string, reason?: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.FORBIDDEN,
      title: 'Account Switch Failed',
      detail: `Cannot switch to customer account '${customer}'`,
      status: 403,
      errors: [{
        type: 'account_switch_failed',
        title: 'Account Switch Failed',
        detail: reason || 'Invalid or missing account switch key'
      }]
    }, context);
    this.name = 'AccountSwitchError';
  }
}

export class InvalidCustomerError extends AkamaiError {
  constructor(customer: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.UNAUTHORIZED,
      title: 'Invalid Customer',
      detail: `Customer '${customer}' is not valid`,
      status: 401,
      errors: [{
        type: 'invalid_customer',
        title: 'Invalid Customer',
        detail: 'The specified customer does not exist or is not configured'
      }]
    }, context);
    this.name = 'InvalidCustomerError';
  }
}

// Certificate-specific errors
export class EnrollmentNotFoundError extends AkamaiError {
  constructor(enrollmentId: number, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.ENROLLMENT_NOT_FOUND,
      title: 'Certificate Enrollment Not Found',
      detail: `Certificate enrollment ${enrollmentId} not found`,
      status: 404,
      errors: [{
        type: 'enrollment_not_found',
        title: 'Enrollment Not Found',
        detail: 'The enrollment may have been deleted or completed'
      }]
    }, context);
    this.name = 'EnrollmentNotFoundError';
  }
}

export class ValidationPendingError extends AkamaiError {
  constructor(domain: string, context?: ErrorContext) {
    super({
      type: AkamaiErrorTypes.VALIDATION_FAILED,
      title: 'Domain Validation Pending',
      detail: `Domain validation pending for ${domain}`,
      status: 400,
      errors: [{
        type: 'validation_pending',
        title: 'Validation Required',
        detail: 'Complete domain validation before proceeding'
      }]
    }, context);
    this.name = 'ValidationPendingError';
  }
}

// Helper functions to check error types
export function isPropertyError(error: unknown): boolean {
  return error instanceof PropertyNotFoundError ||
         error instanceof PropertyVersionNotFoundError ||
         error instanceof PropertyValidationError ||
         error instanceof PropertyAccessDeniedError ||
         error instanceof PropertyActivationError ||
         error instanceof ActivationInProgressError ||
         error instanceof RuleValidationError ||
         error instanceof EdgeHostnameError ||
         error instanceof ContractAccessError ||
         error instanceof GroupAccessError ||
         error instanceof PropertyDependencyError;
}

export function isDNSError(error: unknown): boolean {
  return error instanceof ZoneNotFoundError ||
         error instanceof RecordNotFoundError ||
         error instanceof ZoneAlreadyExistsError ||
         error instanceof RecordAlreadyExistsError ||
         error instanceof DNSValidationError ||
         error instanceof ZoneDependencyError ||
         error instanceof DNSAccessDeniedError ||
         error instanceof ChangelistError ||
         error instanceof DNSSECError;
}

export function isAuthError(error: unknown): boolean {
  return error instanceof UnauthorizedError ||
         error instanceof ForbiddenError ||
         error instanceof AccountSwitchError ||
         error instanceof InvalidCustomerError;
}

export function isCertificateError(error: unknown): boolean {
  return error instanceof EnrollmentNotFoundError ||
         error instanceof ValidationPendingError;
}