/**
 * Security Domain API Schemas and Endpoints
 * 
 * CODE KAI IMPLEMENTATION:
 * - Type-safe schemas for all security operations
 * - Endpoint definitions for Network Lists and AppSec APIs
 * - Response formatters for consistent output
 * - No emojis in formatters per CODE KAI principles
 */

import { z } from 'zod';
import { CustomerSchema, ListRequestSchema } from '../common';

/**
 * Security API Endpoints
 */
export const SecurityEndpoints = {
  // Network List endpoints
  listNetworkLists: () => '/network-list/v2/network-lists',
  getNetworkList: (networkListId: string) => `/network-list/v2/network-lists/${networkListId}`,
  createNetworkList: () => '/network-list/v2/network-lists',
  updateNetworkList: (networkListId: string) => `/network-list/v2/network-lists/${networkListId}`,
  deleteNetworkList: (networkListId: string) => `/network-list/v2/network-lists/${networkListId}`,
  activateNetworkList: (networkListId: string, network: string) => 
    `/network-list/v2/network-lists/${networkListId}/environments/${network}/activate`,
  deactivateNetworkList: (networkListId: string, network: string) => 
    `/network-list/v2/network-lists/${networkListId}/environments/${network}/deactivate`,
  getActivationStatus: (networkListId: string, activationId: number) => 
    `/network-list/v2/network-lists/${networkListId}/activations/${activationId}`,
  listActivations: (networkListId: string) => 
    `/network-list/v2/network-lists/${networkListId}/activations`,

  // AppSec endpoints
  listAppSecConfigs: () => '/appsec/v1/configs',
  getAppSecConfig: (configId: number, version?: number) => 
    version ? `/appsec/v1/configs/${configId}/versions/${version}` : `/appsec/v1/configs/${configId}`,
  createWAFPolicy: (configId: number, version: number) => 
    `/appsec/v1/configs/${configId}/versions/${version}/security-policies`,
  updateWAFPolicy: (configId: number, version: number, policyId: string) => 
    `/appsec/v1/configs/${configId}/versions/${version}/security-policies/${policyId}`,
  deleteWAFPolicy: (configId: number, version: number, policyId: string) => 
    `/appsec/v1/configs/${configId}/versions/${version}/security-policies/${policyId}`,
  getSecurityEvents: (configId: number, version: number, policyId: string) => 
    `/appsec/v1/configs/${configId}/versions/${version}/security-policies/${policyId}/attack-data`,
  activateSecurityConfig: () => '/appsec/v1/activations',
  getSecurityActivationStatus: (activationId: number) => `/appsec/v1/activations/${activationId}`
};

/**
 * Security-specific schemas
 */
const NetworkListTypeSchema = z.enum(['IP', 'GEO', 'ASN', 'EXCEPTION']);
const NetworkEnvironmentSchema = z.enum(['STAGING', 'PRODUCTION']);
const WAFPolicyModeSchema = z.enum(['ASE_AUTO', 'ASE_MANUAL', 'KRS']);

/**
 * Security tool schemas
 */
export const SecurityToolSchemas = {
  // Network List operations
  listNetworkLists: ListRequestSchema.extend({
    type: z.string().optional(),
    search: z.string().optional(),
    includeElements: z.boolean().optional()
  }),

  getNetworkList: CustomerSchema.extend({
    networkListId: z.string(),
    includeElements: z.boolean().optional().default(false)
  }),

  createNetworkList: CustomerSchema.extend({
    name: z.string().min(1).max(128),
    type: NetworkListTypeSchema,
    description: z.string().optional(),
    elements: z.array(z.string()).optional().default([]),
    contractId: z.string(),
    groupId: z.number().int().positive()
  }),

  updateNetworkList: CustomerSchema.extend({
    networkListId: z.string(),
    elements: z.array(z.string()),
    mode: z.enum(['append', 'replace', 'remove']).default('replace'),
    description: z.string().optional()
  }),

  deleteNetworkList: CustomerSchema.extend({
    networkListId: z.string(),
    confirm: z.boolean()
  }),

  activateNetworkList: CustomerSchema.extend({
    networkListId: z.string(),
    network: NetworkEnvironmentSchema,
    comments: z.string().optional(),
    notificationRecipients: z.array(z.string().email()).optional()
  }),

  getActivationStatus: CustomerSchema.extend({
    networkListId: z.string(),
    activationId: z.number()
  }),

  validateGeographicCodes: CustomerSchema.extend({
    codes: z.array(z.string())
  }),

  getASNInformation: CustomerSchema.extend({
    asns: z.array(z.number())
  }),

  // AppSec operations
  listAppSecConfigs: CustomerSchema.extend({
    contractId: z.string().optional(),
    groupId: z.number().optional()
  }),

  createWAFPolicy: CustomerSchema.extend({
    configId: z.number().int().positive(),
    version: z.number().int().positive(),
    policyName: z.string(),
    policyMode: WAFPolicyModeSchema,
    paranoidLevel: z.number().int().min(1).max(4).optional()
  }),

  updateWAFPolicy: CustomerSchema.extend({
    configId: z.number(),
    version: z.number(),
    policyId: z.string(),
    policyMode: WAFPolicyModeSchema.optional(),
    paranoidLevel: z.number().min(0).max(10).optional(),
    ruleSets: z.array(z.string()).optional()
  }),

  deleteWAFPolicy: CustomerSchema.extend({
    configId: z.number(),
    version: z.number(),
    policyId: z.string(),
    confirm: z.boolean()
  })
};

/**
 * Response schemas
 */
export const NetworkListSchema = z.object({
  networkListId: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  elementCount: z.number(),
  readOnly: z.boolean(),
  activationStatus: z.string().optional(),
  syncPoint: z.number().optional()
});

export const NetworkListElementsSchema = NetworkListSchema.extend({
  elements: z.array(z.string())
});

export const ActivationStatusSchema = z.object({
  activationId: z.number(),
  status: z.string(),
  network: z.string(),
  createdDate: z.string(),
  createdBy: z.string()
});

export const AppSecConfigSchema = z.object({
  configId: z.number(),
  configName: z.string(),
  configDescription: z.string().optional(),
  productionVersion: z.number().optional(),
  stagingVersion: z.number().optional(),
  latestVersion: z.number()
});

/**
 * Response formatters
 */
export function formatNetworkListsResponse(response: any): string {
  const lists = response.networkLists || [];
  
  if (lists.length === 0) {
    return 'No network lists found';
  }
  
  let result = `Found ${lists.length} network lists:\n\n`;
  
  for (const list of lists) {
    result += `Network List: ${list.name}\n`;
    result += `  ID: ${list.networkListId}\n`;
    result += `  Type: ${list.type}\n`;
    result += `  Elements: ${list.elementCount}\n`;
    if (list.description) {
      result += `  Description: ${list.description}\n`;
    }
    if (list.activationStatus) {
      result += `  Status: ${list.activationStatus}\n`;
    }
    result += `  Read-only: ${list.readOnly ? 'Yes' : 'No'}\n`;
    result += '\n';
  }
  
  return result.trim();
}

export function formatNetworkListDetails(response: any): string {
  let result = `Network List: ${response.name}\n`;
  result += `ID: ${response.networkListId}\n`;
  result += `Type: ${response.type}\n`;
  result += `Elements: ${response.elementCount}\n`;
  
  if (response.description) {
    result += `Description: ${response.description}\n`;
  }
  
  if (response.activationStatus) {
    result += `Status: ${response.activationStatus}\n`;
  }
  
  result += `Read-only: ${response.readOnly ? 'Yes' : 'No'}\n`;
  
  if (response.elements && response.elements.length > 0) {
    result += `\nElements:\n`;
    for (const element of response.elements.slice(0, 20)) {
      result += `  ${element}\n`;
    }
    if (response.elements.length > 20) {
      result += `  ... and ${response.elements.length - 20} more\n`;
    }
  }
  
  return result.trim();
}

export function formatActivationStatus(response: any): string {
  const statusMap: Record<string, string> = {
    'ACTIVATED': 'Activated',
    'PENDING': 'Pending',
    'FAILED': 'Failed',
    'DEACTIVATED': 'Deactivated',
    'ABORTED': 'Aborted',
    'IN_PROGRESS': 'In Progress'
  };
  
  const status = statusMap[response.status] || response.status;
  
  let result = `Activation Status: ${status}\n`;
  result += `Activation ID: ${response.activationId}\n`;
  result += `Network: ${response.network}\n`;
  result += `Created: ${response.createdDate}\n`;
  result += `Created by: ${response.createdBy}\n`;
  
  return result.trim();
}

export function formatAppSecConfigs(response: any): string {
  const configs = response.configurations || [];
  
  if (configs.length === 0) {
    return 'No application security configurations found';
  }
  
  let result = `Found ${configs.length} security configurations:\n\n`;
  
  for (const config of configs) {
    result += `Configuration: ${config.configName}\n`;
    result += `  ID: ${config.configId}\n`;
    if (config.configDescription) {
      result += `  Description: ${config.configDescription}\n`;
    }
    result += `  Latest version: ${config.latestVersion}\n`;
    if (config.productionVersion) {
      result += `  Production version: ${config.productionVersion}\n`;
    }
    if (config.stagingVersion) {
      result += `  Staging version: ${config.stagingVersion}\n`;
    }
    result += '\n';
  }
  
  return result.trim();
}

export function formatWAFPolicyResponse(response: any): string {
  let result = `WAF Policy: ${response.policyName}\n`;
  result += `Policy ID: ${response.policyId}\n`;
  result += `Mode: ${response.policyMode}\n`;
  
  if (response.paranoidLevel !== undefined) {
    result += `Paranoid Level: ${response.paranoidLevel}\n`;
  }
  
  if (response.ruleSets && response.ruleSets.length > 0) {
    result += `Rule Sets: ${response.ruleSets.join(', ')}\n`;
  }
  
  return result.trim();
}

export function formatSecurityEventsResponse(response: any): string {
  let result = `Security Events Report\n`;
  result += `Time Range: ${response.timeRange.from} to ${response.timeRange.to}\n`;
  result += `Total Events: ${response.totalEvents}\n`;
  result += `Events Returned: ${response.eventsReturned}\n\n`;
  
  if (response.summary.topRules.length > 0) {
    result += `Top Rules Triggered:\n`;
    for (const rule of response.summary.topRules) {
      result += `  ${rule.rule}: ${rule.count} events\n`;
    }
    result += '\n';
  }
  
  if (response.summary.topCountries.length > 0) {
    result += `Top Countries:\n`;
    for (const country of response.summary.topCountries) {
      result += `  ${country.country}: ${country.count} events\n`;
    }
    result += '\n';
  }
  
  if (response.summary.topIPs.length > 0) {
    result += `Top IP Addresses:\n`;
    for (const ip of response.summary.topIPs) {
      result += `  ${ip.ip}: ${ip.count} events\n`;
    }
    result += '\n';
  }
  
  result += `Unique IPs: ${response.summary.uniqueIPs}\n`;
  
  return result.trim();
}