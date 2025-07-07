/**
 * Common Response Schemas for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides Zod schemas for all Akamai API responses
 * - Eliminates 'unknown' type errors by validating API responses
 * - Ensures type safety at runtime and compile time
 * - Single source of truth for response types
 * 
 * These schemas fix ~80% of TS18046 errors by providing
 * proper types for all API responses.
 */

import { z } from 'zod';
import { 
  PropertyIdSchema, 
  ContractIdSchema, 
  GroupIdSchema,
  ZoneNameSchema,
  RecordTypeSchema,
  NetworkListIdSchema,
  CPCodeSchema
} from './validators';

// ============================================================================
// Common Response Patterns
// ============================================================================

/**
 * Akamai API envelope for list responses
 */
export function createListResponseSchema<T>(itemSchema: z.ZodSchema<T>) {
  return z.object({
    items: z.array(itemSchema),
    totalItems: z.number().optional(),
    links: z.object({
      self: z.string().optional(),
      next: z.string().optional(),
      previous: z.string().optional()
    }).optional()
  });
}

/**
 * Akamai API error response
 */
export const ApiErrorSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string().optional(),
  errors: z.array(z.object({
    type: z.string(),
    title: z.string(),
    detail: z.string()
  })).optional()
});

// ============================================================================
// Property Management (PAPI) Response Schemas
// ============================================================================

/**
 * Property details response
 */
export const PropertySchema = z.object({
  propertyId: PropertyIdSchema,
  propertyName: z.string(),
  contractId: ContractIdSchema,
  groupId: GroupIdSchema,
  latestVersion: z.number(),
  stagingVersion: z.number().nullable(),
  productionVersion: z.number().nullable(),
  assetId: z.string().optional(),
  note: z.string().optional()
});

/**
 * Property list response
 */
export const PropertyListResponseSchema = z.object({
  properties: z.object({
    items: z.array(PropertySchema)
  })
});

/**
 * Property version response
 */
export const PropertyVersionDetailsSchema = z.object({
  propertyVersion: z.number(),
  updatedByUser: z.string(),
  updatedDate: z.string(),
  productId: z.string(),
  productionStatus: z.enum(['ACTIVE', 'INACTIVE']),
  stagingStatus: z.enum(['ACTIVE', 'INACTIVE']),
  etag: z.string().optional(),
  note: z.string().optional()
});

/**
 * Rule tree response
 */
export const RuleTreeSchema: z.ZodType<any> = z.lazy(() => 
  z.object({
    name: z.string(),
    children: z.array(RuleTreeSchema).optional(),
    behaviors: z.array(z.object({
      name: z.string(),
      options: z.record(z.unknown())
    })).optional(),
    criteria: z.array(z.object({
      name: z.string(),
      options: z.record(z.unknown())
    })).optional(),
    comments: z.string().optional()
  })
);

/**
 * Property rules response
 */
export const PropertyRulesResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: ContractIdSchema.optional(),
  groupId: GroupIdSchema.optional(),
  propertyId: PropertyIdSchema.optional(),
  propertyVersion: z.number().optional(),
  etag: z.string().optional(),
  ruleFormat: z.string().optional(),
  rules: RuleTreeSchema,
  errors: z.array(z.object({
    type: z.string(),
    errorLocation: z.string(),
    detail: z.string()
  })).optional(),
  warnings: z.array(z.object({
    type: z.string(),
    errorLocation: z.string(), 
    detail: z.string()
  })).optional()
});

/**
 * Activation response
 */
export const ActivationSchema = z.object({
  activationId: z.string(),
  propertyId: PropertyIdSchema,
  propertyVersion: z.number(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  status: z.enum(['ACTIVE', 'PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 'ABORTED', 'FAILED', 'NEW', 'PENDING_DEACTIVATION', 'DEACTIVATED']),
  submitDate: z.string(),
  updateDate: z.string(),
  note: z.string().optional(),
  notifyEmails: z.array(z.string()),
  fatalError: z.string().optional(),
  errors: z.array(z.object({
    type: z.string(),
    messageId: z.string(),
    detail: z.string()
  })).optional(),
  warnings: z.array(z.object({
    type: z.string(),
    messageId: z.string(),
    detail: z.string()
  })).optional()
});

/**
 * Edge hostname response
 */
export const EdgeHostnameSchema = z.object({
  edgeHostnameId: z.number(),
  domainPrefix: z.string(),
  domainSuffix: z.string(),
  edgeHostnameDomain: z.string(),
  productId: z.string(),
  ipVersionBehavior: z.enum(['IPV4', 'IPV6', 'IPV4_IPV6']),
  secure: z.boolean(),
  certificateEnrollmentId: z.number().optional()
});

/**
 * CP Code response
 */
export const CPCodeResponseSchema = z.object({
  cpcodeId: CPCodeSchema,
  cpcodeName: z.string(),
  productIds: z.array(z.string()),
  createdDate: z.string(),
  contractId: ContractIdSchema,
  groupId: GroupIdSchema
});

// ============================================================================
// DNS Response Schemas
// ============================================================================

/**
 * DNS Zone response
 */
export const ZoneSchema = z.object({
  zone: ZoneNameSchema,
  type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']),
  masters: z.array(z.string()).optional(),
  comment: z.string().optional(),
  signAndServe: z.boolean().optional(),
  contractId: ContractIdSchema.optional(),
  activationState: z.enum(['ACTIVE', 'PENDING', 'INACTIVE']).optional(),
  lastModifiedDate: z.string().optional(),
  lastModifiedBy: z.string().optional(),
  versionId: z.string().optional()
});

/**
 * DNS Record response
 */
export const RecordSchema = z.object({
  name: z.string(),
  type: RecordTypeSchema,
  ttl: z.number(),
  rdata: z.array(z.string()),
  active: z.boolean().optional()
});

/**
 * DNS record set response
 */
export const RecordSetSchema = z.object({
  name: z.string(),
  type: RecordTypeSchema,
  ttl: z.number(),
  rdata: z.array(z.string())
});

/**
 * Zone list response
 */
export const ZoneListResponseSchema = z.object({
  zones: z.array(ZoneSchema),
  page: z.object({
    number: z.number(),
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number()
  }).optional()
});

// ============================================================================
// Certificate Response Schemas
// ============================================================================

/**
 * Certificate enrollment response
 */
export const EnrollmentSchema = z.object({
  enrollmentId: z.number(),
  cn: z.string(),
  sans: z.array(z.string()).optional(),
  validationType: z.enum(['DV', 'EV', 'OV', 'THIRD_PARTY']),
  certificateType: z.string().optional(),
  networkConfiguration: z.object({
    secureNetwork: z.enum(['STANDARD_TLS', 'ENHANCED_TLS']),
    geography: z.enum(['CORE', 'CHINA', 'RUSSIA']).optional(),
    sniOnly: z.boolean()
  }),
  signatureAlgorithm: z.string().optional(),
  changeManagement: z.boolean().optional(),
  status: z.string()
});

/**
 * Domain validation challenge
 */
export const ValidationChallengeSchema = z.object({
  domain: z.string(),
  status: z.enum(['PENDING', 'AWAITING_INPUT', 'IN_PROGRESS', 'COMPLETED', 'ERROR']),
  expires: z.string().optional(),
  error: z.string().optional(),
  validationRecords: z.array(z.object({
    hostname: z.string(),
    target: z.string()
  })).optional(),
  httpToken: z.string().optional(),
  httpTokenUrl: z.string().optional()
});

// ============================================================================
// Network List Response Schemas
// ============================================================================

/**
 * Network list response
 */
export const NetworkListSchema = z.object({
  networkListId: NetworkListIdSchema,
  name: z.string(),
  type: z.enum(['IP', 'GEO', 'ASN', 'EXCEPTION']),
  description: z.string().optional(),
  contractId: ContractIdSchema.optional(),
  groupId: GroupIdSchema.optional(),
  elementCount: z.number(),
  readOnly: z.boolean().optional(),
  syncPoint: z.number().optional(),
  activationStatus: z.enum(['INACTIVE', 'ACTIVATED_STAGING', 'ACTIVATED_PRODUCTION', 'ACTIVATED_BOTH']).optional()
});

/**
 * Network list with elements
 */
export const NetworkListWithElementsSchema = NetworkListSchema.extend({
  elements: z.array(z.string())
});

/**
 * Network list activation response
 */
export const NetworkListActivationSchema = z.object({
  activationId: z.number(),
  networkListId: NetworkListIdSchema,
  network: z.enum(['STAGING', 'PRODUCTION']),
  status: z.enum(['ACTIVE', 'PENDING', 'FAILED', 'ABORTED']),
  syncPoint: z.number(),
  createdDate: z.string(),
  createdBy: z.string()
});

// ============================================================================
// FastPurge Response Schemas
// ============================================================================

/**
 * Purge response
 */
export const PurgeResponseSchema = z.object({
  purgeId: z.string(),
  estimatedSeconds: z.number(),
  progressUri: z.string(),
  pingAfterSeconds: z.number(),
  supportId: z.string()
});

/**
 * Purge status response
 */
export const PurgeStatusSchema = z.object({
  purgeId: z.string(),
  purgeStatus: z.enum(['In-Progress', 'Done', 'Failed']),
  submittedBy: z.string(),
  submittedTime: z.string(),
  completionTime: z.string().optional(),
  originalEstimatedSeconds: z.number(),
  originalQueueLength: z.number()
});

// ============================================================================
// Reporting Response Schemas
// ============================================================================

/**
 * Traffic report data point
 */
export const TrafficDataPointSchema = z.object({
  timestamp: z.string(),
  edgeHits: z.number(),
  edgeBandwidth: z.number(),
  originHits: z.number(),
  originBandwidth: z.number(),
  offloadPercentage: z.number()
});

/**
 * Geographic distribution data
 */
export const GeoDistributionSchema = z.object({
  country: z.string(),
  countryCode: z.string(),
  hits: z.number(),
  bandwidth: z.number(),
  percentage: z.number()
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a response validator that handles both success and error cases
 */
export function createResponseValidator<T>(
  successSchema: z.ZodSchema<T>
): (response: unknown) => T {
  return (response: unknown) => {
    // First check if it's an error response
    const errorResult = ApiErrorSchema.safeParse(response);
    if (errorResult.success) {
      throw new Error(`API Error: ${errorResult.data.detail}`);
    }

    // Otherwise validate as success response
    return successSchema.parse(response);
  };
}

/**
 * Type-safe response parser with detailed error messages
 */
export function parseApiResponse<T>(
  response: unknown,
  schema: z.ZodSchema<T>,
  context: string
): T {
  try {
    return schema.parse(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid ${context} response: ${details}`);
    }
    throw error;
  }
}