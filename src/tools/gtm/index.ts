/**
 * GTM Domain Export Module
 * 
 * This module exports all GTM (Global Traffic Management) tools for use in the MCP server
 * 
 * Generated on 2025-07-10T04:21:59.540Z using ALECSCore CLI
 */

// Tool type is not needed for this implementation
import { GTMTools } from './gtm-tools';
import { GTMToolSchemas } from './gtm-api-implementation';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { MCPToolResponse } from '../../types/mcp-protocol';
import type { z } from 'zod';

// Create a singleton instance for backwards compatibility
const gtmToolsInstance = new GTMTools();

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
 * GTM Domain Tools with handlers
 * 
 * Complete GTM API implementation following MCP patterns
 */
export const gtmTools: Record<string, GTMTool> = {
  // Domain Management
  'gtm_list_domains': {
    name: 'gtm_list_domains',
    description: 'List all GTM domains with their types and status',
    inputSchema: zodToJsonSchema(GTMToolSchemas.listDomains),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.listDomains.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.listDomains(restArgs as z.infer<typeof GTMToolSchemas.listDomains>);
    }
  },
  'gtm_create_domain': {
    name: 'gtm_create_domain',
    description: 'Create a new GTM domain for global traffic management',
    inputSchema: zodToJsonSchema(GTMToolSchemas.createDomain),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.createDomain.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.createDomain(restArgs as z.infer<typeof GTMToolSchemas.createDomain>);
    }
  },
  'gtm_get_domain': {
    name: 'gtm_get_domain',
    description: 'Get detailed information about a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.getDomain),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.getDomain.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getDomain(restArgs as z.infer<typeof GTMToolSchemas.getDomain>);
    }
  },
  'gtm_update_domain': {
    name: 'gtm_update_domain',
    description: 'Update GTM domain configuration',
    inputSchema: zodToJsonSchema(GTMToolSchemas.updateDomain),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.updateDomain.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.updateDomain(restArgs as z.infer<typeof GTMToolSchemas.updateDomain>);
    }
  },
  'gtm_get_domain_status': {
    name: 'gtm_get_domain_status',
    description: 'Get propagation status and validation state of a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.getDomainStatus),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.getDomainStatus.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.getDomainStatus(restArgs as z.infer<typeof GTMToolSchemas.getDomainStatus>);
    }
  },
  
  // Datacenter Management
  'gtm_list_datacenters': {
    name: 'gtm_list_datacenters',
    description: 'List all datacenters in a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.listDatacenters),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.listDatacenters.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.listDatacenters(restArgs as z.infer<typeof GTMToolSchemas.listDatacenters>);
    }
  },
  'gtm_create_datacenter': {
    name: 'gtm_create_datacenter',
    description: 'Create a new datacenter for traffic routing',
    inputSchema: zodToJsonSchema(GTMToolSchemas.createDatacenter),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.createDatacenter.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.createDatacenter(restArgs as z.infer<typeof GTMToolSchemas.createDatacenter>);
    }
  },
  'gtm_update_datacenter': {
    name: 'gtm_update_datacenter',
    description: 'Update datacenter information and location',
    inputSchema: zodToJsonSchema(GTMToolSchemas.updateDatacenter),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.updateDatacenter.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.updateDatacenter(restArgs as z.infer<typeof GTMToolSchemas.updateDatacenter>);
    }
  },
  'gtm_delete_datacenter': {
    name: 'gtm_delete_datacenter',
    description: 'Delete a datacenter from GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.deleteDatacenter),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.deleteDatacenter.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.deleteDatacenter(restArgs as z.infer<typeof GTMToolSchemas.deleteDatacenter>);
    }
  },
  
  // Property Management
  'gtm_list_properties': {
    name: 'gtm_list_properties',
    description: 'List all properties in a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.listProperties),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.listProperties.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.listProperties(restArgs as z.infer<typeof GTMToolSchemas.listProperties>);
    }
  },
  'gtm_create_property': {
    name: 'gtm_create_property',
    description: 'Create a new GTM property for traffic management',
    inputSchema: zodToJsonSchema(GTMToolSchemas.createProperty),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.createProperty.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.createProperty(restArgs as z.infer<typeof GTMToolSchemas.createProperty>);
    }
  },
  'gtm_update_property': {
    name: 'gtm_update_property',
    description: 'Update property traffic targets and liveness tests',
    inputSchema: zodToJsonSchema(GTMToolSchemas.updateProperty),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.updateProperty.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.updateProperty(restArgs as z.infer<typeof GTMToolSchemas.updateProperty>);
    }
  },
  'gtm_delete_property': {
    name: 'gtm_delete_property',
    description: 'Delete a property from GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.deleteProperty),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.deleteProperty.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.deleteProperty(restArgs as z.infer<typeof GTMToolSchemas.deleteProperty>);
    }
  },
  
  // Geographic Maps
  'gtm_create_geographic_map': {
    name: 'gtm_create_geographic_map',
    description: 'Create geographic map for location-based routing',
    inputSchema: zodToJsonSchema(GTMToolSchemas.createGeographicMap),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.createGeographicMap.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.createGeographicMap(restArgs as z.infer<typeof GTMToolSchemas.createGeographicMap>);
    }
  },
  'gtm_update_geographic_map': {
    name: 'gtm_update_geographic_map',
    description: 'Update geographic map assignments',
    inputSchema: zodToJsonSchema(GTMToolSchemas.updateGeographicMap),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.updateGeographicMap.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.updateGeographicMap(restArgs as z.infer<typeof GTMToolSchemas.updateGeographicMap>);
    }
  },
  
  // Resource Management
  'gtm_list_resources': {
    name: 'gtm_list_resources',
    description: 'List all resources in a GTM domain',
    inputSchema: zodToJsonSchema(GTMToolSchemas.listResources),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.listResources.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.listResources(restArgs as z.infer<typeof GTMToolSchemas.listResources>);
    }
  },
  'gtm_create_resource': {
    name: 'gtm_create_resource',
    description: 'Create a resource for load measurement',
    inputSchema: zodToJsonSchema(GTMToolSchemas.createResource),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = GTMToolSchemas.createResource.parse(args);
      const customer = validatedArgs.customer || 'default';
      const toolInstance = new GTMTools(customer);
      const { customer: _, ...restArgs } = validatedArgs;
      return toolInstance.createResource(restArgs as z.infer<typeof GTMToolSchemas.createResource>);
    }
  }
};

// Removed gtmDomainTools export as it's not needed with the new pattern

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

/**
 * Export for backwards compatibility
 */
export { gtmToolsInstance };

// Export all tools as default
export default gtmTools;