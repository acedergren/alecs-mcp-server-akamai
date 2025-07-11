/**
 * GTM Domain Index
 * 
 * MCP-compliant tool definitions for Global Traffic Management operations
 * 
 * Updated on 2025-01-11 to use BaseTool.execute pattern
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { MCPToolResponse } from '../../types/mcp-protocol';
import { 
  listDomains,
  getDomain,
  createDomain,
  listDatacenters,
  createDatacenter,
  listProperties,
  getProperty,
  createProperty,
  updatePropertyTraffic
} from './gtm-tools';
import { GTMToolSchemas } from './gtm-api-implementation';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Tool interface with proper typing
 */
interface GTMTool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (client: unknown, args: Record<string, unknown>) => Promise<MCPToolResponse>;
}

/**
 * GTM Domain Tools
 * 
 * Complete Global Traffic Management API implementation following MCP patterns
 */
export const gtmTools: Record<string, GTMTool> = {
  // Domain Management
  'gtm_list_domains': {
    name: 'gtm_list_domains',
    description: 'List all GTM domains',
    inputSchema: zodToJsonSchema(GTMToolSchemas.listDomains),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.listDomains.parse(args);
      return listDomains(validatedArgs);
    }
  },

  'gtm_get_domain': {
    name: 'gtm_get_domain',
    description: 'Get GTM domain details including datacenters and properties',
    inputSchema: zodToJsonSchema(GTMToolSchemas.getDomain),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.getDomain.parse(args);
      return getDomain(validatedArgs);
    }
  },

  'gtm_create_domain': {
    name: 'gtm_create_domain',
    description: 'Create a new GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.createDomain),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.createDomain.parse(args);
      return createDomain(validatedArgs);
    }
  },

  // Datacenter Management
  'gtm_list_datacenters': {
    name: 'gtm_list_datacenters',
    description: 'List all datacenters for a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.listDatacenters),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.listDatacenters.parse(args);
      return listDatacenters(validatedArgs);
    }
  },

  'gtm_create_datacenter': {
    name: 'gtm_create_datacenter',
    description: 'Create a new datacenter for a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.createDatacenter),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.createDatacenter.parse(args);
      return createDatacenter(validatedArgs);
    }
  },

  // Property Management
  'gtm_list_properties': {
    name: 'gtm_list_properties',
    description: 'List all properties for a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.listProperties),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.listProperties.parse(args);
      return listProperties(validatedArgs);
    }
  },

  'gtm_get_property': {
    name: 'gtm_get_property',
    description: 'Get GTM property details including traffic distribution',
    inputSchema: zodToJsonSchema(GTMToolSchemas.getProperty),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.getProperty.parse(args);
      return getProperty(validatedArgs);
    }
  },

  'gtm_create_property': {
    name: 'gtm_create_property',
    description: 'Create a new property for a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.createProperty),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.createProperty.parse(args);
      return createProperty(validatedArgs);
    }
  },

  'gtm_update_property_traffic': {
    name: 'gtm_update_property_traffic',
    description: 'Update traffic distribution for a GTM property',
    inputSchema: zodToJsonSchema(GTMToolSchemas.updatePropertyTraffic),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.updatePropertyTraffic.parse(args);
      return updatePropertyTraffic(validatedArgs);
    }
  }
};

/**
 * Handler function for GTM tool execution (for backwards compatibility)
 */
export async function handleGTMToolCall(name: string, args: Record<string, unknown>): Promise<MCPToolResponse> {
  const tool = gtmTools[name];
  if (!tool) {
    throw new Error(`Unknown GTM tool: ${name}`);
  }
  return tool.handler(null, args);
}

// Export all tools as default
export default gtmTools;