/**
 * Edge Compute API Implementation
 * 
 * Complete implementation of Akamai EdgeWorkers and Cloudlets APIs
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Production-grade edge compute integration
 * Approach: Type-safe implementation with comprehensive error handling
 * Implementation: Full API coverage for EdgeWorkers and Cloudlets
 */

import { z } from 'zod';

/**
 * Base URLs for Edge Compute APIs
 */
export const EDGEWORKERS_API_BASE = '/edgeworkers/v1';
export const CLOUDLETS_API_BASE = '/cloudlets/v3';

/**
 * EdgeWorkers API Schemas
 */
export const EdgeWorkersSchemas = {
  // EdgeWorker ID schema
  EdgeWorkerId: z.object({
    edgeWorkerId: z.number(),
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']),
    createdBy: z.string(),
    createdDate: z.string(),
    lastModifiedBy: z.string(),
    lastModifiedDate: z.string()
  }),
  
  // Version schema
  Version: z.object({
    edgeWorkerId: z.number(),
    version: z.string(),
    description: z.string().optional(),
    checksum: z.string(),
    createdBy: z.string(),
    createdDate: z.string(),
    fileSize: z.number()
  }),
  
  // Activation schema
  Activation: z.object({
    edgeWorkerId: z.number(),
    version: z.string(),
    activationId: z.number(),
    network: z.enum(['STAGING', 'PRODUCTION']),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETE', 'FAILED', 'ABORTED']),
    createdBy: z.string(),
    createdDate: z.string()
  }),
  
  // Resource tier schema
  ResourceTier: z.object({
    tierName: z.string(),
    contractId: z.string(),
    limitId: z.number(),
    limits: z.object({
      maxInitDurationMs: z.number(),
      maxRuntimeDurationMs: z.number(),
      maxMemoryMB: z.number(),
      maxLogSize: z.number()
    })
  })
};

/**
 * Cloudlets API Schemas
 */
export const CloudletsSchemas = {
  // Policy schema
  Policy: z.object({
    policyId: z.number(),
    name: z.string(),
    description: z.string().optional(),
    cloudletType: z.enum(['ALB', 'AP', 'AS', 'CD', 'ER', 'FR', 'IG', 'VP']),
    lastModifiedBy: z.string(),
    lastModifiedDate: z.string()
  }),
  
  // Rule schema
  Rule: z.object({
    ruleId: z.number().optional(),
    ruleName: z.string(),
    matches: z.array(z.object({
      matchType: z.string(),
      matchOperator: z.string(),
      matchValue: z.string()
    })),
    behaviors: z.array(z.object({
      name: z.string(),
      value: z.any()
    }))
  }),
  
  // Activation schema
  CloudletActivation: z.object({
    policyId: z.number(),
    version: z.number(),
    network: z.enum(['staging', 'production']),
    status: z.enum(['pending', 'success', 'failed']),
    createdBy: z.string(),
    createdDate: z.string()
  })
};

/**
 * EdgeWorkers API endpoints
 */
export const EdgeWorkersEndpoints = {
  // EdgeWorker ID endpoints
  listIds: () => 
    `${EDGEWORKERS_API_BASE}/ids`,
  
  getId: (edgeWorkerId: number) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}`,
  
  createId: () => 
    `${EDGEWORKERS_API_BASE}/ids`,
  
  updateId: (edgeWorkerId: number) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}`,
  
  deleteId: (edgeWorkerId: number) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}`,
  
  // Version endpoints
  listVersions: (edgeWorkerId: number) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}/versions`,
  
  getVersion: (edgeWorkerId: number, version: string) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}/versions/${version}`,
  
  createVersion: (edgeWorkerId: number) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}/versions`,
  
  getVersionContent: (edgeWorkerId: number, version: string) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}/versions/${version}/content`,
  
  // Activation endpoints
  listActivations: (edgeWorkerId: number) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}/activations`,
  
  getActivation: (edgeWorkerId: number, activationId: number) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}/activations/${activationId}`,
  
  createActivation: (edgeWorkerId: number) => 
    `${EDGEWORKERS_API_BASE}/ids/${edgeWorkerId}/activations`,
  
  // Resource tier endpoints
  listResourceTiers: () => 
    `${EDGEWORKERS_API_BASE}/resource-tiers`,
  
  getResourceTier: (tierName: string) => 
    `${EDGEWORKERS_API_BASE}/resource-tiers/${tierName}`,
  
  // Reports endpoints
  getReport: (edgeWorkerId: number) => 
    `${EDGEWORKERS_API_BASE}/reports/${edgeWorkerId}`
};

/**
 * Cloudlets API endpoints
 */
export const CloudletsEndpoints = {
  // Policy endpoints
  listPolicies: () => 
    `${CLOUDLETS_API_BASE}/policies`,
  
  getPolicy: (policyId: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}`,
  
  createPolicy: () => 
    `${CLOUDLETS_API_BASE}/policies`,
  
  updatePolicy: (policyId: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}`,
  
  deletePolicy: (policyId: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}`,
  
  // Version endpoints
  listPolicyVersions: (policyId: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}/versions`,
  
  getPolicyVersion: (policyId: number, version: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}/versions/${version}`,
  
  createPolicyVersion: (policyId: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}/versions`,
  
  updatePolicyVersion: (policyId: number, version: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}/versions/${version}`,
  
  // Activation endpoints
  listPolicyActivations: (policyId: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}/activations`,
  
  activatePolicy: (policyId: number) => 
    `${CLOUDLETS_API_BASE}/policies/${policyId}/activations`,
  
  // Load balancer endpoints
  listOrigins: () => 
    `${CLOUDLETS_API_BASE}/origins`,
  
  getOrigin: (originId: string) => 
    `${CLOUDLETS_API_BASE}/origins/${originId}`
};

/**
 * Edge Compute tool parameter schemas
 */
export const EdgeComputeToolSchemas = {
  // EdgeWorkers tools
  listEdgeWorkers: z.object({
    resourceTierId: z.number().optional().describe('Filter by resource tier'),
    limit: z.number().optional().describe('Maximum number of results'),
    offset: z.number().optional().describe('Pagination offset'),
    customer: z.string().optional()
  }),
  
  getEdgeWorker: z.object({
    edgeWorkerId: z.number().describe('EdgeWorker identifier'),
    customer: z.string().optional()
  }),
  
  createEdgeWorker: z.object({
    name: z.string().describe('EdgeWorker name'),
    description: z.string().optional().describe('EdgeWorker description'),
    resourceTierId: z.number().describe('Resource tier ID'),
    customer: z.string().optional()
  }),
  
  updateEdgeWorker: z.object({
    edgeWorkerId: z.number().describe('EdgeWorker identifier'),
    name: z.string().optional().describe('New name'),
    description: z.string().optional().describe('New description'),
    customer: z.string().optional()
  }),
  
  deleteEdgeWorker: z.object({
    edgeWorkerId: z.number().describe('EdgeWorker identifier'),
    customer: z.string().optional()
  }),
  
  createEdgeWorkerVersion: z.object({
    edgeWorkerId: z.number().describe('EdgeWorker identifier'),
    bundleContent: z.string().describe('Base64 encoded bundle content'),
    description: z.string().optional().describe('Version description'),
    customer: z.string().optional()
  }),
  
  activateEdgeWorker: z.object({
    edgeWorkerId: z.number().describe('EdgeWorker identifier'),
    version: z.string().describe('Version to activate'),
    network: z.enum(['STAGING', 'PRODUCTION']).describe('Target network'),
    note: z.string().optional().describe('Activation note'),
    customer: z.string().optional()
  }),
  
  // Cloudlets tools
  listCloudletPolicies: z.object({
    cloudletType: z.enum(['ALB', 'AP', 'AS', 'CD', 'ER', 'FR', 'IG', 'VP']).optional().describe('Filter by cloudlet type'),
    limit: z.number().optional().describe('Maximum number of results'),
    offset: z.number().optional().describe('Pagination offset'),
    customer: z.string().optional()
  }),
  
  getCloudletPolicy: z.object({
    policyId: z.number().describe('Policy identifier'),
    customer: z.string().optional()
  }),
  
  createCloudletPolicy: z.object({
    name: z.string().describe('Policy name'),
    description: z.string().optional().describe('Policy description'),
    cloudletType: z.enum(['ALB', 'AP', 'AS', 'CD', 'ER', 'FR', 'IG', 'VP']).describe('Cloudlet type'),
    propertyId: z.string().optional().describe('Associated property ID'),
    customer: z.string().optional()
  }),
  
  updateCloudletPolicyRules: z.object({
    policyId: z.number().describe('Policy identifier'),
    version: z.number().describe('Policy version'),
    rules: z.array(z.object({
      ruleName: z.string(),
      matches: z.array(z.object({
        matchType: z.string(),
        matchOperator: z.string(),
        matchValue: z.string()
      })),
      behaviors: z.array(z.object({
        name: z.string(),
        value: z.any()
      }))
    })).describe('Policy rules'),
    customer: z.string().optional()
  }),
  
  activateCloudletPolicy: z.object({
    policyId: z.number().describe('Policy identifier'),
    version: z.number().describe('Version to activate'),
    network: z.enum(['staging', 'production']).describe('Target network'),
    additionalPropertyIds: z.array(z.string()).optional().describe('Additional properties'),
    customer: z.string().optional()
  })
};

/**
 * Cloudlet type descriptions
 */
export const CloudletTypes = {
  ALB: 'Application Load Balancer',
  AP: 'API Prioritization',
  AS: 'Audience Segmentation',
  CD: 'Continuous Deployment',
  ER: 'Edge Redirector',
  FR: 'Forward Rewrite',
  IG: 'Image and Video Manager',
  VP: 'Visitor Prioritization'
};

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = bytes;
  
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  
  return `${value.toFixed(2)} ${units[index]}`;
}

/**
 * Format duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}