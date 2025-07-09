/**
 * Property Manager Type Guards
 * 
 * CODE KAI: Comprehensive runtime validation for property API responses
 * Key: Eliminate all 'unknown' type errors through systematic validation
 * Approach: Zod schemas with corresponding TypeScript type guards
 * Implementation: Reusable guards for all property-related API responses
 */

import { z } from 'zod';

// ============================================================================
// PROPERTY RESPONSE SCHEMAS AND GUARDS
// ============================================================================

/**
 * Property details response schema
 */
const PropertyDetailsResponseSchema = z.object({
  properties: z.object({
    items: z.array(z.object({
      propertyId: z.string(),
      propertyName: z.string(),
      contractId: z.string(),
      groupId: z.string(),
      assetId: z.string().optional(),
      productionVersion: z.number().nullable().optional(),
      stagingVersion: z.number().nullable().optional(),
      latestVersion: z.number()
    }))
  })
});

export type PropertyDetailsResponse = z.infer<typeof PropertyDetailsResponseSchema>;

export function isPropertyDetailsResponse(value: unknown): value is PropertyDetailsResponse {
  return PropertyDetailsResponseSchema.safeParse(value).success;
}

// ============================================================================
// VERSION RESPONSE SCHEMAS AND GUARDS
// ============================================================================

/**
 * Property version response schema
 */
const PropertyVersionResponseSchema = z.object({
  propertyId: z.string(),
  propertyName: z.string(),
  accountId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  versions: z.object({
    items: z.array(z.object({
      propertyVersion: z.number(),
      updatedByUser: z.string(),
      updatedDate: z.string(),
      productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
      stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
      etag: z.string(),
      note: z.string().optional()
    }))
  })
});

export type PropertyVersionResponse = z.infer<typeof PropertyVersionResponseSchema>;

export function isPropertyVersionResponse(value: unknown): value is PropertyVersionResponse {
  return PropertyVersionResponseSchema.safeParse(value).success;
}

// ============================================================================
// ACTIVATION RESPONSE SCHEMAS AND GUARDS
// ============================================================================

/**
 * Property activation response schema
 */
const PropertyActivationResponseSchema = z.object({
  activationLink: z.string(),
  activationId: z.string(),
  propertyId: z.string(),
  propertyName: z.string(),
  propertyVersion: z.number(),
  network: z.enum(['STAGING', 'PRODUCTION']),
  activationType: z.enum(['ACTIVATE', 'DEACTIVATE']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ZONE_1', 'ZONE_2', 'ZONE_3', 'ABORTED', 'FAILED'])
});

export type PropertyActivationResponse = z.infer<typeof PropertyActivationResponseSchema>;

export function isPropertyActivationResponse(value: unknown): value is PropertyActivationResponse {
  return PropertyActivationResponseSchema.safeParse(value).success;
}

// ============================================================================
// RULES RESPONSE SCHEMAS AND GUARDS
// ============================================================================

/**
 * Property rules response schema
 */
const PropertyRulesResponseSchema = z.object({
  accountId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  propertyId: z.string(),
  propertyVersion: z.number(),
  etag: z.string(),
  ruleFormat: z.string(),
  rules: z.object({
    name: z.string(),
    criteria: z.array(z.unknown()).optional(),
    behaviors: z.array(z.unknown()).optional(),
    children: z.array(z.unknown()).optional()
  }),
  errors: z.array(z.object({
    type: z.string(),
    title: z.string(),
    detail: z.string(),
    errorLocation: z.string().optional()
  })).optional(),
  warnings: z.array(z.object({
    type: z.string(),
    title: z.string(),
    detail: z.string(),
    errorLocation: z.string().optional()
  })).optional()
});

export type PropertyRulesResponse = z.infer<typeof PropertyRulesResponseSchema>;

export function isPropertyRulesResponse(value: unknown): value is PropertyRulesResponse {
  return PropertyRulesResponseSchema.safeParse(value).success;
}

// ============================================================================
// HOSTNAME RESPONSE SCHEMAS AND GUARDS
// ============================================================================

/**
 * Property hostnames response schema
 */
const PropertyHostnamesResponseSchema = z.object({
  accountId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  propertyId: z.string(),
  propertyVersion: z.number(),
  etag: z.string(),
  hostnames: z.object({
    items: z.array(z.object({
      cnameType: z.enum(['EDGE_HOSTNAME']),
      edgeHostnameId: z.string().optional(),
      cnameFrom: z.string(),
      cnameTo: z.string()
    }))
  })
});

export type PropertyHostnamesResponse = z.infer<typeof PropertyHostnamesResponseSchema>;

export function isPropertyHostnamesResponse(value: unknown): value is PropertyHostnamesResponse {
  return PropertyHostnamesResponseSchema.safeParse(value).success;
}

// ============================================================================
// GROUP RESPONSE SCHEMAS AND GUARDS
// ============================================================================

/**
 * Groups response schema
 */
const GroupsResponseSchema = z.object({
  accountId: z.string(),
  groups: z.object({
    items: z.array(z.object({
      groupId: z.string(),
      groupName: z.string(),
      parentGroupId: z.string().optional(),
      contractIds: z.array(z.string())
    }))
  })
});

export type GroupsResponse = z.infer<typeof GroupsResponseSchema>;

export function isGroupsResponse(value: unknown): value is GroupsResponse {
  return GroupsResponseSchema.safeParse(value).success;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generic response validator with detailed error reporting
 */
export async function validateResponse<T>(
  response: unknown,
  guard: (value: unknown) => value is T,
  context: string
): Promise<T> {
  if (!guard(response)) {
    console.error(`Invalid ${context} response:`, JSON.stringify(response, null, 2));
    throw new Error(`Invalid ${context} response structure`);
  }
  return response;
}

/**
 * Safe property access helper
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue?: T[K]
): T[K] | undefined {
  if (obj === null || obj === undefined) {
    return defaultValue;
  }
  return obj[key] ?? defaultValue;
}

/**
 * Batch validation helper
 */
export const ResponseValidators = {
  property: isPropertyDetailsResponse,
  version: isPropertyVersionResponse,
  activation: isPropertyActivationResponse,
  rules: isPropertyRulesResponse,
  hostnames: isPropertyHostnamesResponse,
  groups: isGroupsResponse,
  
  // Convenience method for validating any response
  validate: validateResponse
} as const;

/**
 * Type guard for checking if a value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Filter undefined values from objects
 */
export function filterUndefined<T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof T] = value as Exclude<T[keyof T], undefined>;
    }
    return acc;
  }, {} as { [K in keyof T]: Exclude<T[K], undefined> });
}