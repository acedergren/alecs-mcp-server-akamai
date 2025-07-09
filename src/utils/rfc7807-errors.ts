/**
 * RFC 7807 PROBLEM DETAILS ERROR HANDLING
 * 
 * ARCHITECTURAL PURPOSE:
 * Implements RFC 7807 "Problem Details for HTTP APIs" standard for consistent
 * error responses that match Akamai's error format. This provides structured,
 * machine-readable error information while remaining human-friendly.
 * 
 * RFC 7807 BENEFITS:
 * - Standardized error format across all APIs
 * - Machine-readable error types with URIs
 * - Human-readable titles and details
 * - Extensible with custom properties
 * - Better debugging with instance paths
 * 
 * AKAMAI ERROR EXAMPLE:
 * {
 *   "type": "https://problems.luna.akamaiapis.net/papi/v1/property_not_found",
 *   "title": "Property Not Found",
 *   "detail": "The requested property does not exist or you don't have permission",
 *   "instance": "/papi/v1/properties/prp_999999",
 *   "status": 404,
 *   "errors": [...]
 * }
 */

import { type MCPToolResponse } from '../types';

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
  }>;
  /** Any additional properties */
  [key: string]: unknown;
}

/**
 * Base class for Akamai API errors following RFC 7807
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
  }>;
  [key: string]: unknown;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = 'AkamaiError';
    this.type = problem.type;
    this.title = problem.title;
    this.detail = problem.detail;
    this.status = problem.status;
    this.instance = problem.instance;
    this.errors = problem.errors;
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
    };
  }

  /**
   * Convert to MCP tool response with user-friendly formatting
   */
  toMCPResponse(): MCPToolResponse {
    let text = `# Error: ${this.title}\n\n`;
    text += `**Status:** ${this.status}\n`;
    text += `**Details:** ${this.detail}\n`;
    
    if (this.instance) {
      text += `**Resource:** ${this.instance}\n`;
    }
    
    text += `\n`;
    
    if (this.errors && this.errors.length > 0) {
      text += `## Detailed Errors\n\n`;
      this.errors.forEach((error, index) => {
        text += `${index + 1}. **${error.title}**\n`;
        text += `   - Type: ${error.type}\n`;
        text += `   - Detail: ${error.detail}\n`;
        if (error.messageId) {
          text += `   - Message ID: ${error.messageId}\n`;
        }
        text += `\n`;
      });
    }
    
    // Add helpful context based on error type
    text += this.getHelpfulContext();
    
    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  }

  /**
   * Provide context-specific help based on error type
   */
  private getHelpfulContext(): string {
    let help = '## What To Do Next\n\n';
    
    // Extract error type from URI
    const errorType = this.type.split('/').pop() || '';
    
    switch (errorType) {
      case 'property_not_found':
        help += '**Troubleshooting Steps:**\n';
        help += '1. Verify the property ID format (should be prp_XXXXXX)\n';
        help += '2. Check if you have access to this property\n';
        help += '3. Use "list_properties" to see available properties\n';
        help += '4. Ensure your API credentials have the correct permissions\n';
        break;
        
      case 'contract_not_found':
        help += '**Troubleshooting Steps:**\n';
        help += '1. Verify the contract ID format (should be ctr_X-XXXXXXX)\n';
        help += '2. Use "list_contracts" to see available contracts\n';
        help += '3. Check if your account has access to this contract\n';
        break;
        
      case 'validation_failed':
        help += '**Troubleshooting Steps:**\n';
        help += '1. Review the validation errors above\n';
        help += '2. Fix any rule configuration issues\n';
        help += '3. Use "get_property_rules" with validateRules=true\n';
        help += '4. Consult Akamai documentation for rule requirements\n';
        break;
        
      case 'unauthorized':
      case 'forbidden':
        help += '**Troubleshooting Steps:**\n';
        help += '1. Check your .edgerc file has valid credentials\n';
        help += '2. Verify API client permissions in Control Center\n';
        help += '3. Ensure the client has access to this resource\n';
        help += '4. Try regenerating your API credentials\n';
        break;
        
      case 'rate_limit_exceeded':
        help += '**Troubleshooting Steps:**\n';
        help += '1. Wait a few minutes before retrying\n';
        help += '2. Reduce the frequency of API calls\n';
        help += '3. Implement exponential backoff for retries\n';
        help += '4. Contact Akamai to increase rate limits if needed\n';
        break;
        
      case 'concurrent_modification':
        help += '**Troubleshooting Steps:**\n';
        help += '1. Someone else modified this resource\n';
        help += '2. Get the latest version of the resource\n';
        help += '3. Re-apply your changes to the new version\n';
        help += '4. Use ETags to prevent this in the future\n';
        break;
        
      default:
        help += '**General Troubleshooting:**\n';
        help += '1. Check the error details above\n';
        help += '2. Verify all parameters are correct\n';
        help += '3. Consult Akamai API documentation\n';
        help += '4. Contact Akamai support if the issue persists\n';
    }
    
    return help;
  }
}

/**
 * Common Akamai API error types
 */
export const AkamaiErrorTypes = {
  // Resource errors
  PROPERTY_NOT_FOUND: 'https://problems.luna.akamaiapis.net/papi/v1/property_not_found',
  CONTRACT_NOT_FOUND: 'https://problems.luna.akamaiapis.net/papi/v1/contract_not_found',
  GROUP_NOT_FOUND: 'https://problems.luna.akamaiapis.net/papi/v1/group_not_found',
  VERSION_NOT_FOUND: 'https://problems.luna.akamaiapis.net/papi/v1/version_not_found',
  
  // Validation errors
  VALIDATION_FAILED: 'https://problems.luna.akamaiapis.net/papi/v1/validation_failed',
  INVALID_PARAMETERS: 'https://problems.luna.akamaiapis.net/papi/v1/invalid_parameters',
  
  // Permission errors
  UNAUTHORIZED: 'https://problems.luna.akamaiapis.net/papi/v1/unauthorized',
  FORBIDDEN: 'https://problems.luna.akamaiapis.net/papi/v1/forbidden',
  
  // Conflict errors
  CONCURRENT_MODIFICATION: 'https://problems.luna.akamaiapis.net/papi/v1/concurrent_modification',
  HOSTNAME_ALREADY_EXISTS: 'https://problems.luna.akamaiapis.net/papi/v1/hostname_already_exists',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'https://problems.luna.akamaiapis.net/papi/v1/rate_limit_exceeded',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'https://problems.luna.akamaiapis.net/papi/v1/internal_server_error',
  SERVICE_UNAVAILABLE: 'https://problems.luna.akamaiapis.net/papi/v1/service_unavailable',
};

/**
 * Create a property not found error
 */
export function createPropertyNotFoundError(propertyId: string): AkamaiError {
  return new AkamaiError({
    type: AkamaiErrorTypes.PROPERTY_NOT_FOUND,
    title: 'Property Not Found',
    detail: `The property ${propertyId} does not exist or you don't have permission to access it`,
    status: 404,
    instance: `/papi/v1/properties/${propertyId}`,
  });
}

/**
 * Create a validation error with details
 */
export function createValidationError(
  resource: string,
  errors: Array<{ type: string; title: string; detail: string }>
): AkamaiError {
  return new AkamaiError({
    type: AkamaiErrorTypes.VALIDATION_FAILED,
    title: 'Validation Failed',
    detail: `The ${resource} configuration contains validation errors`,
    status: 400,
    errors,
  });
}

/**
 * Create a concurrent modification error
 */
export function createConcurrentModificationError(
  resource: string,
  expectedEtag?: string,
  actualEtag?: string
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
  });
}

/**
 * Parse Akamai API error responses into RFC 7807 format
 */
export function parseAkamaiError(error: unknown): AkamaiError {
  // If already an AkamaiError, return it
  if (error instanceof AkamaiError) {
    return error;
  }
  
  // If it has RFC 7807 structure
  if ((error as any).type && (error as any).title && (error as any).detail && (error as any).status) {
    return new AkamaiError(error as ProblemDetails);
  }
  
  // Parse common error response formats
  if ((error as any).response?.data) {
    const data = (error as any).response.data;
    
    // Akamai API error format
    if (data.type && data.title) {
      return new AkamaiError({
        type: data.type,
        title: data.title,
        detail: data.detail || data.title,
        status: (error as any).response.status || 500,
        instance: data.instance,
        errors: data.errors,
      });
    }
    
    // Generic error with message
    if (data.message || data.error) {
      return new AkamaiError({
        type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
        title: 'API Error',
        detail: data.message || data.error || 'An unknown error occurred',
        status: (error as any).response.status || 500,
      });
    }
  }
  
  // HTTP status errors
  if ((error as any).response?.status) {
    const status = (error as any).response.status;
    let type = AkamaiErrorTypes.INTERNAL_SERVER_ERROR;
    let title = 'Server Error';
    
    switch (status) {
      case 401:
        type = AkamaiErrorTypes.UNAUTHORIZED;
        title = 'Unauthorized';
        break;
      case 403:
        type = AkamaiErrorTypes.FORBIDDEN;
        title = 'Forbidden';
        break;
      case 404:
        type = AkamaiErrorTypes.PROPERTY_NOT_FOUND;
        title = 'Not Found';
        break;
      case 429:
        type = AkamaiErrorTypes.RATE_LIMIT_EXCEEDED;
        title = 'Rate Limit Exceeded';
        break;
      case 503:
        type = AkamaiErrorTypes.SERVICE_UNAVAILABLE;
        title = 'Service Unavailable';
        break;
    }
    
    return new AkamaiError({
      type,
      title,
      detail: (error as any).message || `HTTP ${status} error occurred`,
      status,
    });
  }
  
  // Fallback for unknown errors
  return new AkamaiError({
    type: AkamaiErrorTypes.INTERNAL_SERVER_ERROR,
    title: 'Unknown Error',
    detail: (error as any).message || 'An unexpected error occurred',
    status: 500,
  });
}

/**
 * Enhanced error handler that uses RFC 7807 format
 */
export function handleApiErrorRFC7807(error: unknown, operation: string): MCPToolResponse {
  const akamaiError = parseAkamaiError(error);
  
  // Add operation context
  const contextualError = new AkamaiError({
    ...akamaiError.toProblemDetails(),
    detail: `Error ${operation}: ${akamaiError.detail}`,
  });
  
  return contextualError.toMCPResponse();
}