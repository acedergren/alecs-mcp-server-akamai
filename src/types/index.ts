/**
 * Barrel exports for all type definitions
 */

// Configuration types
export * from './config';

// Akamai API types
export * from './akamai';

// MCP tool types
export * from './mcp';

// Re-export commonly used types for convenience
export type {
  // Config types
  NetworkEnvironment,
  EdgeGridCredentials,
  CustomerSection,
  ConfigurationError,
  ConfigErrorType,
  ValidationResult
} from './config';

export type {
  // Akamai API types
  Property,
  PropertyVersion,
  PropertyRules,
  PropertyActivation,
  DnsZone,
  DnsRecord,
  Certificate,
  NetworkList,
  Contract,
  Group,
  Product,
  EdgeHostname,
  CpCode
} from './akamai';

export type {
  // MCP types
  BaseMcpParams,
  McpToolResponse,
  McpToolMetadata
} from './mcp';