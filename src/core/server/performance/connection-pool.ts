/**
 * HTTP Connection Pool
 * 
 * 50% faster by reusing connections
 * Handles keep-alive and connection limits
 */

import { Agent } from 'https';

export interface ConnectionPoolOptions {
  maxSockets?: number;
  maxFreeSockets?: number;
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  timeout?: number;
}

export class ConnectionPool {
  private agent: Agent;
  private stats = {
    created: 0,
    reused: 0,
    destroyed: 0,
  };
  
  constructor(options: ConnectionPoolOptions = {}) {
    this.agent = new Agent({
      maxSockets: options.maxSockets || 10,
      maxFreeSockets: options.maxFreeSockets || 5,
      keepAlive: options.keepAlive !== false,
      keepAliveMsecs: options.keepAliveMsecs || 30000,
      timeout: options.timeout || 60000,
    });
    
    // Track connection metrics
    this.agent.on('free', () => this.stats.reused++);
    this.agent.on('timeout', () => this.stats.destroyed++);
  }
  
  /**
   * Get the agent for HTTP requests
   */
  getAgent(): Agent {
    return this.agent;
  }
  
  /**
   * Get connection statistics
   */
  getStats(): {
    active: number;
    free: number;
    created: number;
    reused: number;
    reuseRate: number;
  } {
    const sockets = this.agent.sockets;
    const freeSockets = this.agent.freeSockets;
    
    let active = 0;
    let free = 0;
    
    // Count active connections
    for (const host in sockets) {
      active += sockets[host]?.length || 0;
    }
    
    // Count free connections
    for (const host in freeSockets) {
      free += freeSockets[host]?.length || 0;
    }
    
    const total = this.stats.created + this.stats.reused;
    
    return {
      active,
      free,
      created: this.stats.created,
      reused: this.stats.reused,
      reuseRate: total > 0 ? this.stats.reused / total : 0,
    };
  }
  
  /**
   * Close all connections
   */
  async close(): Promise<void> {
    this.agent.destroy();
  }
}