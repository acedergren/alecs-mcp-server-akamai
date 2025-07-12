/**
 * Utilities API Definitions
 * 
 * Endpoints, schemas, and formatters for utility operations
 * Covers FastPurge, CP Codes, Includes, Contracts, Products, and Traffic Reports
 * Updated: 2025-07-12 - Extracted from class-based implementation
 */

import { z } from 'zod';
import { CustomerSchema, ContractIdSchema, GroupIdSchema, PropertyIdSchema } from '../common';

/**
 * Utility Tool Schemas
 */
export const UtilityToolSchemas = {
  // FastPurge Schemas
  fastPurgeByURL: CustomerSchema.extend({
    urls: z.array(z.string().url()).min(1).max(50).describe('URLs to purge'),
    network: z.enum(['staging', 'production']).default('production')
  }),

  fastPurgeByCPCode: CustomerSchema.extend({
    cpcodes: z.array(z.string()).min(1).max(50).describe('CP codes to purge'),
    network: z.enum(['staging', 'production']).default('production')
  }),

  fastPurgeByTag: CustomerSchema.extend({
    tags: z.array(z.string()).min(1).max(50).describe('Cache tags to purge'),
    network: z.enum(['staging', 'production']).default('production')
  }),

  fastPurgeStatus: CustomerSchema.extend({
    purgeId: z.string().describe('Purge operation ID')
  }),

  // CP Code Schemas
  createCPCode: CustomerSchema.extend({
    cpcodeName: z.string().min(1).max(128).describe('CP code name'),
    contractId: ContractIdSchema,
    groupId: GroupIdSchema,
    productId: z.string().describe('Product ID')
  }),

  listCPCodes: CustomerSchema.extend({
    contractId: ContractIdSchema.optional(),
    groupId: GroupIdSchema.optional()
  }),

  // Include Schemas
  createInclude: CustomerSchema.extend({
    includeName: z.string().min(1).max(128).describe('Include name'),
    includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']),
    contractId: ContractIdSchema,
    groupId: GroupIdSchema,
    productId: z.string().optional()
  }),

  listIncludes: CustomerSchema.extend({
    contractId: ContractIdSchema.optional(),
    groupId: GroupIdSchema.optional()
  }),

  // Contract/Product Schemas
  listContracts: CustomerSchema.extend({}),

  listProducts: CustomerSchema.extend({
    contractId: ContractIdSchema.optional()
  }),

  // Traffic Report Schema
  getTrafficReport: CustomerSchema.extend({
    propertyId: PropertyIdSchema,
    startDate: z.string().describe('Start date in ISO format'),
    endDate: z.string().describe('End date in ISO format'),
    granularity: z.enum(['FIVE_MINUTES', 'HOUR', 'DAY', 'WEEK', 'MONTH']).default('DAY'),
    metrics: z.array(z.enum(['edge_hits', 'edge_bandwidth', 'origin_hits', 'origin_bandwidth'])).default(['edge_hits', 'edge_bandwidth']),
    groupBy: z.enum(['cpcode', 'hostname', 'geo', 'protocol']).optional()
  })
};

/**
 * Utility API Endpoints
 */
export const UtilityEndpoints = {
  // FastPurge
  fastPurgeByURL: (network: string) => `/ccu/v3/invalidate/url/${network}`,
  fastPurgeByCPCode: (network: string) => `/ccu/v3/invalidate/cpcode/${network}`,
  fastPurgeByTag: (network: string) => `/ccu/v3/invalidate/tag/${network}`,
  fastPurgeStatus: (purgeId: string) => `/ccu/v3/purges/${purgeId}`,

  // CP Codes
  listCPCodes: () => '/papi/v1/cpcodes',
  createCPCode: () => '/papi/v1/cpcodes',

  // Includes
  listIncludes: () => '/papi/v1/includes',
  createInclude: () => '/papi/v1/includes',

  // Contracts/Products
  listContracts: () => '/papi/v1/contracts',
  listProducts: () => '/papi/v1/products',

  // Reporting
  trafficReport: () => '/reporting-api/v1/reports/traffic/http-requests-by-time'
};

/**
 * Utility Response Formatters
 */
export function formatPurgeResponse(data: any): string {
  const statusMap = {
    'Done': 'Complete',
    'In-Progress': 'Processing',
    'Submitted': 'Queued',
    'Failed': 'Failed'
  };

  let text = `FastPurge Operation\n\n`;
  text += `Purge ID: ${data.purgeId}\n`;
  text += `Status: ${statusMap[data.status as keyof typeof statusMap] || data.status}\n`;
  
  if (data.estimatedSeconds) {
    text += `Estimated Time: ${data.estimatedSeconds} seconds\n`;
  }
  
  if (data.network) {
    text += `Network: ${data.network}\n`;
  }
  
  if (data.urls) {
    text += `URLs: ${data.urls.length} items\n`;
  } else if (data.cpcodes) {
    text += `CP Codes: ${data.cpcodes.length} items\n`;
  } else if (data.tags) {
    text += `Tags: ${data.tags.length} items\n`;
  }
  
  if (data.submittedTime) {
    text += `Submitted: ${data.submittedTime}\n`;
  }
  
  if (data.completedTime) {
    text += `Completed: ${data.completedTime}\n`;
  }

  return text;
}

export function formatCPCodeList(data: any): string {
  const cpcodes = data.cpcodes || [];
  
  let text = `CP Codes List\n\n`;
  text += `Total Found: ${cpcodes.length}\n\n`;
  
  cpcodes.forEach((cpcode: any, index: number) => {
    text += `${index + 1}. ${cpcode.cpcodeName} (${cpcode.cpcodeId})\n`;
    if (cpcode.productIds && cpcode.productIds.length > 0) {
      text += `   Products: ${cpcode.productIds.join(', ')}\n`;
    }
    if (cpcode.createdDate) {
      text += `   Created: ${cpcode.createdDate}\n`;
    }
    text += `\n`;
  });
  
  if (cpcodes.length === 0) {
    text += `No CP codes found.\n\n`;
    text += `Create one with: utility_cpcode_create\n`;
  }
  
  return text;
}

export function formatIncludeList(data: any): string {
  const includes = data.includes || [];
  
  let text = `Property Includes List\n\n`;
  text += `Total Found: ${includes.length}\n\n`;
  
  includes.forEach((include: any, index: number) => {
    text += `${index + 1}. ${include.includeName} (${include.includeId})\n`;
    text += `   Type: ${include.includeType}\n`;
    text += `   Latest Version: ${include.latestVersion}\n`;
    text += `\n`;
  });
  
  if (includes.length === 0) {
    text += `No includes found.\n\n`;
    text += `Create one with: utility_include_create\n`;
  }
  
  return text;
}

export function formatContractList(data: any): string {
  const contracts = data.contracts || [];
  
  let text = `Contracts List\n\n`;
  text += `Total Found: ${contracts.length}\n\n`;
  
  contracts.forEach((contract: any, index: number) => {
    text += `${index + 1}. ${contract.contractId}\n`;
    text += `   Type: ${contract.contractTypeName}\n`;
    text += `\n`;
  });
  
  return text;
}

export function formatProductList(data: any): string {
  const products = data.products || [];
  
  let text = `Products List\n\n`;
  text += `Total Found: ${products.length}\n\n`;
  
  products.forEach((product: any, index: number) => {
    text += `${index + 1}. ${product.productName} (${product.productId})\n`;
  });
  
  return text;
}

export function formatTrafficReport(data: any): string {
  let text = `Traffic Report\n\n`;
  text += `Property: ${data.propertyId}\n`;
  text += `Period: ${data.period.start} to ${data.period.end}\n`;
  text += `Granularity: ${data.granularity}\n`;
  text += `Data Points: ${data.dataPoints}\n\n`;
  
  if (data.data && data.data.length > 0) {
    text += `Traffic Summary:\n`;
    data.data.slice(0, 10).forEach((point: any) => {
      text += `${point.time}: ${point.edgeHits} hits, ${point.edgeBandwidth}\n`;
    });
    
    if (data.data.length > 10) {
      text += `... and ${data.data.length - 10} more data points\n`;
    }
  }
  
  return text;
}