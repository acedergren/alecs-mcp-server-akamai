/**
 * Property Domain Types - Consolidated Type Definitions
 * 
 * CODE KAI: Single source of truth for all property-related types
 * Consolidates types from multiple files while maintaining compatibility
 */

import { z } from 'zod';

/**
 * Core property interface matching Akamai PAPI v1
 */
export interface Property {
  propertyId: string;
  propertyName: string;
  accountId: string;
  contractId: string;
  groupId: string;
  assetId?: string;
  latestVersion: number;
  stagingVersion?: number | null;
  productionVersion?: number | null;
  productId?: string;
  ruleFormat?: string;
  note?: string;
}

/**
 * Property version details
 */
export interface PropertyVersion {
  propertyId: string;
  propertyVersion: number;
  contractId: string;
  groupId: string;
  propertyName: string;
  updatedByUser: string;
  updatedDate: string;
  productionStatus: ActivationStatus;
  stagingStatus: ActivationStatus;
  etag: string;
  ruleFormat: string;
  note?: string;
}

/**
 * Property activation status
 */
export type ActivationStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DEACTIVATED' | 'FAILED' | 'ABORTED';

/**
 * Property activation
 */
export interface PropertyActivation {
  activationId: string;
  propertyId: string;
  propertyVersion: number;
  network: 'STAGING' | 'PRODUCTION';
  activationType: 'ACTIVATE' | 'DEACTIVATE';
  status: ActivationStatus;
  submitDate: string;
  updateDate: string;
  note?: string;
  notifyEmails: string[];
  fallbackInfo?: {
    fastFallbackAttempted: boolean;
    fallbackVersion: number;
    canFastFallback: boolean;
    steadyStateTime: number;
    fastFallbackExpirationTime: number;
    fastFallbackRecoveryState?: 'RECOVERY_PREPARE' | 'RECOVERY_CONVERGE' | 'RECOVERY_COMPLETE';
  };
}

/**
 * Property rules (rule tree)
 */
export interface PropertyRules {
  accountId?: string;
  contractId?: string;
  groupId?: string;
  propertyId?: string;
  propertyVersion?: number;
  etag?: string;
  ruleFormat: string;
  rules: Rule;
  warnings?: ValidationWarning[];
  errors?: ValidationError[];
}

/**
 * Rule tree node
 */
export interface Rule {
  name: string;
  comments?: string;
  uuid?: string;
  criteriaMustSatisfy?: 'all' | 'any';
  criteria?: Criterion[];
  behaviors?: Behavior[];
  children?: Rule[];
  options?: Record<string, unknown>;
}

/**
 * Rule criterion
 */
export interface Criterion {
  name: string;
  uuid?: string;
  options: Record<string, unknown>;
}

/**
 * Rule behavior
 */
export interface Behavior {
  name: string;
  uuid?: string;
  options: Record<string, unknown>;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  type: string;
  errorLocation: string;
  detail: string;
}

/**
 * Validation error
 */
export interface ValidationError {
  type: string;
  errorLocation: string;
  detail: string;
}

/**
 * Property hostname
 */
export interface PropertyHostname {
  cnameType: 'EDGE_HOSTNAME';
  edgeHostnameId?: string;
  cnameFrom: string;
  cnameTo?: string;
  certStatus?: {
    production?: CertificateStatus[];
    staging?: CertificateStatus[];
  };
}

/**
 * Certificate status
 */
export interface CertificateStatus {
  status: 'DEPLOYED' | 'PENDING' | 'FAILED';
}

/**
 * Edge hostname
 */
export interface EdgeHostname {
  edgeHostnameId: string;
  recordName: string;
  dnsZone: string;
  securityType: 'STANDARD_TLS' | 'ENHANCED_TLS' | 'SHARED_CERT';
  useDefaultTtl: boolean;
  useDefaultMap: boolean;
  ipVersionBehavior: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  productId: string;
  ttl?: number;
  map?: string;
}

/**
 * Request/Response types for operations
 */
export interface ListPropertiesParams {
  contractId?: string;
  groupId?: string;
  customer?: string;
  limit?: number;
  offset?: number;
}

export interface ListPropertiesResponse {
  properties: {
    items: Property[];
  };
}

export interface GetPropertyParams {
  propertyId: string;
  customer?: string;
  contractId?: string;
  groupId?: string;
}

export interface CreatePropertyParams {
  propertyName: string;
  productId: string;
  contractId: string;
  groupId: string;
  customer?: string;
  ruleFormat?: string;
  cpCodeId?: string;
}

export interface CreatePropertyResponse {
  propertyLink: string;
  propertyId: string;
}

export interface CreateVersionParams {
  propertyId: string;
  createFromVersion?: number;
  createFromEtag?: string;
  customer?: string;
}

export interface CreateVersionResponse {
  versionLink: string;
  propertyVersion: number;
}

export interface ActivatePropertyParams {
  propertyId: string;
  version: number;
  network: 'staging' | 'production';
  note?: string;
  emails?: string[];
  acknowledgeWarnings?: boolean;
  customer?: string;
}

export interface ActivatePropertyResponse {
  activationLink: string;
  activationId: string;
}

/**
 * Zod schemas for validation
 */
export const PropertyIdSchema = z.string().regex(/^prp_\d+$/).or(z.string().regex(/^\d+$/));
export const ContractIdSchema = z.string().regex(/^ctr_[A-Z0-9-]+$/i);
export const GroupIdSchema = z.string().regex(/^grp_\d+$/).or(z.string().regex(/^\d+$/));
export const ProductIdSchema = z.string().regex(/^prd_[A-Z0-9_-]+$/i);
export const NetworkSchema = z.enum(['staging', 'production', 'STAGING', 'PRODUCTION']);

export const ListPropertiesParamsSchema = z.object({
  contractId: ContractIdSchema.optional(),
  groupId: GroupIdSchema.optional(),
  customer: z.string().optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

export const CreatePropertyParamsSchema = z.object({
  propertyName: z.string().min(1).max(85),
  productId: ProductIdSchema,
  contractId: ContractIdSchema,
  groupId: GroupIdSchema,
  customer: z.string().optional(),
  ruleFormat: z.string().optional(),
  cpCodeId: z.string().optional(),
});

export const ActivatePropertyParamsSchema = z.object({
  propertyId: PropertyIdSchema,
  version: z.number().positive(),
  network: NetworkSchema,
  note: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
  acknowledgeWarnings: z.boolean().optional(),
  customer: z.string().optional(),
});

/**
 * Type guards
 */
export function isProperty(obj: unknown): obj is Property {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'propertyId' in obj &&
    'propertyName' in obj &&
    'contractId' in obj &&
    'groupId' in obj
  );
}

export function isPropertyVersion(obj: unknown): obj is PropertyVersion {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'propertyId' in obj &&
    'propertyVersion' in obj &&
    'etag' in obj
  );
}

export function isPropertyActivation(obj: unknown): obj is PropertyActivation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'activationId' in obj &&
    'propertyId' in obj &&
    'status' in obj
  );
}

/**
 * Constants
 */
export const PROPERTY_LIMITS = {
  MAX_NAME_LENGTH: 85,
  MAX_VERSIONS: 500,
  MAX_HOSTNAMES_PER_PROPERTY: 500,
  MAX_RULES_DEPTH: 5,
} as const;

export const ACTIVATION_TIMEOUTS = {
  STAGING: 900000, // 15 minutes
  PRODUCTION: 3600000, // 60 minutes
} as const;