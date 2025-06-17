/**
 * Configuration types for Akamai MCP Server
 */

/**
 * Network environment types for Akamai deployments
 */
export enum NetworkEnvironment {
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION'
}

/**
 * EdgeGrid authentication credentials
 */
export interface EdgeGridCredentials {
  /** Akamai API host URL */
  host: string;
  /** Client token for authentication */
  client_token: string;
  /** Client secret for authentication */
  client_secret: string;
  /** Access token for API access */
  access_token: string;
  /** Optional account switch key for multi-account access */
  account_switch_key?: string;
}

/**
 * Customer configuration section with metadata
 */
export interface CustomerSection extends EdgeGridCredentials {
  /** Section name from .edgerc file */
  name: string;
  /** Whether this section has account switching enabled */
  hasAccountSwitching: boolean;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Validation errors if any */
  errors: string[];
  /** Validation warnings if any */
  warnings: string[];
}

/**
 * Configuration error types
 */
export enum ConfigErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  INVALID_SECTION = 'INVALID_SECTION',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SECTION_NOT_FOUND = 'SECTION_NOT_FOUND'
}

/**
 * Typed configuration error
 */
export class ConfigurationError extends Error {
  constructor(
    public readonly type: ConfigErrorType,
    message: string,
    public readonly section?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * EdgeRC file location options
 */
export interface EdgeRcLocationOptions {
  /** Environment variable name containing path */
  envVar?: string;
  /** Custom paths to check */
  customPaths?: string[];
  /** Whether to check home directory */
  checkHome?: boolean;
  /** Whether to check current working directory */
  checkCwd?: boolean;
}

/**
 * Customer configuration manager options
 */
export interface ConfigManagerOptions {
  /** EdgeRC file location options */
  locations?: EdgeRcLocationOptions;
  /** Whether to validate credentials on load */
  validateOnLoad?: boolean;
  /** Whether to throw on invalid sections */
  throwOnInvalid?: boolean;
}