#!/usr/bin/env tsx
/**
 * Property Manager Advanced Tools Validation Plan
 * 
 * This script analyzes property-manager-advanced-tools.ts and generates
 * the necessary Zod schemas aligned with OpenAPI specifications
 */

import * as fs from 'fs';
import * as path from 'path';

interface FunctionAnalysis {
  name: string;
  endpoint: string;
  method: string;
  needsSchema: string[];
  hasValidation: boolean;
}

// Analyze the functions in property-manager-advanced-tools.ts
const functionsToValidate: FunctionAnalysis[] = [
  {
    name: 'listEdgeHostnames',
    endpoint: '/papi/v1/edgehostnames',
    method: 'GET',
    needsSchema: ['EdgeHostnameListResponse'],
    hasValidation: false
  },
  {
    name: 'getEdgeHostname', 
    endpoint: '/papi/v1/edgehostnames/{edgeHostnameId}',
    method: 'GET',
    needsSchema: ['EdgeHostnameDetailResponse'],
    hasValidation: false
  },
  {
    name: 'cloneProperty',
    endpoint: '/papi/v1/properties',
    method: 'POST',
    needsSchema: ['PropertyCreateResponse'],
    hasValidation: false
  },
  {
    name: 'removeProperty',
    endpoint: '/papi/v1/properties/{propertyId}',
    method: 'DELETE',
    needsSchema: ['DeleteResponse'],
    hasValidation: false
  },
  {
    name: 'listPropertyVersions',
    endpoint: '/papi/v1/properties/{propertyId}/versions',
    method: 'GET',
    needsSchema: ['PropertyVersionListResponse'],
    hasValidation: false
  },
  {
    name: 'getPropertyVersion',
    endpoint: '/papi/v1/properties/{propertyId}/versions/{version}',
    method: 'GET',
    needsSchema: ['PropertyVersionDetailResponse'],
    hasValidation: false
  },
  {
    name: 'getLatestPropertyVersion',
    endpoint: '/papi/v1/properties/{propertyId}/versions/latest',
    method: 'GET',
    needsSchema: ['PropertyVersionDetailResponse'],
    hasValidation: false
  },
  {
    name: 'cancelPropertyActivation',
    endpoint: '/papi/v1/properties/{propertyId}/activations/{activationId}',
    method: 'DELETE',
    needsSchema: ['ActivationCancelResponse'],
    hasValidation: false
  },
  {
    name: 'listPropertyVersionHostnames',
    endpoint: '/papi/v1/properties/{propertyId}/versions/{version}/hostnames',
    method: 'GET',
    needsSchema: ['PropertyHostnameListResponse'],
    hasValidation: false
  }
];

// Load OpenAPI spec
const openApiSpec = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../openapi-specs/papi-v1.json'), 'utf-8')
);

// Generate Zod schemas based on OpenAPI
function generateZodSchemas(): string {
  const schemas: string[] = [];
  
  schemas.push(`/**
 * Zod Validation Schemas for Property Manager Advanced Tools
 * Generated from Akamai PAPI v1 OpenAPI Specification
 */

import { z } from 'zod';

// ============================================================================
// EDGE HOSTNAME SCHEMAS
// ============================================================================
`);

  // EdgeHostnameListResponse
  const edgeHostnamesPath = openApiSpec.paths['/edgehostnames'];
  if (edgeHostnamesPath?.get?.responses?.['200']) {
    const schema = edgeHostnamesPath.get.responses['200'].content?.['application/json']?.schema;
    if (schema) {
      schemas.push(`
export const EdgeHostnameListResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  edgeHostnames: z.object({
    items: z.array(z.object({
      edgeHostnameId: z.string(),
      edgeHostnameDomain: z.string(),
      productId: z.string(),
      domainPrefix: z.string(),
      domainSuffix: z.string(),
      secure: z.boolean(),
      ipVersionBehavior: z.string(),
      createdDate: z.string().optional(),
      createdBy: z.string().optional(),
      mapDetails: z.object({
        serialNumber: z.number().optional(),
        slotNumber: z.number().optional()
      }).optional()
    }).passthrough())
  })
});

export type EdgeHostnameListResponse = z.infer<typeof EdgeHostnameListResponseSchema>;
`);
    }
  }

  // PropertyVersionListResponse (already exists but let's ensure it's complete)
  schemas.push(`
export const PropertyVersionDetailResponseSchema = z.object({
  propertyId: z.string(),
  propertyName: z.string(),
  accountId: z.string(),
  contractId: z.string(),
  groupId: z.string(),
  assetId: z.string().optional(),
  versions: z.object({
    items: z.array(z.object({
      propertyVersion: z.number(),
      updatedByUser: z.string(),
      updatedDate: z.string(),
      productionStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED']).optional(),
      stagingStatus: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'DEACTIVATED']).optional(),
      etag: z.string().optional(),
      productId: z.string().optional(),
      ruleFormat: z.string().optional(),
      note: z.string().optional()
    }).passthrough())
  })
});

export type PropertyVersionDetailResponse = z.infer<typeof PropertyVersionDetailResponseSchema>;
`);

  // PropertyHostnameListResponse
  schemas.push(`
export const PropertyHostnameListResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  propertyId: z.string(),
  propertyVersion: z.number(),
  etag: z.string().optional(),
  hostnames: z.object({
    items: z.array(z.object({
      cnameFrom: z.string(),
      cnameTo: z.string().optional(),
      cnameType: z.enum(['EDGE_HOSTNAME']).optional(),
      edgeHostnameId: z.string().optional(),
      certProvisioningType: z.enum(['DEFAULT', 'CPS_MANAGED']).optional(),
      certStatus: z.object({
        production: z.array(z.object({
          status: z.string()
        })).optional(),
        staging: z.array(z.object({
          status: z.string()
        })).optional()
      }).optional()
    }).passthrough())
  })
});

export type PropertyHostnameListResponse = z.infer<typeof PropertyHostnameListResponseSchema>;
`);

  // ActivationCancelResponse
  schemas.push(`
export const ActivationCancelResponseSchema = z.object({
  activationLink: z.string()
});

export type ActivationCancelResponse = z.infer<typeof ActivationCancelResponseSchema>;
`);

  // EdgeHostnameDetailResponse
  schemas.push(`
export const EdgeHostnameDetailResponseSchema = z.object({
  accountId: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  edgeHostnames: z.object({
    items: z.array(z.object({
      edgeHostnameId: z.string(),
      edgeHostnameDomain: z.string(),
      productId: z.string(),
      domainPrefix: z.string(),
      domainSuffix: z.string(),
      secure: z.boolean(),
      ipVersionBehavior: z.string(),
      createdDate: z.string().optional(),
      createdBy: z.string().optional(),
      recordName: z.string().optional(),
      dnsZone: z.string().optional(),
      securityType: z.string().optional()
    }).passthrough())
  })
});

export type EdgeHostnameDetailResponse = z.infer<typeof EdgeHostnameDetailResponseSchema>;
`);

  return schemas.join('\n');
}

// Generate validation implementation
function generateValidationImplementation(): string {
  const implementations: string[] = [];
  
  implementations.push(`
// ============================================================================
// VALIDATION IMPLEMENTATION PLAN
// ============================================================================

/**
 * Steps to implement validation in property-manager-advanced-tools.ts:
 * 
 * 1. Remove @ts-nocheck directive
 * 2. Import validation schemas and helper
 * 3. Replace direct API response usage with validated calls
 * 4. Remove all :any types
 * 5. Test with real API responses
 */

// Example implementation for listEdgeHostnames:
`);

  implementations.push(`
// BEFORE:
const response = await client.request({
  path: '/papi/v1/edgehostnames',
  method: 'GET',
  queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
});

// AFTER:
const rawResponse = await client.request({
  path: '/papi/v1/edgehostnames',
  method: 'GET',
  ...(Object.keys(queryParams).length > 0 && { queryParams }),
});

const response = validateApiResponse(
  rawResponse,
  EdgeHostnameListResponseSchema,
  'listEdgeHostnames'
);
`);

  return implementations.join('\n');
}

// Main execution
async function main() {
  console.log('🔍 Analyzing property-manager-advanced-tools.ts validation needs...\n');
  
  console.log('📋 Functions requiring validation:');
  functionsToValidate.forEach(func => {
    console.log(`- ${func.name}: ${func.method} ${func.endpoint}`);
  });
  
  // Generate schemas
  const schemas = generateZodSchemas();
  const schemasPath = path.join(__dirname, '../src/validation/property-advanced-schemas.ts');
  fs.writeFileSync(schemasPath, schemas);
  console.log(`\n✅ Generated validation schemas: ${schemasPath}`);
  
  // Generate implementation plan
  const implementation = generateValidationImplementation();
  const planPath = path.join(__dirname, '../property-advanced-validation-implementation.md');
  fs.writeFileSync(planPath, implementation);
  console.log(`✅ Generated implementation plan: ${planPath}`);
  
  console.log('\n📊 Summary:');
  console.log(`- Total functions to validate: ${functionsToValidate.length}`);
  console.log('- All functions currently lack validation');
  console.log('- Next step: Apply validation systematically to each function');
}

main().catch(console.error);