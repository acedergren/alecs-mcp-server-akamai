#!/usr/bin/env node
/**
 * ALECS SIEM Server - ALECSCore Implementation
 * 
 * Specialized server for Security Information and Event Management (SIEM)
 * Built on ALECSCore architecture for consistency with other domains
 * 
 * Features:
 * - Real-time security event streaming (near real-time via polling)
 * - Event filtering by security configuration and policy
 * - Time-based and offset-based event retrieval
 * - 12-hour event replay capability
 * - Support for WAF, Bot Manager, DDoS, and other security events
 * 
 * No local storage required - events are streamed directly from Akamai
 */

import { ALECSCore, tool } from '../core/server/alecs-core';
import { SIEMTools } from '../tools/siem/consolidated-siem-tools';
import { logger } from '../utils/pino-logger';

/**
 * SIEM Server implementation using ALECSCore
 */
export class SIEMServer extends ALECSCore {
  constructor() {
    super({
      name: 'alecs-siem',
      version: '1.7.4',
      description: 'Akamai SIEM Integration Tools - Security event streaming and analysis'
    });
  }

  // Define tools using ALECSCore pattern
  override tools = Object.entries(SIEMTools.getAllTools()).map(([name, toolDef]) => {
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
  });
}

// Main execution
async function main() {
  const server = new SIEMServer();
  
  try {
    await server.start();
    logger.info('SIEM server started successfully');
  } catch (error) {
    logger.error('Failed to start SIEM server', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in SIEM server', { error });
    process.exit(1);
  });
}

export default SIEMServer;