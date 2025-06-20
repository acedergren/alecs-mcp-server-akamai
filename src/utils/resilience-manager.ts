/**
 * Error Recovery and Operational Resilience Manager
 * Comprehensive error handling with circuit breakers, retry logic, and recovery patterns
 */

import { ErrorTranslator } from './errors';

// Circuit breaker states
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Operation types for tracking
export enum OperationType {
  PROPERTY_READ = 'PROPERTY_READ',
  PROPERTY_WRITE = 'PROPERTY_WRITE',
  ACTIVATION = 'ACTIVATION',
  DNS_READ = 'DNS_READ',
  DNS_WRITE = 'DNS_WRITE',
  CERTIFICATE = 'CERTIFICATE',
  BULK_OPERATION = 'BULK_OPERATION',
}

// Error categories
export interface ErrorCategory {
  type:
    | 'NETWORK'
    | 'AUTHENTICATION'
    | 'AUTHORIZATION'
    | 'VALIDATION'
    | 'RATE_LIMIT'
    | 'SERVER_ERROR'
    | 'UNKNOWN';
  code?: string;
  retryable: boolean;
  severity: ErrorSeverity;
  recovery: RecoveryStrategy[];
}

// Recovery strategies
export interface RecoveryStrategy {
  type: 'RETRY' | 'FALLBACK' | 'CIRCUIT_BREAKER' | 'CACHE' | 'QUEUE' | 'ALERT';
  config: any;
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  halfOpenMaxCalls: number;
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

// Operation metrics
export interface OperationMetrics {
  operationType: OperationType;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  lastFailureTime?: Date;
  consecutiveFailures: number;
  errorRate: number;
  p95ResponseTime: number;
}

// Circuit breaker instance
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: Date;
  private halfOpenCalls = 0;
  private responseTimes: number[] = [];

  constructor(
    private operationType: OperationType,
    private config: CircuitBreakerConfig,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenCalls = 0;
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.operationType}`);
      }
    }

    if (
      this.state === CircuitBreakerState.HALF_OPEN &&
      this.halfOpenCalls >= this.config.halfOpenMaxCalls
    ) {
      throw new Error(`Circuit breaker HALF_OPEN call limit exceeded for ${this.operationType}`);
    }

    const startTime = Date.now();

    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;

      this.recordSuccess(responseTime);
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(responseTime: number): void {
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
return false;
}
    return Date.now() - this.lastFailureTime.getTime() >= this.config.resetTimeout;
  }

  getMetrics(): OperationMetrics {
    const totalCalls = this.responseTimes.length + this.failureCount;
    const successfulCalls = this.responseTimes.length;
    const failedCalls = this.failureCount;

    return {
      operationType: this.operationType,
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime:
        this.responseTimes.length > 0
          ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
          : 0,
      lastFailureTime: this.lastFailureTime,
      consecutiveFailures: this.state === CircuitBreakerState.OPEN ? this.failureCount : 0,
      errorRate: totalCalls > 0 ? failedCalls / totalCalls : 0,
      p95ResponseTime: this.calculateP95(),
    };
  }

  private calculateP95(): number {
    if (this.responseTimes.length === 0) {
return 0;
}
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index] || 0;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

// Retry handler with exponential backoff
export class RetryHandler {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    errorHandler?: (error: any, attempt: number) => boolean,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = _error;

        // Check if error is retryable
        if (errorHandler && !errorHandler(_error, attempt)) {
          throw error;
        }

        if (attempt === this.config.maxAttempts) {
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, this.config.maxDelay);

    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return delay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Error classifier
export class ErrorClassifier {
  private static categories: Map<string, ErrorCategory> = new Map([
    // Network errors
    [
      'ECONNREFUSED',
      {
        type: 'NETWORK',
        code: 'ECONNREFUSED',
        retryable: true,
        severity: ErrorSeverity.HIGH,
        recovery: [
          { type: 'RETRY', config: { maxAttempts: 3, baseDelay: 1000 } },
          { type: 'CIRCUIT_BREAKER', config: { threshold: 5 } },
        ],
      },
    ],
    [
      'ENOTFOUND',
      {
        type: 'NETWORK',
        code: 'ENOTFOUND',
        retryable: true,
        severity: ErrorSeverity.HIGH,
        recovery: [{ type: 'RETRY', config: { maxAttempts: 2, baseDelay: 500 } }],
      },
    ],
    [
      'ETIMEDOUT',
      {
        type: 'NETWORK',
        code: 'ETIMEDOUT',
        retryable: true,
        severity: ErrorSeverity.MEDIUM,
        recovery: [{ type: 'RETRY', config: { maxAttempts: 3, baseDelay: 2000 } }],
      },
    ],

    // HTTP status codes
    [
      '400',
      {
        type: 'VALIDATION',
        code: '400',
        retryable: false,
        severity: ErrorSeverity.LOW,
        recovery: [
          { type: 'ALERT', config: { message: 'Validation error - check request parameters' } },
        ],
      },
    ],
    [
      '401',
      {
        type: 'AUTHENTICATION',
        code: '401',
        retryable: false,
        severity: ErrorSeverity.HIGH,
        recovery: [
          { type: 'ALERT', config: { message: 'Authentication failed - check credentials' } },
        ],
      },
    ],
    [
      '403',
      {
        type: 'AUTHORIZATION',
        code: '403',
        retryable: false,
        severity: ErrorSeverity.HIGH,
        recovery: [
          { type: 'ALERT', config: { message: 'Authorization failed - check permissions' } },
        ],
      },
    ],
    [
      '404',
      {
        type: 'VALIDATION',
        code: '404',
        retryable: false,
        severity: ErrorSeverity.LOW,
        recovery: [{ type: 'FALLBACK', config: { strategy: 'return_empty' } }],
      },
    ],
    [
      '429',
      {
        type: 'RATE_LIMIT',
        code: '429',
        retryable: true,
        severity: ErrorSeverity.MEDIUM,
        recovery: [
          { type: 'RETRY', config: { maxAttempts: 5, baseDelay: 5000, backoffMultiplier: 2 } },
          { type: 'QUEUE', config: { delay: true } },
        ],
      },
    ],
    [
      '500',
      {
        type: 'SERVER_ERROR',
        code: '500',
        retryable: true,
        severity: ErrorSeverity.HIGH,
        recovery: [
          { type: 'RETRY', config: { maxAttempts: 3, baseDelay: 1000 } },
          { type: 'CIRCUIT_BREAKER', config: { threshold: 3 } },
        ],
      },
    ],
    [
      '502',
      {
        type: 'SERVER_ERROR',
        code: '502',
        retryable: true,
        severity: ErrorSeverity.HIGH,
        recovery: [{ type: 'RETRY', config: { maxAttempts: 3, baseDelay: 2000 } }],
      },
    ],
    [
      '503',
      {
        type: 'SERVER_ERROR',
        code: '503',
        retryable: true,
        severity: ErrorSeverity.HIGH,
        recovery: [{ type: 'RETRY', config: { maxAttempts: 5, baseDelay: 3000 } }],
      },
    ],
    [
      '504',
      {
        type: 'SERVER_ERROR',
        code: '504',
        retryable: true,
        severity: ErrorSeverity.MEDIUM,
        recovery: [{ type: 'RETRY', config: { maxAttempts: 3, baseDelay: 5000 } }],
      },
    ],
  ]);

  static classify(error: any): ErrorCategory {
    let code: string | undefined;

    // Extract error code
    if (_error.code) {
      code = _error.code;
    } else if (_error.response?.status) {
      code = _error.response.status.toString();
    } else if (_error.status) {
      code = _error.status.toString();
    } else if (error.message) {
      // Try to extract HTTP status from message
      const statusMatch = error.message.match(/\b(4\d{2}|5\d{2})\b/);
      if (statusMatch) {
        code = statusMatch[1];
      }
    }

    if (code && this.categories.has(code)) {
      return this.categories.get(code)!;
    }

    // Default classification
    return {
      type: 'UNKNOWN',
      code,
      retryable: false,
      severity: ErrorSeverity.MEDIUM,
      recovery: [{ type: 'ALERT', config: { message: 'Unknown error occurred' } }],
    };
  }

  static isRetryable(error: any): boolean {
    return this.classify(_error).retryable;
  }

  static getSeverity(error: any): ErrorSeverity {
    return this.classify(_error).severity;
  }
}

// Resilience manager
export class ResilienceManager {
  private static instance: ResilienceManager;
  private circuitBreakers: Map<OperationType, CircuitBreaker> = new Map();

  static getInstance(): ResilienceManager {
    if (!ResilienceManager.instance) {
      ResilienceManager.instance = new ResilienceManager();
    }
    return ResilienceManager.instance;
  }
  private errorTranslator: ErrorTranslator = new ErrorTranslator();

  // Default configurations
  private static defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringWindow: 60000,
    halfOpenMaxCalls: 3,
  };

  private static defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  };

  constructor() {
    // Initialize circuit breakers for each operation type
    Object.values(OperationType).forEach((opType) => {
      this.circuitBreakers.set(
        opType as OperationType,
        new CircuitBreaker(opType as OperationType, ResilienceManager.defaultCircuitBreakerConfig),
      );
    });
  }

  async executeWithCircuitBreaker<T>(
    operationType: OperationType,
    operation: () => Promise<T>,
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(operationType);
    if (!circuitBreaker) {
      throw new Error(`No circuit breaker configured for operation type: ${operationType}`);
    }

    return circuitBreaker.execute(operation);
  }

  async executeWithResilience<T>(
    operationType: OperationType,
    operation: () => Promise<T>,
    customRetryConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(operationType);
    if (!circuitBreaker) {
      throw new Error(`No circuit breaker configured for operation type: ${operationType}`);
    }

    const retryConfig = { ...ResilienceManager.defaultRetryConfig, ...customRetryConfig };
    const retryHandler = new RetryHandler(retryConfig);

    return retryHandler.execute(
      () => circuitBreaker.execute(operation),
      (_error, attempt) => {
        const category = ErrorClassifier.classify(_error);

        // Log error for monitoring
        console.error(`Operation ${operationType} failed (attempt ${attempt}):`, {
          error: error.message,
          category: category.type,
          severity: category.severity,
          retryable: category.retryable,
        });

        return category.retryable;
      },
    );
  }

  getOperationMetrics(operationType: OperationType): OperationMetrics | undefined {
    const circuitBreaker = this.circuitBreakers.get(operationType);
    return circuitBreaker?.getMetrics();
  }

  getAllMetrics(): Map<OperationType, OperationMetrics> {
    const metrics = new Map<OperationType, OperationMetrics>();

    this.circuitBreakers.forEach((breaker, opType) => {
      metrics.set(opType, breaker.getMetrics());
    });

    return metrics;
  }

  getCircuitBreakerState(operationType: OperationType): CircuitBreakerState | undefined {
    const circuitBreaker = this.circuitBreakers.get(operationType);
    return circuitBreaker?.getState();
  }

  resetCircuitBreaker(operationType: OperationType): void {
    const circuitBreaker = this.circuitBreakers.get(operationType);
    if (circuitBreaker) {
      // Force reset by creating a new instance
      this.circuitBreakers.set(
        operationType,
        new CircuitBreaker(operationType, ResilienceManager.defaultCircuitBreakerConfig),
      );
    }
  }

  formatUserFriendlyError(error: any, operationType: OperationType, context?: any): string {
    const category = ErrorClassifier.classify(_error);

    // Use existing error translator for base formatting
    const baseMessage = this.errorTranslator.formatConversationalError(_error, {
      operation: operationType,
      parameters: context,
      timestamp: new Date(),
    });

    // Add resilience-specific guidance
    let guidance = '';

    switch (category.type) {
      case 'RATE_LIMIT':
        guidance =
          '\\n\\n**Rate Limit Guidance:**\\n' +
          '- The request will be automatically retried with exponential backoff\\n' +
          '- Consider reducing the frequency of requests\\n' +
          '- For bulk operations, use smaller batch sizes';
        break;

      case 'NETWORK':
        guidance =
          '\\n\\n**Network Issue Guidance:**\\n' +
          '- The operation will be retried automatically\\n' +
          '- Check your internet connection\\n' +
          '- Verify Akamai service status if issues persist';
        break;

      case 'AUTHENTICATION':
        guidance =
          '\\n\\n**Authentication Guidance:**\\n' +
          '- Check your .edgerc credentials\\n' +
          '- Verify the customer section name\\n' +
          '- Ensure API client has proper permissions';
        break;

      case 'AUTHORIZATION':
        guidance =
          '\\n\\n**Authorization Guidance:**\\n' +
          '- Contact your Akamai administrator\\n' +
          '- Verify API client permissions for this operation\\n' +
          '- Check contract and group access rights';
        break;

      case 'SERVER_ERROR': {
        const circuitState = this.getCircuitBreakerState(operationType);
        if (circuitState === CircuitBreakerState.OPEN) {
          guidance =
            '\\n\\n**Service Protection Active:**\\n' +
            '- Circuit breaker is protecting against repeated failures\\n' +
            '- Service will be retried automatically after cooldown period\\n' +
            '- Consider checking Akamai service status';
        } else {
          guidance =
            '\\n\\n**Server Error Guidance:**\\n' +
            '- The operation will be retried automatically\\n' +
            '- If issues persist, check Akamai service status\\n' +
            '- Consider trying again in a few minutes';
        }
        break;
      }
    }

    return baseMessage + guidance;
  }
}

// Global resilience manager instance
export const globalResilienceManager = new ResilienceManager();

// Health check utilities
export interface HealthCheckResult {
  operationType: OperationType;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  metrics: OperationMetrics;
  circuitBreakerState: CircuitBreakerState;
  lastCheck: Date;
  issues: string[];
}

export class HealthChecker {
  static checkOperationHealth(
    operationType: OperationType,
    manager: ResilienceManager = globalResilienceManager,
  ): HealthCheckResult {
    const metrics = manager.getOperationMetrics(operationType);
    const circuitState = manager.getCircuitBreakerState(operationType);
    const issues: string[] = [];

    if (!metrics || !circuitState) {
      return {
        operationType,
        status: 'UNHEALTHY',
        metrics: metrics!,
        circuitBreakerState: circuitState!,
        lastCheck: new Date(),
        issues: ['No metrics available'],
      };
    }

    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';

    // Check circuit breaker state
    if (circuitState === CircuitBreakerState.OPEN) {
      status = 'UNHEALTHY';
      issues.push('Circuit breaker is OPEN');
    } else if (circuitState === CircuitBreakerState.HALF_OPEN) {
      status = 'DEGRADED';
      issues.push('Circuit breaker is HALF_OPEN');
    }

    // Check error rate
    if (metrics.errorRate > 0.5) {
      status = 'UNHEALTHY';
      issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    } else if (metrics.errorRate > 0.2) {
      if (status === 'HEALTHY') {
status = 'DEGRADED';
}
      issues.push(`Elevated error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }

    // Check response times
    if (metrics.p95ResponseTime > 30000) {
      if (status === 'HEALTHY') {
status = 'DEGRADED';
}
      issues.push(`Slow response times: P95 = ${metrics.p95ResponseTime}ms`);
    }

    // Check consecutive failures
    if (metrics.consecutiveFailures > 3) {
      status = 'UNHEALTHY';
      issues.push(`${metrics.consecutiveFailures} consecutive failures`);
    }

    return {
      operationType,
      status,
      metrics,
      circuitBreakerState: circuitState,
      lastCheck: new Date(),
      issues,
    };
  }

  static checkAllOperationsHealth(
    manager: ResilienceManager = globalResilienceManager,
  ): HealthCheckResult[] {
    return Object.values(OperationType).map((opType) =>
      this.checkOperationHealth(opType as OperationType, manager),
    );
  }
}
