/**
 * Edge Compute Domain Index
 * 
 * MCP-compliant tool definitions for EdgeWorkers and Cloudlets operations
 * 
 * Generated on 2025-07-10T04:07:56.616Z using ALECSCore CLI
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { MCPToolResponse } from '../../types/mcp-protocol';
import { edgeComputeTools } from './edge-compute-tools';
import { EdgeComputeToolSchemas } from './edge-compute-api-implementation';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Edge Compute Domain Tools
 * 
 * Complete EdgeWorkers and Cloudlets API implementation following MCP patterns
 */
export const edgeComputeToolsRegistry: Record<string, Tool> = {
  // EdgeWorkers Tools
  'edge_compute_list_edgeworkers': {
    name: 'edge_compute_list_edgeworkers',
    description: 'List all EdgeWorkers with optional filtering',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.listEdgeWorkers) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.listEdgeWorkers(args)
  },

  'edge_compute_get_edgeworker': {
    name: 'edge_compute_get_edgeworker',
    description: 'Get EdgeWorker details including recent versions',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.getEdgeWorker) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.getEdgeWorker(args)
  },

  'edge_compute_create_edgeworker': {
    name: 'edge_compute_create_edgeworker',
    description: 'Create a new EdgeWorker',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.createEdgeWorker) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.createEdgeWorker(args)
  },

  'edge_compute_update_edgeworker': {
    name: 'edge_compute_update_edgeworker',
    description: 'Update EdgeWorker name or description',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.updateEdgeWorker) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.updateEdgeWorker(args)
  },

  'edge_compute_delete_edgeworker': {
    name: 'edge_compute_delete_edgeworker',
    description: 'Delete an EdgeWorker (cannot be undone)',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.deleteEdgeWorker) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.deleteEdgeWorker(args)
  },

  'edge_compute_create_version': {
    name: 'edge_compute_create_version',
    description: 'Upload a new EdgeWorker code bundle version',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.createEdgeWorkerVersion) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.createEdgeWorkerVersion(args)
  },

  'edge_compute_activate_edgeworker': {
    name: 'edge_compute_activate_edgeworker',
    description: 'Activate EdgeWorker version to staging or production',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.activateEdgeWorker) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.activateEdgeWorker(args)
  },

  // Cloudlets Tools
  'edge_compute_list_cloudlet_policies': {
    name: 'edge_compute_list_cloudlet_policies',
    description: 'List all Cloudlet policies with optional filtering by type',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.listCloudletPolicies) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.listCloudletPolicies(args)
  },

  'edge_compute_get_cloudlet_policy': {
    name: 'edge_compute_get_cloudlet_policy',
    description: 'Get Cloudlet policy details including recent versions',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.getCloudletPolicy) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.getCloudletPolicy(args)
  },

  'edge_compute_create_cloudlet_policy': {
    name: 'edge_compute_create_cloudlet_policy',
    description: 'Create a new Cloudlet policy',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.createCloudletPolicy) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.createCloudletPolicy(args)
  },

  'edge_compute_update_cloudlet_rules': {
    name: 'edge_compute_update_cloudlet_rules',
    description: 'Update Cloudlet policy rules',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.updateCloudletPolicyRules) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.updateCloudletPolicyRules(args)
  },

  'edge_compute_activate_cloudlet': {
    name: 'edge_compute_activate_cloudlet',
    description: 'Activate Cloudlet policy version to staging or production',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.activateCloudletPolicy) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      edgeComputeTools.activateCloudletPolicy(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export { edgeComputeTools };

/**
 * Export for dynamic registration
 */
export default edgeComputeToolsRegistry;