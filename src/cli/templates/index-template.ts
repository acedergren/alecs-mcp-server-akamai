/**
 * Index Template
 * 
 * Generates index.ts file for new domains
 */

export interface IndexTemplateVars {
  domainName: string;
  domainNamePascal: string;
  domainNameSnake: string;
  description: string;
  apiName: string;
  timestamp: string;
}

export function getIndexTemplate(vars: IndexTemplateVars): string {
  return `/**
 * ${vars.domainNamePascal} Domain Tools Export
 * 
 * ${vars.description}
 * 
 * Generated on ${vars.timestamp} using ALECSCore CLI
 */

import { ${vars.domainName}Tools as consolidated${vars.domainNamePascal}Tools } from './${vars.domainName}-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * ${vars.domainNamePascal} tool definitions for ALECSCore registration
 */
export const ${vars.domainName}Tools = {
  // List operations
  '${vars.domainNameSnake}_list': {
    description: 'List all ${vars.domainName} resources',
    inputSchema: z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidated${vars.domainNamePascal}Tools.listResources(args)
  },

  // Get operations
  '${vars.domainNameSnake}_get': {
    description: 'Get specific ${vars.domainName} resource',
    inputSchema: z.object({
      id: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidated${vars.domainNamePascal}Tools.getResource(args)
  },

  // Create operations
  '${vars.domainNameSnake}_create': {
    description: 'Create new ${vars.domainName} resource',
    inputSchema: z.object({
      name: z.string(),
      description: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidated${vars.domainNamePascal}Tools.createResource(args)
  },

  // Update operations
  '${vars.domainNameSnake}_update': {
    description: 'Update existing ${vars.domainName} resource',
    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidated${vars.domainNamePascal}Tools.updateResource(args)
  },

  // Delete operations
  '${vars.domainNameSnake}_delete': {
    description: 'Delete ${vars.domainName} resource',
    inputSchema: z.object({
      id: z.string(),
      confirm: z.boolean().describe('Confirm deletion'),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidated${vars.domainNamePascal}Tools.deleteResource(args)
  },

  // Search operations
  '${vars.domainNameSnake}_search': {
    description: 'Search ${vars.domainName} resources',
    inputSchema: z.object({
      searchTerm: z.string(),
      limit: z.number().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidated${vars.domainNamePascal}Tools.searchResources(args)
  }

  // TODO: Add more tools here using: alecs generate tool ${vars.domainName} <tool-name>
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  searchResources
} = consolidated${vars.domainNamePascal}Tools;

/**
 * Export the domain tools instance
 */
export { consolidated${vars.domainNamePascal}Tools };

/**
 * Export the new naming convention
 */
export { consolidated${vars.domainNamePascal}Tools as ${vars.domainName}Tools };

/**
 * ${vars.domainNamePascal} domain metadata for ALECSCore
 */
export const ${vars.domainName}DomainMetadata = {
  name: '${vars.domainName}',
  description: '${vars.description}',
  toolCount: Object.keys(${vars.domainName}Tools).length,
  features: [
    'Basic ${vars.domainName} CRUD operations',
    'Search and filtering capabilities',
    'Domain tools architecture',
    'Type-safe parameter validation',
    'Comprehensive error handling'
  ],
  apiIntegration: {
    name: '${vars.apiName}',
    baseUrl: 'https://akzz-XXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXX.luna.akamaiapis.net',
    authentication: 'EdgeGrid',
    documentation: 'https://developer.akamai.com/'
  }
};
`;
}