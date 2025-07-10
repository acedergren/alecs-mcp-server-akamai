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
 * Generated on 2025-07-10T04:07:56.616Z using ALECSCore CLI
 */

import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiClient } from '../../akamai-client';
import { createLogger } from '../../utils/pino-logger';
import { ToolErrorHandler } from '../../utils/error-handler';
import { 
  EdgeWorkersEndpoints, 
  CloudletsEndpoints, 
  EdgeComputeToolSchemas, 
  formatFileSize,
  CloudletTypes 
} from './edge-compute-api-implementation';
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

const logger = createLogger('edge-compute-tools');

/**
 * Edge Compute Tools - Complete implementation
 * 
 * Provides all EdgeWorkers and Cloudlets operations through a single class
 * following ALECSCore domain patterns
 */
export class EdgeComputeTools {
  private client: AkamaiClient;
  private errorHandler: ToolErrorHandler;

  constructor(customer: string = 'default') {
    this.client = new AkamaiClient(customer);
    this.errorHandler = new ToolErrorHandler({
      tool: 'edge-compute',
      operation: 'edge-compute-operation',
      customer
    });
  }

  /**
   * List EdgeWorkers
   */
  async listEdgeWorkers(args: z.infer<typeof EdgeComputeToolSchemas.listEdgeWorkers>): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Listing EdgeWorkers');
      
      const response = await this.client.request({
        method: 'GET',
        path: EdgeWorkersEndpoints.listIds(),
        queryParams: {
          ...(args.resourceTierId !== undefined && { resourceTierId: args.resourceTierId.toString() }),
          ...(args.limit !== undefined && { limit: args.limit.toString() }),
          ...(args.offset !== undefined && { offset: args.offset.toString() })
        }
      });

      const edgeWorkers = (response as EdgeComputeResponse).edgeWorkerIds || [];

      let text = `⚡ **EdgeWorkers**\n\n`;

      if (edgeWorkers.length > 0) {
        text += `**Found ${edgeWorkers.length} EdgeWorkers**\n\n`;
        
        edgeWorkers.forEach((ew: any, index: number) => {
          const statusIcon = ew.status === 'ACTIVE' ? '✅' : ew.status === 'INACTIVE' ? '⏸️' : '❌';
          text += `${index + 1}. ${statusIcon} **${ew.name}** (ID: ${ew.edgeWorkerId})\n`;
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

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get EdgeWorker details
   */
  async getEdgeWorker(args: z.infer<typeof EdgeComputeToolSchemas.getEdgeWorker>): Promise<MCPToolResponse> {
    try {
      logger.info({ edgeWorkerId: args.edgeWorkerId }, 'Getting EdgeWorker details');
      
      const response = await this.client.request({
        method: 'GET',
        path: EdgeWorkersEndpoints.getId(args.edgeWorkerId)
      });

      const edgeWorker = response as EdgeComputeResponse;

      let text = `⚡ **EdgeWorker Details**\n\n`;
      text += `**Name**: ${edgeWorker.name}\n`;
      text += `**ID**: ${edgeWorker.edgeWorkerId}\n`;
      if (edgeWorker.description) {
        text += `**Description**: ${edgeWorker.description}\n`;
      }
      text += `**Status**: ${edgeWorker.status}\n`;
      text += `**Created**: ${edgeWorker.createdDate} by ${edgeWorker.createdBy}\n`;
      text += `**Modified**: ${edgeWorker.lastModifiedDate} by ${edgeWorker.lastModifiedBy}\n`;

      // Get versions
      try {
        const versionsResponse = await this.client.request({
          method: 'GET',
          path: EdgeWorkersEndpoints.listVersions(args.edgeWorkerId),
          queryParams: { limit: '5' }
        });

        const versions = (versionsResponse as EdgeComputeResponse).versions || [];
        
        if (versions.length > 0) {
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
      } catch {
        // Ignore version fetch errors
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Create EdgeWorker
   */
  async createEdgeWorker(args: z.infer<typeof EdgeComputeToolSchemas.createEdgeWorker>): Promise<MCPToolResponse> {
    try {
      logger.info({ name: args.name }, 'Creating EdgeWorker');
      
      const response = await this.client.request({
        method: 'POST',
        path: EdgeWorkersEndpoints.createId(),
        body: {
          name: args.name,
          description: args.description,
          resourceTierId: args.resourceTierId
        }
      });

      const edgeWorker = response as EdgeComputeResponse;

      let text = `✅ **EdgeWorker Created Successfully**\n\n`;
      text += `**Name**: ${edgeWorker.name}\n`;
      text += `**ID**: ${edgeWorker.edgeWorkerId}\n`;
      text += `**Resource Tier**: ${args.resourceTierId}\n`;
      if (edgeWorker.description) {
        text += `**Description**: ${edgeWorker.description}\n`;
      }
      text += `\n💡 Next steps:\n`;
      text += `1. Upload code bundle using \`edge_compute_create_version\`\n`;
      text += `2. Test in staging using \`edge_compute_activate\`\n`;
      text += `3. Deploy to production when ready\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Update EdgeWorker
   */
  async updateEdgeWorker(args: z.infer<typeof EdgeComputeToolSchemas.updateEdgeWorker>): Promise<MCPToolResponse> {
    try {
      logger.info({ edgeWorkerId: args.edgeWorkerId }, 'Updating EdgeWorker');
      
      const updates: any = {};
      if (args.name) updates.name = args.name;
      if (args.description !== undefined) updates.description = args.description;
      
      await this.client.request({
        method: 'PUT',
        path: EdgeWorkersEndpoints.updateId(args.edgeWorkerId),
        body: updates
      });

      let text = `✅ **EdgeWorker Updated Successfully**\n\n`;
      text += `**EdgeWorker ID**: ${args.edgeWorkerId}\n`;
      if (args.name) {
        text += `**New Name**: ${args.name}\n`;
      }
      if (args.description !== undefined) {
        text += `**New Description**: ${args.description || '(removed)'}\n`;
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Delete EdgeWorker
   */
  async deleteEdgeWorker(args: z.infer<typeof EdgeComputeToolSchemas.deleteEdgeWorker>): Promise<MCPToolResponse> {
    try {
      logger.info({ edgeWorkerId: args.edgeWorkerId }, 'Deleting EdgeWorker');
      
      await this.client.request({
        method: 'DELETE',
        path: EdgeWorkersEndpoints.deleteId(args.edgeWorkerId)
      });

      let text = `✅ **EdgeWorker Deleted Successfully**\n\n`;
      text += `**EdgeWorker ID**: ${args.edgeWorkerId}\n`;
      text += `\n⚠️ Note: This action cannot be undone.\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Create EdgeWorker version
   */
  async createEdgeWorkerVersion(args: z.infer<typeof EdgeComputeToolSchemas.createEdgeWorkerVersion>): Promise<MCPToolResponse> {
    try {
      logger.info({ edgeWorkerId: args.edgeWorkerId }, 'Creating EdgeWorker version');
      
      const response = await this.client.request({
        method: 'POST',
        path: EdgeWorkersEndpoints.createVersion(args.edgeWorkerId),
        headers: {
          'Content-Type': 'application/gzip'
        },
        body: Buffer.from(args.bundleContent, 'base64')
      });

      const version = response as EdgeComputeResponse;

      let text = `✅ **EdgeWorker Version Created Successfully**\n\n`;
      text += `**EdgeWorker ID**: ${args.edgeWorkerId}\n`;
      text += `**Version**: ${version.version}\n`;
      text += `**File Size**: ${formatFileSize((version as any).fileSize || 0)}\n`;
      text += `**Checksum**: ${(version as any).checksum || 'N/A'}\n`;
      if (args.description) {
        text += `**Description**: ${args.description}\n`;
      }
      text += `\n💡 Next step: Activate this version using \`edge_compute_activate\`\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Activate EdgeWorker
   */
  async activateEdgeWorker(args: z.infer<typeof EdgeComputeToolSchemas.activateEdgeWorker>): Promise<MCPToolResponse> {
    try {
      logger.info({ 
        edgeWorkerId: args.edgeWorkerId, 
        version: args.version, 
        network: args.network 
      }, 'Activating EdgeWorker');
      
      const response = await this.client.request({
        method: 'POST',
        path: EdgeWorkersEndpoints.createActivation(args.edgeWorkerId),
        body: {
          version: args.version,
          network: args.network,
          note: args.note
        }
      });

      const activation = response as EdgeComputeResponse;

      let text = `🚀 **EdgeWorker Activation Started**\n\n`;
      text += `**EdgeWorker ID**: ${args.edgeWorkerId}\n`;
      text += `**Version**: ${args.version}\n`;
      text += `**Network**: ${args.network}\n`;
      text += `**Activation ID**: ${activation.activationId}\n`;
      text += `**Status**: ${activation.status}\n`;
      if (args.note) {
        text += `**Note**: ${args.note}\n`;
      }
      text += `\n⏳ Activation typically takes 5-10 minutes.\n`;
      text += `💡 Check status using \`edge_compute_get_activation_status\`\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * List Cloudlet policies
   */
  async listCloudletPolicies(args: z.infer<typeof EdgeComputeToolSchemas.listCloudletPolicies>): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Listing Cloudlet policies');
      
      const response = await this.client.request({
        method: 'GET',
        path: CloudletsEndpoints.listPolicies(),
        queryParams: {
          ...(args.cloudletType && { cloudletType: args.cloudletType }),
          ...(args.limit !== undefined && { limit: args.limit.toString() }),
          ...(args.offset !== undefined && { offset: args.offset.toString() })
        }
      });

      const policies = (response as EdgeComputeResponse).policies || [];

      let text = `☁️ **Cloudlet Policies**\n\n`;

      if (policies.length > 0) {
        text += `**Found ${policies.length} policies**\n\n`;
        
        // Group by cloudlet type
        const groupedPolicies: Record<string, any[]> = {};
        policies.forEach((policy: any) => {
          const type = policy.cloudletType || 'Unknown';
          if (!groupedPolicies[type]) {
            groupedPolicies[type] = [];
          }
          groupedPolicies[type].push(policy);
        });

        Object.entries(groupedPolicies).forEach(([type, typePolicies]) => {
          text += `### ${CloudletTypes[type as keyof typeof CloudletTypes] || type}\n`;
          typePolicies.forEach((policy: any, index: number) => {
            text += `${index + 1}. **${policy.name}** (ID: ${policy.policyId})\n`;
            if (policy.description) {
              text += `   • Description: ${policy.description}\n`;
            }
            text += `   • Modified: ${policy.lastModifiedDate} by ${policy.lastModifiedBy}\n`;
            text += `\n`;
          });
        });
      } else {
        text += '⚠️ No Cloudlet policies found.\n';
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Get Cloudlet policy details
   */
  async getCloudletPolicy(args: z.infer<typeof EdgeComputeToolSchemas.getCloudletPolicy>): Promise<MCPToolResponse> {
    try {
      logger.info({ policyId: args.policyId }, 'Getting Cloudlet policy details');
      
      const response = await this.client.request({
        method: 'GET',
        path: CloudletsEndpoints.getPolicy(args.policyId)
      });

      const policy = response as EdgeComputeResponse;

      let text = `☁️ **Cloudlet Policy Details**\n\n`;
      text += `**Name**: ${policy.name}\n`;
      text += `**ID**: ${policy.policyId}\n`;
      text += `**Type**: ${CloudletTypes[policy.cloudletType as keyof typeof CloudletTypes] || policy.cloudletType}\n`;
      if (policy.description) {
        text += `**Description**: ${policy.description}\n`;
      }
      text += `**Modified**: ${policy.lastModifiedDate} by ${policy.lastModifiedBy}\n`;

      // Get versions
      try {
        const versionsResponse = await this.client.request({
          method: 'GET',
          path: CloudletsEndpoints.listPolicyVersions(args.policyId),
          queryParams: { limit: '5' }
        });

        const versions = (versionsResponse as EdgeComputeResponse).policyVersions || [];
        
        if (versions.length > 0) {
          text += `\n**Recent Versions**:\n`;
          versions.forEach((version: any, index: number) => {
            text += `${index + 1}. Version ${version.version}\n`;
            text += `   • Rules: ${version.ruleCount || 0}\n`;
            text += `   • Modified: ${version.lastModifiedDate}\n`;
            if (version.description) {
              text += `   • Description: ${version.description}\n`;
            }
            text += `\n`;
          });
        }
      } catch {
        // Ignore version fetch errors
      }

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Create Cloudlet policy
   */
  async createCloudletPolicy(args: z.infer<typeof EdgeComputeToolSchemas.createCloudletPolicy>): Promise<MCPToolResponse> {
    try {
      logger.info({ name: args.name, cloudletType: args.cloudletType }, 'Creating Cloudlet policy');
      
      const response = await this.client.request({
        method: 'POST',
        path: CloudletsEndpoints.createPolicy(),
        body: {
          name: args.name,
          description: args.description,
          cloudletType: args.cloudletType,
          propertyId: args.propertyId
        }
      });

      const policy = response as EdgeComputeResponse;

      let text = `✅ **Cloudlet Policy Created Successfully**\n\n`;
      text += `**Name**: ${policy.name}\n`;
      text += `**ID**: ${policy.policyId}\n`;
      text += `**Type**: ${CloudletTypes[args.cloudletType] || args.cloudletType}\n`;
      if (policy.description) {
        text += `**Description**: ${policy.description}\n`;
      }
      text += `\n💡 Next steps:\n`;
      text += `1. Add rules using \`edge_compute_update_cloudlet_rules\`\n`;
      text += `2. Test in staging using \`edge_compute_activate_cloudlet\`\n`;
      text += `3. Deploy to production when ready\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Update Cloudlet policy rules
   */
  async updateCloudletPolicyRules(args: z.infer<typeof EdgeComputeToolSchemas.updateCloudletPolicyRules>): Promise<MCPToolResponse> {
    try {
      logger.info({ policyId: args.policyId, version: args.version }, 'Updating Cloudlet policy rules');
      
      await this.client.request({
        method: 'PUT',
        path: CloudletsEndpoints.updatePolicyVersion(args.policyId, args.version),
        body: {
          rules: args.rules
        }
      });

      let text = `✅ **Cloudlet Policy Rules Updated Successfully**\n\n`;
      text += `**Policy ID**: ${args.policyId}\n`;
      text += `**Version**: ${args.version}\n`;
      text += `**Rules Updated**: ${args.rules.length}\n\n`;
      
      text += `**Rules Summary**:\n`;
      args.rules.forEach((rule: any, index: number) => {
        text += `${index + 1}. ${rule.ruleName}\n`;
        text += `   • Matches: ${rule.matches.length} conditions\n`;
        text += `   • Behaviors: ${rule.behaviors.length} actions\n`;
        text += `\n`;
      });

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }

  /**
   * Activate Cloudlet policy
   */
  async activateCloudletPolicy(args: z.infer<typeof EdgeComputeToolSchemas.activateCloudletPolicy>): Promise<MCPToolResponse> {
    try {
      logger.info({ 
        policyId: args.policyId, 
        version: args.version, 
        network: args.network 
      }, 'Activating Cloudlet policy');
      
      const response = await this.client.request({
        method: 'POST',
        path: CloudletsEndpoints.activatePolicy(args.policyId),
        body: {
          version: args.version,
          network: args.network,
          additionalPropertyIds: args.additionalPropertyIds
        }
      });

      const activation = response as EdgeComputeResponse;

      let text = `🚀 **Cloudlet Policy Activation Started**\n\n`;
      text += `**Policy ID**: ${args.policyId}\n`;
      text += `**Version**: ${args.version}\n`;
      text += `**Network**: ${args.network}\n`;
      text += `**Status**: ${activation.status}\n`;
      if (args.additionalPropertyIds && args.additionalPropertyIds.length > 0) {
        text += `**Additional Properties**: ${args.additionalPropertyIds.length}\n`;
      }
      text += `\n⏳ Activation typically takes 5-10 minutes.\n`;
      text += `💡 Check status using \`edge_compute_get_cloudlet_activation_status\`\n`;

      return {
        content: [{ type: 'text', text }]
      };
    } catch (error) {
      return this.errorHandler.handleError(error);
    }
  }
}

/**
 * Create edge compute tools instance
 */
export const edgeComputeTools = new EdgeComputeTools();