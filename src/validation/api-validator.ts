/**
 * API Response Validation Layer
 * 
 * This module provides runtime validation for Akamai API responses
 * to ensure our TypeScript types match reality, not just documentation.
 * 
 * Strategy: Start with permissive schemas, tighten based on real data
 */

import { z } from 'zod';

// Base schemas that align with Akamai's common response patterns
const BaseAkamaiResponse = z.object({
  // Common Akamai response wrapper
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  etag: z.string().optional(),
});

// Property Manager API Schemas (PAPI)
// Start permissive, add strictness as we learn from real responses
export const PropertyListResponseSchema = z.object({
  properties: z.object({
    items: z.array(z.object({
      propertyId: z.string(),
      propertyName: z.string(),
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      productId: z.string().optional(), // Often missing in docs but present in reality
      propertyVersion: z.number().optional(),
      stagingVersion: z.number().optional(),
      productionVersion: z.number().optional(),
      note: z.string().optional(),
      // Allow additional fields we haven't discovered yet
    }).passthrough()) // passthrough allows extra properties
  }).extend(BaseAkamaiResponse.shape)
});

export const PropertyDetailsSchema = z.object({
  property: z.object({
    propertyId: z.string(),
    propertyName: z.string(),
    contractId: z.string(),
    groupId: z.string(),
    productId: z.string(),
    ruleFormat: z.string().optional(),
    // Real responses often have more fields than documented
  }).passthrough()
}).extend(BaseAkamaiResponse.shape);

export const PropertyVersionsSchema = z.object({
  versions: z.object({
    items: z.array(z.object({
      propertyVersion: z.number(),
      updatedByUser: z.string().optional(),
      updatedDate: z.string().optional(),
      productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED']).optional(),
      stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'ABORTED']).optional(),
      etag: z.string().optional(),
      note: z.string().optional(),
    }).passthrough())
  }).extend(BaseAkamaiResponse.shape)
});

// Edge DNS API Schemas
export const DNSZoneListSchema = z.object({
  zones: z.array(z.object({
    zone: z.string(),
    type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']).optional(),
    masters: z.array(z.string()).optional(),
    comment: z.string().optional(),
    signAndServe: z.boolean().optional(),
    // DNS responses vary significantly in practice
  }).passthrough())
});

export const DNSRecordSetSchema = z.object({
  recordsets: z.array(z.object({
    name: z.string(),
    type: z.string(), // A, AAAA, CNAME, MX, etc.
    ttl: z.number(),
    rdata: z.array(z.string()),
  }).passthrough())
});

// Reporting API Schemas - These are especially inconsistent in docs
export const ReportingDataSchema = z.object({
  // Akamai reporting responses have highly dynamic structure
  data: z.array(z.object({
    // Common fields that usually exist
    datetime: z.string().optional(),
    
    // Dynamic fields that vary by report type
    // These cause the TS4111 errors we're seeing
    cpCodes: z.unknown().optional(),
    hostnames: z.unknown().optional(), 
    countries: z.unknown().optional(),
    regions: z.unknown().optional(),
    httpStatus: z.unknown().optional(),
    cacheStatus: z.unknown().optional(),
    bandwidth: z.unknown().optional(),
    
    // Allow any additional dynamic fields
  }).passthrough()),
  
  // Metadata that's usually present
  metadata: z.object({
    name: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
  }).passthrough().optional()
});

// Network Lists API
export const NetworkListsSchema = z.object({
  networkLists: z.array(z.object({
    uniqueId: z.string(),
    name: z.string(),
    type: z.enum(['IP', 'GEO', 'ASN']).optional(),
    elementCount: z.number().optional(),
    readOnly: z.boolean().optional(),
    shared: z.boolean().optional(),
  }).passthrough())
});

// Certificate Provisioning System (CPS) - Expanded schemas
export const CPSCertificatesSchema = z.object({
  certificates: z.array(z.object({
    certificateId: z.number(),
    certificateType: z.string().optional(),
    commonName: z.string().optional(),
    status: z.string().optional(),
    sans: z.array(z.string()).optional(),
    validationType: z.enum(['DV', 'OV', 'EV']).optional(),
  }).passthrough())
});

export const CPSEnrollmentSchema = z.object({
  enrollment: z.object({
    id: z.number(),
    status: z.string(),
    certificateType: z.string().optional(),
    validationType: z.string().optional(),
    csr: z.object({
      cn: z.string(),
      sans: z.array(z.string()).optional(),
      c: z.string().optional(),
      st: z.string().optional(),
      l: z.string().optional(),
      o: z.string().optional(),
      ou: z.string().optional(),
    }).passthrough().optional(),
    networkConfiguration: z.object({
      geography: z.enum(['core', 'china', 'russia']).optional(),
      secureNetwork: z.enum(['standard-tls', 'enhanced-tls']).optional(),
      sniOnly: z.boolean().optional(),
      quicEnabled: z.boolean().optional(),
    }).passthrough().optional(),
  }).passthrough()
});

export const CPSDeploymentSchema = z.object({
  production: z.array(z.object({
    primaryCertificate: z.object({
      certificate: z.string().optional(),
      trustChain: z.string().optional(),
      certificateId: z.number().optional(),
    }).passthrough().optional(),
    multiStackedCertificates: z.array(z.unknown()).optional(),
  }).passthrough()).optional(),
  staging: z.array(z.object({
    primaryCertificate: z.object({
      certificate: z.string().optional(),
      trustChain: z.string().optional(),
      certificateId: z.number().optional(),
    }).passthrough().optional(),
    multiStackedCertificates: z.array(z.unknown()).optional(),
  }).passthrough()).optional(),
});

// Fast Purge API (CCU v3) - Comprehensive schemas
export const PurgeResponseSchema = z.object({
  httpStatus: z.number(),
  detail: z.string().optional(),
  purgeId: z.string().optional(),
  estimatedSeconds: z.number().optional(),
  progressUri: z.string().optional(),
  submissionTime: z.string().optional(),
  supportId: z.string().optional(),
}).passthrough();

export const PurgeStatusSchema = z.object({
  purgeId: z.string(),
  submissionTime: z.string().optional(),
  purgeStatus: z.enum(['In-Progress', 'Done', 'Unknown']).optional(),
  completionTime: z.string().optional(),
  submittedBy: z.string().optional(),
  progressUri: z.string().optional(),
  originalEstimatedSeconds: z.number().optional(),
  actualSeconds: z.number().optional(),
}).passthrough();

export const PurgeRequestSchema = z.object({
  objects: z.array(z.string()).min(1).max(50), // Akamai limit
  type: z.enum(['url', 'cpcode', 'tag']).optional(),
  action: z.enum(['remove', 'invalidate']).optional(),
}).passthrough();

// CP Codes API (CPRG v1)
export const CPCodeListSchema = z.object({
  cpcodes: z.array(z.object({
    cpcodeId: z.number(),
    cpcodeName: z.string(),
    contractId: z.string().optional(),
    groupId: z.string().optional(),
    productId: z.string().optional(),
    createdDate: z.string().optional(),
    type: z.enum(['regular', 'adaptive', 'streaming']).optional(),
  }).passthrough())
}).passthrough();

export const CPCodeCreateSchema = z.object({
  cpcode: z.object({
    cpcodeId: z.number(),
    cpcodeName: z.string(),
    contractId: z.string(),
    groupId: z.string(),
    productId: z.string(),
    type: z.string().optional(),
  }).passthrough()
}).passthrough();

// Application Security (AppSec v1) - Complex schemas
export const AppSecConfigurationsSchema = z.object({
  configurations: z.array(z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    contractId: z.string().optional(),
    groupId: z.string().optional(),
    hostnames: z.array(z.string()).optional(),
    latestVersion: z.number().optional(),
    productionVersion: z.number().optional(),
    stagingVersion: z.number().optional(),
    createDate: z.string().optional(),
    createdBy: z.string().optional(),
  }).passthrough())
}).passthrough();

export const AppSecPolicySchema = z.object({
  policies: z.array(z.object({
    policyId: z.string(),
    policyName: z.string(),
    mode: z.enum(['ASE_AUTO', 'ASE_MANUAL', 'KSD']).optional(),
    createDate: z.string().optional(),
    createdBy: z.string().optional(),
    lastModified: z.string().optional(),
    modifiedBy: z.string().optional(),
  }).passthrough())
}).passthrough();

export const AppSecRulesSchema = z.object({
  rules: z.array(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    action: z.enum(['alert', 'deny', 'none']).optional(),
    enabled: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    conditions: z.array(z.object({
      type: z.string(),
      positiveMatch: z.boolean().optional(),
      value: z.array(z.string()).optional(),
      valueWildcard: z.boolean().optional(),
      header: z.string().optional(),
    }).passthrough()).optional(),
  }).passthrough())
}).passthrough();

export const AppSecMatchTargetsSchema = z.object({
  matchTargets: z.array(z.object({
    targetId: z.number(),
    type: z.enum(['website', 'api']).optional(),
    hostnames: z.array(z.string()).optional(),
    filePaths: z.array(z.string()).optional(),
    bypassNetworkLists: z.array(z.object({
      id: z.string(),
      name: z.string().optional(),
    })).optional(),
    securityPolicy: z.object({
      policyId: z.string(),
    }).optional(),
  }).passthrough())
}).passthrough();

// Edge DNS API - Enhanced schemas
export const DNSZoneDetailsSchema = z.object({
  zone: z.string(),
  type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']).optional(),
  masters: z.array(z.string()).optional(),
  comment: z.string().optional(),
  signAndServe: z.boolean().optional(),
  signAndServeAlgorithm: z.string().optional(),
  tsigKey: z.object({
    name: z.string(),
    algorithm: z.string(),
    secret: z.string(),
  }).optional(),
  target: z.string().optional(), // For ALIAS zones
  endCustomerId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  lastActivationDate: z.string().optional(),
  lastModifiedDate: z.string().optional(),
  lastModifiedBy: z.string().optional(),
  versionId: z.string().optional(),
}).passthrough();

export const DNSRecordDetailsSchema = z.object({
  name: z.string(),
  type: z.string(), // A, AAAA, CNAME, MX, TXT, SRV, etc.
  ttl: z.number(),
  rdata: z.array(z.string()),
  active: z.boolean().optional(),
  lastModifiedDate: z.string().optional(),
  lastModifiedBy: z.string().optional(),
}).passthrough();

export const DNSChangeListSchema = z.object({
  changeListId: z.string(),
  zone: z.string(),
  status: z.enum(['PENDING', 'SUBMITTED', 'ACTIVE', 'ERROR']).optional(),
  submittedBy: z.string().optional(),
  submittedDate: z.string().optional(),
  notes: z.string().optional(),
  recordsets: z.array(DNSRecordDetailsSchema).optional(),
}).passthrough();

// Error Response Schema - Akamai's error format is actually quite consistent
export const AkamaiErrorSchema = z.object({
  type: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  status: z.number().optional(),
  instance: z.string().optional(),
  problemId: z.string().optional(),
  errors: z.array(z.object({
    type: z.string(),
    title: z.string(),
    detail: z.string(),
    messageId: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();

// Validation helper functions
export function validateApiResponse<T>(
  schema: z.ZodSchema<T>, 
  data: unknown, 
  endpoint: string
): { success: boolean; data?: T; errors?: string[]; extraFields?: string[] } {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { 
        success: true, 
        data: result.data,
        // Log any extra fields we discovered for future type improvements
        extraFields: extractExtraFields(data, schema)
      };
    } else {
      console.warn(`[API Validator] ${endpoint} response validation failed:`, result.error.errors);
      return { 
        success: false, 
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
  } catch (error) {
    console.error(`[API Validator] ${endpoint} validation error:`, error);
    return { 
      success: false, 
      errors: [`Validation exception: ${error}`]
    };
  }
}

// Helper to identify fields in real responses that aren't in our schemas
function extractExtraFields(_data: unknown, _schema: z.ZodSchema): string[] {
  // This is a simplified implementation - in practice you'd want
  // more sophisticated field discovery
  const extraFields: string[] = [];
  
  if (typeof _data === 'object' && _data !== null) {
    // Implementation would analyze the object structure
    // and identify fields not covered by the schema
  }
  
  return extraFields;
}

// Response capture for building better types
export interface ResponseCapture {
  endpoint: string;
  timestamp: string;
  statusCode: number;
  response: unknown;
  validated: boolean;
  errors?: string[];
  extraFields?: string[];
}

export function captureApiResponse(
  endpoint: string,
  response: unknown,
  statusCode: number = 200
): ResponseCapture {
  const timestamp = new Date().toISOString();
  
  // Try to validate against appropriate schema
  let validated = false;
  let errors: string[] = [];
  let extraFields: string[] = [];
  
  // Route to appropriate schema based on endpoint
  if (endpoint.includes('/properties')) {
    if (endpoint.includes('/versions')) {
      const validation = validateApiResponse(PropertyVersionsSchema, response, endpoint);
      validated = validation.success;
      errors = validation.errors || [];
      extraFields = validation.extraFields || [];
    } else if (endpoint.endsWith('/properties')) {
      const validation = validateApiResponse(PropertyListResponseSchema, response, endpoint);
      validated = validation.success;
      errors = validation.errors || [];
      extraFields = validation.extraFields || [];
    }
  } else if (endpoint.includes('/zones')) {
    const validation = validateApiResponse(DNSZoneListSchema, response, endpoint);
    validated = validation.success;
    errors = validation.errors || [];
    extraFields = validation.extraFields || [];
  }
  // Add more endpoint routing as needed
  
  const capture: ResponseCapture = {
    endpoint,
    timestamp,
    statusCode,
    response,
    validated
  };
  
  if (errors.length > 0) capture.errors = errors;
  if (extraFields.length > 0) capture.extraFields = extraFields;
  
  return capture;
}

// Export all schemas for use in components
export const ApiSchemas = {
  // Property Manager API
  PropertyList: PropertyListResponseSchema,
  PropertyDetails: PropertyDetailsSchema,
  PropertyVersions: PropertyVersionsSchema,
  
  // Edge DNS API
  DNSZoneList: DNSZoneListSchema,
  DNSZoneDetails: DNSZoneDetailsSchema,
  DNSRecordSet: DNSRecordSetSchema,
  DNSRecordDetails: DNSRecordDetailsSchema,
  DNSChangeList: DNSChangeListSchema,
  
  // Reporting API
  ReportingData: ReportingDataSchema,
  
  // Network Lists API
  NetworkLists: NetworkListsSchema,
  
  // Certificate Provisioning System (CPS)
  CPSCertificates: CPSCertificatesSchema,
  CPSEnrollment: CPSEnrollmentSchema,
  CPSDeployment: CPSDeploymentSchema,
  
  // Fast Purge API
  PurgeResponse: PurgeResponseSchema,
  PurgeStatus: PurgeStatusSchema,
  PurgeRequest: PurgeRequestSchema,
  
  // CP Codes API
  CPCodeList: CPCodeListSchema,
  CPCodeCreate: CPCodeCreateSchema,
  
  // Application Security API
  AppSecConfigurations: AppSecConfigurationsSchema,
  AppSecPolicy: AppSecPolicySchema,
  AppSecRules: AppSecRulesSchema,
  AppSecMatchTargets: AppSecMatchTargetsSchema,
  
  // Error responses
  AkamaiError: AkamaiErrorSchema,
} as const;

export type ApiSchemaTypes = {
  // Property Manager API
  PropertyList: z.infer<typeof PropertyListResponseSchema>;
  PropertyDetails: z.infer<typeof PropertyDetailsSchema>;
  PropertyVersions: z.infer<typeof PropertyVersionsSchema>;
  
  // Edge DNS API
  DNSZoneList: z.infer<typeof DNSZoneListSchema>;
  DNSZoneDetails: z.infer<typeof DNSZoneDetailsSchema>;
  DNSRecordSet: z.infer<typeof DNSRecordSetSchema>;
  DNSRecordDetails: z.infer<typeof DNSRecordDetailsSchema>;
  DNSChangeList: z.infer<typeof DNSChangeListSchema>;
  
  // Reporting API
  ReportingData: z.infer<typeof ReportingDataSchema>;
  
  // Network Lists API
  NetworkLists: z.infer<typeof NetworkListsSchema>;
  
  // Certificate Provisioning System (CPS)
  CPSCertificates: z.infer<typeof CPSCertificatesSchema>;
  CPSEnrollment: z.infer<typeof CPSEnrollmentSchema>;
  CPSDeployment: z.infer<typeof CPSDeploymentSchema>;
  
  // Fast Purge API
  PurgeResponse: z.infer<typeof PurgeResponseSchema>;
  PurgeStatus: z.infer<typeof PurgeStatusSchema>;
  PurgeRequest: z.infer<typeof PurgeRequestSchema>;
  
  // CP Codes API
  CPCodeList: z.infer<typeof CPCodeListSchema>;
  CPCodeCreate: z.infer<typeof CPCodeCreateSchema>;
  
  // Application Security API
  AppSecConfigurations: z.infer<typeof AppSecConfigurationsSchema>;
  AppSecPolicy: z.infer<typeof AppSecPolicySchema>;
  AppSecRules: z.infer<typeof AppSecRulesSchema>;
  AppSecMatchTargets: z.infer<typeof AppSecMatchTargetsSchema>;
  
  // Error responses
  AkamaiError: z.infer<typeof AkamaiErrorSchema>;
};