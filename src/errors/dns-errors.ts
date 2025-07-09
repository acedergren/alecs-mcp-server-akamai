/**
 * DNS Operations specific error classes
 * 
 * CODE KAI IMPLEMENTATION:
 * - Extends base error classes with DNS-specific context
 * - Provides clear guidance for DNS configuration issues
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
 * Base class for all DNS operation errors
 */
export class DNSOperationError extends AkamaiError {
  constructor(message: string, code: string, statusCode: number = 400, details?: unknown) {
    super({
      type: `https://problems.luna.akamaiapis.net/edge-dns/v2/${code.toLowerCase()}`,
      title: message,
      detail: message,
      status: statusCode,
      ...(details as Record<string, unknown>)
    });
    this.name = 'DNSOperationError';
  }
}

/**
 * DNS Zone not found error
 */
export class ZoneNotFoundError extends NotFoundError {
  constructor(zone: string, hint?: string) {
    const message = `DNS zone '${zone}' not found`;
    const response: ApiErrorResponse = {
      type: 'ZONE_NOT_FOUND',
      title: 'DNS Zone Not Found',
      detail: message,
      status: 404,
      errors: [{
        type: 'zone_not_found',
        title: 'Zone Not Found',
        detail: hint || 'Use dns.zone.list to see available zones'
      }]
    };
    
    super(message, response);
    this.name = 'ZoneNotFoundError';
  }
}

/**
 * DNS Record not found error
 */
export class RecordNotFoundError extends NotFoundError {
  constructor(zone: string, recordName: string, recordType: string) {
    const message = `DNS record '${recordName}' (type: ${recordType}) not found in zone '${zone}'`;
    const response: ApiErrorResponse = {
      type: 'RECORD_NOT_FOUND',
      title: 'DNS Record Not Found',
      detail: message,
      status: 404,
      errors: [{
        type: 'record_not_found',
        title: 'Record Not Found',
        detail: 'Use dns.record.list to see existing records'
      }]
    };
    
    super(message, response);
    this.name = 'RecordNotFoundError';
  }
}

/**
 * DNS Zone already exists error
 */
export class ZoneAlreadyExistsError extends ConflictError {
  constructor(zone: string) {
    const message = `DNS zone '${zone}' already exists`;
    const response: ApiErrorResponse = {
      type: 'ZONE_ALREADY_EXISTS',
      title: 'DNS Zone Already Exists',
      detail: message,
      status: 409,
      errors: [{
        type: 'conflict',
        title: 'Zone Exists',
        detail: 'Use the existing zone or choose a different zone name'
      }]
    };
    
    super(message, response);
    this.name = 'ZoneAlreadyExistsError';
  }
}

/**
 * DNS Record already exists error
 */
export class RecordAlreadyExistsError extends ConflictError {
  constructor(zone: string, recordName: string, recordType: string) {
    const message = `DNS record '${recordName}' (type: ${recordType}) already exists in zone '${zone}'`;
    const response: ApiErrorResponse = {
      type: 'RECORD_ALREADY_EXISTS',
      title: 'DNS Record Already Exists',
      detail: message,
      status: 409,
      errors: [{
        type: 'conflict',
        title: 'Record Exists',
        detail: 'Use dns.record.update to modify the existing record'
      }]
    };
    
    super(message, response);
    this.name = 'RecordAlreadyExistsError';
  }
}

/**
 * DNS validation error
 */
export class DNSValidationError extends BadRequestError {
  constructor(field: string, issue: string, _value?: any) {
    const message = `DNS validation failed: ${field} ${issue}`;
    let detailMessage = 'Check the DNS record format';
    
    // Add specific details based on field
    if (field === 'recordName') {
      detailMessage = 'Ensure the record name is a valid hostname, use @ for zone apex';
    } else if (field === 'ttl') {
      detailMessage = 'TTL must be between 30 and 86400 seconds';
    } else if (field === 'rdata') {
      detailMessage = 'Check the record data format for the specific record type';
    }
    
    const response: ApiErrorResponse = {
      type: 'DNS_VALIDATION_ERROR',
      title: 'DNS Validation Error',
      detail: message,
      status: 400,
      errors: [{
        type: 'validation_error',
        title: `Invalid ${field}`,
        detail: detailMessage
      }]
    };
    
    super(message, response);
    this.name = 'DNSValidationError';
  }
}

/**
 * DNS Zone dependency error
 */
export class ZoneDependencyError extends ConflictError {
  constructor(zone: string, dependencies: string[]) {
    const message = `Cannot delete zone '${zone}': active dependencies exist`;
    const response: ApiErrorResponse = {
      type: 'ZONE_DEPENDENCY_ERROR',
      title: 'Zone Dependency Error',
      detail: message,
      status: 409,
      errors: [{
        type: 'dependency_conflict',
        title: 'Active Dependencies',
        detail: `Dependencies found: ${dependencies.join(', ')}. Remove all records first`
      }]
    };
    
    super(message, response);
    this.name = 'ZoneDependencyError';
  }
}

/**
 * DNS access denied error
 */
export class DNSAccessDeniedError extends ForbiddenError {
  constructor(resource: string, operation: string) {
    const message = `Access denied: You do not have permission to ${operation} ${resource}`;
    const response: ApiErrorResponse = {
      type: 'DNS_ACCESS_DENIED',
      title: 'DNS Access Denied',
      detail: message,
      status: 403,
      errors: [{
        type: 'access_denied',
        title: 'Insufficient Permissions',
        detail: `Required permission: dns:${operation}. Contact your administrator`
      }]
    };
    
    super(message, response);
    this.name = 'DNSAccessDeniedError';
  }
}

/**
 * DNS changelist error
 */
export class ChangelistError extends BadRequestError {
  constructor(zone: string, reason: string) {
    const message = `Changelist operation failed for zone '${zone}': ${reason}`;
    const response: ApiErrorResponse = {
      type: 'CHANGELIST_ERROR',
      title: 'Changelist Error',
      detail: message,
      status: 400,
      errors: [{
        type: 'changelist_error',
        title: 'Changelist Operation Failed',
        detail: reason
      }]
    };
    
    super(message, response);
    this.name = 'ChangelistError';
  }
}

/**
 * DNSSEC configuration error
 */
export class DNSSECError extends BadRequestError {
  constructor(zone: string, issue: string) {
    const message = `DNSSEC configuration error for zone '${zone}': ${issue}`;
    const response: ApiErrorResponse = {
      type: 'DNSSEC_ERROR',
      title: 'DNSSEC Error',
      detail: message,
      status: 400,
      errors: [{
        type: 'dnssec_error',
        title: 'DNSSEC Configuration Error',
        detail: issue
      }]
    };
    
    super(message, response);
    this.name = 'DNSSECError';
  }
}

/**
 * Helper function to determine if an error is a DNS-related error
 */
export function isDNSError(error: unknown): error is DNSOperationError {
  return error instanceof DNSOperationError || 
         error instanceof ZoneNotFoundError ||
         error instanceof RecordNotFoundError ||
         error instanceof ZoneAlreadyExistsError ||
         error instanceof RecordAlreadyExistsError ||
         error instanceof DNSValidationError ||
         error instanceof ZoneDependencyError ||
         error instanceof DNSAccessDeniedError ||
         error instanceof ChangelistError ||
         error instanceof DNSSECError;
}