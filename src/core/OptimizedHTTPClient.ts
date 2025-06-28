import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface NetworkOptimizationTargets {
  latencyReduction: '70%';
  connectionReuse: '90%';
  failoverTime: '<500ms';
  poolSize: 25;
  http2Support: true;
}

export interface OptimizedHTTPConfig {
  maxSockets: number;
  maxFreeSockets: number;
  timeout: number;
  keepAlive: boolean;
  keepAliveMsecs: number;
  maxCachedSessions: number;
  http2: boolean;
  retryAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

export interface ConnectionMetrics {
  totalRequests: number;
  reuseCount: number;
  failureCount: number;
  averageLatency: number;
  http2Connections: number;
  http1Connections: number;
}

export interface DNSCacheEntry {
  addresses: string[];
  family: 4 | 6;
  ttl: number;
  timestamp: number;
}

export class OptimizedHTTPClient extends EventEmitter {
  private httpsAgents = new Map<string, HttpsAgent>();
  private httpAgents = new Map<string, HttpAgent>();
  private dnsCache = new LRUCache<string, DNSCacheEntry>({
    max: 1000,
    ttl: 300000, // 5 minutes
  });
  private metrics: ConnectionMetrics = {
    totalRequests: 0,
    reuseCount: 0,
    failureCount: 0,
    averageLatency: 0,
    http2Connections: 0,
    http1Connections: 0,
  };
  private config: OptimizedHTTPConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<OptimizedHTTPConfig> = {}) {
    super();

    this.config = {
      maxSockets: 25,
      maxFreeSockets: 10,
      timeout: 30000,
      keepAlive: true,
      keepAliveMsecs: 60000,
      maxCachedSessions: 100,
      http2: true,
      retryAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterMs: 100,
      ...config,
    };

    this.initializeHealthCheck();
  }

  /**
   * Get optimized HTTPS agent for a specific host
   */
  public getHttpsAgent(hostname: string): HttpsAgent {
    if (!this.httpsAgents.has(hostname)) {
      const agent = new HttpsAgent({
        maxSockets: this.config.maxSockets,
        maxFreeSockets: this.config.maxFreeSockets,
        timeout: this.config.timeout,
        keepAlive: this.config.keepAlive,
        keepAliveMsecs: this.config.keepAliveMsecs,
        maxCachedSessions: this.config.maxCachedSessions,
        // Enable HTTP/2 with ALPN negotiation
        ALPNProtocols: ['h2', 'http/1.1'],
        // Optimize for long-lived connections
        scheduling: 'fifo',
        // Custom DNS lookup with caching
        lookup: this.createDNSLookup(hostname),
      });

      // Monitor agent events
      agent.on('free', (socket) => {
        this.metrics.reuseCount++;
        this.emit('connectionReused', { hostname, socket });
      });

      this.httpsAgents.set(hostname, agent);
      this.emit('agentCreated', { hostname, protocol: 'https' });
    }

    return this.httpsAgents.get(hostname)!;
  }

  /**
   * Get optimized HTTP agent for a specific host
   */
  public getHttpAgent(hostname: string): HttpAgent {
    if (!this.httpAgents.has(hostname)) {
      const agent = new HttpAgent({
        maxSockets: this.config.maxSockets,
        maxFreeSockets: this.config.maxFreeSockets,
        timeout: this.config.timeout,
        keepAlive: this.config.keepAlive,
        keepAliveMsecs: this.config.keepAliveMsecs,
        scheduling: 'fifo',
        lookup: this.createDNSLookup(hostname),
      });

      agent.on('free', (socket) => {
        this.metrics.reuseCount++;
        this.emit('connectionReused', { hostname, socket });
      });

      this.httpAgents.set(hostname, agent);
      this.emit('agentCreated', { hostname, protocol: 'http' });
    }

    return this.httpAgents.get(hostname)!;
  }

  /**
   * Create DNS lookup function with caching
   */
  private createDNSLookup(_hostname: string) {
    return (hostname: string, _options: any, callback: any) => {
      const cacheKey = `${hostname}:${_options.family || 4}`;
      const cached = this.dnsCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.emit('dnsCacheHit', { hostname, family: cached.family });
        return callback(null, cached.addresses[0], cached.family);
      }

      // Use Node.js dns module for lookup
      const dns = require('dns');
      const lookupFn = _options.family === 6 ? dns.lookup : dns.lookup;

      lookupFn(hostname, _options, (_err: any, address: string, family: number) => {
        if (_err) {
          this.emit('dnsLookupError', { hostname, _error: _err });
          return callback(_err);
        }

        // Cache the result
        this.dnsCache.set(cacheKey, {
          addresses: [address],
          family: family as 4 | 6,
          ttl: 300000, // 5 minutes
          timestamp: Date.now(),
        });

        this.emit('dnsLookupSuccess', { hostname, address, family });
        callback(null, address, family);
      });
    };
  }

  /**
   * Execute HTTP request with optimizations
   */
  public async executeRequest(
    options: any,
    data?: Buffer | string,
  ): Promise<{ response: any; data: Buffer; metrics: any }> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    const hostname = options.hostname || options.host;
    const isHttps = options.protocol === 'https:' || options.port === 443;

    // Get appropriate agent
    const agent = isHttps ? this.getHttpsAgent(hostname) : this.getHttpAgent(hostname);
    options.agent = agent;

    // Track HTTP version
    if (options.agent.protocol === 'h2') {
      this.metrics.http2Connections++;
    } else {
      this.metrics.http1Connections++;
    }

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.config.retryAttempts) {
      try {
        const result = await this.makeRequest(options, data);

        // Update metrics
        const latency = performance.now() - startTime;
        this.updateLatencyMetrics(latency);

        this.emit('requestSuccess', {
          hostname,
          attempt: attempt + 1,
          latency,
          http2: options.agent.protocol === 'h2',
        });

        return {
          ...result,
          metrics: {
            latency,
            attempt: attempt + 1,
            http2: options.agent.protocol === 'h2',
            connectionReused: result.socket?.reused || false,
          },
        };
      } catch (_error) {
        lastError = _error as Error;
        attempt++;
        this.metrics.failureCount++;

        if (attempt < this.config.retryAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          this.emit('requestRetry', { hostname, attempt, delay, _error });
          await this.sleep(delay);
        }
      }
    }

    this.emit('requestFailed', { hostname, attempts: attempt, _error: lastError });
    throw lastError;
  }

  /**
   * Make single HTTP request
   */
  private makeRequest(_options: any, data?: Buffer | string): Promise<any> {
    return new Promise((resolve, reject) => {
      const protocol = _options.protocol === 'https:' ? 'https' : 'http';
      const mod = require(protocol);

      const req = mod._request(_options, (_res: any) => {
        const chunks: Buffer[] = [];

        _res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        _res.on('end', () => {
          const responseData = Buffer.concat(chunks);
          resolve({
            _response: _res,
            data: responseData,
            socket: _res.socket,
          });
        });

        _res.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(data);
      }

      req.end();
    });
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * this.config.jitterMs;
    const delay = Math.min(baseDelay + jitter, this.config.maxDelayMs);
    return Math.floor(delay);
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    const totalLatency = this.metrics.averageLatency * (this.metrics.totalRequests - 1);
    this.metrics.averageLatency = (totalLatency + latency) / this.metrics.totalRequests;
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection reuse rate
   */
  public getConnectionReuseRate(): number {
    return this.metrics.totalRequests > 0
      ? (this.metrics.reuseCount / this.metrics.totalRequests) * 100
      : 0;
  }

  /**
   * Initialize health check for connections
   */
  private initializeHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health check on connections
   */
  private performHealthCheck(): void {
    const reuseRate = this.getConnectionReuseRate();
    const failureRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.failureCount / this.metrics.totalRequests) * 100
        : 0;

    this.emit('healthCheck', {
      reuseRate,
      failureRate,
      averageLatency: this.metrics.averageLatency,
      activeConnections: this.getActiveConnectionCount(),
    });

    // Alert if performance degrades
    if (reuseRate < 70) {
      // Target is 90%, alert if below 70%
      this.emit('performanceAlert', {
        type: 'low_reuse_rate',
        value: reuseRate,
        threshold: 70,
      });
    }

    if (failureRate > 5) {
      // Alert if failure rate above 5%
      this.emit('performanceAlert', {
        type: 'high_failure_rate',
        value: failureRate,
        threshold: 5,
      });
    }
  }

  /**
   * Get active connection count across all agents
   */
  private getActiveConnectionCount(): number {
    let count = 0;

    for (const agent of this.httpsAgents.values()) {
      count += Object.keys(agent.sockets).length;
      count += Object.keys(agent.freeSockets).length;
    }

    for (const agent of this.httpAgents.values()) {
      count += Object.keys(agent.sockets).length;
      count += Object.keys(agent.freeSockets).length;
    }

    return count;
  }

  /**
   * Clear DNS cache
   */
  public clearDNSCache(): void {
    this.dnsCache.clear();
    this.emit('dnsCacheCleared');
  }

  /**
   * Destroy all agents and clear resources
   */
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Destroy all agents
    for (const agent of this.httpsAgents.values()) {
      agent.destroy();
    }
    for (const agent of this.httpAgents.values()) {
      agent.destroy();
    }

    this.httpsAgents.clear();
    this.httpAgents.clear();
    this.dnsCache.clear();

    this.emit('destroyed');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
