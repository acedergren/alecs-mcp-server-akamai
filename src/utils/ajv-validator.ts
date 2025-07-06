
// Type definitions for validators
interface PropertyListResponse {
  properties: {
    items: Array<{
      propertyId: string;
      propertyName: string;
      contractId: string;
      groupId: string;
      latestVersion: number;
      stagingVersion: number | null;
      productionVersion: number | null;
      assetId: string;
    }>;
  };
}

interface PropertyVersion {
  propertyId: string;
  propertyVersion: number;
  contractId: string;
  groupId: string;
  propertyName: string;
  updatedByUser: string;
  updatedDate: string;
  productionStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DEACTIVATED';
  stagingStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DEACTIVATED';
  etag: string;
  ruleFormat: string;
}

interface Activation {
  activationId: string;
  propertyId: string;
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ABORTED' | 'FAILED' | 'DEACTIVATED' | 'PENDING_DEACTIVATION' | 'NEW';
  submitDate: string;
  updateDate: string;
  note: string;
  notifyEmails: string[];
}

interface DNSZone {
  zone: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ALIAS';
  comment: string;
  signAndServe: boolean;
  contractId: string;
  activationState: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'PENDING_DELETION';
  lastActivationDate: string;
  lastModifiedDate: string;
  versionId: string;
}

interface DNSRecordSet {
  name: string;
  type: string;
  ttl: number;
  rdata: string[];
}

interface Enrollment {
  enrollmentId: number;
  status: string;
  certificateType: string;
  validationType: string;
  certificateChainType: string;
  networkConfiguration: {
    geography: string;
    secureNetwork: string;
    sniOnly: boolean;
    quicEnabled: boolean;
  };
}

/**
 * Ajv-based runtime validation for Akamai API responses
 * Provides type-safe validation with proper error messages
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';


// Validation type definitions
type ValidatorFunction = (data: unknown) => boolean;
type ValidationError = { path: string; message: string; code?: string };
type SchemaValidator = { validate: ValidatorFunction; errors?: ValidationError[] };

// Create and configure Ajv instance
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false, // Allow additional properties from API
  coerceTypes: false, // Don't coerce types
  useDefaults: true
});

// Add format validators
addFormats(ajv);

// Custom formats for Akamai-specific validations
ajv.addFormat('akamai-property-id', /^prp_\d+$/);
ajv.addFormat('akamai-contract-id', /^ctr_[A-Z0-9-]+$/);
ajv.addFormat('akamai-group-id', /^grp_\d+$/);
ajv.addFormat('akamai-cpcode-id', /^cpc_\d+$/);
ajv.addFormat('akamai-edge-hostname', /^[a-zA-Z0-9.-]+\.edgekey\.net$|^[a-zA-Z0-9.-]+\.edgesuite\.net$|^[a-zA-Z0-9.-]+\.akamaized\.net$/);
ajv.addFormat('akamai-activation-id', /^atv_\d+$/);
ajv.addFormat('akamai-enrollment-id', /^\d+$/);

// Validation result type
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// Create a validator function for a schema
export function createValidator<T>(schema: object): (data: unknown) => ValidationResult<T> {
  const validate = ajv.compile<T>(schema);
  
  return (data: unknown): ValidationResult<T> => {
    const valid = validate(data);
    
    if (valid) {
      return {
        valid: true,
        data: data as T
      };
    }
    
    return {
      valid: false,
      errors: (validate.errors || []).map(err => ({
        field: err.instancePath || err.schemaPath,
        message: err.message || 'Validation error',
        code: err.keyword
      }))
    };
  };
}

// Type guard with validation
export function validateApiResponse<T>(
  data: unknown,
  schema: object
): data is T {
  const validator = createValidator<T>(schema);
  return validator(data).valid;
}

// Common Akamai API response schemas
export const PropertyListSchema = {
  type: 'object',
  required: ['properties'],
  properties: {
    properties: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['propertyId', 'propertyName', 'contractId', 'groupId'],
            properties: {
              propertyId: { type: 'string', format: 'akamai-property-id' },
              propertyName: { type: 'string' },
              contractId: { type: 'string', format: 'akamai-contract-id' },
              groupId: { type: 'string', format: 'akamai-group-id' },
              latestVersion: { type: 'integer' },
              stagingVersion: { type: ['integer', 'null'] },
              productionVersion: { type: ['integer', 'null'] },
              assetId: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

export const PropertyVersionSchema = {
  type: 'object',
  required: ['propertyId', 'propertyVersion', 'contractId', 'groupId'],
  properties: {
    propertyId: { type: 'string', format: 'akamai-property-id' },
    propertyVersion: { type: 'integer' },
    contractId: { type: 'string', format: 'akamai-contract-id' },
    groupId: { type: 'string', format: 'akamai-group-id' },
    propertyName: { type: 'string' },
    updatedByUser: { type: 'string' },
    updatedDate: { type: 'string', format: 'date-time' },
    productionStatus: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED']
    },
    stagingStatus: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED']
    },
    etag: { type: 'string' },
    ruleFormat: { type: 'string' }
  }
};

export const ActivationSchema = {
  type: 'object',
  required: ['activationId', 'propertyId', 'propertyVersion', 'network', 'status'],
  properties: {
    activationId: { type: 'string', format: 'akamai-activation-id' },
    propertyId: { type: 'string', format: 'akamai-property-id' },
    propertyVersion: { type: 'integer' },
    network: { type: 'string', enum: ['STAGING', 'PRODUCTION'] },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 'ABORTED', 'FAILED', 'DEACTIVATED', 'PENDING_DEACTIVATION', 'NEW']
    },
    submitDate: { type: 'string', format: 'date-time' },
    updateDate: { type: 'string', format: 'date-time' },
    note: { type: 'string' },
    notifyEmails: {
      type: 'array',
      items: { type: 'string', format: 'email' }
    }
  }
};

// Edge DNS schemas
export const DNSZoneSchema = {
  type: 'object',
  required: ['zone', 'type'],
  properties: {
    zone: { type: 'string', format: 'hostname' },
    type: { type: 'string', enum: ['PRIMARY', 'SECONDARY', 'ALIAS'] },
    comment: { type: 'string' },
    signAndServe: { type: 'boolean' },
    contractId: { type: 'string', format: 'akamai-contract-id' },
    activationState: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'PENDING_DELETION'] },
    lastActivationDate: { type: 'string', format: 'date-time' },
    lastModifiedDate: { type: 'string', format: 'date-time' },
    versionId: { type: 'string' }
  }
};

export const DNSRecordSetSchema = {
  type: 'object',
  required: ['name', 'type', 'ttl', 'rdata'],
  properties: {
    name: { type: 'string' },
    type: { 
      type: 'string', 
      enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA', 'CERT', 'DNSKEY', 'DS', 'NAPTR', 'NSEC3', 'NSEC3PARAM', 'RRSIG', 'SPF', 'SSHFP', 'TLSA']
    },
    ttl: { type: 'integer', minimum: 0 },
    rdata: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    }
  }
};

// CPS schemas
export const EnrollmentSchema = {
  type: 'object',
  required: ['enrollmentId', 'status'],
  properties: {
    enrollmentId: { type: 'integer', format: 'akamai-enrollment-id' },
    status: { 
      type: 'string',
      enum: ['new', 'verified', 'wait-upload-third-party', 'cancelled', 'provisioning', 'deployed', 'pending-expiration', 'incomplete', 'wait-review', 'action-required']
    },
    certificateType: { type: 'string', enum: ['san', 'single', 'wildcard', 'wildcard-san'] },
    validationType: { type: 'string', enum: ['dv', 'ev', 'ov', 'third-party'] },
    certificateChainType: { type: 'string', enum: ['default', 'intermediate-only'] },
    networkConfiguration: {
      type: 'object',
      properties: {
        geography: { type: 'string', enum: ['core', 'china', 'russia', 'standard'] },
        secureNetwork: { type: 'string', enum: ['standard-tls', 'enhanced-tls', 'shared-cert'] },
        sniOnly: { type: 'boolean' },
        quicEnabled: { type: 'boolean' }
      }
    }
  }
};

// Validator instances
export const propertyListValidator = createValidator<PropertyListResponse>(PropertyListSchema);
export const propertyVersionValidator = createValidator<PropertyVersion>(PropertyVersionSchema);
export const activationValidator = createValidator<Activation>(ActivationSchema);
export const dnsZoneValidator = createValidator<DNSZone>(DNSZoneSchema);
export const dnsRecordSetValidator = createValidator<DNSRecordSet>(DNSRecordSetSchema);
export const enrollmentValidator = createValidator<Enrollment>(EnrollmentSchema);

// Helper to validate and transform API responses
export function validateAndTransform<T>(
  data: unknown,
  validator: (data: unknown) => ValidationResult<T>,
  transformFn?: (data: T) => T
): T {
  const result = validator(data);
  
  if (!result.valid || !result.data) {
    const errors = result.errors?.map(e => `${e.field}: ${e.message}`).join(', ') || 'Unknown validation error';
    throw new Error(`API response validation failed: ${errors}`);
  }
  
  return transformFn ? transformFn(result.data) : result.data;
}