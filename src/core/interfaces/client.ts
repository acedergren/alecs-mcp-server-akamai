/**
 * Akamai Client Interface - CODE KAI Implementation
 * 
 * KEY: Type-safe abstraction for all Akamai API interactions
 * APPROACH: Request/response pattern with full configurability
 * IMPLEMENTATION: Customer-aware, retry-capable, extensible
 * 
 * This interface defines the contract for Akamai API clients,
 * enabling mock implementations for testing and alternative transports.
 */

import { EdgeGridConfig } from '../../types/edgegrid';

/**
 * HTTP methods supported by Akamai APIs
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request configuration for Akamai API calls
 */
export interface AkamaiRequestConfig {
  /** API endpoint path (e.g., '/papi/v1/properties') */
  path: string;
  
  /** HTTP method */
  method: HttpMethod;
  
  /** Query parameters */
  queryParams?: Record<string, string | number | boolean | undefined>;
  
  /** Request body (will be JSON stringified) */
  body?: unknown;
  
  /** Additional headers */
  headers?: Record<string, string>;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Number of retry attempts */
  retries?: number;
  
  /** Custom retry delay */
  retryDelay?: number;
  
  /** Account switch key for cross-account operations */
  accountSwitchKey?: string;
}

/**
 * Response from Akamai API
 */
export interface AkamaiResponse<T = any> {
  /** Response data */
  data: T;
  
  /** HTTP status code */
  status: number;
  
  /** Response headers */
  headers: Record<string, string>;
  
  /** Request metadata */
  meta?: {
    duration: number;
    retries: number;
    cached?: boolean;
    requestId?: string;
  };
}

/**
 * Akamai-specific error information
 */
export interface AkamaiErrorInfo {
  /** Error type (e.g., 'invalid_auth', 'rate_limit') */
  type: string;
  
  /** Error title */
  title: string;
  
  /** Detailed error message */
  detail: string;
  
  /** HTTP status code */
  status: number;
  
  /** Akamai error code */
  errorCode?: string;
  
  /** Request ID for support */
  requestId?: string;
  
  /** Additional error context */
  instance?: string;
  
  /** Rate limit information */
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

/**
 * Core Akamai client interface
 */
export interface IAkamaiClient {
  /**
   * Get current customer context
   */
  readonly customer: string;
  
  /**
   * Make an authenticated request to Akamai API
   */
  request<T = any>(config: AkamaiRequestConfig): Promise<T>;
  
  /**
   * Make a raw request with full response details
   */
  requestWithResponse<T = any>(config: AkamaiRequestConfig): Promise<AkamaiResponse<T>>;
  
  /**
   * Check if client is configured for account switching
   */
  hasAccountSwitching(): boolean;
  
  /**
   * Get account switch key if available
   */
  getAccountSwitchKey(): string | undefined;
  
  /**
   * Create a new client instance for a different customer
   */
  withCustomer(customer: string): IAkamaiClient;
  
  /**
   * Validate client configuration
   */
  validateConfig(): Promise<boolean>;
}

/**
 * Extended client interface with additional features
 */
export interface IExtendedAkamaiClient extends IAkamaiClient {
  /**
   * Batch multiple requests
   */
  batch<T = any>(requests: AkamaiRequestConfig[]): Promise<T[]>;
  
  /**
   * Stream large responses
   */
  stream<T = any>(config: AkamaiRequestConfig): AsyncIterableIterator<T>;
  
  /**
   * Request with automatic pagination
   */
  paginate<T = any>(
    config: AkamaiRequestConfig,
    options?: {
      pageSize?: number;
      maxPages?: number;
      pageParam?: string;
    }
  ): AsyncIterableIterator<T>;
  
  /**
   * Request with progress tracking
   */
  requestWithProgress<T = any>(
    config: AkamaiRequestConfig,
    onProgress: (progress: number) => void
  ): Promise<T>;
  
  /**
   * Get client metrics
   */
  getMetrics(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    rateLimit: {
      remaining: number;
      reset: Date;
    };
  };
}

/**
 * Client factory interface
 */
export interface IAkamaiClientFactory {
  /**
   * Create client for specific customer
   */
  createClient(customer: string, config?: Partial<EdgeGridConfig>): IAkamaiClient;
  
  /**
   * Get or create cached client
   */
  getClient(customer: string): IAkamaiClient;
  
  /**
   * Clear cached clients
   */
  clearClients(): void;
  
  /**
   * Validate customer configuration
   */
  validateCustomer(customer: string): boolean;
}