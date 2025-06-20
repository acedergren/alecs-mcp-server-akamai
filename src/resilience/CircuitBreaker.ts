import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  recoveryTimeout?: number;
  monitorTimeout?: number;
  expectedErrors?: Array<new (...args: any[]) => Error>;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  circuitBreakerTrips: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  averageResponseTime: number;
  state: CircuitBreakerState;
}

export interface CircuitBreakerStats {
  failureRate: number;
  successRate: number;
  requestRate: number;
  averageResponseTime: number;
  uptime: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = 'CLOSED';
  private config: Required<CircuitBreakerConfig>;
  private metrics: CircuitBreakerMetrics;
  private failures: number = 0;
  private successes: number = 0;
  private nextAttempt: number = 0;
  private monitorTimer: NodeJS.Timeout | null = null;
  private startTime: number;

  constructor(config: CircuitBreakerConfig) {
    super();
    
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      recoveryTimeout: config.recoveryTimeout || 60000, // 1 minute
      monitorTimeout: config.monitorTimeout || 10000,   // 10 seconds
      expectedErrors: config.expectedErrors || []
    };

    this.startTime = Date.now();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitBreakerTrips: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      averageResponseTime: 0,
      state: this.state
    };

    this.startMonitoring();
    
    // Emit initialized event on next tick to allow listeners to be set up
    process.nextTick(() => {
      this.emit('initialized', { state: this.state, config: this.config });
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error('Circuit breaker is OPEN');
        this.emit('requestRejected', { 
          state: this.state,
          nextAttempt: this.nextAttempt,
          timeUntilRetry: this.nextAttempt - Date.now()
        });
        throw error;
      } else {
        // Time to try half-open
        this.moveToHalfOpen();
      }
    }

    try {
      const result = await fn();
      const responseTime = performance.now() - startTime;
      
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.onFailure(error as Error, responseTime);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = Date.now();
    this.updateResponseTime(responseTime);
    
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      this.emit('halfOpenSuccess', { 
        successes: this.successes, 
        threshold: this.config.successThreshold 
      });
      
      if (this.successes >= this.config.successThreshold) {
        this.moveToClosed();
      }
    }

    this.emit('requestSuccess', {
      responseTime,
      state: this.state,
      totalRequests: this.metrics.totalRequests
    });
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error, responseTime: number): void {
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = Date.now();
    this.updateResponseTime(responseTime);

    // Check if this is an expected error that shouldn't trigger circuit breaker
    const isExpectedError = this.config.expectedErrors.some(
      ExpectedError => error instanceof ExpectedError
    );

    if (isExpectedError) {
      this.emit('expectedError', { error, responseTime });
      return;
    }

    this.failures++;
    this.successes = 0; // Reset success count

    // Check for timeout
    if (error.message.includes('timeout')) {
      this.metrics.timeouts++;
    }

    this.emit('requestFailure', {
      error,
      responseTime,
      failures: this.failures,
      state: this.state,
      threshold: this.config.failureThreshold
    });

    // Move to open if threshold exceeded
    if (this.failures >= this.config.failureThreshold) {
      this.moveToOpen();
    }
  }

  /**
   * Move circuit breaker to CLOSED state
   */
  private moveToClosed(): void {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.metrics.state = this.state;
    this.failures = 0;
    this.successes = 0;
    
    this.emit('stateChange', {
      from: previousState,
      to: this.state,
      timestamp: Date.now(),
      reason: 'Success threshold reached'
    });
  }

  /**
   * Move circuit breaker to OPEN state
   */
  private moveToOpen(): void {
    const previousState = this.state;
    this.state = 'OPEN';
    this.metrics.state = this.state;
    this.metrics.circuitBreakerTrips++;
    this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    
    this.emit('stateChange', {
      from: previousState,
      to: this.state,
      timestamp: Date.now(),
      reason: 'Failure threshold exceeded',
      nextAttempt: this.nextAttempt,
      recoveryTimeout: this.config.recoveryTimeout
    });

    // Schedule automatic half-open attempt
    setTimeout(() => {
      if (this.state === 'OPEN') {
        this.emit('recoveryAttemptScheduled', {
          scheduledTime: Date.now(),
          state: this.state
        });
      }
    }, this.config.recoveryTimeout);
  }

  /**
   * Move circuit breaker to HALF_OPEN state
   */
  private moveToHalfOpen(): void {
    const previousState = this.state;
    this.state = 'HALF_OPEN';
    this.metrics.state = this.state;
    this.successes = 0;
    
    this.emit('stateChange', {
      from: previousState,
      to: this.state,
      timestamp: Date.now(),
      reason: 'Recovery timeout elapsed'
    });
  }

  /**
   * Update average response time
   */
  private updateResponseTime(responseTime: number): void {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
  }

  /**
   * Start monitoring circuit breaker health
   */
  private startMonitoring(): void {
    this.monitorTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitorTimeout);
  }

  /**
   * Perform health check and emit metrics
   */
  private performHealthCheck(): void {
    const stats = this.getStats();
    
    this.emit('healthCheck', {
      state: this.state,
      stats,
      metrics: this.metrics,
      timestamp: Date.now()
    });

    // Emit alerts for concerning metrics
    if (stats.failureRate > 50 && this.state === 'CLOSED') {
      this.emit('highFailureRate', {
        failureRate: stats.failureRate,
        threshold: 50,
        state: this.state
      });
    }

    if (stats.averageResponseTime > 10000) { // 10 seconds
      this.emit('highResponseTime', {
        averageResponseTime: stats.averageResponseTime,
        threshold: 10000
      });
    }
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  public getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get circuit breaker statistics
   */
  public getStats(): CircuitBreakerStats {
    const totalRequests = this.metrics.totalRequests;
    const failureRate = totalRequests > 0 
      ? (this.metrics.failedRequests / totalRequests) * 100 
      : 0;
    const successRate = totalRequests > 0 
      ? (this.metrics.successfulRequests / totalRequests) * 100 
      : 0;
    const uptime = Date.now() - this.startTime;
    const requestRate = uptime > 0 
      ? (totalRequests / uptime) * 1000 // requests per second
      : 0;

    return {
      failureRate,
      successRate,
      requestRate,
      averageResponseTime: this.metrics.averageResponseTime,
      uptime
    };
  }

  /**
   * Check if circuit breaker is healthy
   */
  public isHealthy(): boolean {
    const stats = this.getStats();
    return this.state !== 'OPEN' && 
           stats.failureRate < 50 && 
           stats.averageResponseTime < 10000;
  }

  /**
   * Force circuit breaker to specific state (for testing)
   */
  public forceState(state: CircuitBreakerState): void {
    const previousState = this.state;
    this.state = state;
    this.metrics.state = this.state;
    
    if (state === 'OPEN') {
      this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    }
    
    this.emit('stateForced', {
      from: previousState,
      to: state,
      timestamp: Date.now()
    });
  }

  /**
   * Reset circuit breaker to initial state
   */
  public reset(): void {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.metrics.state = this.state;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = 0;
    
    // Reset metrics but keep historical data
    this.metrics.totalRequests = 0;
    this.metrics.successfulRequests = 0;
    this.metrics.failedRequests = 0;
    this.metrics.timeouts = 0;
    this.metrics.averageResponseTime = 0;
    this.metrics.lastFailureTime = null;
    this.metrics.lastSuccessTime = null;
    
    this.emit('reset', {
      previousState,
      timestamp: Date.now()
    });
  }

  /**
   * Get time until next retry attempt (for OPEN state)
   */
  public getTimeUntilRetry(): number {
    if (this.state !== 'OPEN') {
      return 0;
    }
    return Math.max(0, this.nextAttempt - Date.now());
  }

  /**
   * Check if circuit breaker allows requests
   */
  public allowsRequests(): boolean {
    if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      return Date.now() >= this.nextAttempt;
    }
    
    return false;
  }

  /**
   * Destroy circuit breaker and cleanup resources
   */
  public destroy(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    
    this.emit('destroyed', {
      finalState: this.state,
      totalRequests: this.metrics.totalRequests,
      uptime: Date.now() - this.startTime
    });
    
    this.removeAllListeners();
  }
}

export default CircuitBreaker;