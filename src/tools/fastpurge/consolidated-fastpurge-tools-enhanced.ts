/**
 * FastPurge Tools - Enhanced CLI Pattern
 * 
 * CODE KAI IMPLEMENTATION:
 * - All content purging and cache invalidation tools
 * - Dynamic customer support
 * - Built-in caching for status checks
 * - Automatic hint integration
 * - Progress tracking for bulk operations
 * 
 * This module handles URL purging, CP code purging, tag-based purging,
 * status checking, and queue management.
 */

import { z } from 'zod';
import { CustomerSchema } from '../common';
import { EnhancedTool, type MCPToolResponse } from '../common';

// Create enhanced tool instance for FastPurge domain
const fastPurgeTool = new EnhancedTool('fastpurge');

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
 * Format purge response
 */
function formatPurgeResponse(response: any, args: any, type: string): string {
  const emoji = args.action === 'delete' ? '🗑️' : '🔄';
  
  let text = `${emoji} **FastPurge ${type} ${args.action} - ${args.network.toUpperCase()}**\n\n`;
  text += `**Purge ID:** ${response.purgeId}\n`;
  text += `**Estimated Time:** ${response.estimatedSeconds || '<5'} seconds\n`;
  text += `**Support ID:** ${response.supportId}\n`;
  
  if (type === 'URL') {
    text += `**URLs Purged:** ${args.urls.length}\n`;
    if (args.urls.length <= 10) {
      text += `\n**URLs:**\n`;
      args.urls.forEach((url: string) => {
        text += `• ${url}\n`;
      });
    } else {
      text += `\n**Sample URLs:**\n`;
      args.urls.slice(0, 5).forEach((url: string) => {
        text += `• ${url}\n`;
      });
      text += `_... and ${args.urls.length - 5} more_\n`;
    }
  } else if (type === 'CP Code') {
    text += `**CP Codes Purged:** ${args.cpcodes.length}\n`;
    text += `\n**CP Codes:** ${args.cpcodes.join(', ')}\n`;
  } else if (type === 'Tag') {
    text += `**Tags Purged:** ${args.tags.length}\n`;
    text += `\n**Tags:** ${args.tags.join(', ')}\n`;
  }
  
  text += `\n✅ Purge request submitted successfully!`;
  
  return text;
}

/**
 * FastPurge URL handler - Enhanced
 */
export async function purgeUrls(args: z.infer<typeof FastPurgeUrlSchema>): Promise<MCPToolResponse> {
  return fastPurgeTool.execute(
    'fastpurge_url',
    args,
    async (client) => {
      return client.request({
        path: `/ccu/v3/${args.action}/url/${args.network}`,
        method: 'POST',
        body: {
          objects: args.urls
        }
      });
    },
    {
      format: 'text',
      formatter: (data) => formatPurgeResponse(data, args, 'URL'),
      progress: args.urls.length > 100,
      progressMessage: `Purging ${args.urls.length} URLs...`
    }
  );
}

/**
 * FastPurge CP Code handler - Enhanced
 */
export async function purgeCPCodes(args: z.infer<typeof FastPurgeCPCodeSchema>): Promise<MCPToolResponse> {
  return fastPurgeTool.execute(
    'fastpurge_cpcode',
    args,
    async (client) => {
      return client.request({
        path: `/ccu/v3/${args.action}/cpcode/${args.network}`,
        method: 'POST',
        body: {
          objects: args.cpcodes
        }
      });
    },
    {
      format: 'text',
      formatter: (data) => formatPurgeResponse(data, args, 'CP Code')
    }
  );
}

/**
 * FastPurge Tag handler - Enhanced
 */
export async function purgeTags(args: z.infer<typeof FastPurgeTagSchema>): Promise<MCPToolResponse> {
  return fastPurgeTool.execute(
    'fastpurge_tag',
    args,
    async (client) => {
      return client.request({
        path: `/ccu/v3/${args.action}/tag/${args.network}`,
        method: 'POST',
        body: {
          objects: args.tags
        }
      });
    },
    {
      format: 'text',
      formatter: (data) => formatPurgeResponse(data, args, 'Tag')
    }
  );
}

/**
 * Check purge status - Enhanced with caching
 */
export async function checkPurgeStatus(args: z.infer<typeof PurgeStatusSchema>): Promise<MCPToolResponse> {
  return fastPurgeTool.execute(
    'fastpurge_status',
    args,
    async (client) => {
      return client.request({
        path: `/ccu/v3/purges/${args.purgeId}`,
        method: 'GET'
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        const statusEmoji = {
          'In-Progress': '⏳',
          'Done': '✅',
          'Failed': '❌',
          'Unknown': '❓'
        }[response.purgeStatus] || '❓';
        
        let text = `${statusEmoji} **Purge Status**\n\n`;
        text += `**Purge ID:** ${response.purgeId}\n`;
        text += `**Status:** ${response.purgeStatus}\n`;
        text += `**Progress:** ${response.percentComplete || 0}%\n`;
        text += `**Submitted By:** ${response.submittedBy}\n`;
        text += `**Submission Time:** ${new Date(response.submissionTime).toLocaleString()}\n`;
        
        if (response.completionTime) {
          text += `**Completion Time:** ${new Date(response.completionTime).toLocaleString()}\n`;
          const duration = new Date(response.completionTime).getTime() - 
                          new Date(response.submissionTime).getTime();
          text += `**Duration:** ${Math.round(duration / 1000)} seconds\n`;
        }
        
        text += `\n**Network:** ${response.network}\n`;
        text += `**Action:** ${response.action}\n`;
        
        if (response.purgeStatus === 'Done') {
          text += `\n✅ Purge completed successfully!`;
        } else if (response.purgeStatus === 'Failed') {
          text += `\n❌ Purge failed. Please check the Support ID: ${response.supportId}`;
        }
        
        return text;
      },
      cacheKey: (p) => `fastpurge:status:${p.purgeId}`,
      cacheTtl: 10 // Cache for 10 seconds since status changes quickly
    }
  );
}

/**
 * Check queue status - Enhanced
 */
export async function checkQueueStatus(args: { customer?: string }): Promise<MCPToolResponse> {
  return fastPurgeTool.execute(
    'fastpurge_queue_status',
    args,
    async (client) => {
      return client.request({
        path: '/ccu/v3/queues/default',
        method: 'GET'
      });
    },
    {
      format: 'text',
      formatter: (response) => {
        let text = `📊 **FastPurge Queue Status**\n\n`;
        text += `**Queue Length:** ${response.queueLength || 0} requests\n`;
        text += `**Estimated Wait Time:** ${response.estimatedQueueTime || '<5'} seconds\n`;
        
        if (response.queueLength === 0) {
          text += `\n✅ Queue is clear - purges will process immediately!`;
        } else if (response.queueLength < 100) {
          text += `\n⚡ Queue is light - minimal delays expected.`;
        } else {
          text += `\n⚠️ Queue is busy - consider spacing out purge requests.`;
        }
        
        return text;
      },
      cacheKey: 'fastpurge:queue:status',
      cacheTtl: 30 // Cache for 30 seconds
    }
  );
}

/**
 * Enhanced FastPurge Tools export
 */
export const enhancedFastPurgeTools = {
  purgeUrls,
  purgeCPCodes,
  purgeTags,
  checkPurgeStatus,
  checkQueueStatus
};

/**
 * Schema exports for CLI tool generation
 */
export const FastPurgeSchemas = {
  purgeUrls: FastPurgeUrlSchema,
  purgeCPCodes: FastPurgeCPCodeSchema,
  purgeTags: FastPurgeTagSchema,
  checkPurgeStatus: PurgeStatusSchema
};