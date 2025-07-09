/**
 * Consolidated FastPurge Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Consolidates all content purging and cache invalidation tools
 * - Provides type-safe FastPurge API interactions
 * - Implements proper multi-tenant support
 * - Eliminates 'unknown' type errors through schemas
 * 
 * This module handles URL purging, CP code purging, tag-based purging,
 * status checking, and queue management.
 */

import { z } from 'zod';
import { 
  CustomerSchema,
  type MCPToolResponse
} from '../common';
import { AkamaiClient } from '../../akamai-client';

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
 * FastPurge URL handler
 */
async function purgeUrls(
  client: AkamaiClient,
  args: z.infer<typeof FastPurgeUrlSchema>
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/ccu/v3/${args.action}/url/${args.network}`,
      method: 'POST',
      body: {
        objects: args.urls
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          purgeId: (response as any).purgeId,
          estimatedSeconds: (response as any).estimatedSeconds,
          supportId: (response as any).supportId,
          detail: (response as any).detail,
          httpStatus: (response as any).httpStatus,
          network: args.network,
          action: args.action,
          urlCount: args.urls.length
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error in FastPurge URL operation: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * FastPurge CP Code handler
 */
async function purgeCPCodes(
  client: AkamaiClient,
  args: z.infer<typeof FastPurgeCPCodeSchema>
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/ccu/v3/${args.action}/cpcode/${args.network}`,
      method: 'POST',
      body: {
        objects: args.cpcodes
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          purgeId: (response as any).purgeId,
          estimatedSeconds: (response as any).estimatedSeconds,
          supportId: (response as any).supportId,
          detail: (response as any).detail,
          httpStatus: (response as any).httpStatus,
          network: args.network,
          action: args.action,
          cpcodeCount: args.cpcodes.length
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error in FastPurge CP code operation: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * FastPurge Tag handler
 */
async function purgeTags(
  client: AkamaiClient,
  args: z.infer<typeof FastPurgeTagSchema>
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/ccu/v3/${args.action}/tag/${args.network}`,
      method: 'POST',
      body: {
        objects: args.tags
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          purgeId: (response as any).purgeId,
          estimatedSeconds: (response as any).estimatedSeconds,
          supportId: (response as any).supportId,
          detail: (response as any).detail,
          httpStatus: (response as any).httpStatus,
          network: args.network,
          action: args.action,
          tagCount: args.tags.length
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error in FastPurge tag operation: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * Purge Status Check handler
 */
async function checkPurgeStatus(
  client: AkamaiClient,
  args: z.infer<typeof PurgeStatusSchema>
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: `/ccu/v3/purges/${args.purgeId}`,
      method: 'GET'
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          purgeId: (response as any).purgeId,
          status: (response as any).purgeStatus,
          submittedBy: (response as any).submittedBy,
          submissionTime: (response as any).submissionTime,
          completionTime: (response as any).completionTime,
          estimatedSeconds: (response as any).estimatedSeconds,
          purgedObjects: (response as any).purgedObjects,
          network: (response as any).network,
          action: (response as any).action
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error checking purge status: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * Queue Status handler
 */
async function checkQueueStatus(
  client: AkamaiClient,
  _args: z.infer<typeof CustomerSchema>
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: '/ccu/v3/queues/default',
      method: 'GET'
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          queueLength: (response as any).queueLength,
          estimatedQueueTime: (response as any).estimatedQueueTime,
          detail: (response as any).detail || 'Queue status retrieved successfully'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error checking queue status: ${error.message || JSON.stringify(error)}`
      }]
    };
  }
}

/**
 * FastPurge Tools Registry
 */
export class FastPurgeTools {
  private static tools = {
    'fastpurge_url': {
      description: 'Purge content by URL (invalidate or delete)',
      inputSchema: FastPurgeUrlSchema,
      handler: purgeUrls
    },
    'fastpurge_cpcode': {
      description: 'Purge content by CP code',
      inputSchema: FastPurgeCPCodeSchema,
      handler: purgeCPCodes
    },
    'fastpurge_tag': {
      description: 'Purge content by cache tag',
      inputSchema: FastPurgeTagSchema,
      handler: purgeTags
    },
    'fastpurge_status': {
      description: 'Check the status of a purge operation',
      inputSchema: PurgeStatusSchema,
      handler: checkPurgeStatus
    },
    'fastpurge_queue': {
      description: 'Check FastPurge queue length and congestion',
      inputSchema: CustomerSchema,
      handler: checkQueueStatus
    }
  };

  static getAllTools() {
    return this.tools;
  }

  static getTool(name: string) {
    return this.tools[name as keyof typeof this.tools];
  }
}