/**
 * EdgeGrid Configuration Types
 * 
 * TYPE DEFINITIONS for Akamai EdgeGrid authentication
 * These types define the configuration structure for EdgeGrid API authentication,
 * supporting both file-based (.edgerc) and programmatic configuration.
 */

/**
 * EdgeGrid authentication credentials
 */
export interface EdgeGridAuth {
  /** Client token for API authentication */
  clientToken: string;
  
  /** Client secret for API authentication */
  clientSecret: string;
  
  /** Access token for API authentication */
  accessToken: string;
  
  /** Base URL for API requests */
  baseURL: string;
}

/**
 * EdgeGrid configuration options
 */
export interface EdgeGridConfig extends EdgeGridAuth {
  /** Maximum request body size for signing (default: 131072) */
  maxBody?: number;
  
  /** Request headers to include in signature */
  headersToSign?: string[];
  
  /** Debug mode for detailed logging */
  debug?: boolean;
  
  /** Custom user agent string */
  userAgent?: string;
  
  /** Connection timeout in milliseconds */
  timeout?: number;
  
  /** Account switch key for cross-account operations */
  accountSwitchKey?: string;
}

/**
 * EdgeGrid section configuration from .edgerc file
 */
export interface EdgeRcSection {
  /** Section name in .edgerc file */
  section: string;
  
  /** File path to .edgerc (optional, defaults to ~/.edgerc) */
  path?: string;
}

/**
 * Complete EdgeGrid configuration combining auth and options
 */
export interface FullEdgeGridConfig extends EdgeGridConfig {
  /** Section configuration if using .edgerc file */
  edgerc?: EdgeRcSection;
  
  /** Customer identifier for multi-tenant operations */
  customer?: string;
  
  /** Environment name (e.g., 'production', 'staging', 'development') */
  environment?: string;
}

/**
 * EdgeGrid request options for the underlying library
 */
export interface EdgeGridRequestOptions {
  /** Request path */
  path: string;
  
  /** HTTP method */
  method: string;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body (already stringified) */
  body?: string;
  
  /** Query string parameters */
  qs?: Record<string, string>;
  
  /** Follow redirects */
  followRedirects?: boolean;
  
  /** Request timeout */
  timeout?: number;
}

/**
 * EdgeGrid error response structure
 */
export interface EdgeGridError {
  /** Error type identifier */
  type: string;
  
  /** Human-readable error title */
  title: string;
  
  /** Detailed error description */
  detail: string;
  
  /** HTTP status code */
  status: number;
  
  /** Akamai-specific error code */
  errorCode?: string;
  
  /** Request identifier for support */
  requestId?: string;
  
  /** Additional error context */
  instance?: string;
}

/**
 * EdgeGrid response with metadata
 */
export interface EdgeGridResponse<T = any> {
  /** Response data */
  data: T;
  
  /** HTTP status code */
  statusCode: number;
  
  /** Response headers */
  headers: Record<string, string>;
  
  /** Request/response metadata */
  meta?: {
    /** Request duration in milliseconds */
    duration: number;
    
    /** Request ID from Akamai */
    requestId?: string;
    
    /** Rate limit information */
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}

/**
 * Type guard to check if config has EdgeRC section
 */
export function hasEdgeRcConfig(config: any): config is FullEdgeGridConfig & { edgerc: EdgeRcSection } {
  return config && typeof config.edgerc === 'object' && typeof config.edgerc.section === 'string';
}

/**
 * Type guard to check if config has direct auth credentials
 */
export function hasDirectAuth(config: any): config is EdgeGridAuth {
  return config && 
    typeof config.clientToken === 'string' &&
    typeof config.clientSecret === 'string' &&
    typeof config.accessToken === 'string' &&
    typeof config.baseURL === 'string';
}