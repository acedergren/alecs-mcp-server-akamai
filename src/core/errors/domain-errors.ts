/**
 * Domain-Specific Error Handlers
 * 
 * Provides specialized error handling for each domain
 * with context-aware suggestions and recovery strategies
 */

import { ApplicationError, ErrorCode } from './index';

/**
 * Property-specific errors
 */
export class PropertyError extends ApplicationError {
  constructor(message: string, details?: string, propertyId?: string) {
    super(
      ErrorCode.OPERATION_FAILED,
      message,
      details,
      undefined,
      propertyId ? { propertyId } : undefined
    );
    this.name = 'PropertyError';
  }
  
  static notFound(propertyId: string): PropertyError {
    return new PropertyError(
      `Property ${propertyId} not found`,
      'The property may have been deleted or you may not have access to it',
      propertyId
    );
  }
  
  static invalidVersion(propertyId: string, version: number): PropertyError {
    return new PropertyError(
      `Invalid version ${version} for property ${propertyId}`,
      'Use property.version.list() to see available versions',
      propertyId
    );
  }
  
  static activationFailed(propertyId: string, reason: string): PropertyError {
    return new PropertyError(
      `Failed to activate property ${propertyId}`,
      reason,
      propertyId
    );
  }
  
  static validationFailed(errors: string[]): PropertyError {
    return new PropertyError(
      'Property validation failed',
      errors.join('\n')
    );
  }
}

/**
 * DNS-specific errors
 */
export class DNSError extends ApplicationError {
  constructor(message: string, details?: string, zone?: string) {
    super(
      ErrorCode.OPERATION_FAILED,
      message,
      details,
      undefined,
      zone ? { zone } : undefined
    );
    this.name = 'DNSError';
  }
  
  static zoneNotFound(zone: string): DNSError {
    return new DNSError(
      `DNS zone ${zone} not found`,
      'The zone may not exist or you may not have access to it',
      zone
    );
  }
  
  static invalidRecord(zone: string, record: string, reason: string): DNSError {
    return new DNSError(
      `Invalid DNS record ${record} in zone ${zone}`,
      reason,
      zone
    );
  }
  
  static dnssecError(zone: string, operation: string): DNSError {
    return new DNSError(
      `DNSSEC ${operation} failed for zone ${zone}`,
      'Check if DNSSEC is enabled for this zone',
      zone
    );
  }
  
  static activationRequired(zone: string): DNSError {
    return new DNSError(
      `Zone ${zone} has pending changes`,
      'Use dns.changes.activate() to apply changes',
      zone
    );
  }
}

/**
 * Certificate-specific errors
 */
export class CertificateError extends ApplicationError {
  constructor(message: string, details?: string, enrollmentId?: number) {
    super(
      ErrorCode.OPERATION_FAILED,
      message,
      details,
      undefined,
      enrollmentId ? { enrollmentId } : undefined
    );
    this.name = 'CertificateError';
  }
  
  static enrollmentNotFound(enrollmentId: number): CertificateError {
    return new CertificateError(
      `Certificate enrollment ${enrollmentId} not found`,
      'The enrollment may have been deleted or completed',
      enrollmentId
    );
  }
  
  static validationPending(domain: string): CertificateError {
    return new CertificateError(
      `Domain validation pending for ${domain}`,
      'Complete domain validation before proceeding'
    );
  }
  
  static deploymentFailed(enrollmentId: number, network: string): CertificateError {
    return new CertificateError(
      `Failed to deploy certificate ${enrollmentId} to ${network}`,
      'Check certificate status and try again',
      enrollmentId
    );
  }
}

/**
 * Network List errors
 */
export class NetworkListError extends ApplicationError {
  constructor(message: string, details?: string, listId?: string) {
    super(
      ErrorCode.OPERATION_FAILED,
      message,
      details,
      undefined,
      listId ? { networkListId: listId } : undefined
    );
    this.name = 'NetworkListError';
  }
  
  static notFound(listId: string): NetworkListError {
    return new NetworkListError(
      `Network list ${listId} not found`,
      'The list may have been deleted or you may not have access',
      listId
    );
  }
  
  static invalidElement(element: string, listType: string): NetworkListError {
    return new NetworkListError(
      `Invalid ${listType} element: ${element}`,
      `Elements must be valid ${listType} format`
    );
  }
  
  static activationInProgress(listId: string): NetworkListError {
    return new NetworkListError(
      `Network list ${listId} has an activation in progress`,
      'Wait for current activation to complete',
      listId
    );
  }
}

/**
 * Fast Purge errors
 */
export class PurgeError extends ApplicationError {
  constructor(message: string, details?: string) {
    super(
      ErrorCode.OPERATION_FAILED,
      message,
      details
    );
    this.name = 'PurgeError';
  }
  
  static invalidUrl(url: string): PurgeError {
    return new PurgeError(
      `Invalid URL for purging: ${url}`,
      'URLs must be absolute and use http/https protocol'
    );
  }
  
  static rateLimited(resetTime: Date): PurgeError {
    return new PurgeError(
      'Fast Purge rate limit exceeded',
      `Rate limit resets at ${resetTime.toISOString()}`
    );
  }
  
  static queueFull(): PurgeError {
    return new PurgeError(
      'Fast Purge queue is full',
      'Wait for current purges to complete before submitting new ones'
    );
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ApplicationError {
  constructor(message: string, details?: string) {
    super(
      ErrorCode.CONFIGURATION_ERROR,
      message,
      details,
      'Check your configuration and try again'
    );
    this.name = 'ConfigurationError';
  }
  
  static missingCredentials(customer: string): ConfigurationError {
    return new ConfigurationError(
      `Missing credentials for customer '${customer}'`,
      'Add credentials to .edgerc file'
    );
  }
  
  static invalidCredentials(customer: string): ConfigurationError {
    return new ConfigurationError(
      `Invalid credentials for customer '${customer}'`,
      'Verify client_token, client_secret, and access_token in .edgerc'
    );
  }
  
  static missingAccountKey(customer: string): ConfigurationError {
    return new ConfigurationError(
      `Account switching not configured for customer '${customer}'`,
      'Add account_key to .edgerc section for cross-account access'
    );
  }
}

/**
 * State transition errors
 */
export class StateError extends ApplicationError {
  constructor(
    message: string,
    currentState: string,
    requiredState: string,
    suggestion?: string
  ) {
    super(
      ErrorCode.INVALID_STATE,
      message,
      `Current state: ${currentState}, Required: ${requiredState}`,
      suggestion,
      { currentState, requiredState }
    );
    this.name = 'StateError';
  }
  
  static cannotActivate(resourceType: string, resourceId: string, reason: string): StateError {
    return new StateError(
      `Cannot activate ${resourceType} ${resourceId}`,
      reason,
      'READY',
      'Resolve the issues and try again'
    );
  }
  
  static cannotModify(resourceType: string, resourceId: string, state: string): StateError {
    return new StateError(
      `Cannot modify ${resourceType} ${resourceId} in ${state} state`,
      state,
      'EDITABLE',
      'Wait for current operation to complete'
    );
  }
}

/**
 * Batch operation errors
 */
export class BatchError extends ApplicationError {
  constructor(
    message: string,
    public succeeded: string[],
    public failed: Array<{ id: string; error: string }>
  ) {
    super(
      ErrorCode.OPERATION_FAILED,
      message,
      `Succeeded: ${succeeded.length}, Failed: ${failed.length}`,
      undefined,
      { succeeded, failed }
    );
    this.name = 'BatchError';
  }
  
  static partial(
    operation: string,
    succeeded: string[],
    failed: Array<{ id: string; error: string }>
  ): BatchError {
    return new BatchError(
      `Batch ${operation} partially failed`,
      succeeded,
      failed
    );
  }
}