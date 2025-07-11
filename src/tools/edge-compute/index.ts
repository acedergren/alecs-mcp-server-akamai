/**
 * Edge Compute Domain Index
 * 
 * MCP-compliant tool definitions for EdgeWorkers and Cloudlets operations
 * 
 * Updated on 2025-01-11 to use BaseTool.execute pattern
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { MCPToolResponse } from '../../types/mcp-protocol';
import { 
  listEdgeWorkers,
  getEdgeWorker,
  createEdgeWorker,
  uploadEdgeWorkerVersion,
  activateEdgeWorker,
  listCloudletsPolicies,
  getCloudletPolicy,
  createCloudletPolicy,
  activateCloudletPolicy
} from './edge-compute-tools';
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
      listEdgeWorkers(args)
  },

  'edge_compute_get_edgeworker': {
    name: 'edge_compute_get_edgeworker',
    description: 'Get EdgeWorker details including recent versions',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.getEdgeWorker) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      getEdgeWorker(args)
  },

  'edge_compute_create_edgeworker': {
    name: 'edge_compute_create_edgeworker',
    description: 'Create a new EdgeWorker',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.createEdgeWorker) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      createEdgeWorker(args)
  },

  'edge_compute_upload_edgeworker_version': {
    name: 'edge_compute_upload_edgeworker_version',
    description: 'Upload a new EdgeWorker code bundle version',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.uploadEdgeWorkerVersion) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      uploadEdgeWorkerVersion(args)
  },

  'edge_compute_activate_edgeworker': {
    name: 'edge_compute_activate_edgeworker',
    description: 'Activate EdgeWorker version to staging or production',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.activateEdgeWorker) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      activateEdgeWorker(args)
  },

  // Cloudlets Tools
  'edge_compute_list_cloudlets_policies': {
    name: 'edge_compute_list_cloudlets_policies',
    description: 'List all Cloudlet policies with optional filtering by type',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.listCloudletsPolicies) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      listCloudletsPolicies(args)
  },

  'edge_compute_get_cloudlet_policy': {
    name: 'edge_compute_get_cloudlet_policy',
    description: 'Get Cloudlet policy details including recent versions',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.getCloudletPolicy) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      getCloudletPolicy(args)
  },

  'edge_compute_create_cloudlet_policy': {
    name: 'edge_compute_create_cloudlet_policy',
    description: 'Create a new Cloudlet policy',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.createCloudletPolicy) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      createCloudletPolicy(args)
  },

  'edge_compute_activate_cloudlet': {
    name: 'edge_compute_activate_cloudlet',
    description: 'Activate Cloudlet policy version to staging or production',
    inputSchema: zodToJsonSchema(EdgeComputeToolSchemas.activateCloudletPolicy) as any,
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      activateCloudletPolicy(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export { 
  listEdgeWorkers,
  getEdgeWorker,
  createEdgeWorker,
  uploadEdgeWorkerVersion,
  activateEdgeWorker,
  listCloudletsPolicies,
  getCloudletPolicy,
  createCloudletPolicy,
  activateCloudletPolicy
};

/**
 * Export for dynamic registration
 */
export default edgeComputeToolsRegistry;