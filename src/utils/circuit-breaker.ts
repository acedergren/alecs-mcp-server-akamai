/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by temporarily blocking requests to failing services.
 * States: CLOSED (normal), OPEN (blocking), HALF_OPEN (testing)
 * 
 * Features:
 * - Configurable failure threshold
 * - Automatic recovery with half-open state
 * - Exponential backoff for reset timeout
 * - Success rate tracking
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Number of failures before opening (default: 5)
  successThreshold?: number;      // Number of successes to close from half-open (default: 2)
  timeout?: number;              // Initial timeout in ms before trying half-open (default: 60000)
  maxTimeout?: number;           // Maximum timeout with backoff (default: 300000)
  windowSize?: number;           // Time window for failure counting in ms (default: 60000)
  volumeThreshold?: number;      // Minimum requests before opening (default: 10)
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];  // Timestamps of failures
  private successes: number[] = []; // Timestamps of successes
  private consecutiveSuccesses = 0;
  private lastFailureTime = 0;
  private nextResetTime = 0;
  private resetTimeouts = 0;
  
  private readonly options: Required<CircuitBreakerOptions>;
  
  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 60000,        // 1 minute
      maxTimeout: options.maxTimeout || 300000, // 5 minutes
      windowSize: options.windowSize || 60000,  // 1 minute window
      volumeThreshold: options.volumeThreshold || 10
    };
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(`Circuit breaker is ${this.state}. Service temporarily unavailable.`);
    }
    
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  /**
   * Check if execution is allowed
   */
  canExecute(): boolean {
    this.updateState();
    
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
      
      case CircuitState.OPEN:
        return false;
      
      case CircuitState.HALF_OPEN:
        return true;
      
      default:
        return false;
    }
  }
  
  /**
   * Record a successful execution
   */
  private recordSuccess(): void {
    const now = Date.now();
    this.successes.push(now);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        this.close();
      }
    }
    
    // Clean old records
    this.cleanOldRecords();
  }
  
  /**
   * Record a failed execution
   */
  private recordFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      const recentFailures = this.getRecentFailures();
      const totalRequests = this.getRecentRequests();
      
      if (totalRequests >= this.options.volumeThreshold &&
          recentFailures >= this.options.failureThreshold) {
        this.open();
      }
    }
    
    // Clean old records
    this.cleanOldRecords();
  }
  
  /**
   * Update circuit state based on current conditions
   */
  private updateState(): void {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now >= this.nextResetTime) {
        this.halfOpen();
      }
    }
  }
  
  /**
   * Transition to OPEN state
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.consecutiveSuccesses = 0;
    
    // Calculate next reset time with exponential backoff
    const backoffMultiplier = Math.min(Math.pow(2, this.resetTimeouts), 5);
    const resetTimeout = Math.min(
      this.options.timeout * backoffMultiplier,
      this.options.maxTimeout
    );
    
    this.nextResetTime = Date.now() + resetTimeout;
    this.resetTimeouts++;
  }
  
  /**
   * Transition to HALF_OPEN state
   */
  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.consecutiveSuccesses = 0;
  }
  
  /**
   * Transition to CLOSED state
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveSuccesses = 0;
    this.resetTimeouts = 0;
  }
  
  /**
   * Get count of recent failures
   */
  private getRecentFailures(): number {
    const cutoff = Date.now() - this.options.windowSize;
    return this.failures.filter(time => time >= cutoff).length;
  }
  
  /**
   * Get total recent requests
   */
  private getRecentRequests(): number {
    const cutoff = Date.now() - this.options.windowSize;
    const recentFailures = this.failures.filter(time => time >= cutoff).length;
    const recentSuccesses = this.successes.filter(time => time >= cutoff).length;
    return recentFailures + recentSuccesses;
  }
  
  /**
   * Clean old records outside the time window
   */
  private cleanOldRecords(): void {
    const cutoff = Date.now() - this.options.windowSize;
    this.failures = this.failures.filter(time => time >= cutoff);
    this.successes = this.successes.filter(time => time >= cutoff);
  }
  
  /**
   * Get current circuit breaker status
   */
  getStatus(): {
    state: CircuitState;
    failures: number;
    successes: number;
    totalRequests: number;
    nextResetTime?: number;
  } {
    const failures = this.getRecentFailures();
    const totalRequests = this.getRecentRequests();
    const successes = totalRequests - failures;
    
    return {
      state: this.state,
      failures,
      successes,
      totalRequests,
      nextResetTime: this.state === CircuitState.OPEN ? this.nextResetTime : undefined
    };
  }
  
  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = [];
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = 0;
    this.nextResetTime = 0;
    this.resetTimeouts = 0;
  }
}