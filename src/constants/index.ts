/**
 * ALECS MCP Server - Centralized Constants
 * 
 * Replaces 89 hardcoded values across 47 files identified in hardcoded-values-analysis.md
 * 
 * CODE KAI PRINCIPLES:
 * Key: Single source of truth for all configuration values
 * Approach: Environment-configurable constants with sensible defaults
 * Implementation: Type-safe, well-documented, easy to maintain
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Get version from package.json
function getPackageVersion(): string {
  try {
    // Try development path first
    let packagePath = join(__dirname, '../../package.json');
    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    } catch {
      // Try production build path
      packagePath = join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    }
  } catch (error) {
    console.warn('Could not read package.json version, falling back to default');
    return '2.0.0';
  }
}

/**
 * Application version - Single source of truth
 * Replaces 15 hardcoded version instances across the codebase
 */
export const VERSION = getPackageVersion();

/**
 * HTTP Status Codes - Named constants
 * Replaces 8 instances of magic HTTP status numbers
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Port Configuration - Environment configurable
 * Replaces 12 instances of hardcoded ports
 */
export const PORTS = {
  HTTP: 80,
  HTTPS: 443,
  DEFAULT_WS: parseInt(process.env['WS_PORT'] || '8080'),
  DEFAULT_SSE: parseInt(process.env['SSE_PORT'] || '3001'),
  DEFAULT_HTTP: parseInt(process.env['HTTP_PORT'] || '8080'),
  MCP_DEFAULT: parseInt(process.env['MCP_PORT'] || '8080'),
  MIN_PORT: 1,
  MAX_PORT: 65535
} as const;

/**
 * Timeout and Interval Configuration - Named constants
 * Replaces 35 instances of magic timeout numbers
 */
export const TIMEOUTS = {
  // EdgeGrid and HTTP client timeouts
  EDGEGRID_DEFAULT: 30000,                    // 30 seconds
  HTTP_REQUEST_DEFAULT: 30000,                // 30 seconds
  HTTP_CONNECT_TIMEOUT: 10000,                // 10 seconds
  
  // Service timeouts
  ERROR_RECOVERY: 120000,                     // 2 minutes
  CERTIFICATE_DEPLOYMENT: 300000,             // 5 minutes
  DNS_OPERATION_DELAY: 5000,                  // 5 seconds
  PROPERTY_ACTIVATION_DELAY: 10000,           // 10 seconds
  
  // Monitoring and health checks
  MONITORING_INTERVAL: 30000,                 // 30 seconds
  HEALTH_CHECK_INTERVAL: 60000,               // 1 minute
  METRICS_COLLECTION_INTERVAL: 60000,         // 1 minute
  
  // Circuit breaker and resilience
  CIRCUIT_BREAKER_RESET: 60000,               // 1 minute
  RETRY_DELAY_BASE: 1000,                     // 1 second
  RETRY_DELAY_MAX: 30000,                     // 30 seconds
  
  // Test timeouts
  TEST_DEFAULT: 10000,                        // 10 seconds
  TEST_INTEGRATION: 30000,                    // 30 seconds
  TEST_E2E: 120000,                          // 2 minutes
  
  // Development and hot reload
  HOT_RELOAD_SCAN_INTERVAL: 5000,             // 5 seconds
  DEV_SERVER_RESTART_DELAY: 2000              // 2 seconds
} as const;

/**
 * Cache TTL Configuration - Standardized values
 * Replaces 25 instances of inconsistent cache timing
 */
export const CACHE_TTL = {
  // Short-term caching (5 minutes)
  DEFAULT: 300,
  TOOLS_DISCOVERY: 300,
  REPORTING_DEFAULT: 300,
  DNS_DEFAULT: 300,
  WORKFLOW_DEFAULT: 300,
  
  // Medium-term caching (30 minutes)
  CUSTOMER_CONFIG: 1800,
  CONTRACT_INFO: 1800,
  GROUP_INFO: 1800,
  
  // Long-term caching (1 hour)
  DNS_CAA: 3600,
  CERTIFICATE_INFO: 3600,
  PRODUCT_INFO: 3600,
  
  // Very long-term caching (24 hours)
  STATIC_CONFIG: 86400,
  API_SPECS: 86400,
  
  // Short TTL
  LIST_SHORT: 60,                              // 1 minute for list operations
  STATUS_SHORT: 5,                             // 5 seconds for status checks
  
  // Akamai-specific TTLs
  PROPERTIES_LIST: 300,                        // 5 minutes for property lists
  PROPERTY_DETAILS: 300,                       // 5 minutes for property details
  HOSTNAMES: 300,                              // 5 minutes for hostnames
  CONTRACTS_LIST: 1800,                        // 30 minutes for contracts
  GROUPS_LIST: 1800,                           // 30 minutes for groups
  
  // No caching
  DISABLED: 0,
  
  // Environment configurable
  CUSTOM: parseInt(process.env['CACHE_TTL'] || '300')
} as const;

/**
 * Service and Validation Limits - Named constants
 * Replaces 12 instances of magic limit numbers
 */
export const LIMITS = {
  // Validation limits
  MAX_HOSTNAME_LENGTH: 253,
  MAX_EMAIL_LENGTH: 254,
  MAX_NOTE_LENGTH: 1000,
  MAX_QUERY_LENGTH: 1000,
  MAX_DESCRIPTION_LENGTH: 500,
  
  // API limits
  MAX_TTL: 2147483647,                        // Max 32-bit signed integer
  MAX_PURGE_URL_LENGTH: 8000,
  MAX_NETWORK_LIST_ENTRIES: 10000,
  MAX_RESULTS_PER_PAGE: 1000,
  DEFAULT_PAGE_SIZE: 100,
  
  // Connection and pool limits
  MAX_CONCURRENT_CONNECTIONS: 20,
  MAX_POOL_SIZE: 10,
  MAX_QUEUE_SIZE: 100,
  
  // Display and UI limits
  MAX_DISPLAY_ITEMS: 10,
  MAX_SAMPLE_SIZE: 3,
  MAX_LOG_MESSAGE_LENGTH: 1000,
  
  // Retry limits
  MAX_RETRIES: 3,
  MAX_RETRY_ATTEMPTS: 5
} as const;

/**
 * Test Configuration - Environment configurable
 * Replaces 6 instances of test account hardcoding
 */
export const TEST_CONFIG = {
  CUSTOMER: process.env['TEST_CUSTOMER'] || 'testing',
  TIMEOUT: TIMEOUTS.TEST_DEFAULT,
  INTEGRATION_TIMEOUT: TIMEOUTS.TEST_INTEGRATION,
  E2E_TIMEOUT: TIMEOUTS.TEST_E2E,
  MAX_RETRIES: LIMITS.MAX_RETRIES,
  
  // Test data limits
  MAX_TEST_TOOLS: 50,
  SAMPLE_TOOL_COUNT: 5,
  
  // Test environment flags
  SKIP_SLOW_TESTS: process.env['SKIP_SLOW_TESTS'] === 'true',
  MOCK_API_CALLS: process.env['MOCK_API_CALLS'] === 'true',
  
  // Expected test counts (to be updated as tools are added/removed)
  EXPECTED_MIN_TOOLS: 200,                    // Based on our 203 actual count
  EXPECTED_MAX_TOOLS: 300                     // Reasonable upper bound
} as const;

/**
 * API Base URLs - Environment configurable
 * Replaces 3 instances of hardcoded endpoints
 */
export const API_BASES = {
  BILLING: process.env['BILLING_API_BASE'] || '/billing-api/v1',
  GTM: process.env['GTM_API_BASE'] || '/config-gtm/v1',
  REPORTING: process.env['REPORTING_API_BASE'] || '/reporting-api/v1/reports',
  EDGE_DNS: process.env['EDGE_DNS_API_BASE'] || '/config-dns/v2',
  PROPERTY_MANAGER: process.env['PROPERTY_API_BASE'] || '/papi/v1',
  CERTIFICATES: process.env['CPS_API_BASE'] || '/cps/v2',
  NETWORK_LISTS: process.env['NETWORK_LISTS_API_BASE'] || '/network-list/v2',
  FAST_PURGE: process.env['FAST_PURGE_API_BASE'] || '/ccu/v3',
  APPLICATION_SECURITY: process.env['APPSEC_API_BASE'] || '/appsec/v1'
} as const;

/**
 * JSON-RPC Error Codes - Standard values
 * Replaces magic error code numbers in API discovery scripts
 */
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
} as const;

/**
 * Tool Count Configuration - Dynamic and configurable
 * Replaces hardcoded tool count expectations
 */
export const TOOL_COUNTS = {
  // These will be replaced by dynamic discovery
  // But kept for backward compatibility during migration
  LEGACY_EXPECTED_TOTAL: 287,                 // Old hardcoded value
  ACTUAL_CURRENT_TOTAL: 203,                  // From our analysis
  
  // Per-domain estimates (to be replaced by dynamic discovery)
  PROPERTY_TOOLS: 9,
  DNS_TOOLS: 11,
  UTILITY_TOOLS: 4,
  CERTIFICATE_TOOLS: 45,
  SECURITY_TOOLS: 78,
  FASTPURGE_TOOLS: 8,
  
  // Migration tracking
  SNAKE_CASE_TOOLS: 24,
  MIGRATION_PERCENT_TARGET: 90
} as const;

/**
 * File Path Constants - Configurable paths
 * Replaces hardcoded file path references
 */
export const PATHS = {
  PACKAGE_JSON: '../../package.json',
  EDGERC_DEFAULT: '~/.edgerc',
  TOOLS_DIR: '../tools',
  CONFIG_DIR: '../config',
  TEMP_DIR: process.env['TEMP_DIR'] || '/tmp',
  LOG_DIR: process.env['LOG_DIR'] || './logs'
} as const;

/**
 * Environment and Runtime Configuration
 */
export const RUNTIME = {
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
  DEBUG: process.env['DEBUG'] === 'true',
  
  // Transport configuration
  MCP_TRANSPORT: process.env['MCP_TRANSPORT'] || 'stdio',
  
  // Feature flags
  ENABLE_DYNAMIC_DISCOVERY: process.env['ENABLE_DYNAMIC_DISCOVERY'] !== 'false',
  ENABLE_HOT_RELOAD: process.env['ENABLE_HOT_RELOAD'] === 'true',
  ENABLE_METRICS: process.env['ENABLE_METRICS'] !== 'false',
  ENABLE_CACHING: process.env['ENABLE_CACHING'] !== 'false'
} as const;

/**
 * DNS-specific constants
 * Consolidates DNS-related magic numbers
 */
export const DNS_CONSTANTS = {
  MIN_TTL: 30,
  MAX_TTL: 86400,
  DEFAULT_TTL: 300,
  CAA_TTL: 3600,
  
  // DNS record type priorities
  A_RECORD_PRIORITY: 1,
  AAAA_RECORD_PRIORITY: 1,
  CNAME_RECORD_PRIORITY: 5,
  MX_RECORD_PRIORITY: 10,
  
  // Port validation for SRV records
  MIN_PORT: 1,
  MAX_PORT: 65535
} as const;

// Export all constants as a single object for convenience
export const CONSTANTS = {
  VERSION,
  HTTP_STATUS,
  PORTS,
  TIMEOUTS,
  CACHE_TTL,
  LIMITS,
  TEST_CONFIG,
  API_BASES,
  JSON_RPC_ERRORS,
  TOOL_COUNTS,
  PATHS,
  RUNTIME,
  DNS_CONSTANTS
} as const;

// Type definitions for better TypeScript support
export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type TimeoutValue = typeof TIMEOUTS[keyof typeof TIMEOUTS];
export type CacheTTL = typeof CACHE_TTL[keyof typeof CACHE_TTL];
export type ServiceLimit = typeof LIMITS[keyof typeof LIMITS];
export type PortNumber = typeof PORTS[keyof typeof PORTS];

/**
 * Utility function to get environment-specific configuration
 */
export function getEnvironmentConfig(key: string, defaultValue: any = undefined): any {
  const envValue = process.env[key];
  
  if (envValue === undefined) {
    return defaultValue;
  }
  
  // Try to parse as number
  const numValue = Number(envValue);
  if (!isNaN(numValue)) {
    return numValue;
  }
  
  // Try to parse as boolean
  if (envValue.toLowerCase() === 'true') return true;
  if (envValue.toLowerCase() === 'false') return false;
  
  // Return as string
  return envValue;
}

/**
 * Validation helper for port numbers
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= PORTS.MIN_PORT && port <= PORTS.MAX_PORT;
}

/**
 * Validation helper for TTL values
 */
export function isValidTTL(ttl: number): boolean {
  return Number.isInteger(ttl) && ttl >= 0 && ttl <= LIMITS.MAX_TTL;
}

/**
 * Helper to get dynamic tool count (when available)
 * Falls back to static estimates during migration
 */
export function getExpectedToolCount(): number {
  // This will be replaced with dynamic discovery
  // For now, return the actual count we measured
  return TOOL_COUNTS.ACTUAL_CURRENT_TOTAL;
}