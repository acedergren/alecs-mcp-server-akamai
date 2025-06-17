/**
 * Runtime type validation utilities
 * Provides comprehensive type checking and validation
 */

import { z, ZodSchema, ZodError } from 'zod';
import { 
  EdgeGridCredentials,
  ConfigurationError,
  ConfigErrorType 
} from '../../../src/types/config';
import {
  Property,
  PropertyVersion,
  DnsZone,
  DnsRecord,
  NetworkList
} from '../../../src/types/akamai';

/**
 * Type guard results
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate data against a Zod schema
 */
export function validateWithSchema<T>(
  data: unknown,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
    };
  }
}

/**
 * Type guards for Akamai types
 */
export const TypeGuards = {
  /**
   * Check if value is a valid Property
   */
  isProperty(value: unknown): value is Property {
    if (!value || typeof value !== 'object') return false;
    
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.propertyId === 'string' &&
      obj.propertyId.startsWith('prp_') &&
      typeof obj.propertyName === 'string' &&
      typeof obj.contractId === 'string' &&
      typeof obj.groupId === 'string' &&
      typeof obj.productId === 'string' &&
      typeof obj.latestVersion === 'number'
    );
  },

  /**
   * Check if value is a valid PropertyVersion
   */
  isPropertyVersion(value: unknown): value is PropertyVersion {
    if (!value || typeof value !== 'object') return false;
    
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.propertyId === 'string' &&
      typeof obj.version === 'number' &&
      typeof obj.productId === 'string' &&
      ['ACTIVE', 'INACTIVE', 'PENDING'].includes(obj.productionStatus as string) &&
      ['ACTIVE', 'INACTIVE', 'PENDING'].includes(obj.stagingStatus as string)
    );
  },

  /**
   * Check if value is a valid DnsZone
   */
  isDnsZone(value: unknown): value is DnsZone {
    if (!value || typeof value !== 'object') return false;
    
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.zone === 'string' &&
      ['PRIMARY', 'SECONDARY', 'ALIAS'].includes(obj.type as string) &&
      typeof obj.contractId === 'string' &&
      typeof obj.signAndServe === 'boolean'
    );
  },

  /**
   * Check if value is a valid DnsRecord
   */
  isDnsRecord(value: unknown): value is DnsRecord {
    if (!value || typeof value !== 'object') return false;
    
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.name === 'string' &&
      typeof obj.type === 'string' &&
      typeof obj.ttl === 'number' &&
      Array.isArray(obj.rdata) &&
      obj.rdata.every(r => typeof r === 'string')
    );
  },

  /**
   * Check if value is a valid NetworkList
   */
  isNetworkList(value: unknown): value is NetworkList {
    if (!value || typeof value !== 'object') return false;
    
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.listId === 'string' &&
      typeof obj.name === 'string' &&
      ['IP', 'GEO'].includes(obj.type as string) &&
      typeof obj.elementCount === 'number' &&
      Array.isArray(obj.list)
    );
  },

  /**
   * Check if value is a valid EdgeGrid credentials
   */
  isEdgeGridCredentials(value: unknown): value is EdgeGridCredentials {
    if (!value || typeof value !== 'object') return false;
    
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.host === 'string' &&
      typeof obj.client_token === 'string' &&
      typeof obj.client_secret === 'string' &&
      typeof obj.access_token === 'string'
    );
  },

  /**
   * Check if value is a ConfigurationError
   */
  isConfigurationError(value: unknown): value is ConfigurationError {
    return (
      value instanceof ConfigurationError ||
      (value instanceof Error && 
       'type' in value && 
       Object.values(ConfigErrorType).includes((value as any).type))
    );
  },
};

/**
 * Schema validators for comprehensive validation
 */
export const SchemaValidators = {
  /**
   * Property schema
   */
  property: z.object({
    propertyId: z.string().regex(/^prp_\d+$/),
    propertyName: z.string().min(1).max(255),
    contractId: z.string().regex(/^ctr_[A-Z]-\d+$/),
    groupId: z.string().regex(/^grp_\d+$/),
    productId: z.string().startsWith('prd_'),
    latestVersion: z.number().int().positive(),
    productionVersion: z.number().int().positive().optional(),
    stagingVersion: z.number().int().positive().optional(),
    hostnames: z.array(z.string()).optional(),
    createdDate: z.string().datetime().optional(),
    modifiedDate: z.string().datetime().optional(),
  }),

  /**
   * DNS zone schema
   */
  dnsZone: z.object({
    zone: z.string().regex(/^[a-z0-9.-]+$/),
    type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
    contractId: z.string(),
    comment: z.string().optional(),
    signAndServe: z.boolean(),
    signAndServeAlgorithm: z.string().optional(),
    activationState: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']),
    lastActivationDate: z.string().datetime().optional(),
    lastModifiedDate: z.string().datetime().optional(),
    versionId: z.string().optional(),
  }),

  /**
   * DNS record schema
   */
  dnsRecord: z.object({
    name: z.string(),
    type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV', 'CAA']),
    ttl: z.number().int().min(0).max(2147483647),
    rdata: z.array(z.string()).min(1),
    active: z.boolean().optional(),
  }),

  /**
   * EdgeGrid credentials schema
   */
  edgeGridCredentials: z.object({
    host: z.string().regex(/^[a-zA-Z0-9.-]+\.akamai(?:apis)?\.net$/),
    client_token: z.string().min(1),
    client_secret: z.string().min(1),
    access_token: z.string().min(1),
    account_switch_key: z.string().optional(),
  }),

  /**
   * Network list schema
   */
  networkList: z.object({
    listId: z.string(),
    name: z.string(),
    type: z.enum(['IP', 'GEO']),
    elementCount: z.number().int().min(0),
    list: z.array(z.string()),
    syncPoint: z.number().int(),
    accessControlGroup: z.string().optional(),
    description: z.string().optional(),
  }),
};

/**
 * Composite validators for complex validation scenarios
 */
export class CompositeValidator {
  /**
   * Validate property with all its versions
   */
  static validatePropertyWithVersions(
    property: unknown,
    versions: unknown[]
  ): ValidationResult<{ property: Property; versions: PropertyVersion[] }> {
    const propertyResult = validateWithSchema(property, SchemaValidators.property);
    if (!propertyResult.valid) {
      return { valid: false, errors: propertyResult.errors };
    }

    const validatedVersions: PropertyVersion[] = [];
    const errors: string[] = [];

    for (let i = 0; i < versions.length; i++) {
      const versionResult = validateWithSchema(
        versions[i],
        SchemaValidators.property.extend({
          version: z.number().int().positive(),
          note: z.string().optional(),
          productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']),
          stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']),
          ruleFormat: z.string(),
          createdByUser: z.string().email(),
          createdDate: z.string().datetime(),
        })
      );

      if (!versionResult.valid) {
        errors.push(`Version ${i}: ${versionResult.errors?.join(', ')}`);
      } else if (versionResult.data) {
        validatedVersions.push(versionResult.data as PropertyVersion);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      data: {
        property: propertyResult.data!,
        versions: validatedVersions,
      },
    };
  }

  /**
   * Validate DNS zone with records
   */
  static validateDnsZoneWithRecords(
    zone: unknown,
    records: unknown[]
  ): ValidationResult<{ zone: DnsZone; records: DnsRecord[] }> {
    const zoneResult = validateWithSchema(zone, SchemaValidators.dnsZone);
    if (!zoneResult.valid) {
      return { valid: false, errors: zoneResult.errors };
    }

    const validatedRecords: DnsRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const recordResult = validateWithSchema(records[i], SchemaValidators.dnsRecord);
      if (!recordResult.valid) {
        errors.push(`Record ${i}: ${recordResult.errors?.join(', ')}`);
      } else if (recordResult.data) {
        validatedRecords.push(recordResult.data);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      data: {
        zone: zoneResult.data!,
        records: validatedRecords,
      },
    };
  }
}

/**
 * Create a strict validator that throws on invalid data
 */
export function createStrictValidator<T>(schema: ZodSchema<T>) {
  return (data: unknown): T => {
    const result = validateWithSchema(data, schema);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
    }
    return result.data!;
  };
}

/**
 * Create a type predicate function from a schema
 */
export function createTypePredicate<T>(
  schema: ZodSchema<T>
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    const result = validateWithSchema(value, schema);
    return result.valid;
  };
}