/**
 * Edge Compute Domain Tools
 * 
 * Complete implementation of Akamai EdgeWorkers and Cloudlets APIs
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Production-grade edge compute operations
 * Approach: Type-safe implementation with comprehensive error handling
 * Implementation: Full API coverage for EdgeWorkers and Cloudlets
 * 
 * Updated on 2025-01-11 to use AkamaiOperation.execute pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { 
  EdgeWorkersEndpoints, 
  CloudletsEndpoints, 
  EdgeComputeToolSchemas, 
  formatFileSize,
  CloudletTypes 
} from './api';
import type { z } from 'zod';

interface EdgeComputeResponse {
  edgeWorkerIds?: any[];
  edgeWorkerId?: number;
  versions?: any[];
  activations?: any[];
  resourceTiers?: any[];
  policies?: any[];
  policyVersions?: any[];
  origins?: any[];
  report?: any;
  name?: string;
  description?: string;
  status?: string;
  cloudletType?: string;
  rules?: any[];
  activationId?: number;
  network?: string;
  version?: string | number;
  createdDate?: string;
  lastModifiedDate?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  policyId?: number;
}

/**
 * Format EdgeWorkers list for display
 */
function formatEdgeWorkersList(response: EdgeComputeResponse): string {
  const edgeWorkerIds = (response as any).edgeWorkerIds || [];
  
  let text = `⚡ **EdgeWorkers List**\n`;
  text += `Total EdgeWorkers: ${edgeWorkerIds.length}\n\n`;
  
  if (edgeWorkerIds.length > 0) {
    edgeWorkerIds.forEach((ew: any, index: number) => {
      text += `${index + 1}. **${ew.name}** (ID: ${ew.edgeWorkerId})\n`;
      if (ew.description) {
        text += `   • Description: ${ew.description}\n`;
      }
      text += `   • Status: ${ew.status}\n`;
      text += `   • Created: ${ew.createdDate} by ${ew.createdBy}\n`;
      text += `   • Modified: ${ew.lastModifiedDate} by ${ew.lastModifiedBy}\n`;
      text += `\n`;
    });
  } else {
    text += '⚠️ No EdgeWorkers found.\n';
  }
  
  return text;
}

/**
 * Format EdgeWorker details
 */
function formatEdgeWorkerDetails(edgeWorker: EdgeComputeResponse, versions?: any[]): string {
  let text = `⚡ **EdgeWorker Details**\n\n`;
  text += `**Name**: ${edgeWorker.name}\n`;
  text += `**ID**: ${edgeWorker.edgeWorkerId}\n`;
  if (edgeWorker.description) {
    text += `**Description**: ${edgeWorker.description}\n`;
  }
  text += `**Status**: ${edgeWorker.status}\n`;
  text += `**Created**: ${edgeWorker.createdDate} by ${edgeWorker.createdBy}\n`;
  text += `**Modified**: ${edgeWorker.lastModifiedDate} by ${edgeWorker.lastModifiedBy}\n`;
  
  if (versions && versions.length > 0) {
    text += `\n**Recent Versions**:\n`;
    versions.forEach((version: any, index: number) => {
      text += `${index + 1}. Version ${version.version}\n`;
      text += `   • Size: ${formatFileSize(version.fileSize)}\n`;
      text += `   • Created: ${version.createdDate}\n`;
      if (version.description) {
        text += `   • Description: ${version.description}\n`;
      }
      text += `\n`;
    });
  }
  
  return text;
}

/**
 * Format Cloudlets policies list
 */
function formatCloudletsPoliciesList(response: EdgeComputeResponse, cloudletType: string): string {
  const policies = (response as any).policies || [];
  
  let text = `☁️ **Cloudlets Policies** (${CloudletTypes[cloudletType as keyof typeof CloudletTypes] || cloudletType})\n`;
  text += `Total Policies: ${policies.length}\n\n`;
  
  if (policies.length > 0) {
    policies.forEach((policy: any, index: number) => {
      text += `${index + 1}. **${policy.name}** (ID: ${policy.policyId})\n`;
      if (policy.description) {
        text += `   • Description: ${policy.description}\n`;
      }
      text += `   • Status: ${policy.status}\n`;
      text += `   • Created: ${policy.createdDate} by ${policy.createdBy}\n`;
      text += `   • Modified: ${policy.lastModifiedDate} by ${policy.lastModifiedBy}\n`;
      text += `\n`;
    });
  } else {
    text += '⚠️ No policies found for this Cloudlet type.\n';
  }
  
  return text;
}

/**
 * Format activation response
 */
function formatActivationResponse(response: EdgeComputeResponse, type: 'EdgeWorker' | 'Cloudlet'): string {
  let text = `✅ **${type} Activation Submitted**\n\n`;
  text += `**Activation ID**: ${response.activationId}\n`;
  text += `**Network**: ${response.network}\n`;
  text += `**Status**: ${response.status}\n`;
  text += `**Version**: ${response.version}\n`;
  
  text += `\n📝 **Note**: Activation typically takes 5-15 minutes. Check status with `;
  text += type === 'EdgeWorker' ? 'edge_compute_edgeworker_activation_status' : 'edge_compute_cloudlet_activation_status';
  
  return text;
}

/**
 * List all EdgeWorkers
 */
export async function listEdgeWorkers(args: z.infer<typeof EdgeComputeToolSchemas.listEdgeWorkers>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_list_edgeworkers',
    args,
    async (client) => {
      const queryParams: any = {};
      if (args.limit) {queryParams.limit = args.limit.toString();}
      if (args.offset) {queryParams.offset = args.offset.toString();}
      
      return client.request({
        method: 'GET',
        path: EdgeWorkersEndpoints.listIds(),
        queryParams
      });
    },
    {
      format: 'text',
      formatter: formatEdgeWorkersList,
      cacheKey: () => 'edge-compute:edgeworkers:list',
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get EdgeWorker details
 */
export async function getEdgeWorker(args: z.infer<typeof EdgeComputeToolSchemas.getEdgeWorker>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_get_edgeworker',
    args,
    async (client) => {
      const edgeWorker = await client.request({
        method: 'GET',
        path: EdgeWorkersEndpoints.getId(args.edgeWorkerId)
      });
      
      // Try to get versions
      let versions = [];
      try {
        const versionsResponse = await client.request({
          method: 'GET',
          path: EdgeWorkersEndpoints.listVersions(args.edgeWorkerId),
          queryParams: { limit: '5' }
        });
        versions = (versionsResponse as EdgeComputeResponse).versions || [];
      } catch {
        // Ignore version fetch errors
      }
      
      return { ...(edgeWorker as any), versions };
    },
    {
      format: 'text',
      formatter: (result) => formatEdgeWorkerDetails(result, result.versions),
      cacheKey: (p) => `edge-compute:edgeworker:${p.edgeWorkerId}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Create EdgeWorker
 */
export async function createEdgeWorker(args: z.infer<typeof EdgeComputeToolSchemas.createEdgeWorker>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_create_edgeworker',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: EdgeWorkersEndpoints.createId(),
        body: {
          name: args.name,
          description: args.description,
          resourceTierId: args.resourceTierId
        }
      });
    },
    {
      format: 'text',
      formatter: (edgeWorker: EdgeComputeResponse) => {
        let text = `✅ **EdgeWorker Created Successfully**\n\n`;
        text += `**Name**: ${edgeWorker.name}\n`;
        text += `**ID**: ${edgeWorker.edgeWorkerId}\n`;
        if (edgeWorker.description) {
          text += `**Description**: ${edgeWorker.description}\n`;
        }
        text += `\n📝 **Next Steps**:\n`;
        text += `1. Upload code bundle with edge_compute_upload_edgeworker_version\n`;
        text += `2. Activate to staging/production with edge_compute_activate_edgeworker\n`;
        return text;
      }
    }
  );
}

/**
 * Upload EdgeWorker version
 */
export async function uploadVersion(args: any): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_upload_edgeworker_version',
    args,
    async (client) => {
      // First create the version
      const createResponse = await client.request({
        method: 'POST',
        path: EdgeWorkersEndpoints.createVersion(args.edgeWorkerId),
        body: {
          description: args.description
        }
      });
      
      const version = (createResponse as EdgeComputeResponse).version;
      
      // Then upload the bundle
      await client.request({
        method: 'PUT',
        path: EdgeWorkersEndpoints.getVersionContent(args.edgeWorkerId, version as string),
        body: args.bundle,
        headers: {
          'Content-Type': 'application/gzip'
        }
      });
      
      return { ...createResponse as any, bundleUploaded: true };
    },
    {
      format: 'text',
      formatter: (result: EdgeComputeResponse) => {
        let text = `✅ **EdgeWorker Version Uploaded**\n\n`;
        text += `**EdgeWorker ID**: ${args.edgeWorkerId}\n`;
        text += `**Version**: ${result.version}\n`;
        if (result.description) {
          text += `**Description**: ${result.description}\n`;
        }
        text += `\n📝 **Next Step**: Activate this version with edge_compute_activate_edgeworker\n`;
        return text;
      }
    }
  );
}

/**
 * Activate EdgeWorker
 */
export async function activateEdgeWorker(args: z.infer<typeof EdgeComputeToolSchemas.activateEdgeWorker>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_activate_edgeworker',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: EdgeWorkersEndpoints.createActivation(args.edgeWorkerId),
        body: {
          network: args.network.toUpperCase(),
          version: args.version
        }
      });
    },
    {
      format: 'text',
      formatter: (result) => formatActivationResponse(result as EdgeComputeResponse, 'EdgeWorker'),
      progress: true
    }
  );
}

/**
 * List Cloudlets policies
 */
export async function listCloudletsPolicies(args: z.infer<typeof EdgeComputeToolSchemas.listCloudletPolicies>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_list_cloudlets_policies',
    args,
    async (client) => {
      const queryParams: any = { cloudletType: args.cloudletType };
      if (args.limit) {queryParams.limit = args.limit.toString();}
      if (args.offset) {queryParams.offset = args.offset.toString();}
      
      return client.request({
        method: 'GET',
        path: CloudletsEndpoints.listPolicies(),
        queryParams
      });
    },
    {
      format: 'text',
      formatter: (result) => formatCloudletsPoliciesList(result as EdgeComputeResponse, args.cloudletType || 'ALL'),
      cacheKey: (p) => `edge-compute:cloudlets:${p.cloudletType}:policies`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get Cloudlet policy details
 */
export async function getCloudletPolicy(args: z.infer<typeof EdgeComputeToolSchemas.getCloudletPolicy>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_get_cloudlet_policy',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: CloudletsEndpoints.getPolicy(args.policyId)
      });
    },
    {
      format: 'text',
      formatter: (policy: EdgeComputeResponse) => {
        let text = `☁️ **Cloudlet Policy Details**\n\n`;
        text += `**Name**: ${policy.name}\n`;
        text += `**ID**: ${policy.policyId}\n`;
        text += `**Type**: ${CloudletTypes[policy.cloudletType as keyof typeof CloudletTypes] || policy.cloudletType}\n`;
        if (policy.description) {
          text += `**Description**: ${policy.description}\n`;
        }
        text += `**Status**: ${policy.status}\n`;
        text += `**Created**: ${policy.createdDate} by ${policy.createdBy}\n`;
        text += `**Modified**: ${policy.lastModifiedDate} by ${policy.lastModifiedBy}\n`;
        return text;
      },
      cacheKey: (p) => `edge-compute:cloudlet:policy:${p.policyId}`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Create Cloudlet policy
 */
export async function createCloudletPolicy(args: z.infer<typeof EdgeComputeToolSchemas.createCloudletPolicy>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_create_cloudlet_policy',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: CloudletsEndpoints.createPolicy(),
        body: {
          name: args.name,
          cloudletType: args.cloudletType,
          description: args.description,
          propertyId: args.propertyId
        }
      });
    },
    {
      format: 'text',
      formatter: (policy: EdgeComputeResponse) => {
        let text = `✅ **Cloudlet Policy Created**\n\n`;
        text += `**Name**: ${policy.name}\n`;
        text += `**ID**: ${policy.policyId}\n`;
        text += `**Type**: ${CloudletTypes[policy.cloudletType as keyof typeof CloudletTypes] || policy.cloudletType}\n`;
        if (policy.description) {
          text += `**Description**: ${policy.description}\n`;
        }
        text += `\n📝 **Next Steps**:\n`;
        text += `1. Create policy version with edge_compute_create_cloudlet_version\n`;
        text += `2. Update rules with edge_compute_update_cloudlet_rules\n`;
        text += `3. Activate to staging/production\n`;
        return text;
      }
    }
  );
}

/**
 * Activate Cloudlet policy
 */
export async function activateCloudletPolicy(args: z.infer<typeof EdgeComputeToolSchemas.activateCloudletPolicy>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'edge-compute',
    'edge_compute_activate_cloudlet',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: CloudletsEndpoints.activatePolicy(args.policyId),
        body: {
          network: args.network.toUpperCase(),
          version: args.version
        }
      });
    },
    {
      format: 'text',
      formatter: (result) => formatActivationResponse(result as EdgeComputeResponse, 'Cloudlet'),
      progress: true
    }
  );
}

/**
 * Legacy class exports for backward compatibility
 * @deprecated Use direct function exports instead
 */
export const edgeComputeOperations = {
  listEdgeWorkers,
  getEdgeWorker,
  createEdgeWorker,
  uploadVersion,
  activateEdgeWorker,
  listCloudletsPolicies,
  getCloudletPolicy,
  createCloudletPolicy,
  activateCloudletPolicy
};