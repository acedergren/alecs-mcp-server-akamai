/**
 * HEALTH CHECK ENDPOINT FOR MCP SERVER
 * 
 * Provides debugging information and server health status
 * Useful for monitoring and troubleshooting
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createLogger } from './logger';
import os from 'os';
import { AkamaiMCPServer } from './akamai-server-factory';

const healthLogger = createLogger('health-check');

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  tools: {
    total: number;
    loaded: number;
    names?: string[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpuCount: number;
    loadAverage: number[];
  };
  environment: {
    logLevel: string;
    mcpDebug: boolean;
    traceTools: boolean;
    nodeEnv: string;
  };
  metrics?: {
    toolExecutions: Array<{
      tool: string;
      count: number;
    }>;
  };
}

/**
 * Add health check handler to MCP server
 */
export function addHealthCheckHandler(
  server: Server,
  akamaiServer: AkamaiMCPServer
): void {
  // Add custom health check handler
  // Note: 'health' is a custom method, not part of standard MCP
  (server as Server & { setCustomHandler?: (method: string, handler: () => Promise<any>) => void }).setCustomHandler?.('health', async () => {
    healthLogger.debug('Health check requested');
    
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const usedMem = memUsage.heapUsed + memUsage.external;
    
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.6.2',
      tools: {
        total: 171, // Known total
        loaded: akamaiServer.getLoadedTools().length,
        names: process.env['MCP_DEBUG'] === 'true' ? 
          akamaiServer.getLoadedTools().map(t => t.name) : 
          undefined
      },
      memory: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round((usedMem / totalMem) * 100)
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg()
      },
      environment: {
        logLevel: process.env['LOG_LEVEL'] || 'info',
        mcpDebug: process.env['MCP_DEBUG'] === 'true',
        traceTools: process.env['TRACE_TOOLS'] === 'true',
        nodeEnv: process.env['NODE_ENV'] || 'production'
      }
    };
    
    // Add metrics if available
    const metrics = akamaiServer.getMetrics();
    if (metrics.length > 0) {
      result.metrics = {
        toolExecutions: metrics
          .map(m => ({ tool: m.toolName, count: m.executionCount }))
          .sort((a, b) => b.count - a.count)
      };
    }
    
    // Determine health status
    if (result.tools.loaded < result.tools.total * 0.5) {
      result.status = 'unhealthy';
    } else if (result.memory.percentage > 90) {
      result.status = 'degraded';
    }
    
    healthLogger.info({ status: result.status }, 'Health check completed');
    
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  });
  
  healthLogger.info('Health check endpoint registered');
}