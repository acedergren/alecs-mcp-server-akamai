/**
 * ERROR RECOVERY ENGINE
 * 
 * CODE KAI ARCHITECTURE:
 * Intelligent error recovery service that analyzes errors and provides
 * automatic recovery strategies. This service learns from successful
 * recoveries to improve future suggestions.
 * 
 * KEY FEATURES:
 * - Analyzes errors and suggests recovery strategies
 * - Implements automatic recovery patterns
 * - Provides guided recovery steps for complex issues
 * - Learns from successful recoveries
 * - Integrates with circuit breaker and hint system
 * 
 * RECOVERY PATTERNS:
 * - Retry with exponential backoff (429, timeouts)
 * - Account switching (403 permission errors)
 * - Fallback strategies (alternative endpoints)
 * - Validation corrections (400 errors)
 * - Circuit breaker integration
 * 
 * IMPLEMENTATION:
 * - Pattern matching for error types
 * - Strategy execution with monitoring
 * - Success tracking and learning
 * - Integration with existing services
 */

import { createLogger } from '../utils/pino-logger';
import { AkamaiClient } from '../akamai-client';
import { AkamaiError, ProblemDetails, AkamaiErrorTypes } from '../core/errors/error-handler';
import { getCacheService, UnifiedCacheService } from './unified-cache-service';
import { CircuitBreaker, CircuitState } from '../utils/circuit-breaker';
import { contractGroupDiscovery } from './contract-group-discovery-service';
import { getUserHintService, HintType } from './user-hint-service';
import { z } from 'zod';

const logger = createLogger('error-recovery-service');

/**
 * Recovery strategy types
 */
export enum RecoveryStrategy {
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  ACCOUNT_SWITCH = 'account_switch',
  FALLBACK_ENDPOINT = 'fallback_endpoint',
  VALIDATION_CORRECTION = 'validation_correction',
  CIRCUIT_BREAKER_WAIT = 'circuit_breaker_wait',
  INCREASE_TIMEOUT = 'increase_timeout',
  REDUCE_BATCH_SIZE = 'reduce_batch_size',
  USE_CACHE = 'use_cache',
  MANUAL_INTERVENTION = 'manual_intervention'
}

/**
 * Recovery action configuration
 */
export interface RecoveryAction {
  strategy: RecoveryStrategy;
  description: string;
  confidence: number; // 0-1 confidence in this strategy
  automatic: boolean; // Can be executed automatically
  parameters?: Record<string, any>;
  estimatedDuration?: number; // ms
  fallbackStrategies?: RecoveryStrategy[]; // If this fails, try these
}

/**
 * Recovery context for error analysis
 */
export interface RecoveryContext {
  error: Error | AkamaiError;
  tool: string;
  operation: string;
  args?: any;
  customer?: string;
  attempt?: number;
  previousStrategies?: RecoveryStrategy[];
  circuitBreakerState?: CircuitState;
  requestMetadata?: {
    path?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  };
}

/**
 * Recovery result tracking
 */
export interface RecoveryResult {
  strategy: RecoveryStrategy;
  success: boolean;
  duration: number;
  error?: Error;
  result?: any;
  context: RecoveryContext;
  timestamp: Date;
}

/**
 * Recovery analytics for learning
 */
interface RecoveryAnalytics {
  strategySuccessRates: Map<RecoveryStrategy, { successes: number; failures: number }>;
  errorPatterns: Map<string, RecoveryStrategy[]>; // Error pattern -> successful strategies
  averageRecoveryTimes: Map<RecoveryStrategy, number>;
}

/**
 * Error Recovery Engine Service
 */
export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private cache: UnifiedCacheService | null = null;
  private analytics: RecoveryAnalytics;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  // Recovery configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly BASE_BACKOFF_MS = 1000;
  private readonly MAX_BACKOFF_MS = 30000;
  private readonly ANALYTICS_CACHE_TTL = 86400; // 24 hours
  
  private constructor() {
    this.analytics = {
      strategySuccessRates: new Map(),
      errorPatterns: new Map(),
      averageRecoveryTimes: new Map()
    };
    this.initializeCache();
    this.loadAnalytics();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Initialize cache service
   */
  private async initializeCache(): Promise<void> {
    try {
      this.cache = await getCacheService();
    } catch (error) {
      logger.warn('Failed to initialize cache, continuing without cache', { error });
    }
  }

  /**
   * Load analytics from cache
   */
  private async loadAnalytics(): Promise<void> {
    if (!this.cache) return;
    
    try {
      const cached = await this.cache.get('error-recovery:analytics');
      if (cached) {
        this.analytics = cached as RecoveryAnalytics;
      }
    } catch (error) {
      logger.warn('Failed to load analytics from cache', { error });
    }
  }

  /**
   * Save analytics to cache
   */
  private async saveAnalytics(): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cache.set('error-recovery:analytics', this.analytics, this.ANALYTICS_CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to save analytics to cache', { error });
    }
  }

  /**
   * Analyze error and suggest recovery strategies
   */
  async analyzeError(context: RecoveryContext): Promise<RecoveryAction[]> {
    const strategies: RecoveryAction[] = [];
    const error = context.error;
    
    // Extract error details
    const statusCode = this.getStatusCode(error);
    const errorType = this.getErrorType(error);
    const errorPattern = this.getErrorPattern(error);
    
    logger.info('Analyzing error for recovery', {
      tool: context.tool,
      operation: context.operation,
      statusCode,
      errorType,
      errorPattern
    });
    
    // Check learned patterns first
    const learnedStrategies = this.analytics.errorPatterns.get(errorPattern);
    if (learnedStrategies && learnedStrategies.length > 0) {
      for (const strategy of learnedStrategies) {
        const action = this.createRecoveryAction(strategy, context);
        if (action) {
          action.confidence = 0.9; // High confidence for learned patterns
          strategies.push(action);
        }
      }
    }
    
    // Analyze by status code
    switch (statusCode) {
      case 429: // Rate limit
        strategies.push(this.createRateLimitRecovery(context));
        break;
        
      case 403: // Forbidden
        strategies.push(...this.createPermissionRecovery(context));
        break;
        
      case 400: // Bad request
        strategies.push(...this.createValidationRecovery(context));
        break;
        
      case 408: // Request timeout
      case 504: // Gateway timeout
        strategies.push(this.createTimeoutRecovery(context));
        break;
        
      case 500: // Internal server error
      case 502: // Bad gateway
      case 503: // Service unavailable
        strategies.push(...this.createServerErrorRecovery(context));
        break;
    }
    
    // Check circuit breaker state
    const circuitKey = `${context.tool}:${context.operation}`;
    const circuitBreaker = this.circuitBreakers.get(circuitKey);
    if (circuitBreaker && context.circuitBreakerState === CircuitState.OPEN) {
      strategies.push({
        strategy: RecoveryStrategy.CIRCUIT_BREAKER_WAIT,
        description: 'Circuit breaker is open. Wait before retrying.',
        confidence: 1.0,
        automatic: true,
        parameters: {
          waitTime: 60000 // 1 minute
        }
      });
    }
    
    // Add manual intervention as last resort
    if (strategies.length === 0 || context.attempt && context.attempt >= this.MAX_RETRY_ATTEMPTS) {
      strategies.push({
        strategy: RecoveryStrategy.MANUAL_INTERVENTION,
        description: 'Automatic recovery failed. Manual intervention required.',
        confidence: 0.1,
        automatic: false,
        parameters: {
          supportMessage: this.generateSupportMessage(context)
        }
      });
    }
    
    // Sort by confidence
    strategies.sort((a, b) => b.confidence - a.confidence);
    
    return strategies;
  }

  /**
   * Execute recovery strategy
   */
  async executeRecovery(
    action: RecoveryAction,
    context: RecoveryContext,
    executor: (params?: any) => Promise<any>
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    logger.info('Executing recovery strategy', {
      strategy: action.strategy,
      tool: context.tool,
      operation: context.operation
    });
    
    try {
      let result: any;
      
      switch (action.strategy) {
        case RecoveryStrategy.RETRY_WITH_BACKOFF:
          result = await this.executeRetryWithBackoff(context, executor, action.parameters);
          break;
          
        case RecoveryStrategy.ACCOUNT_SWITCH:
          result = await this.executeAccountSwitch(context, executor, action.parameters);
          break;
          
        case RecoveryStrategy.INCREASE_TIMEOUT:
          result = await this.executeWithIncreasedTimeout(context, executor, action.parameters);
          break;
          
        case RecoveryStrategy.USE_CACHE:
          result = await this.executeWithCache(context, executor, action.parameters);
          break;
          
        case RecoveryStrategy.CIRCUIT_BREAKER_WAIT:
          await this.waitForCircuitBreaker(action.parameters?.waitTime || 60000);
          result = await executor();
          break;
          
        default:
          // For other strategies, execute with parameters
          result = await executor(action.parameters);
      }
      
      const duration = Date.now() - startTime;
      const recoveryResult: RecoveryResult = {
        strategy: action.strategy,
        success: true,
        duration,
        result,
        context,
        timestamp: new Date()
      };
      
      // Track success
      this.trackRecoveryResult(recoveryResult);
      
      return recoveryResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const recoveryResult: RecoveryResult = {
        strategy: action.strategy,
        success: false,
        duration,
        error: error as Error,
        context,
        timestamp: new Date()
      };
      
      // Track failure
      this.trackRecoveryResult(recoveryResult);
      
      throw error;
    }
  }

  /**
   * Execute retry with exponential backoff
   */
  private async executeRetryWithBackoff(
    context: RecoveryContext,
    executor: () => Promise<any>,
    parameters?: any
  ): Promise<any> {
    const maxAttempts = parameters?.maxAttempts || this.MAX_RETRY_ATTEMPTS;
    const baseDelay = parameters?.baseDelay || this.BASE_BACKOFF_MS;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info(`Retry attempt ${attempt}/${maxAttempts}`, {
          tool: context.tool,
          operation: context.operation
        });
        
        return await executor();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // Calculate backoff delay
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1),
          this.MAX_BACKOFF_MS
        );
        
        logger.info(`Waiting ${delay}ms before retry`, {
          attempt,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Execute with account switching
   */
  private async executeAccountSwitch(
    context: RecoveryContext,
    executor: (params?: any) => Promise<any>,
    parameters?: any
  ): Promise<any> {
    const alternativeCustomer = parameters?.customer;
    
    if (!alternativeCustomer) {
      throw new Error('No alternative customer provided for account switch');
    }
    
    logger.info('Switching to alternative customer', {
      from: context.customer,
      to: alternativeCustomer
    });
    
    // Update context with new customer
    const newContext = { ...context, customer: alternativeCustomer };
    
    return executor({ ...context.args, customer: alternativeCustomer });
  }

  /**
   * Execute with increased timeout
   */
  private async executeWithIncreasedTimeout(
    context: RecoveryContext,
    executor: (params?: any) => Promise<any>,
    parameters?: any
  ): Promise<any> {
    const timeout = parameters?.timeout || 120000; // 2 minutes default
    
    logger.info('Executing with increased timeout', {
      timeout,
      tool: context.tool
    });
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
    });
    
    // Race between executor and timeout
    return Promise.race([executor(), timeoutPromise]);
  }

  /**
   * Execute with cache fallback
   */
  private async executeWithCache(
    context: RecoveryContext,
    executor: () => Promise<any>,
    parameters?: any
  ): Promise<any> {
    if (!this.cache) {
      // No cache available, execute normally
      return executor();
    }
    
    const cacheKey = parameters?.cacheKey || `${context.tool}:${context.operation}:${JSON.stringify(context.args)}`;
    
    // Try to get from cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.info('Using cached result for recovery', {
        tool: context.tool,
        operation: context.operation
      });
      return cached;
    }
    
    // Execute and cache result
    const result = await executor();
    await this.cache.set(cacheKey, result, parameters?.ttl || 300); // 5 minutes default
    
    return result;
  }

  /**
   * Wait for circuit breaker to reset
   */
  private async waitForCircuitBreaker(waitTime: number): Promise<void> {
    logger.info(`Waiting ${waitTime}ms for circuit breaker to reset`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  /**
   * Create rate limit recovery action
   */
  private createRateLimitRecovery(context: RecoveryContext): RecoveryAction {
    return {
      strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
      description: 'Rate limit exceeded. Retry with exponential backoff.',
      confidence: 0.95,
      automatic: true,
      parameters: {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 30000
      },
      estimatedDuration: 35000,
      fallbackStrategies: [RecoveryStrategy.ACCOUNT_SWITCH]
    };
  }

  /**
   * Create permission recovery actions
   */
  private createPermissionRecovery(context: RecoveryContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    
    // Account switching strategy
    actions.push({
      strategy: RecoveryStrategy.ACCOUNT_SWITCH,
      description: 'Permission denied. Try switching to a different account.',
      confidence: 0.8,
      automatic: false, // Requires user confirmation
      parameters: {
        message: 'Please specify an alternative customer account'
      }
    });
    
    // Check if contract/group discovery can help
    if (context.args?.contractId || context.args?.groupId) {
      actions.push({
        strategy: RecoveryStrategy.VALIDATION_CORRECTION,
        description: 'Invalid contract or group ID. Use discovery to find valid options.',
        confidence: 0.7,
        automatic: true,
        parameters: {
          useDiscovery: true
        }
      });
    }
    
    return actions;
  }

  /**
   * Create validation recovery actions
   */
  private createValidationRecovery(context: RecoveryContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    const error = context.error;
    
    // Analyze validation errors
    if (error instanceof AkamaiError && error.errors) {
      for (const validationError of error.errors) {
        if (validationError.field) {
          actions.push({
            strategy: RecoveryStrategy.VALIDATION_CORRECTION,
            description: `Fix validation error in field: ${validationError.field}`,
            confidence: 0.6,
            automatic: false,
            parameters: {
              field: validationError.field,
              error: validationError.detail,
              suggestion: this.generateValidationSuggestion(validationError)
            }
          });
        }
      }
    }
    
    return actions;
  }

  /**
   * Create timeout recovery action
   */
  private createTimeoutRecovery(context: RecoveryContext): RecoveryAction {
    return {
      strategy: RecoveryStrategy.INCREASE_TIMEOUT,
      description: 'Request timed out. Retry with increased timeout.',
      confidence: 0.85,
      automatic: true,
      parameters: {
        timeout: 120000, // 2 minutes
        maxTimeout: 300000 // 5 minutes
      },
      estimatedDuration: 120000,
      fallbackStrategies: [RecoveryStrategy.REDUCE_BATCH_SIZE]
    };
  }

  /**
   * Create server error recovery actions
   */
  private createServerErrorRecovery(context: RecoveryContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    
    // Retry strategy
    actions.push({
      strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
      description: 'Server error. Retry with backoff.',
      confidence: 0.7,
      automatic: true,
      parameters: {
        maxAttempts: 2,
        baseDelay: 5000
      }
    });
    
    // Cache fallback
    actions.push({
      strategy: RecoveryStrategy.USE_CACHE,
      description: 'Use cached data if available.',
      confidence: 0.5,
      automatic: true
    });
    
    // Fallback endpoint
    if (context.requestMetadata?.path) {
      const fallbackPath = this.getFallbackEndpoint(context.requestMetadata.path);
      if (fallbackPath) {
        actions.push({
          strategy: RecoveryStrategy.FALLBACK_ENDPOINT,
          description: 'Use alternative endpoint.',
          confidence: 0.4,
          automatic: true,
          parameters: {
            path: fallbackPath
          }
        });
      }
    }
    
    return actions;
  }

  /**
   * Create recovery action from strategy
   */
  private createRecoveryAction(strategy: RecoveryStrategy, context: RecoveryContext): RecoveryAction | null {
    switch (strategy) {
      case RecoveryStrategy.RETRY_WITH_BACKOFF:
        return this.createRateLimitRecovery(context);
      case RecoveryStrategy.ACCOUNT_SWITCH:
        return this.createPermissionRecovery(context)[0];
      case RecoveryStrategy.INCREASE_TIMEOUT:
        return this.createTimeoutRecovery(context);
      default:
        return null;
    }
  }

  /**
   * Track recovery result for analytics
   */
  private trackRecoveryResult(result: RecoveryResult): void {
    // Update success rates
    const stats = this.analytics.strategySuccessRates.get(result.strategy) || {
      successes: 0,
      failures: 0
    };
    
    if (result.success) {
      stats.successes++;
    } else {
      stats.failures++;
    }
    
    this.analytics.strategySuccessRates.set(result.strategy, stats);
    
    // Track successful patterns
    if (result.success) {
      const errorPattern = this.getErrorPattern(result.context.error);
      const strategies = this.analytics.errorPatterns.get(errorPattern) || [];
      if (!strategies.includes(result.strategy)) {
        strategies.push(result.strategy);
        this.analytics.errorPatterns.set(errorPattern, strategies);
      }
    }
    
    // Update average recovery times
    if (result.success) {
      const avgTime = this.analytics.averageRecoveryTimes.get(result.strategy) || 0;
      const count = stats.successes;
      const newAvg = (avgTime * (count - 1) + result.duration) / count;
      this.analytics.averageRecoveryTimes.set(result.strategy, newAvg);
    }
    
    // Save analytics asynchronously
    this.saveAnalytics().catch(error => {
      logger.warn('Failed to save analytics', { error });
    });
  }

  /**
   * Get analytics report
   */
  getAnalytics(): RecoveryAnalytics {
    return this.analytics;
  }

  /**
   * Get circuit breaker for operation
   */
  getCircuitBreaker(tool: string, operation: string): CircuitBreaker {
    const key = `${tool}:${operation}`;
    let circuitBreaker = this.circuitBreakers.get(key);
    
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        windowSize: 60000
      });
      this.circuitBreakers.set(key, circuitBreaker);
    }
    
    return circuitBreaker;
  }

  /**
   * Helper: Get status code from error
   */
  private getStatusCode(error: Error | AkamaiError): number {
    if (error instanceof AkamaiError) {
      return error.status;
    }
    
    // Try to extract from error message or properties
    const errorAny = error as any;
    return errorAny.statusCode || errorAny.status || 500;
  }

  /**
   * Helper: Get error type
   */
  private getErrorType(error: Error | AkamaiError): string {
    if (error instanceof AkamaiError) {
      return error.type;
    }
    
    return (error as any).code || error.name || 'Unknown';
  }

  /**
   * Helper: Get error pattern for learning
   */
  private getErrorPattern(error: Error | AkamaiError): string {
    const statusCode = this.getStatusCode(error);
    const errorType = this.getErrorType(error);
    
    return `${statusCode}:${errorType}`;
  }

  /**
   * Helper: Generate validation suggestion
   */
  private generateValidationSuggestion(validationError: any): string {
    // Common validation patterns
    if (validationError.detail.includes('required')) {
      return `Add required field: ${validationError.field}`;
    }
    
    if (validationError.detail.includes('format')) {
      return `Fix format for field: ${validationError.field}`;
    }
    
    if (validationError.detail.includes('enum')) {
      return `Use one of the allowed values for: ${validationError.field}`;
    }
    
    return validationError.detail;
  }

  /**
   * Helper: Get fallback endpoint
   */
  private getFallbackEndpoint(path: string): string | null {
    // Common fallback patterns
    if (path.includes('/v2/')) {
      return path.replace('/v2/', '/v1/');
    }
    
    if (path.includes('/papi/v1/')) {
      return path.replace('/papi/v1/', '/papi/v0/');
    }
    
    return null;
  }

  /**
   * Helper: Generate support message
   */
  private generateSupportMessage(context: RecoveryContext): string {
    const error = context.error;
    let message = `Error recovery failed for ${context.tool}/${context.operation}.\n\n`;
    
    if (error instanceof AkamaiError) {
      message += `Error: ${error.title}\n`;
      message += `Details: ${error.detail}\n`;
      message += `Request ID: ${error.requestId || 'N/A'}\n`;
    } else {
      message += `Error: ${error.message}\n`;
    }
    
    message += `\nPlease contact support with the above information.`;
    
    return message;
  }
}

/**
 * Export singleton instance
 */
export const errorRecoveryService = ErrorRecoveryService.getInstance();