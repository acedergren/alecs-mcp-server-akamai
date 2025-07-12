/**
 * Core Interfaces - CODE KAI Implementation
 * 
 * KEY: Centralized interface exports for ALECS architecture
 * APPROACH: Single source of truth for all abstractions
 * IMPLEMENTATION: Clean separation of concerns with type safety
 * 
 * This module exports all core interfaces used throughout ALECS,
 * enabling consistent contracts and easy testing.
 */

// Cache interfaces
export type {
  CacheEntry,
  CacheStats,
  CacheOptions,
  ICache,
  IAdvancedCache,
  IPropertyCache
} from './cache';
import type { ICache } from './cache';

// Client interfaces
export type {
  HttpMethod,
  AkamaiRequestConfig,
  AkamaiResponse,
  AkamaiErrorInfo,
  IAkamaiClient,
  IExtendedAkamaiClient,
  IAkamaiClientFactory
} from './client';

// Configuration interfaces
export type {
  CustomerConfig,
  ConfigValidationResult,
  IConfigProvider,
  IWritableConfigProvider,
  IConfigSource,
  IFileConfigSource,
  IEnvConfigSource,
  IDbConfigSource,
  IConfigManager,
  IConfigEvents
} from './config';

// Tool interfaces
export type {
  ToolContext,
  ToolMetadata,
  ToolExample,
  ToolOptions,
  ToolValidationResult,
  ITool,
  IHealthCheckableTool,
  IMetricsTool,
  IToolFactory,
  IToolRegistry,
  IToolLoader,
  IToolExecutor
} from './tool';

/**
 * Common interface patterns used across ALECS
 */

/**
 * Initializable interface for services that need setup
 */
export interface IInitializable {
  initialize(): Promise<void>;
  isInitialized(): boolean;
}

/**
 * Disposable interface for cleanup
 */
export interface IDisposable {
  dispose(): Promise<void>;
}

/**
 * Health checkable interface
 */
export interface IHealthCheckable {
  healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    details?: Record<string, any>;
  }>;
}

/**
 * Metrics provider interface
 */
export interface IMetricsProvider {
  getMetrics(): Record<string, any>;
  resetMetrics(): void;
}

/**
 * Event emitter interface
 */
export interface IEventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
}

/**
 * Configurable interface
 */
export interface IConfigurable<T = any> {
  getConfig(): T;
  setConfig(config: T): void;
  validateConfig(config: T): boolean;
}

/**
 * Loggable interface for services that need logging
 */
export interface ILoggable {
  setLogger(logger: any): void;
  getLogger(): any;
}

/**
 * Cacheable interface for services that support caching
 */
export interface ICacheable {
  setCache(cache: ICache): void;
  getCache(): ICache | undefined;
  invalidateCache(pattern?: string): Promise<void>;
}

/**
 * Customer-aware interface for multi-tenant services
 */
export interface ICustomerAware {
  setCustomer(customer: string): void;
  getCustomer(): string;
  validateCustomer(customer: string): boolean;
}

/**
 * Rate limitable interface
 */
export interface IRateLimitable {
  isRateLimited(key: string): boolean;
  getRateLimitInfo(key: string): {
    remaining: number;
    reset: Date;
    limit: number;
  };
}

/**
 * Retryable interface for operations that can be retried
 */
export interface IRetryable {
  retry<T>(
    operation: () => Promise<T>,
    options?: {
      maxAttempts?: number;
      delay?: number;
      backoff?: 'linear' | 'exponential';
    }
  ): Promise<T>;
}

/**
 * Validatable interface for input validation
 */
export interface IValidatable<T = any> {
  validate(input: T): {
    valid: boolean;
    errors: string[];
    warnings?: string[];
  };
}