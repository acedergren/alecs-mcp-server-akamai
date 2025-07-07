/**
 * Common Validators for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Centralizes all validation logic used across tools
 * - Provides type-safe runtime validation with Zod
 * - Eliminates duplicate schema definitions
 * - Ensures consistent validation error messages
 * 
 * These validators fix type errors by providing compile-time
 * and runtime type safety for all API interactions.
 */

import { z } from 'zod';

// ============================================================================
// Common Request/Response Schemas
// ============================================================================

/**
 * Pagination parameters used across all list operations
 */
export const PaginationSchema = z.object({
  limit: z.number().int().positive().max(1000).optional().describe('Maximum number of items to return'),
  offset: z.number().int().min(0).optional().describe('Number of items to skip'),
  page: z.number().int().positive().optional().describe('Page number (alternative to offset)'),
  pageSize: z.number().int().positive().max(200).optional().describe('Items per page')
});

/**
 * Customer parameter schema - used in every tool
 */
export const CustomerSchema = z.object({
  customer: z.string().optional().describe('Customer configuration section from .edgerc')
});

/**
 * Common error response structure
 */
export const ErrorResponseSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string().optional(),
  errors: z.array(z.unknown()).optional()
});

/**
 * Format parameter for response formatting
 */
export const FormatSchema = z.object({
  format: z.enum(['json', 'text']).optional().default('json')
});

// ============================================================================
// Property Domain Validators
// ============================================================================

/**
 * Property ID validation - must match Akamai format
 */
export const PropertyIdSchema = z.string()
  .regex(/^prp_\d+$/, 'Property ID must be in format prp_123456')
  .describe('Akamai property ID');

/**
 * Property version validation
 */
export const PropertyVersionSchema = z.number()
  .int()
  .positive()
  .describe('Property version number');

/**
 * Contract ID validation
 */
export const ContractIdSchema = z.string()
  .regex(/^ctr_[A-Z0-9-]+$/, 'Contract ID must be in format ctr_C-XXXXXX')
  .describe('Akamai contract ID');

/**
 * Group ID validation
 */
export const GroupIdSchema = z.string()
  .regex(/^grp_\d+$/, 'Group ID must be in format grp_123456')
  .describe('Akamai group ID');

/**
 * Network type for activations
 */
export const NetworkTypeSchema = z.enum(['STAGING', 'PRODUCTION'])
  .describe('Target network for activation');

// ============================================================================
// DNS Domain Validators
// ============================================================================

/**
 * DNS zone name validation
 */
export const ZoneNameSchema = z.string()
  .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, 'Invalid zone name format')
  .describe('DNS zone name');

/**
 * DNS record type validation
 */
export const RecordTypeSchema = z.enum([
  'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 
  'SRV', 'CAA', 'PTR', 'NAPTR', 'SSHFP', 'TLSA'
]).describe('DNS record type');

/**
 * TTL validation for DNS records
 */
export const TTLSchema = z.number()
  .int()
  .min(30)
  .max(86400)
  .describe('Time to live in seconds');

// ============================================================================
// Certificate Domain Validators
// ============================================================================

/**
 * Certificate enrollment ID validation
 */
export const EnrollmentIdSchema = z.number()
  .int()
  .positive()
  .describe('Certificate enrollment ID');

/**
 * Certificate validation method
 */
export const ValidationMethodSchema = z.enum(['dns-01', 'http-01'])
  .describe('Domain validation method');

/**
 * Certificate type validation
 */
export const CertificateTypeSchema = z.enum(['DV', 'EV', 'OV'])
  .describe('Certificate type');

// ============================================================================
// Network List Validators
// ============================================================================

/**
 * Network list ID validation
 */
export const NetworkListIdSchema = z.string()
  .regex(/^\d+_[A-Z]+$/, 'Network list ID must be in format 12345_LISTNAME')
  .describe('Network list ID');

/**
 * IP address validation (v4 and v6)
 */
export const IPAddressSchema = z.string()
  .ip({ version: 'v4' })
  .or(z.string().ip({ version: 'v6' }))
  .describe('IP address (IPv4 or IPv6)');

/**
 * CIDR notation validation
 */
export const CIDRSchema = z.string()
  .regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'Invalid CIDR notation')
  .describe('CIDR notation (e.g., 192.168.1.0/24)');

/**
 * Geographic code validation (ISO 3166)
 */
export const GeoCodeSchema = z.string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Geographic code must be 2-letter ISO code')
  .describe('ISO 3166-1 alpha-2 country code');

/**
 * ASN validation
 */
export const ASNSchema = z.number()
  .int()
  .positive()
  .max(4294967295) // Max 32-bit ASN
  .describe('Autonomous System Number');

// ============================================================================
// FastPurge Validators
// ============================================================================

/**
 * URL validation for purging
 */
export const PurgeURLSchema = z.string()
  .url()
  .describe('URL to purge');

/**
 * CP Code validation
 */
export const CPCodeSchema = z.number()
  .int()
  .positive()
  .describe('Content Provider code');

/**
 * Cache tag validation
 */
export const CacheTagSchema = z.string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Cache tag must be alphanumeric with _ and -')
  .describe('Cache tag');

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a validator for array inputs with deduplication
 */
export function createArrayValidator<T>(
  itemSchema: z.ZodSchema<T>,
  options?: {
    minItems?: number;
    maxItems?: number;
    unique?: boolean;
  }
): z.ZodSchema<T[]> {
  let schema = z.array(itemSchema);
  
  if (options?.minItems) {
    schema = schema.min(options.minItems);
  }
  
  if (options?.maxItems) {
    schema = schema.max(options.maxItems);
  }
  
  if (options?.unique) {
    schema = schema.transform((items) => [...new Set(items)]);
  }
  
  return schema;
}

/**
 * Creates a validator for optional fields with defaults
 */
export function createOptionalWithDefault<T>(
  schema: z.ZodSchema<T>,
  defaultValue: T
): z.ZodSchema<T> {
  return schema.optional().default(defaultValue);
}

/**
 * Validates email format for notifications
 */
export const EmailSchema = z.string()
  .email()
  .describe('Email address for notifications');

/**
 * Validates hostname format
 */
export const HostnameSchema = z.string()
  .regex(
    /^([a-z0-9]+(-[a-z0-9]+)*\.)*[a-z0-9]+(-[a-z0-9]+)*$/,
    'Invalid hostname format'
  )
  .describe('Hostname');

// ============================================================================
// Composite Validators
// ============================================================================

/**
 * Standard list request parameters
 */
export const ListRequestSchema = PaginationSchema
  .merge(CustomerSchema)
  .merge(FormatSchema);

/**
 * Standard activation request parameters
 */
export const ActivationRequestSchema = z.object({
  network: NetworkTypeSchema,
  notifyEmails: createArrayValidator(EmailSchema, { unique: true }).optional(),
  note: z.string().optional(),
  acknowledgeWarnings: z.boolean().optional().default(true),
  customer: z.string().optional()
});

/**
 * Property identifier (can be ID or name)
 */
export const PropertyIdentifierSchema = z.union([
  PropertyIdSchema,
  z.string().min(1).describe('Property name')
]);

/**
 * Zone identifier (name is sufficient)
 */
export const ZoneIdentifierSchema = ZoneNameSchema;

// ============================================================================
// Type Guards (Runtime Type Validation)
// ============================================================================

/**
 * Type guard for property ID
 */
export function isPropertyId(value: unknown): value is string {
  return PropertyIdSchema.safeParse(value).success;
}

/**
 * Type guard for contract ID
 */
export function isContractId(value: unknown): value is string {
  return ContractIdSchema.safeParse(value).success;
}

/**
 * Type guard for zone name
 */
export function isZoneName(value: unknown): value is string {
  return ZoneNameSchema.safeParse(value).success;
}

/**
 * Type guard for IP address
 */
export function isIPAddress(value: unknown): value is string {
  return IPAddressSchema.safeParse(value).success;
}

// Export type inference utilities
export type PaginationParams = z.infer<typeof PaginationSchema>;
export type CustomerParams = z.infer<typeof CustomerSchema>;
export type NetworkType = z.infer<typeof NetworkTypeSchema>;
export type RecordType = z.infer<typeof RecordTypeSchema>;
export type ValidationMethod = z.infer<typeof ValidationMethodSchema>;