/**
 * Edge Hostname API Definitions
 * 
 * Endpoints, schemas, and formatters for edge hostname management
 * Updated: 2025-07-12 - Converted to unified AkamaiOperation.execute pattern
 */

import { z } from 'zod';
import { CustomerSchema } from '../common';

/**
 * Edge Hostname Schemas
 */
export const EdgeHostnameToolSchemas = {
  create: CustomerSchema.extend({
    domainPrefix: z.string().min(1).max(63).describe('Domain prefix for new edge hostname'),
    domainSuffix: z.string().default('edgesuite.net').describe('Domain suffix'),
    productId: z.string().default('prd_Web_App_Accel').describe('Product ID'),
    secureNetwork: z.enum(['ENHANCED_TLS', 'STANDARD_TLS', 'SHARED_CERT']).default('ENHANCED_TLS'),
    ipVersionBehavior: z.enum(['IPV4', 'IPV6_PERFORMANCE', 'IPV6_COMPLIANCE']).default('IPV4'),
    certificateEnrollmentId: z.number().int().positive().optional().describe('Certificate enrollment ID'),
    slotNumber: z.number().int().min(0).max(999).optional().describe('Slot number for shared certificates'),
    comments: z.string().max(1000).optional().describe('Comments for the edge hostname')
  }),

  list: CustomerSchema.extend({
    contractId: z.string().optional(),
    groupId: z.string().optional(),
    limit: z.number().int().min(1).max(1000).default(100).optional(),
    offset: z.number().int().min(0).default(0).optional()
  }),

  get: CustomerSchema.extend({
    edgeHostnameId: z.string().describe('Edge hostname ID'),
    contractId: z.string().optional(),
    groupId: z.string().optional()
  }),

  update: CustomerSchema.extend({
    edgeHostnameId: z.string().describe('Edge hostname ID'),
    ipVersionBehavior: z.enum(['IPV4', 'IPV6_PERFORMANCE', 'IPV6_COMPLIANCE']).optional(),
    certificateEnrollmentId: z.number().int().positive().optional(),
    comments: z.string().max(1000).optional()
  }),

  delete: CustomerSchema.extend({
    edgeHostnameId: z.string().describe('Edge hostname ID'),
    force: z.boolean().default(false).describe('Force deletion even if in use')
  })
};

/**
 * Edge Hostname API Endpoints
 */
export const EdgeHostnameEndpoints = {
  list: () => '/hapi/v1/edge-hostnames',
  create: () => '/hapi/v1/edge-hostnames',
  get: (edgeHostnameId: string) => `/hapi/v1/edge-hostnames/${edgeHostnameId}`,
  update: (edgeHostnameId: string) => `/hapi/v1/edge-hostnames/${edgeHostnameId}`,
  delete: (edgeHostnameId: string) => `/hapi/v1/edge-hostnames/${edgeHostnameId}`,
  usage: (edgeHostnameId: string) => `/hapi/v1/edge-hostnames/${edgeHostnameId}/properties`
};

/**
 * Edge Hostname Response Formatters
 */
export function formatEdgeHostnameList(data: any): string {
  const hostnames = data.edgeHostnames || [];
  
  let text = `Edge Hostnames List\n\n`;
  text += `Total Found: ${hostnames.length}\n\n`;
  
  hostnames.forEach((hostname: any, index: number) => {
    text += `${index + 1}. ${hostname.domainPrefix}.${hostname.domainSuffix}\n`;
    text += `   ID: ${hostname.edgeHostnameId}\n`;
    text += `   Certificate: ${hostname.secureNetwork}\n`;
    text += `   Status: ${hostname.status || 'Unknown'}\n`;
    if (hostname.targetCname) text += `   Target: ${hostname.targetCname}\n`;
    text += `\n`;
  });
  
  if (hostnames.length === 0) {
    text += `No edge hostnames found.\n\n`;
    text += `Create one with: edge_hostname_create\n`;
  }
  
  return text;
}

export function formatEdgeHostnameDetails(data: any): string {
  let text = `Edge Hostname Details\n\n`;
  text += `ID: ${data.edgeHostnameId}\n`;
  text += `Domain: ${data.domainPrefix}.${data.domainSuffix}\n`;
  text += `Certificate: ${data.secureNetwork}\n`;
  text += `IP Version: ${data.ipVersionBehavior}\n`;
  text += `Status: ${data.status || 'Unknown'}\n`;
  
  if (data.targetCname) {
    text += `Target CNAME: ${data.targetCname}\n`;
  }
  
  if (data.certificateEnrollmentId) {
    text += `Certificate ID: ${data.certificateEnrollmentId}\n`;
  }
  
  if (data.comments) {
    text += `Comments: ${data.comments}\n`;
  }
  
  return text;
}

export function formatEdgeHostnameCreated(data: any): string {
  let text = `Edge Hostname Created Successfully!\n\n`;
  text += `Hostname: ${data.domainPrefix}.${data.domainSuffix}\n`;
  text += `ID: ${data.edgeHostnameId}\n`;
  text += `Certificate Type: ${data.secureNetwork}\n`;
  text += `IP Version: ${data.ipVersionBehavior}\n\n`;
  text += `Next Steps:\n`;
  text += `1. Add hostname to property: property_hostname_add\n`;
  text += `2. Update property rules if needed\n`;
  text += `3. Activate property to staging/production\n`;
  return text;
}