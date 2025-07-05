/**
 * Property Manager specific error classes
 * 
 * CODE KAI IMPLEMENTATION:
 * - Extends base error classes with property-specific context
 * - Provides clear guidance for property configuration issues
 * - Includes proper error codes for programmatic handling
 * - Maintains compatibility with MCP error protocol
 */

import { AkamaiError } from '../utils/rfc7807-errors';
import { 
  NotFoundError, 
  BadRequestError, 
  ConflictError,
  ForbiddenError,
  type ApiErrorResponse 
} from '../services/BaseAkamaiClient';

/**
 * Base class for all property operation errors
 */
export class PropertyOperationError extends AkamaiError {
  constructor(message: string, code: string, statusCode: number = 400, details?: any) {
    super({
      type: `https://problems.luna.akamaiapis.net/property-manager/v1/${code.toLowerCase()}`,
      title: message,
      detail: message,
      status: statusCode,
      ...details
    });
    this.name = 'PropertyOperationError';
  }
}

/**
 * Property not found error
 */
export class PropertyNotFoundError extends NotFoundError {
  constructor(propertyId: string, hint?: string) {
    const message = `Property '${propertyId}' not found`;
    const response: ApiErrorResponse = {
      type: 'PROPERTY_NOT_FOUND',
      title: 'Property Not Found',
      detail: message,
      status: 404,
      errors: [{
        type: 'property_not_found',
        title: 'Property Not Found',
        detail: hint || 'Use property.list to see available properties'
      }]
    };
    
    super(message, response);
    this.name = 'PropertyNotFoundError';
  }
}

/**
 * Property version not found error
 */
export class PropertyVersionNotFoundError extends NotFoundError {
  constructor(propertyId: string, version: number) {
    const message = `Property version ${version} not found for property '${propertyId}'`;
    const response: ApiErrorResponse = {
      type: 'PROPERTY_VERSION_NOT_FOUND',
      title: 'Property Version Not Found',
      detail: message,
      status: 404,
      errors: [{
        type: 'version_not_found',
        title: 'Version Not Found',
        detail: 'Use property.version.list to see available versions'
      }]
    };
    
    super(message, response);
    this.name = 'PropertyVersionNotFoundError';
  }
}

/**
 * Invalid property response error
 */
export class InvalidPropertyResponseError extends BadRequestError {
  constructor(expected: string, _received?: any) {
    const message = `Invalid property API response: expected ${expected}`;
    const response: ApiErrorResponse = {
      type: 'INVALID_PROPERTY_RESPONSE',
      title: 'Invalid Property Response',
      detail: message,
      status: 400,
      errors: [{
        type: 'invalid_response',
        title: 'Invalid Response Format',
        detail: 'This may indicate an API version mismatch'
      }]
    };
    
    super(message, response);
    this.name = 'InvalidPropertyResponseError';
  }
}

/**
 * Property validation error
 */
export class PropertyValidationError extends BadRequestError {
  constructor(field: string, issue: string, _value?: any) {
    const message = `Property validation failed: ${field} ${issue}`;
    let detailMessage = 'Check the property configuration';
    
    // Add specific details based on field
    if (field === 'propertyName') {
      detailMessage = 'Property names must be 1-85 characters, use only letters, numbers, spaces, and basic punctuation';
    } else if (field === 'hostname') {
      detailMessage = 'Hostnames must be valid domain names without protocol';
    } else if (field === 'cpcode') {
      detailMessage = 'CP codes must be numeric. Use property.cpcode.list to see available CP codes';
    }
    
    const response: ApiErrorResponse = {
      type: 'PROPERTY_VALIDATION_ERROR',
      title: 'Property Validation Error',
      detail: message,
      status: 400,
      errors: [{
        type: 'validation_error',
        title: `Invalid ${field}`,
        detail: detailMessage
      }]
    };
    
    super(message, response);
    this.name = 'PropertyValidationError';
  }
}

/**
 * Property access denied error
 */
export class PropertyAccessDeniedError extends ForbiddenError {
  constructor(propertyId: string, operation: string) {
    const message = `Access denied: You do not have permission to ${operation} property '${propertyId}'`;
    const response: ApiErrorResponse = {
      type: 'PROPERTY_ACCESS_DENIED',
      title: 'Property Access Denied',
      detail: message,
      status: 403,
      errors: [{
        type: 'access_denied',
        title: 'Insufficient Permissions',
        detail: `Required permission: property:${operation}. Contact your account administrator`
      }]
    };
    
    super(message, response);
    this.name = 'PropertyAccessDeniedError';
  }
}

/**
 * Property activation error
 */
export class PropertyActivationError extends BadRequestError {
  constructor(propertyId: string, version: number, network: string, reason: string) {
    const message = `Failed to activate property '${propertyId}' v${version} to ${network}: ${reason}`;
    const response: ApiErrorResponse = {
      type: 'PROPERTY_ACTIVATION_ERROR',
      title: 'Property Activation Error',
      detail: message,
      status: 400,
      errors: [{
        type: 'activation_failed',
        title: 'Activation Failed',
        detail: reason
      }]
    };
    
    super(message, response);
    this.name = 'PropertyActivationError';
  }
}

/**
 * Property activation in progress error
 */
export class ActivationInProgressError extends ConflictError {
  constructor(propertyId: string, activationId: string, network: string) {
    const message = `An activation is already in progress for property '${propertyId}' on ${network}`;
    const response: ApiErrorResponse = {
      type: 'ACTIVATION_IN_PROGRESS',
      title: 'Activation In Progress',
      detail: message,
      status: 409,
      errors: [{
        type: 'conflict',
        title: 'Concurrent Activation',
        detail: `Activation ${activationId} is in progress. Wait for completion or cancel it`
      }]
    };
    
    super(message, response);
    this.name = 'ActivationInProgressError';
  }
}

/**
 * Property rule validation error
 */
export class RuleValidationError extends BadRequestError {
  constructor(_propertyId: string, errors: any[]) {
    const errorSummary = errors.slice(0, 3).map(e => e.detail || e.title).join(', ');
    const message = `Property rules validation failed: ${errorSummary}`;
    
    const response: ApiErrorResponse = {
      type: 'RULE_VALIDATION_ERROR',
      title: 'Rule Validation Error',
      detail: message,
      status: 400,
      errors: errors.slice(0, 10).map(e => ({
        type: e.type || 'validation_error',
        title: e.title || 'Validation Error',
        detail: e.detail || e.message || 'Unknown validation error'
      }))
    };
    
    super(message, response);
    this.name = 'RuleValidationError';
  }
}

/**
 * Edge hostname error
 */
export class EdgeHostnameError extends BadRequestError {
  constructor(hostname: string, issue: string) {
    const message = `Edge hostname error for '${hostname}': ${issue}`;
    const response: ApiErrorResponse = {
      type: 'EDGE_HOSTNAME_ERROR',
      title: 'Edge Hostname Error',
      detail: message,
      status: 400,
      errors: [{
        type: 'edge_hostname_error',
        title: 'Invalid Edge Hostname',
        detail: issue
      }]
    };
    
    super(message, response);
    this.name = 'EdgeHostnameError';
  }
}

/**
 * Contract access error
 */
export class ContractAccessError extends ForbiddenError {
  constructor(contractId: string, operation: string) {
    const message = `No access to contract '${contractId}' for operation: ${operation}`;
    const response: ApiErrorResponse = {
      type: 'CONTRACT_ACCESS_ERROR',
      title: 'Contract Access Error',
      detail: message,
      status: 403,
      errors: [{
        type: 'access_denied',
        title: 'Contract Access Denied',
        detail: 'Verify you have access to this contract or switch accounts'
      }]
    };
    
    super(message, response);
    this.name = 'ContractAccessError';
  }
}

/**
 * Group access error
 */
export class GroupAccessError extends ForbiddenError {
  constructor(groupId: string, operation: string) {
    const message = `No access to group '${groupId}' for operation: ${operation}`;
    const response: ApiErrorResponse = {
      type: 'GROUP_ACCESS_ERROR',
      title: 'Group Access Error',
      detail: message,
      status: 403,
      errors: [{
        type: 'access_denied',
        title: 'Group Access Denied',
        detail: 'Verify you have access to this group in your account'
      }]
    };
    
    super(message, response);
    this.name = 'GroupAccessError';
  }
}

/**
 * Property dependency error
 */
export class PropertyDependencyError extends ConflictError {
  constructor(propertyId: string, dependencies: string[]) {
    const message = `Cannot delete property '${propertyId}': active dependencies exist`;
    const response: ApiErrorResponse = {
      type: 'PROPERTY_DEPENDENCY_ERROR',
      title: 'Property Dependency Error',
      detail: message,
      status: 409,
      errors: [{
        type: 'dependency_conflict',
        title: 'Active Dependencies',
        detail: `Dependencies found: ${dependencies.join(', ')}. Deactivate the property first`
      }]
    };
    
    super(message, response);
    this.name = 'PropertyDependencyError';
  }
}

/**
 * Helper function to determine if an error is a property-related error
 */
export function isPropertyError(error: unknown): error is PropertyOperationError {
  return error instanceof PropertyOperationError || 
         error instanceof PropertyNotFoundError ||
         error instanceof PropertyVersionNotFoundError ||
         error instanceof InvalidPropertyResponseError ||
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