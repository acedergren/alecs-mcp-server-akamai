/**
 * Utility Domain Tools Export
 * 
 * This module exports all utility-related tools for use with ALECSCore.
 * It consolidates FastPurge, CP Codes, Includes, and Reporting
 * functionality into a clean interface.
 */

import { consolidatedUtilityTools } from './consolidated-utility-tools';
import { z } from 'zod';
import { type MCPToolResponse } from '../../types';

/**
 * Utility tool definitions for ALECSCore registration
 */
export const utilityTools = {
  // FastPurge operations
  'fastpurge.url': {
    description: 'Invalidate content by URL',
    inputSchema: z.object({
      urls: z.array(z.string()),
      network: z.enum(['staging', 'production']).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.fastPurgeByURL(args)
  },

  'fastpurge.cpcode': {
    description: 'Invalidate content by CP code',
    inputSchema: z.object({
      cpcodes: z.array(z.string()),
      network: z.enum(['staging', 'production']).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.fastPurgeByCPCode(args)
  },

  'fastpurge.tag': {
    description: 'Invalidate content by cache tag',
    inputSchema: z.object({
      tags: z.array(z.string()),
      network: z.enum(['staging', 'production']).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.fastPurgeByTag(args)
  },

  'fastpurge.status': {
    description: 'Check FastPurge operation status',
    inputSchema: z.object({
      purgeId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.fastPurgeStatus(args)
  },

  // CP Code operations
  'cpcode.list': {
    description: 'List CP codes',
    inputSchema: z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.listCPCodes(args)
  },

  'cpcode.create': {
    description: 'Create a new CP code',
    inputSchema: z.object({
      cpcodeName: z.string(),
      contractId: z.string(),
      groupId: z.string(),
      productId: z.string(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.createCPCode(args)
  },

  // Include operations
  'include.list': {
    description: 'List property includes',
    inputSchema: z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.listIncludes(args)
  },

  'include.create': {
    description: 'Create a new include',
    inputSchema: z.object({
      includeName: z.string(),
      includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']),
      contractId: z.string(),
      groupId: z.string(),
      productId: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.createInclude(args)
  },

  // Reporting operations
  'reporting.traffic': {
    description: 'Get traffic report',
    inputSchema: z.object({
      propertyId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      granularity: z.enum(['FIVE_MINUTES', 'HOUR', 'DAY', 'WEEK', 'MONTH']).optional(),
      metrics: z.array(z.string()).optional(),
      groupBy: z.enum(['cpcode', 'hostname', 'geo', 'protocol']).optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.getTrafficReport(args)
  }
};

/**
 * Export individual tool handlers for backwards compatibility
 */
export const {
  fastPurgeByURL,
  fastPurgeByCPCode,
  fastPurgeByTag,
  fastPurgeStatus,
  listCPCodes,
  createCPCode,
  listIncludes,
  createInclude,
  getTrafficReport
} = consolidatedUtilityTools;

/**
 * Export the consolidated tools instance
 */
export { consolidatedUtilityTools };

/**
 * Utility domain metadata for ALECSCore
 */
export const utilityDomainMetadata = {
  name: 'utility',
  description: 'Akamai Utilities - FastPurge, CP Codes, Includes, and Reporting',
  toolCount: Object.keys(utilityTools).length,
  consolidationStats: {
    originalFiles: 4,
    consolidatedFiles: 2,
    errorReduction: 206,
    codeReduction: '50%'
  }
};