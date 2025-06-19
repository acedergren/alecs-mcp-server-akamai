/**
 * Authentication Module Exports
 * Provides OAuth authentication, credential management, and authorization
 */

// OAuth types
export type {
  OAuthToken,
  OAuthProfile,
  CustomerContext,
  OAuthSubjectMapping,
  Permission,
  Role,
  AuthSession,
  CredentialAuditLog,
  EncryptedCredential,
  CredentialRotationSchedule,
  OAuthConfig,
  CustomerIsolationPolicy,
  AuthorizationContext,
  AuthorizationDecision,
} from './oauth/types';

// Export enums separately
export { OAuthProvider, PermissionScope, CredentialAction, IsolationLevel } from './oauth/types';

// OAuth Manager
export { OAuthManager } from './oauth/OAuthManager';
import { OAuthManager } from './oauth/OAuthManager';

// Secure Credential Manager
export { SecureCredentialManager } from './SecureCredentialManager';
import { SecureCredentialManager } from './SecureCredentialManager';

// Authorization Manager
export { AuthorizationManager } from './AuthorizationManager';
import { AuthorizationManager } from './AuthorizationManager';

// EdgeGrid Authentication (existing)
export { EdgeGridAuth } from './EdgeGridAuth';
export type { EdgeGridAuthHeader, EdgeGridRequestConfig, EdgeGridClientOptions } from './EdgeGridAuth';

// Customer Context Manager integration
export { CustomerContextManager } from '@/services/CustomerContextManager';
import { CustomerContextManager } from '@/services/CustomerContextManager';
export type {
  CustomerSwitchRequest,
  CustomerCredentialRequest,
  AuthorizationRequest,
} from '@/services/CustomerContextManager';

// OAuth Middleware
export { OAuthMiddleware } from './oauth-middleware';
export type { OAuthMiddlewareConfig, AuthContext } from './oauth-middleware';

// OAuth 2.1 Protection
export { createOAuthProtectedServer as setupOAuth21Protection } from './oauth-middleware';

// Middleware
export {
  createOAuthMiddleware,
  createCustomerContextMiddleware,
  createCredentialAccessMiddleware,
} from '@/middleware/OAuthMiddleware';
export type { OAuthMiddlewareConfig as LegacyOAuthMiddlewareConfig } from '@/middleware/OAuthMiddleware';

// HTTP Transport
export {
  createOAuthRoutes,
  createSessionMiddleware,
  requireAuth,
  requireAdmin,
} from '@/transport/OAuthEndpoints';

/**
 * Initialize OAuth authentication system
 */
export function initializeOAuthSystem(config?: {
  masterKey?: string;
  providers?: string[];
  requireAuth?: boolean;
}): void {
  const { masterKey, providers = [], requireAuth = true } = config || {};

  // Set environment variables if provided
  if (masterKey) {
    process.env.CREDENTIAL_MASTER_KEY = masterKey;
  }

  if (providers.length > 0) {
    process.env.OAUTH_PROVIDERS = providers.join(',');
  }

  // Initialize managers (they're singletons)
  OAuthManager.getInstance();
  SecureCredentialManager.getInstance(
    process.env.CREDENTIAL_MASTER_KEY || 'default-insecure-key',
  );
  AuthorizationManager.getInstance();
  CustomerContextManager.getInstance();
}

/**
 * Default system roles
 */
export const SystemRoles = {
  ADMIN: 'system:admin',
  OPERATOR: 'system:operator',
  DEVELOPER: 'system:developer',
  VIEWER: 'system:viewer',
} as const;

/**
 * Default permissions
 */
export const DefaultPermissions = {
  // Property permissions
  PROPERTY_READ: { resource: 'property', actions: ['read'] },
  PROPERTY_WRITE: { resource: 'property', actions: ['create', 'update'] },
  PROPERTY_DELETE: { resource: 'property', actions: ['delete'] },
  PROPERTY_ACTIVATE: { resource: 'property', actions: ['activate'] },

  // Configuration permissions
  CONFIG_READ: { resource: 'configuration', actions: ['read'] },
  CONFIG_WRITE: { resource: 'configuration', actions: ['create', 'update'] },
  CONFIG_DELETE: { resource: 'configuration', actions: ['delete'] },

  // Purge permissions
  PURGE_CREATE: { resource: 'purge', actions: ['create'] },
  PURGE_READ: { resource: 'purge', actions: ['read'] },

  // Reporting permissions
  REPORTING_READ: { resource: 'reporting', actions: ['read'] },

  // Security permissions
  SECURITY_READ: { resource: 'security', actions: ['read'] },
  SECURITY_WRITE: { resource: 'security', actions: ['create', 'update'] },

  // Admin permissions
  ADMIN_ALL: { resource: '*', actions: ['*'] },
} as const;
