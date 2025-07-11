/**
 * FastPurge Tools Module
 * 
 * Exports all FastPurge-related tools for content purging and cache invalidation
 * 
 * Updated on 2025-01-11 to use BaseTool.execute pattern
 */

import {
  purgeUrls,
  purgeCPCodes,
  purgeTags,
  checkPurgeStatus,
  getQueueStatus
} from './fastpurge-tools';
import { CustomerSchema } from '../common';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { MCPToolResponse } from '../../types/mcp-protocol';

// Re-export schemas for external use
const NetworkSchema = z.enum(['staging', 'production']).default('staging');
const ActionSchema = z.enum(['invalidate', 'delete']).default('invalidate');

const FastPurgeUrlSchema = CustomerSchema.extend({
  urls: z.array(z.string().url()).min(1).max(5000).describe('URLs to purge (max 5000)'),
  network: NetworkSchema,
  action: ActionSchema,
});

const FastPurgeCPCodeSchema = CustomerSchema.extend({
  cpcodes: z.array(z.string()).min(1).max(100).describe('CP codes to purge (max 100)'),
  network: NetworkSchema,
  action: ActionSchema,
});

const FastPurgeTagSchema = CustomerSchema.extend({
  tags: z.array(z.string()).min(1).max(100).describe('Cache tags to purge (max 100)'),
  network: NetworkSchema,
  action: ActionSchema,
});

const PurgeStatusSchema = CustomerSchema.extend({
  purgeId: z.string().describe('Purge operation ID to check status'),
});

/**
 * Tool interface with proper typing
 */
interface FastPurgeTool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (client: unknown, args: Record<string, unknown>) => Promise<MCPToolResponse>;
}

/**
 * FastPurge Domain Tools
 * 
 * Complete FastPurge API implementation following MCP patterns
 */
export const fastpurgeTools: Record<string, FastPurgeTool> = {
  'fastpurge_invalidate_urls': {
    name: 'fastpurge_invalidate_urls',
    description: 'Purge URLs from Akamai edge cache',
    inputSchema: zodToJsonSchema(FastPurgeUrlSchema),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = FastPurgeUrlSchema.parse(args);
      return purgeUrls(validatedArgs);
    }
  },

  'fastpurge_invalidate_cpcodes': {
    name: 'fastpurge_invalidate_cpcodes',
    description: 'Purge content by CP codes',
    inputSchema: zodToJsonSchema(FastPurgeCPCodeSchema),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = FastPurgeCPCodeSchema.parse(args);
      return purgeCPCodes(validatedArgs);
    }
  },

  'fastpurge_invalidate_tags': {
    name: 'fastpurge_invalidate_tags',
    description: 'Purge content by cache tags',
    inputSchema: zodToJsonSchema(FastPurgeTagSchema),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = FastPurgeTagSchema.parse(args);
      return purgeTags(validatedArgs);
    }
  },

  'fastpurge_status': {
    name: 'fastpurge_status',
    description: 'Check status of a purge operation',
    inputSchema: zodToJsonSchema(PurgeStatusSchema),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = PurgeStatusSchema.parse(args);
      return checkPurgeStatus(validatedArgs);
    }
  },

  'fastpurge_queue_status': {
    name: 'fastpurge_queue_status',
    description: 'Get FastPurge queue status',
    inputSchema: zodToJsonSchema(CustomerSchema),
    handler: async (_client: unknown, args: Record<string, unknown>): Promise<MCPToolResponse> => {
      const validatedArgs = CustomerSchema.parse(args);
      return getQueueStatus(validatedArgs);
    }
  }
};

/**
 * Handler function for FastPurge tool execution (for backwards compatibility)
 */
export async function handleFastPurgeToolCall(name: string, args: Record<string, unknown>): Promise<MCPToolResponse> {
  const tool = fastpurgeTools[name];
  if (!tool) {
    throw new Error(`Unknown FastPurge tool: ${name}`);
  }
  return tool.handler(null, args);
}

// Export for backward compatibility with tools-registry.ts
export const FastPurgeTools = fastpurgeTools;

// Export default
export default fastpurgeTools;

// Also export monitoring tools if they exist
export { FastPurgeMonitoringTools } from './monitoring-tools';