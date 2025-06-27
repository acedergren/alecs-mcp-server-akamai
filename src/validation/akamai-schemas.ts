/**
 * Comprehensive Zod Schema Validation for Akamai MCP Server
 * Replaces manual validation with type-safe schema validation
 * Based on Akamai API specifications and security best practices
 */

import { z } from 'zod';

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

export const AkamaiIdentifierSchema = z.object({
  customer: z.string()
    .min(1, 'Customer identifier is required')
    .max(50, 'Customer identifier too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Customer identifier contains invalid characters'),
});

export const NetworkSchema = z.enum(['STAGING', 'PRODUCTION'], {
  errorMap: () => ({ message: 'Network must be either STAGING or PRODUCTION' }),
});

export const EmailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email address too long');

export const EmailListSchema = z.array(EmailSchema)
  .min(1, 'At least one email address is required')
  .max(10, 'Too many email addresses (maximum 10)');

// ============================================================================
// PROPERTY MANAGER SCHEMAS
// ============================================================================

export const PropertyIdSchema = z.string()
  .regex(/^prp_\d+$/, 'Property ID must be in format prp_123456');

export const ContractIdSchema = z.string()
  .regex(/^ctr_[A-Z0-9-]+$/, 'Contract ID must be in format ctr_ABC123');

export const GroupIdSchema = z.string()
  .regex(/^grp_\d+$/, 'Group ID must be in format grp_123456');

export const PropertyVersionSchema = z.number()
  .int('Version must be an integer')
  .min(1, 'Version must be at least 1')
  .max(9999, 'Version number too high');

export const PropertyNameSchema = z.string()
  .min(1, 'Property name is required')
  .max(85, 'Property name too long')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Property name contains invalid characters');

export const HostnameSchema = z.string()
  .min(1, 'Hostname is required')
  .max(253, 'Hostname too long')
  .regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    'Invalid hostname format'
  );

export const ListPropertiesRequestSchema = AkamaiIdentifierSchema.extend({
  contractId: ContractIdSchema.optional(),
  groupId: GroupIdSchema.optional(),
});

export const GetPropertyRequestSchema = AkamaiIdentifierSchema.extend({
  propertyId: PropertyIdSchema,
  version: PropertyVersionSchema.optional(),
});

export const CreatePropertyRequestSchema = AkamaiIdentifierSchema.extend({
  propertyName: PropertyNameSchema,
  contractId: ContractIdSchema,
  groupId: GroupIdSchema,
  productId: z.string().min(1, 'Product ID is required'),
  cloneFrom: z.object({
    propertyId: PropertyIdSchema,
    version: PropertyVersionSchema,
  }).optional(),
  hostnames: z.array(HostnameSchema).optional(),
});

export const ActivatePropertyRequestSchema = AkamaiIdentifierSchema.extend({
  propertyId: PropertyIdSchema,
  version: PropertyVersionSchema,
  network: NetworkSchema,
  notifyEmails: EmailListSchema.optional(),
  note: z.string().max(1000, 'Note too long').optional(),
  acknowledgeWarnings: z.array(z.string()).optional(),
  complianceRecord: z.object({
    noncomplianceReason: z.string().max(1000, 'Compliance reason too long').optional(),
  }).optional(),
});

// ============================================================================
// EDGE DNS SCHEMAS
// ============================================================================

export const ZoneNameSchema = z.string()
  .min(1, 'Zone name is required')
  .max(253, 'Zone name too long')
  .regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?$/,
    'Invalid zone name format'
  );

export const RecordTypeSchema = z.enum([
  'A', 'AAAA', 'AFSDB', 'CNAME', 'DNAME', 'HINFO', 'LOC', 'MX', 
  'NAPTR', 'NS', 'NSEC3', 'NSEC3PARAM', 'PTR', 'RP', 'SOA', 
  'SPF', 'SRV', 'SSHFP', 'TXT'
], {
  errorMap: () => ({ message: 'Invalid DNS record type' }),
});

export const TTLSchema = z.number()
  .int('TTL must be an integer')
  .min(30, 'TTL must be at least 30 seconds')
  .max(2147483647, 'TTL too large');

export const IPv4Schema = z.string()
  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IPv4 address');

export const IPv6Schema = z.string()
  .regex(/^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/, 'Invalid IPv6 address');

export const CreateZoneRequestSchema = AkamaiIdentifierSchema.extend({
  zone: ZoneNameSchema,
  type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
  comment: z.string().max(1000, 'Comment too long').optional(),
  masters: z.array(IPv4Schema.or(IPv6Schema)).optional(),
  signAndServe: z.boolean().optional(),
  target: ZoneNameSchema.optional(),
});

export const CreateRecordRequestSchema = AkamaiIdentifierSchema.extend({
  zone: ZoneNameSchema,
  name: z.string().min(1, 'Record name is required').max(253, 'Record name too long'),
  type: RecordTypeSchema,
  ttl: TTLSchema,
  rdata: z.array(z.string().min(1, 'Record data is required')).min(1, 'At least one record data entry is required'),
});

// ============================================================================
// CERTIFICATE PROVISIONING SCHEMAS
// ============================================================================

export const CertificateTypeSchema = z.enum(['SAN', 'SINGLE', 'WILDCARD'], {
  errorMap: () => ({ message: 'Certificate type must be SAN, SINGLE, or WILDCARD' }),
});

export const ValidationTypeSchema = z.enum(['DV', 'OV', 'EV'], {
  errorMap: () => ({ message: 'Validation type must be DV, OV, or EV' }),
});

export const SignatureAlgorithmSchema = z.enum(['SHA-1', 'SHA-256'], {
  errorMap: () => ({ message: 'Signature algorithm must be SHA-1 or SHA-256' }),
});

export const KeyAlgorithmSchema = z.enum(['RSA', 'ECDSA'], {
  errorMap: () => ({ message: 'Key algorithm must be RSA or ECDSA' }),
});

export const EnrollCertificateRequestSchema = AkamaiIdentifierSchema.extend({
  commonName: HostnameSchema,
  sans: z.array(HostnameSchema).max(99, 'Too many SAN entries (maximum 99)').optional(),
  certificateType: CertificateTypeSchema,
  validationType: ValidationTypeSchema,
  signatureAlgorithm: SignatureAlgorithmSchema.optional(),
  keyAlgorithm: KeyAlgorithmSchema.optional(),
  organization: z.object({
    name: z.string().min(1, 'Organization name is required').max(100, 'Organization name too long'),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
    addressLineOne: z.string().min(1, 'Address is required').max(100, 'Address too long'),
    addressLineTwo: z.string().max(100, 'Address too long').optional(),
    city: z.string().min(1, 'City is required').max(50, 'City name too long'),
    region: z.string().min(1, 'Region is required').max(50, 'Region name too long'),
    postalCode: z.string().min(1, 'Postal code is required').max(20, 'Postal code too long'),
    country: z.string().length(2, 'Country must be a 2-letter ISO code'),
  }).optional(),
  adminContact: z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    email: EmailSchema,
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  }).optional(),
});

// ============================================================================
// FAST PURGE SCHEMAS
// ============================================================================

export const PurgeObjectSchema = z.string()
  .min(1, 'Purge object cannot be empty')
  .max(8000, 'Purge object URL too long')
  .refine((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      // Allow relative paths and wildcards for Fast Purge
      return /^\/[^?#]*(\*)?$/.test(url) || /^[^\/\s]+$/.test(url);
    }
  }, 'Invalid purge object format');

export const PurgeRequestSchema = AkamaiIdentifierSchema.extend({
  objects: z.array(PurgeObjectSchema)
    .min(1, 'At least one object to purge is required')
    .max(50, 'Too many objects to purge (maximum 50)'),
  action: z.enum(['remove', 'invalidate']).optional(),
  hostname: HostnameSchema.optional(),
});

// ============================================================================
// NETWORK LISTS SCHEMAS
// ============================================================================

export const NetworkListTypeSchema = z.enum(['IP', 'GEO'], {
  errorMap: () => ({ message: 'Network list type must be IP or GEO' }),
});

export const IPAddressSchema = IPv4Schema.or(IPv6Schema)
  .or(z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/, 'Invalid CIDR notation'))
  .or(z.string().regex(/^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\/(?:[0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$/, 'Invalid IPv6 CIDR notation'));

export const CountryCodeSchema = z.string()
  .length(2, 'Country code must be 2 letters')
  .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters');

export const CreateNetworkListRequestSchema = AkamaiIdentifierSchema.extend({
  name: z.string()
    .min(1, 'Network list name is required')
    .max(255, 'Network list name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Network list name contains invalid characters'),
  type: NetworkListTypeSchema,
  description: z.string().max(1000, 'Description too long').optional(),
  list: z.array(z.union([IPAddressSchema, CountryCodeSchema]))
    .max(10000, 'Too many entries (maximum 10,000)'),
});

// ============================================================================
// SEARCH AND UNIVERSAL SCHEMAS
// ============================================================================

export const SearchQuerySchema = z.string()
  .min(1, 'Search query cannot be empty')
  .max(1000, 'Search query too long')
  .refine((query) => {
    // Prevent potential injection attacks
    const dangerous = /<script|javascript:|on\w+\s*=|data:text\/html/i;
    return !dangerous.test(query);
  }, 'Search query contains potentially dangerous content');

export const UniversalSearchRequestSchema = AkamaiIdentifierSchema.extend({
  query: SearchQuerySchema,
  detailed: z.boolean().optional(),
  includeInactive: z.boolean().optional(),
  maxResults: z.number().int().min(1).max(1000).optional(),
});

// ============================================================================
// MCP MESSAGE SCHEMAS
// ============================================================================

export const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string().min(1, 'Method is required'),
  params: z.record(z.unknown()).optional(),
});

export const MCPResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }).optional(),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate and sanitize input using Zod schema
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
      throw new Error(`Validation failed: ${messages}`);
    }
    throw error;
  }
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .slice(0, 1000); // Limit length
}

/**
 * Validate customer identifier format
 */
export function validateCustomer(customer: string): string {
  return validateInput(AkamaiIdentifierSchema, { customer }).customer;
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): string {
  return validateInput(EmailSchema, email);
}

/**
 * Validate hostname format
 */
export function validateHostname(hostname: string): string {
  return validateInput(HostnameSchema, hostname);
}