/**
 * Enhanced Index Template
 * 
 * Generates index.ts for enhanced domains
 */

export interface EnhancedIndexTemplateVars {
  domainName: string;
  domainNamePascal: string;
  domainNameSnake: string;
  description: string;
  timestamp: string;
}

export function getEnhancedIndexTemplate(vars: EnhancedIndexTemplateVars): string {
  return `/**
 * ${vars.domainNamePascal} Domain Tools Export - Enhanced Pattern
 * 
 * This module exports all ${vars.domainName}-related tools using the enhanced BaseTool.execute pattern.
 * Features include dynamic customer support, caching, hints, and progress tracking.
 * 
 * Generated on ${vars.timestamp}
 */

import {
  list${vars.domainNamePascal},
  get${vars.domainNamePascal},
  create${vars.domainNamePascal},
  update${vars.domainNamePascal},
  delete${vars.domainNamePascal}
} from './${vars.domainName}-tools';
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
      customer: z.string().optional(),
      format: z.enum(['json', 'text']).optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      list${vars.domainNamePascal}(args)
  },

  // Get operations
  '${vars.domainNameSnake}_get': {
    description: 'Get ${vars.domainName} details',
    inputSchema: z.object({
      id: z.string(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      get${vars.domainNamePascal}(args)
  },

  // Create operations
  '${vars.domainNameSnake}_create': {
    description: 'Create a new ${vars.domainName}',
    inputSchema: z.object({
      name: z.string(),
      description: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      create${vars.domainNamePascal}(args)
  },

  // Update operations
  '${vars.domainNameSnake}_update': {
    description: 'Update ${vars.domainName}',
    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      update${vars.domainNamePascal}(args)
  },

  // Delete operations
  '${vars.domainNameSnake}_delete': {
    description: 'Delete ${vars.domainName}',
    inputSchema: z.object({
      id: z.string(),
      confirm: z.boolean().describe('Confirm deletion'),
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      delete${vars.domainNamePascal}(args)
  }
};

/**
 * Export enhanced tool functions
 */
export {
  list${vars.domainNamePascal},
  get${vars.domainNamePascal},
  create${vars.domainNamePascal},
  update${vars.domainNamePascal},
  delete${vars.domainNamePascal}
};

/**
 * ${vars.domainNamePascal} domain metadata for ALECSCore
 */
export const ${vars.domainName}DomainMetadata = {
  name: '${vars.domainName}',
  description: '${vars.description} with enhanced features',
  toolCount: Object.keys(${vars.domainName}Tools).length,
  features: [
    'Dynamic customer support',
    'Built-in caching for better performance',
    'Automatic hint integration',
    'Progress tracking for long operations',
    'Enhanced error messages with context'
  ],
  enhancedPattern: true
};`
}