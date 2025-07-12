/**
 * FastPurge Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides type-safe FastPurge API interactions
 * - Implements proper multi-tenant support
 * - Eliminates 'unknown' type errors through schemas
 * 
 * This module handles URL purging, CP code purging, tag-based purging,
 * status checking, and queue management.
 * 
 * Updated on 2025-01-11 to use AkamaiOperation.execute pattern
 */

import { type MCPToolResponse, AkamaiOperation } from '../common';
import { z } from 'zod';
import { CustomerSchema } from '../common';

/**
 * FastPurge-specific schemas
 */
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
 * Response schemas  
 */
const PurgeResponseSchema = z.object({
  purgeId: z.string(),
  estimatedSeconds: z.number(),
  progressUri: z.string(),
  pingAfterSeconds: z.number(),
  supportId: z.string(),
  httpStatus: z.number(),
  detail: z.string().optional(),
  title: z.string().optional()
});

const PurgeStatusResponseSchema = z.object({
  purgeId: z.string(),
  purgeStatus: z.string(),
  submittedBy: z.string(),
  submissionTime: z.string(),
  completionTime: z.string().optional(),
  progressUri: z.string().optional(),
  purgedCount: z.number().optional()
});

const QueueStatusResponseSchema = z.object({
  queueLength: z.number(),
  detail: z.string()
});

/**
 * Format purge response for display
 */
function formatPurgeResponse(response: z.infer<typeof PurgeResponseSchema>, type: string): string {
  let text = `✅ **FastPurge ${type} Request Submitted**\n\n`;
  text += `**Purge ID**: ${response.purgeId}\n`;
  text += `**Estimated Time**: ${response.estimatedSeconds} seconds\n`;
  text += `**Support ID**: ${response.supportId}\n`;
  
  if (response.detail) {
    text += `**Details**: ${response.detail}\n`;
  }
  
  text += `\n📝 **Note**: Check status with fastpurge_status using purge ID: ${response.purgeId}`;
  
  return text;
}

/**
 * Format status response for display
 */
function formatStatusResponse(response: z.infer<typeof PurgeStatusResponseSchema>): string {
  let text = `📊 **FastPurge Status**\n\n`;
  text += `**Purge ID**: ${response.purgeId}\n`;
  text += `**Status**: ${response.purgeStatus}\n`;
  text += `**Submitted By**: ${response.submittedBy}\n`;
  text += `**Submission Time**: ${response.submissionTime}\n`;
  
  if (response.completionTime) {
    text += `**Completion Time**: ${response.completionTime}\n`;
  }
  
  if (response.purgedCount !== undefined) {
    text += `**Objects Purged**: ${response.purgedCount}\n`;
  }
  
  return text;
}

/**
 * Purge URLs from cache
 */
export async function purgeUrls(args: z.infer<typeof FastPurgeUrlSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'fastpurge',
    'fastpurge_invalidate_urls',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: `/ccu/v3/${args.action}/url/${args.network}`,
        body: {
          objects: args.urls
        }
      });
      
      return PurgeResponseSchema.parse(response);
    },
    {
      format: 'text',
      formatter: (result) => formatPurgeResponse(result as any, 'URL'),
      progress: true,
    }
  );
}

/**
 * Purge CP codes from cache
 */
export async function purgeCPCodes(args: z.infer<typeof FastPurgeCPCodeSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'fastpurge',
    'fastpurge_invalidate_cpcodes',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: `/ccu/v3/${args.action}/cpcode/${args.network}`,
        body: {
          objects: args.cpcodes
        }
      });
      
      return PurgeResponseSchema.parse(response);
    },
    {
      format: 'text',
      formatter: (result) => formatPurgeResponse(result as any, 'CP Code'),
      progress: true,
      translation: {
        mappings: [
          { path: 'objects[*]', type: 'cpcode' }
        ]
      }
    }
  );
}

/**
 * Purge cache tags
 */
export async function purgeTags(args: z.infer<typeof FastPurgeTagSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'fastpurge',
    'fastpurge_invalidate_tags',
    args,
    async (client) => {
      const response = await client.request({
        method: 'POST',
        path: `/ccu/v3/${args.action}/tag/${args.network}`,
        body: {
          objects: args.tags
        }
      });
      
      return PurgeResponseSchema.parse(response);
    },
    {
      format: 'text',
      formatter: (result) => formatPurgeResponse(result, 'Tag'),
      progress: true
    }
  );
}

/**
 * Check purge status
 */
export async function checkPurgeStatus(args: z.infer<typeof PurgeStatusSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'fastpurge',
    'fastpurge_status',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: `/ccu/v3/purges/${args.purgeId}`
      });
      
      return PurgeStatusResponseSchema.parse(response);
    },
    {
      format: 'text',
      formatter: formatStatusResponse,
      cacheKey: (p) => `fastpurge:status:${p.purgeId}`,
      cacheTtl: 30 // 30 seconds
    }
  );
}

/**
 * Get queue status
 */
export async function getQueueStatus(args: z.infer<typeof CustomerSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'fastpurge',
    'fastpurge_queue_status',
    args,
    async (client) => {
      const response = await client.request({
        method: 'GET',
        path: '/ccu/v3/queues/default'
      });
      
      return QueueStatusResponseSchema.parse(response);
    },
    {
      format: 'text',
      formatter: (result) => {
        let text = `📊 **FastPurge Queue Status**\n\n`;
        text += `**Queue Length**: ${result.queueLength} requests\n`;
        text += `**Status**: ${result.detail}\n`;
        
        if (result.queueLength > 100) {
          text += `\n⚠️ **Note**: Queue is currently busy. Your purge requests may take longer than usual.`;
        }
        
        return text;
      },
      cacheKey: () => 'fastpurge:queue:status',
      cacheTtl: 10 // 10 seconds
    }
  );
}

/**
 * Legacy class exports for backward compatibility
 * @deprecated Use direct function exports instead
 */
export const fastPurgeOperations = {
  purgeUrls,
  purgeCPCodes,
  purgeTags,
  checkPurgeStatus,
  getQueueStatus
};