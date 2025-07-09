#!/usr/bin/env node
/**
 * ALECS FastPurge Server - ALECSCore Implementation
 * 
 * Specialized server for content purging and cache invalidation
 * Built on ALECSCore architecture for consistency with other domains
 * 
 * Features:
 * - URL-based purging (up to 5000 URLs)
 * - CP Code-based purging (up to 100 CP codes)
 * - Tag-based purging (up to 100 tags)
 * - Purge status checking
 * - Queue status monitoring
 * - Purge estimation
 * 
 * Supports both invalidate and delete actions on staging/production networks
 */

import { ALECSCore, tool } from '../core/server/alecs-core';
import { FastPurgeTools } from '../tools/fastpurge/consolidated-fastpurge-tools';
import { FastPurgeMonitoringTools } from '../tools/fastpurge/monitoring-tools';
import { logger } from '../utils/pino-logger';

/**
 * FastPurge Server implementation using ALECSCore
 */
export class FastPurgeServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-fastpurge',
      version: '1.7.4',
      description: 'Akamai FastPurge Tools - Content invalidation and cache purging'
    });
  }

  // Define tools using ALECSCore pattern
  override tools = [
    // Core FastPurge tools
    ...Object.entries(FastPurgeTools.getAllTools()).map(([name, toolDef]) => {
      const toolInstance = tool(name, toolDef.inputSchema, async (args, ctx) => {
        // Handler returns just the data, ALECSCore wraps it
        const result = await toolDef.handler(ctx.client, args);
        // Extract the content from MCPToolResponse
        return result.content[0]?.text || '';
      }, {
        cache: name.includes('status') || name.includes('queue') ? { ttl: 5 * 1000 } : undefined
      });
      
      // Override the description
      toolInstance.description = toolDef.description;
      return toolInstance;
    }),
    
    // Monitoring tools
    ...Object.entries(FastPurgeMonitoringTools.getAllTools()).map(([name, toolDef]) => {
      const toolInstance = tool(name, toolDef.inputSchema, async (args, ctx) => {
        const result = await toolDef.handler(ctx.client, args);
        return result.content[0]?.text || '';
      }, {
        cache: name.includes('monitor') ? { ttl: 30 * 1000 } : undefined // 30s cache for monitoring
      });
      
      toolInstance.description = toolDef.description;
      return toolInstance;
    })
  ];
}

// Main execution
async function main() {
  const server = new FastPurgeServer();
  
  try {
    await server.start();
    logger.info('FastPurge server started successfully');
  } catch (error) {
    logger.error('Failed to start FastPurge server', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in FastPurge server', { error });
    process.exit(1);
  });
}

export default FastPurgeServer;