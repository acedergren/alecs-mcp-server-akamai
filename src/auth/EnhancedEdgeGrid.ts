import EdgeGrid = require('akamai-edgegrid');
import { OptimizedHTTPClient } from '../core/OptimizedHTTPClient';
import { CircuitBreaker } from '../resilience/CircuitBreaker';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface EnhancedEdgeGridConfig {
  edgercPath?: string;
  section?: string;
  optimizedClient?: OptimizedHTTPClient;
  circuitBreaker?: CircuitBreaker;
  timeoutMs?: number;
  retryAttempts?: number;
  monkeyPatchSDK?: boolean;
}

export interface AuthenticationMetrics {
  totalRequests: number;
  successfulAuth: number;
  failedAuth: number;
  averageAuthTime: number;
  timeoutCount: number;
  circuitBreakerTrips: number;
}

export interface EdgeGridRequestOptions {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeout?: number;
  maxRedirects?: number;
}

export class EnhancedEdgeGrid extends EventEmitter {
  private edgeGrid: EdgeGrid;
  private optimizedClient: OptimizedHTTPClient;
  private circuitBreaker: CircuitBreaker;
  private config: Required<EnhancedEdgeGridConfig>;
  private metrics: AuthenticationMetrics = {
    totalRequests: 0,
    successfulAuth: 0,
    failedAuth: 0,
    averageAuthTime: 0,
    timeoutCount: 0,
    circuitBreakerTrips: 0
  };
  private originalAuth: ((_req: any) => any) | null = null;

  constructor(config: EnhancedEdgeGridConfig = {}) {
    super();
    
    this.config = {
      edgercPath: config.edgercPath || process.env.EDGERC_PATH || '~/.edgerc',
      section: config.section || process.env.EDGERC_SECTION || 'default',
      optimizedClient: config.optimizedClient || new OptimizedHTTPClient(),
      circuitBreaker: config.circuitBreaker || new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        recoveryTimeout: 30000,
        monitorTimeout: 5000
      },
      timeoutMs: config.timeoutMs || 30000,
      retryAttempts: config.retryAttempts || 3,
      monkeyPatchSDK: config.monkeyPatchSDK !== false
    };

    // Initialize EdgeGrid with configuration
    this.edgeGrid = new EdgeGrid({
      path: this.config.edgercPath,
      section: this.config.section
    });

    this.optimizedClient = this.config.optimizedClient;
    this.circuitBreaker = this.config.circuitBreaker;

    // Apply monkey patch to EdgeGrid SDK if enabled
    if (this.config.monkeyPatchSDK) {
      this.applyMonkeyPatch();
    }

    this.setupEventHandlers();
  }

  /**
   * Apply monkey patch to EdgeGrid SDK for optimization
   * This addresses the lack of keep-alive support in the original SDK
   */
  private applyMonkeyPatch(): void {
    if (!this.edgeGrid.auth) {
      this.emit('monkeyPatchError', new Error('EdgeGrid auth method not found'));
      return;
    }

    // Store original auth method
    this.originalAuth = this.edgeGrid.auth.bind(this.edgeGrid);
    
    // Replace with enhanced auth method
    this.edgeGrid.auth = (requestOptions: any) => {
      const startTime = performance.now();
      
      try {
        // Apply original authentication
        const authenticatedOptions = this.originalAuth!(requestOptions);
        
        // Get hostname for agent selection
        const hostname = authenticatedOptions.hostname || 
                        authenticatedOptions.host || 
                        this.extractHostnameFromUrl(authenticatedOptions.url);
        
        if (hostname) {
          // Apply optimized HTTP agent
          const isHttps = authenticatedOptions.protocol === 'https:' || 
                         authenticatedOptions.port === 443 ||
                         authenticatedOptions.url?.startsWith('https:');
          
          authenticatedOptions.agent = isHttps 
            ? this.optimizedClient.getHttpsAgent(hostname)
            : this.optimizedClient.getHttpAgent(hostname);
        }

        // Apply enhanced configurations
        authenticatedOptions.timeout = this.config.timeoutMs;
        authenticatedOptions.keepAlive = true;
        authenticatedOptions.keepAliveMsecs = 60000;
        
        // Add custom headers for optimization
        authenticatedOptions.headers = {
          ...authenticatedOptions.headers,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60, max=100'
        };

        // Add account switch key if available
        const accountSwitchKey = process.env.AKAMAI_ACCOUNT_SWITCH_KEY;
        if (accountSwitchKey) {
          authenticatedOptions.headers['account-switch-key'] = accountSwitchKey;
        }

        const authTime = performance.now() - startTime;
        this.updateAuthMetrics(authTime, true);
        
        this.emit('authSuccess', {
          hostname,
          authTime,
          keepAlive: true,
          http2: authenticatedOptions.agent?.protocol === 'h2'
        });

        return authenticatedOptions;
      } catch (_error) {
        const authTime = performance.now() - startTime;
        this.updateAuthMetrics(authTime, false);
        
        this.emit('authError', { _error, authTime });
        throw _error;
      }
    };

    this.emit('monkeyPatchApplied', { 
      originalAuth: !!this.originalAuth,
      optimizedClient: !!this.optimizedClient 
    });
  }

  /**
   * Execute authenticated _request with circuit breaker protection
   */
  public async executeRequest(
    _options: EdgeGridRequestOptions,
    data?: string | Buffer
  ): Promise<{ response: any; data: Buffer; metrics: any }> {
    this.metrics.totalRequests++;
    
    return this.circuitBreaker.execute(async () => {
      const startTime = performance.now();
      
      try {
        // Prepare _request _options
        const requestOptions = {
          method: _options.method,
          path: _options.path,
          headers: _options.headers || {},
          body: data,
          timeout: _options.timeout || this.config.timeoutMs,
          maxRedirects: _options.maxRedirects || 5
        };

        // Apply EdgeGrid authentication
        const authenticatedOptions = this.edgeGrid.auth(requestOptions);
        
        // Execute _request through optimized client
        const result = await this.optimizedClient.executeRequest(
          authenticatedOptions,
          data
        );

        const totalTime = performance.now() - startTime;
        this.metrics.successfulAuth++;
        
        this.emit('requestSuccess', {
          path: _options.path,
          method: _options.method,
          totalTime,
          authTime: result.metrics?.authTime,
          networkTime: result.metrics?.latency
        });

        return {
          ...result,
          metrics: {
            ...result.metrics,
            totalTime,
            circuitBreakerState: this.circuitBreaker.getState()
          }
        };
      } catch (_error) {
        const totalTime = performance.now() - startTime;
        this.metrics.failedAuth++;
        
        // Check for timeout
        if (_error instanceof Error && _error.message.includes('timeout')) {
          this.metrics.timeoutCount++;
        }
        
        this.emit('requestError', {
          path: _options.path,
          method: _options.method,
          _error,
          totalTime
        });
        
        throw _error;
      }
    });
  }

  /**
   * Execute GET _request
   */
  public async get(path: string, headers?: Record<string, string>): Promise<any> {
    return this.executeRequest({
      method: 'GET',
      path,
      headers
    });
  }

  /**
   * Execute POST _request
   */
  public async post(
    path: string,
    data?: string | Buffer,
    headers?: Record<string, string>
  ): Promise<any> {
    return this.executeRequest({
      method: 'POST',
      path,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, data);
  }

  /**
   * Execute PUT _request
   */
  public async put(
    path: string,
    data?: string | Buffer,
    headers?: Record<string, string>
  ): Promise<any> {
    return this.executeRequest({
      method: 'PUT',
      path,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, data);
  }

  /**
   * Execute DELETE _request
   */
  public async delete(path: string, headers?: Record<string, string>): Promise<any> {
    return this.executeRequest({
      method: 'DELETE',
      path,
      headers
    });
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.circuitBreaker.on('stateChange', (state) => {
      this.emit('circuitBreakerStateChange', state);
      
      if (state === 'OPEN') {
        this.metrics.circuitBreakerTrips++;
        this.emit('circuitBreakerTripped', {
          totalRequests: this.metrics.totalRequests,
          failedAuth: this.metrics.failedAuth,
          successRate: this.getSuccessRate()
        });
      }
    });

    this.optimizedClient.on('performanceAlert', (alert) => {
      this.emit('performanceAlert', alert);
    });

    this.optimizedClient.on('connectionReused', (info) => {
      this.emit('connectionOptimized', info);
    });
  }

  /**
   * Extract hostname from URL
   */
  private extractHostnameFromUrl(url?: string): string | null {
    if (!url) {return null;}
    
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Update authentication metrics
   */
  private updateAuthMetrics(authTime: number, success: boolean): void {
    const totalAuthTime = this.metrics.averageAuthTime * this.metrics.totalRequests;
    this.metrics.averageAuthTime = (totalAuthTime + authTime) / (this.metrics.totalRequests + 1);
    
    if (success) {
      this.metrics.successfulAuth++;
    } else {
      this.metrics.failedAuth++;
    }
  }

  /**
   * Get authentication success rate
   */
  public getSuccessRate(): number {
    return this.metrics.totalRequests > 0 
      ? (this.metrics.successfulAuth / this.metrics.totalRequests) * 100 
      : 0;
  }

  /**
   * Get authentication metrics
   */
  public getMetrics(): AuthenticationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get circuit breaker state
   */
  public getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Get network optimization metrics
   */
  public getNetworkMetrics(): any {
    return this.optimizedClient.getMetrics();
  }

  /**
   * Get connection reuse rate
   */
  public getConnectionReuseRate(): number {
    return this.optimizedClient.getConnectionReuseRate();
  }

  /**
   * Reset circuit breaker manually
   */
  public resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    this.emit('circuitBreakerReset');
  }

  /**
   * Health check for the enhanced EdgeGrid
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: any;
    circuitBreakerState: string;
    networkOptimization: any;
  }> {
    const successRate = this.getSuccessRate();
    const circuitBreakerState = this.getCircuitBreakerState();
    const networkMetrics = this.getNetworkMetrics();
    const connectionReuseRate = this.getConnectionReuseRate();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (circuitBreakerState === 'OPEN' || successRate < 50) {
      status = 'unhealthy';
    } else if (successRate < 80 || connectionReuseRate < 70) {
      status = 'degraded';
    }

    return {
      status,
      metrics: {
        ...this.metrics,
        successRate,
        connectionReuseRate
      },
      circuitBreakerState,
      networkOptimization: networkMetrics
    };
  }

  /**
   * Destroy and cleanup resources
   */
  public destroy(): void {
    // Restore original auth method if monkey patched
    if (this.originalAuth && this.edgeGrid.auth !== this.originalAuth) {
      this.edgeGrid.auth = this.originalAuth;
    }

    this.optimizedClient.destroy();
    this.circuitBreaker.destroy();
    
    this.emit('destroyed');
  }
}

export default EnhancedEdgeGrid;