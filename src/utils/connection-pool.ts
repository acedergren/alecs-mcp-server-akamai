/**
 * HTTP Connection Pool
 * 
 * Provides connection pooling and keep-alive for better performance
 * when making multiple requests to Akamai APIs
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

export interface ConnectionPoolOptions {
  /**
   * Maximum number of sockets to allow per host
   * Default: 50
   */
  maxSockets?: number;

  /**
   * Maximum number of sockets to allow total
   * Default: 100
   */
  maxTotalSockets?: number;

  /**
   * Maximum number of sockets to leave open in free state
   * Default: 10
   */
  maxFreeSockets?: number;

  /**
   * Socket timeout in milliseconds
   * Default: 60000 (60 seconds)
   */
  timeout?: number;

  /**
   * Keep-alive timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  keepAliveTimeout?: number;

  /**
   * Enable keep-alive
   * Default: true
   */
  keepAlive?: boolean;

  /**
   * Initial delay for keep-alive probes
   * Default: 1000 (1 second)
   */
  keepAliveInitialDelay?: number;
}

/**
 * Connection pool manager for HTTP/HTTPS requests
 */
export class ConnectionPool {
  private static instance: ConnectionPool;
  private httpAgent: HttpAgent;
  private httpsAgent: HttpsAgent;
  private options: Required<ConnectionPoolOptions>;

  private constructor(options: ConnectionPoolOptions = {}) {
    this.options = {
      maxSockets: options.maxSockets || 50,
      maxTotalSockets: options.maxTotalSockets || 100,
      maxFreeSockets: options.maxFreeSockets || 10,
      timeout: options.timeout || 60000,
      keepAliveTimeout: options.keepAliveTimeout || 30000,
      keepAlive: options.keepAlive !== false,
      keepAliveInitialDelay: options.keepAliveInitialDelay || 1000,
    };

    // Create HTTP agent
    this.httpAgent = new HttpAgent({
      keepAlive: this.options.keepAlive,
      keepAliveMsecs: this.options.keepAliveInitialDelay,
      maxSockets: this.options.maxSockets,
      maxTotalSockets: this.options.maxTotalSockets,
      maxFreeSockets: this.options.maxFreeSockets,
      timeout: this.options.timeout,
    });

    // Create HTTPS agent
    this.httpsAgent = new HttpsAgent({
      keepAlive: this.options.keepAlive,
      keepAliveMsecs: this.options.keepAliveInitialDelay,
      maxSockets: this.options.maxSockets,
      maxTotalSockets: this.options.maxTotalSockets,
      maxFreeSockets: this.options.maxFreeSockets,
      timeout: this.options.timeout,
      // Additional HTTPS options
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: ConnectionPoolOptions): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool(options);
    }
    return ConnectionPool.instance;
  }

  /**
   * Get HTTP agent
   */
  getHttpAgent(): HttpAgent {
    return this.httpAgent;
  }

  /**
   * Get HTTPS agent
   */
  getHttpsAgent(): HttpsAgent {
    return this.httpsAgent;
  }

  /**
   * Get agent based on protocol
   */
  getAgent(protocol: string): HttpAgent | HttpsAgent {
    return protocol === 'https:' ? this.httpsAgent : this.httpAgent;
  }

  /**
   * Get current socket statistics
   */
  getStats(): {
    http: {
      sockets: number;
      freeSockets: number;
      requests: number;
    };
    https: {
      sockets: number;
      freeSockets: number;
      requests: number;
    };
  } {
    return {
      http: {
        sockets: Object.keys(this.httpAgent.sockets).reduce(
          (acc, key) => acc + (this.httpAgent.sockets[key]?.length || 0),
          0
        ),
        freeSockets: Object.keys(this.httpAgent.freeSockets).reduce(
          (acc, key) => acc + (this.httpAgent.freeSockets[key]?.length || 0),
          0
        ),
        requests: Object.keys(this.httpAgent.requests).reduce(
          (acc, key) => acc + (this.httpAgent.requests[key]?.length || 0),
          0
        ),
      },
      https: {
        sockets: Object.keys(this.httpsAgent.sockets).reduce(
          (acc, key) => acc + (this.httpsAgent.sockets[key]?.length || 0),
          0
        ),
        freeSockets: Object.keys(this.httpsAgent.freeSockets).reduce(
          (acc, key) => acc + (this.httpsAgent.freeSockets[key]?.length || 0),
          0
        ),
        requests: Object.keys(this.httpsAgent.requests).reduce(
          (acc, key) => acc + (this.httpsAgent.requests[key]?.length || 0),
          0
        ),
      },
    };
  }

  /**
   * Destroy all sockets and reset the pool
   */
  destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }

  /**
   * Update configuration
   */
  updateConfig(options: ConnectionPoolOptions): void {
    this.destroy();
    ConnectionPool.instance = new ConnectionPool(options);
  }
}

/**
 * Default connection pool instance
 */
export const defaultPool = ConnectionPool.getInstance();

/**
 * Helper to get agent for a URL
 */
export function getAgentForUrl(url: string | URL): HttpAgent | HttpsAgent {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  return defaultPool.getAgent(urlObj.protocol);
}