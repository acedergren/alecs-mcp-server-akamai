/**
 * OAuth Authentication Types and Interfaces
 * Provides type definitions for OAuth authentication with customer _context mapping
 */


/**
 * OAuth provider types supported
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  AZURE_AD = 'azure_ad',
  OKTA = 'okta',
  AUTH0 = 'auth0',
  CUSTOM = 'custom',
}

/**
 * OAuth token information
 */
export interface OAuthToken {
  /** Access token */
  accessToken: string;
  /** Token type (e.g., Bearer) */
  tokenType: string;
  /** Expiration time in seconds */
  expiresIn?: number;
  /** Refresh token for renewing access */
  refreshToken?: string;
  /** Token scope */
  scope?: string;
  /** ID token for OpenID Connect */
  idToken?: string;
  /** Token issued at timestamp */
  issuedAt: number;
}

/**
 * OAuth user profile
 */
export interface OAuthProfile {
  /** Unique subject identifier from OAuth provider */
  sub: string;
  /** Email address */
  email?: string;
  /** Display name */
  name?: string;
  /** Profile picture URL */
  picture?: string;
  /** Email verification status */
  emailVerified?: boolean;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
  /** OAuth provider */
  provider: OAuthProvider;
}

/**
 * Customer _context mapping
 */
export interface CustomerContext {
  /** Customer identifier */
  customerId: string;
  /** Customer name */
  customerName: string;
  /** Account switch key for multi-tenant access */
  accountSwitchKey?: string;
  /** Customer-specific roles */
  roles: string[];
  /** Customer-specific permissions */
  permissions: Permission[];
  /** Customer metadata */
  metadata?: Record<string, unknown>;
  /** Active status */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last access timestamp */
  lastAccessAt?: Date;
}

/**
 * OAuth subject to customer mapping
 */
export interface OAuthSubjectMapping {
  /** OAuth subject (user ID from provider) */
  subject: string;
  /** OAuth provider */
  provider: OAuthProvider;
  /** Mapped customer contexts */
  customerContexts: CustomerContext[];
  /** Default customer _context */
  defaultCustomerId?: string;
  /** Mapping creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Permission model
 */
export interface Permission {
  /** Permission identifier */
  id: string;
  /** Resource type (e.g., property, configuration) */
  resource: string;
  /** Allowed actions (e.g., read, write, delete) */
  actions: string[];
  /** Resource constraints (e.g., specific property IDs) */
  constraints?: Record<string, unknown>;
  /** Permission scope (global, customer, resource) */
  scope: PermissionScope;
}

/**
 * Permission scope levels
 */
export enum PermissionScope {
  GLOBAL = 'global',
  CUSTOMER = 'customer',
  RESOURCE = 'resource',
}

/**
 * Role definition
 */
export interface Role {
  /** Role identifier */
  id: string;
  /** Role name */
  name: string;
  /** Role description */
  description?: string;
  /** Permissions associated with role */
  permissions: Permission[];
  /** Whether role is system-defined */
  isSystem: boolean;
  /** Role priority for inheritance */
  priority: number;
}

/**
 * Authentication session
 */
export interface AuthSession {
  /** Session ID */
  sessionId: string;
  /** OAuth token */
  token: OAuthToken;
  /** User profile */
  profile: OAuthProfile;
  /** Current customer _context */
  currentContext?: CustomerContext;
  /** Available customer contexts */
  availableContexts: CustomerContext[];
  /** Session creation timestamp */
  createdAt: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Credential access audit log
 */
export interface CredentialAuditLog {
  /** Log entry ID */
  id: string;
  /** User who accessed credentials */
  userId: string;
  /** Customer _context */
  customerId: string;
  /** Action performed */
  action: CredentialAction;
  /** Resource accessed */
  resource: string;
  /** Access timestamp */
  timestamp: Date;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Credential actions for audit logging
 */
export enum CredentialAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ROTATE = 'rotate',
  DECRYPT = 'decrypt',
  VALIDATE = 'validate',
}

/**
 * Encrypted credential storage
 */
export interface EncryptedCredential {
  /** Credential ID */
  id: string;
  /** Customer ID */
  customerId: string;
  /** Encrypted EdgeGrid credentials */
  encryptedData: string;
  /** Encryption algorithm used */
  algorithm: string;
  /** Key derivation parameters */
  keyDerivation?: {
    algorithm: string;
    iterations: number;
    salt: string;
  };
  /** Initialization vector */
  iv: string;
  /** Authentication tag for GCM modes */
  authTag?: string;
  /** Credential version */
  version: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last rotation timestamp */
  lastRotatedAt?: Date;
  /** Rotation schedule */
  rotationSchedule?: CredentialRotationSchedule;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Credential rotation schedule
 */
export interface CredentialRotationSchedule {
  /** Rotation interval in days */
  intervalDays: number;
  /** Next rotation date */
  nextRotation: Date;
  /** Auto-rotation enabled */
  autoRotate: boolean;
  /** Notification settings */
  notifications?: {
    enabled: boolean;
    daysBeforeRotation: number;
    recipients: string[];
  };
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  /** OAuth provider */
  provider: OAuthProvider;
  /** Client ID */
  clientId: string;
  /** Client secret */
  clientSecret: string;
  /** Authorization URL */
  authorizationUrl: string;
  /** Token URL */
  tokenUrl: string;
  /** User info URL */
  userInfoUrl?: string;
  /** Redirect URI */
  redirectUri: string;
  /** Required scopes */
  scopes: string[];
  /** Additional provider-specific config */
  providerConfig?: Record<string, unknown>;
}

/**
 * Customer isolation policy
 */
export interface CustomerIsolationPolicy {
  /** Policy ID */
  id: string;
  /** Customer ID */
  customerId: string;
  /** Isolation level */
  isolationLevel: IsolationLevel;
  /** Resource access restrictions */
  resourceRestrictions: ResourceRestriction[];
  /** Network access restrictions */
  networkRestrictions?: NetworkRestriction[];
  /** Data residency requirements */
  dataResidency?: DataResidencyRequirement;
  /** Policy metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Isolation levels
 */
export enum IsolationLevel {
  /** Complete isolation - no cross-customer access */
  STRICT = 'strict',
  /** Partial isolation - limited cross-customer access */
  PARTIAL = 'partial',
  /** Shared resources with access control */
  SHARED = 'shared',
}

/**
 * Resource access restriction
 */
export interface ResourceRestriction {
  /** Resource type */
  resourceType: string;
  /** Allowed resource IDs */
  allowedIds?: string[];
  /** Denied resource IDs */
  deniedIds?: string[];
  /** Access conditions */
  conditions?: Record<string, unknown>;
}

/**
 * Network access restriction
 */
export interface NetworkRestriction {
  /** Allowed IP ranges */
  allowedIpRanges?: string[];
  /** Denied IP ranges */
  deniedIpRanges?: string[];
  /** Allowed regions */
  allowedRegions?: string[];
  /** Required VPN */
  requireVpn?: boolean;
}

/**
 * Data residency requirement
 */
export interface DataResidencyRequirement {
  /** Required regions */
  requiredRegions: string[];
  /** Prohibited regions */
  prohibitedRegions?: string[];
  /** Encryption requirements */
  encryptionRequired: boolean;
}

/**
 * Authorization _context for requests
 */
export interface AuthorizationContext {
  /** Authenticated user */
  user: OAuthProfile;
  /** Current customer _context */
  customerContext: CustomerContext;
  /** Effective permissions */
  permissions: Permission[];
  /** Request metadata */
  requestMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  };
}

/**
 * Authorization decision
 */
export interface AuthorizationDecision {
  /** Whether access is allowed */
  allowed: boolean;
  /** Reason for decision */
  reason?: string;
  /** Applied policies */
  appliedPolicies?: string[];
  /** Required permissions that were missing */
  missingPermissions?: Permission[];
  /** Additional constraints */
  constraints?: Record<string, unknown>;
}
