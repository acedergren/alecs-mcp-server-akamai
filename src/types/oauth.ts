/**
 * OAuth 2.0 Resource Server Type Definitions
 * Implements OAuth 2.0 Resource Server specifications including:
 * - RFC 6749 (OAuth 2.0 Core)
 * - RFC 8707 (Resource Indicators)
 * - RFC 8414 (OAuth 2.0 Authorization Server Metadata)
 */

import { type Property, type DnsZone, type Certificate, type NetworkList } from './akamai';

/**
 * OAuth 2.0 Resource Types
 * Defines the types of resources that can be protected
 */
export enum OAuthResourceType {
  PROPERTY = 'property',
  HOSTNAME = 'hostname',
  CERTIFICATE = 'certificate',
  DNS_ZONE = 'dns_zone',
  DNS_RECORD = 'dns_record',
  NETWORK_LIST = 'network_list',
  PURGE = 'purge',
  REPORT = 'report',
  SECURITY_CONFIG = 'security_config',
}

/**
 * OAuth 2.0 Resource URI Scheme
 * Format: akamai://{resource-type}/{account-id}/{resource-id}
 * Example: akamai://property/acc_123456/prp_789012
 */
export interface OAuthResourceUri {
  /** URI scheme (always 'akamai') */
  scheme: 'akamai';
  /** Resource type */
  resourceType: OAuthResourceType;
  /** Account/Contract ID */
  accountId: string;
  /** Resource-specific ID */
  resourceId: string;
  /** Optional sub-resource path */
  subPath?: string;
  /** Full URI string representation */
  toString(): string;
}

/**
 * OAuth 2.0 Protected Resource Metadata
 * Defines metadata for protected resources
 */
export interface OAuthProtectedResource {
  /** Resource URI following the akamai:// scheme */
  uri: string;
  /** Resource type */
  type: OAuthResourceType;
  /** Human-readable resource name */
  name: string;
  /** Resource description */
  description?: string;
  /** Required OAuth scopes for access */
  requiredScopes: string[];
  /** Optional resource-specific scopes */
  resourceScopes?: string[];
  /** Resource owner (account/contract) */
  owner: {
    accountId: string;
    contractId?: string;
    groupId?: string;
  };
  /** Resource metadata */
  metadata: {
    /** Creation timestamp */
    created: string;
    /** Last modified timestamp */
    modified: string;
    /** Resource version */
    version?: string;
    /** Resource status */
    status?: string;
    /** Additional metadata */
    [key: string]: unknown;
  };
  /** Allowed HTTP methods */
  allowedMethods: string[];
  /** Resource-specific attributes */
  attributes?: Record<string, unknown>;
}

/**
 * OAuth 2.0 Authorization Server Metadata
 * RFC 8414 compliant authorization server metadata
 */
export interface OAuthAuthorizationServerMetadata {
  /** Authorization server issuer identifier */
  issuer: string;
  /** Authorization endpoint URL */
  authorization_endpoint: string;
  /** Token endpoint URL */
  token_endpoint: string;
  /** Token introspection endpoint URL (RFC 7662) */
  introspection_endpoint?: string;
  /** Token revocation endpoint URL (RFC 7009) */
  revocation_endpoint?: string;
  /** JWKS endpoint URL */
  jwks_uri: string;
  /** Registration endpoint URL */
  registration_endpoint?: string;
  /** Supported OAuth scopes */
  scopes_supported: string[];
  /** Supported response types */
  response_types_supported: string[];
  /** Supported response modes */
  response_modes_supported?: string[];
  /** Supported grant types */
  grant_types_supported?: string[];
  /** Supported token endpoint auth methods */
  token_endpoint_auth_methods_supported?: string[];
  /** Supported token endpoint auth signing algorithms */
  token_endpoint_auth_signing_alg_values_supported?: string[];
  /** Service documentation URL */
  service_documentation?: string;
  /** Supported UI locales */
  ui_locales_supported?: string[];
  /** OP policy URL */
  op_policy_uri?: string;
  /** OP terms of service URL */
  op_tos_uri?: string;
  /** Supported PKCE code challenge methods */
  code_challenge_methods_supported?: string[];
  /** Resource indicators supported (RFC 8707) */
  resource_indicators_supported?: boolean;
  /** Authorization response issuer parameter supported */
  authorization_response_iss_parameter_supported?: boolean;
}

/**
 * OAuth 2.0 Resource Server Metadata
 * Resource server specific metadata
 */
export interface OAuthResourceServerMetadata {
  /** Resource server identifier */
  resource: string;
  /** Resource server name */
  name: string;
  /** Resource server description */
  description?: string;
  /** Base URL for resource APIs */
  resource_base_uri: string;
  /** Supported resource types */
  resource_types_supported: OAuthResourceType[];
  /** Resource-specific scopes */
  resource_scopes: Record<OAuthResourceType, string[]>;
  /** Required base scopes for any access */
  base_scopes_required: string[];
  /** Resource documentation URL */
  resource_documentation?: string;
  /** Resource policy URL */
  resource_policy_uri?: string;
  /** Supported OAuth features */
  features_supported: string[];
  /** Resource terms of service URL */
  resource_tos_uri?: string;
  /** Authorization servers that can issue tokens for this resource */
  authorization_servers?: string[];
  /** Supported bearer token methods */
  bearer_methods_supported?: string[];
  /** MCP version */
  mcp_version?: string;
  /** MCP features supported */
  mcp_features?: string[];
}

/**
 * OAuth 2.0 Scope Definition
 * Defines OAuth scopes and their permissions
 */
export interface OAuthScope {
  /** Scope identifier */
  scope: string;
  /** Human-readable scope name */
  name: string;
  /** Scope description */
  description: string;
  /** Resource types this scope applies to */
  resourceTypes: OAuthResourceType[];
  /** Allowed operations for this scope */
  operations: OAuthOperation[];
  /** Is this a resource-specific scope template */
  isResourceScope: boolean;
  /** Parent scope (for hierarchical scopes) */
  parentScope?: string;
}

/**
 * OAuth 2.0 Operation
 * Defines operations that can be performed on resources
 */
export enum OAuthOperation {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  PURGE = 'purge',
  VALIDATE = 'validate',
  ANALYZE = 'analyze',
}

/**
 * OAuth 2.0 Resource Indicator (RFC 8707)
 * Used to indicate specific resources in token requests
 */
export interface OAuthResourceIndicator {
  /** Resource identifier (URI or identifier) */
  resource: string | string[];
  /** Resource type hint */
  resource_type?: OAuthResourceType;
  /** Requested scopes for the resource */
  scope?: string;
}

/**
 * OAuth 2.0 Access Token Claims
 * JWT claims for resource access tokens
 */
export interface OAuthAccessTokenClaims {
  /** Issuer */
  iss: string;
  /** Subject (client or user) */
  sub: string;
  /** Audience (resource servers) */
  aud: string | string[];
  /** Expiration time */
  exp: number;
  /** Not before time */
  nbf?: number;
  /** Issued at time */
  iat: number;
  /** JWT ID */
  jti?: string;
  /** Granted scopes */
  scope: string;
  /** Client ID */
  client_id: string;
  /** Resource indicators (RFC 8707) */
  resource?: string | string[];
  /** Akamai-specific claims */
  akamai?: {
    /** Account ID */
    account_id: string;
    /** Contract IDs */
    contract_ids?: string[];
    /** Group IDs */
    group_ids?: string[];
    /** Customer section */
    customer?: string;
    /** API client name */
    api_client?: string;
  };
}

/**
 * OAuth 2.0 Token Introspection Response (RFC 7662)
 */
export interface OAuthTokenIntrospectionResponse {
  /** Token active status */
  active: boolean;
  /** Token scopes */
  scope?: string;
  /** Client ID */
  client_id?: string;
  /** Username */
  username?: string;
  /** Token type */
  token_type?: string;
  /** Expiration */
  exp?: number;
  /** Issued at */
  iat?: number;
  /** Not before */
  nbf?: number;
  /** Subject */
  sub?: string;
  /** Audience */
  aud?: string | string[];
  /** Issuer */
  iss?: string;
  /** JWT ID */
  jti?: string;
  /** Resource indicators */
  resource?: string | string[];
  /** Additional claims */
  [key: string]: unknown;
}

/**
 * OAuth 2.0 Resource Access Context
 * Context for resource access decisions
 */
export interface OAuthResourceAccessContext {
  /** Access token claims */
  token: OAuthAccessTokenClaims;
  /** Requested resource */
  resource: OAuthProtectedResource;
  /** Requested operation */
  operation: OAuthOperation;
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * OAuth 2.0 Authorization Decision
 */
export interface OAuthAuthorizationDecision {
  /** Access allowed */
  allowed: boolean;
  /** Reason for denial */
  reason?: string;
  /** Missing scopes */
  missingScopes?: string[];
  /** Required conditions */
  conditions?: string[];
  /** Audit metadata */
  audit?: {
    timestamp: string;
    decision: 'ALLOW' | 'DENY';
    resource: string;
    operation: string;
    client: string;
    reason?: string;
  };
}

/**
 * Resource-specific scope templates
 * These are expanded with actual resource IDs at runtime
 */
export const RESOURCE_SCOPE_TEMPLATES: Record<OAuthResourceType, string[]> = {
  [OAuthResourceType.PROPERTY]: [
    'property:{id}:read',
    'property:{id}:write',
    'property:{id}:activate',
    'property:{id}:delete',
  ],
  [OAuthResourceType.HOSTNAME]: [
    'hostname:{id}:read',
    'hostname:{id}:write',
    'hostname:{id}:validate',
  ],
  [OAuthResourceType.CERTIFICATE]: [
    'certificate:{id}:read',
    'certificate:{id}:renew',
    'certificate:{id}:revoke',
  ],
  [OAuthResourceType.DNS_ZONE]: [
    'dns_zone:{id}:read',
    'dns_zone:{id}:write',
    'dns_zone:{id}:delete',
  ],
  [OAuthResourceType.DNS_RECORD]: [
    'dns_record:{zone}:{id}:read',
    'dns_record:{zone}:{id}:write',
    'dns_record:{zone}:{id}:delete',
  ],
  [OAuthResourceType.NETWORK_LIST]: [
    'network_list:{id}:read',
    'network_list:{id}:write',
    'network_list:{id}:activate',
  ],
  [OAuthResourceType.PURGE]: [
    'purge:url:execute',
    'purge:cpcode:execute',
    'purge:tag:execute',
  ],
  [OAuthResourceType.REPORT]: [
    'report:{type}:read',
    'report:{type}:generate',
  ],
  [OAuthResourceType.SECURITY_CONFIG]: [
    'security_config:{id}:read',
    'security_config:{id}:write',
    'security_config:{id}:activate',
  ],
};

/**
 * Base OAuth scopes for general access
 */
export const BASE_OAUTH_SCOPES = {
  // Read access to all resources
  READ_ALL: 'akamai:read',
  // Write access to all resources
  WRITE_ALL: 'akamai:write',
  // Property management
  PROPERTY_READ: 'property:read',
  PROPERTY_WRITE: 'property:write',
  PROPERTY_ACTIVATE: 'property:activate',
  // DNS management
  DNS_READ: 'dns:read',
  DNS_WRITE: 'dns:write',
  // Certificate management
  CERTIFICATE_READ: 'certificate:read',
  CERTIFICATE_MANAGE: 'certificate:manage',
  // Network list management
  NETWORK_LIST_READ: 'network_list:read',
  NETWORK_LIST_WRITE: 'network_list:write',
  // Purge operations
  PURGE_EXECUTE: 'purge:execute',
  // Reporting
  REPORT_READ: 'report:read',
  // Security configuration
  SECURITY_READ: 'security:read',
  SECURITY_WRITE: 'security:write',
} as const;

/**
 * Well-known URIs for OAuth discovery
 */
export const OAUTH_WELL_KNOWN_URIS = {
  AUTHORIZATION_SERVER: '/.well-known/oauth-authorization-server',
  RESOURCE_SERVER: '/.well-known/oauth-resource-server',
  JWKS: '/.well-known/jwks.json',
} as const;
