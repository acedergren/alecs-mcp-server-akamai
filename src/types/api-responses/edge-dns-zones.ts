/**
 * Edge DNS API Response Types
 * @see https://techdocs.akamai.com/edge-dns/reference/api
 * 
 * CODE KAI IMPLEMENTATION:
 * - Runtime validation with Zod schemas
 * - Type guards for safe type assertions
 * - Custom error classes for actionable feedback
 * - Production-grade validation patterns
 */

import { z } from 'zod';

/**
 * TSIG Key schema for secondary zones
 */
export const TSIGKeySchema = z.object({
  name: z.string().min(1),
  algorithm: z.string(),
  secret: z.string(),
});

/**
 * SOA Record schema
 */
export const SOARecordSchema = z.object({
  primary: z.string().min(1),
  admin: z.string().min(1),
  serial: z.number().int().positive(),
  refresh: z.number().int().positive(),
  retry: z.number().int().positive(),
  expire: z.number().int().positive(),
  minimum: z.number().int().positive(),
});

/**
 * DNS Zone schema
 */
export const EdgeDNSZoneSchema = z.object({
  zone: z.string().min(1),
  type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
  comment: z.string().optional(),
  signAndServe: z.boolean().optional(),
  signAndServeAlgorithm: z.string().optional(),
  contractId: z.string().optional(),
  activationState: z.string().optional(),
  lastModifiedBy: z.string().optional(),
  lastModifiedDate: z.string().optional(),
  versionId: z.string().optional(),
  groupId: z.string().optional(),
  endCustomerId: z.string().optional(),
  target: z.string().optional(), // For alias zones
  masters: z.array(z.string()).optional(), // For secondary zones
  tsigKey: TSIGKeySchema.optional(),
  recordCount: z.number().int().nonnegative().optional(),
  nsRecords: z.array(z.string()).optional(),
  soaRecord: SOARecordSchema.optional(),
});

/**
 * Zone list response metadata
 */
export const ZoneListMetadataSchema = z.object({
  totalCount: z.number().int().nonnegative().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

/**
 * Zone list response schema
 */
export const EdgeDNSZonesResponseSchema = z.object({
  zones: z.array(EdgeDNSZoneSchema),
  metadata: ZoneListMetadataSchema.optional(),
});

/**
 * Single zone response schema
 */
export const EdgeDNSZoneResponseSchema = EdgeDNSZoneSchema;

/**
 * DNS Record Set schema
 */
export const EdgeDNSRecordSetSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  ttl: z.number().int().positive(),
  rdata: z.array(z.string()),
  active: z.boolean().optional(),
});

/**
 * Record sets response schema
 */
export const EdgeDNSRecordSetsResponseSchema = z.object({
  recordsets: z.array(EdgeDNSRecordSetSchema).optional(),
  metadata: ZoneListMetadataSchema.optional(),
});

/**
 * Change list response schema
 */
export const EdgeDNSChangeListResponseSchema = z.object({
  zone: z.string().min(1),
  lastModifiedDate: z.string(),
  lastModifiedBy: z.string(),
  recordSets: z.array(EdgeDNSRecordSetSchema),
  changeTag: z.string().optional(),
});

/**
 * Validation error schema
 */
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

/**
 * Zone submit response schema
 */
export const EdgeDNSZoneSubmitResponseSchema = z.object({
  requestId: z.string().min(1),
  expiryDate: z.string(),
  changeTag: z.string().optional(),
  validationResult: z.object({
    errors: z.array(ValidationErrorSchema).optional(),
    warnings: z.array(ValidationErrorSchema).optional(),
  }).optional(),
});

/**
 * Propagation status schema
 */
export const PropagationStatusSchema = z.object({
  percentage: z.number().min(0).max(100),
  serversUpdated: z.number().int().nonnegative(),
  totalServers: z.number().int().positive(),
});

/**
 * Zone activation status response schema
 */
export const EdgeDNSZoneActivationStatusResponseSchema = z.object({
  zone: z.string().min(1),
  activationState: z.enum(['PENDING', 'ACTIVE', 'FAILED', 'NEW']),
  lastActivationTime: z.string().optional(),
  lastActivatedBy: z.string().optional(),
  propagationStatus: PropagationStatusSchema.optional(),
  requestId: z.string().optional(),
  message: z.string().optional(),
});

/**
 * Bulk zone create response schema
 */
export const EdgeDNSBulkZoneCreateResponseSchema = z.object({
  requestId: z.string().min(1),
  expiryDate: z.string(),
  zonesCreated: z.number().int().nonnegative().optional(),
  zonesSubmitted: z.number().int().nonnegative().optional(),
  failures: z.array(z.object({
    zone: z.string(),
    failureReason: z.string(),
  })).optional(),
});

/**
 * DNSSEC status schema
 */
export const DNSSECZoneStatusSchema = z.object({
  zone: z.string().min(1),
  dnssecStatus: z.enum(['ENABLED', 'DISABLED', 'PENDING']),
  algorithm: z.string().optional(),
  keyType: z.string().optional(),
});

/**
 * DNSSEC status response schema
 */
export const EdgeDNSDnssecStatusResponseSchema = z.object({
  zones: z.array(DNSSECZoneStatusSchema),
});

/**
 * Type exports
 */
export type TSIGKey = z.infer<typeof TSIGKeySchema>;
export type SOARecord = z.infer<typeof SOARecordSchema>;
export type EdgeDNSZone = z.infer<typeof EdgeDNSZoneSchema>;
export type ZoneListMetadata = z.infer<typeof ZoneListMetadataSchema>;
export type EdgeDNSZonesResponse = z.infer<typeof EdgeDNSZonesResponseSchema>;
export type EdgeDNSZoneResponse = z.infer<typeof EdgeDNSZoneResponseSchema>;
export type EdgeDNSRecordSet = z.infer<typeof EdgeDNSRecordSetSchema>;
export type EdgeDNSRecordSetsResponse = z.infer<typeof EdgeDNSRecordSetsResponseSchema>;
export type EdgeDNSChangeListResponse = z.infer<typeof EdgeDNSChangeListResponseSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type EdgeDNSZoneSubmitResponse = z.infer<typeof EdgeDNSZoneSubmitResponseSchema>;
export type PropagationStatus = z.infer<typeof PropagationStatusSchema>;
export type EdgeDNSZoneActivationStatusResponse = z.infer<typeof EdgeDNSZoneActivationStatusResponseSchema>;
export type EdgeDNSBulkZoneCreateResponse = z.infer<typeof EdgeDNSBulkZoneCreateResponseSchema>;
export type DNSSECZoneStatus = z.infer<typeof DNSSECZoneStatusSchema>;
export type EdgeDNSDnssecStatusResponse = z.infer<typeof EdgeDNSDnssecStatusResponseSchema>;

/**
 * Custom error class for Edge DNS validation failures
 */
export class EdgeDNSValidationError extends Error {
  public override readonly name = 'EdgeDNSValidationError';
  public readonly received: unknown;
  public readonly expected: string;

  constructor(message: string, received: unknown, expected: string) {
    super(message);
    this.received = received;
    this.expected = expected;
    
    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EdgeDNSValidationError);
    }
  }
}

/**
 * Type guard for zone list response
 */
export function isEdgeDNSZonesResponse(data: unknown): data is EdgeDNSZonesResponse {
  try {
    EdgeDNSZonesResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for single zone response
 */
export function isEdgeDNSZoneResponse(data: unknown): data is EdgeDNSZoneResponse {
  try {
    EdgeDNSZoneResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for record sets response
 */
export function isEdgeDNSRecordSetsResponse(data: unknown): data is EdgeDNSRecordSetsResponse {
  try {
    EdgeDNSRecordSetsResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for change list response
 */
export function isEdgeDNSChangeListResponse(data: unknown): data is EdgeDNSChangeListResponse {
  try {
    EdgeDNSChangeListResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for zone submit response
 */
export function isEdgeDNSZoneSubmitResponse(data: unknown): data is EdgeDNSZoneSubmitResponse {
  try {
    EdgeDNSZoneSubmitResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for zone activation status response
 */
export function isEdgeDNSZoneActivationStatusResponse(data: unknown): data is EdgeDNSZoneActivationStatusResponse {
  try {
    EdgeDNSZoneActivationStatusResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for bulk zone create response
 */
export function isEdgeDNSBulkZoneCreateResponse(data: unknown): data is EdgeDNSBulkZoneCreateResponse {
  try {
    EdgeDNSBulkZoneCreateResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for DNSSEC status response
 */
export function isEdgeDNSDnssecStatusResponse(data: unknown): data is EdgeDNSDnssecStatusResponse {
  try {
    EdgeDNSDnssecStatusResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}