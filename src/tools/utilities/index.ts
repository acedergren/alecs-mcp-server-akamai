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
  // FastPurge operations are handled by fastpurge module

  // fastpurge.status removed - handled by fastpurge module

  // CP Code operations
  'cpcode_list': {
    description: 'List CP codes',
    inputSchema: z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
      customer: z.string().optional()
    }),
    handler: async (args: any): Promise<MCPToolResponse> => 
      consolidatedUtilityTools.listCPCodes(args)
  },

  'cpcode_create': {
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

  // Reporting operations are handled by reporting module
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
  description: 'Akamai Utilities - CP Codes and Common Operations',
  toolCount: Object.keys(utilityTools).length,
  consolidationStats: {
    originalFiles: 4,
    consolidatedFiles: 2,
    errorReduction: 206,
    codeReduction: '50%'
  }
};