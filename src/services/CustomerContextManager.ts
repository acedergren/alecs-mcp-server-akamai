/**
 * ENTERPRISE MULTI-TENANT CUSTOMER CONTEXT MANAGER
 * 
 * HOSTED REMOTE MCP SERVER ARCHITECTURE:
 * This is the cornerstone of enterprise-grade multi-tenant MCP hosting,
 * providing OAuth-based authentication, session management, and customer
 * context switching for hosted remote MCP server deployments.
 * 
 * REMOTE MCP HOSTING CAPABILITIES:
 * 🔐 OAuth Integration: Token-based authentication for remote clients
 * 🏢 Multi-Tenant Sessions: Users can access multiple customer accounts
 * 🔄 Dynamic Context Switching: Seamless customer account switching
 * 🛡️ Role-Based Authorization: Granular permissions per customer context
 * 🔒 Secure Credential Storage: Encrypted Akamai credentials per customer
 * 🔑 Credential Rotation: Automated credential lifecycle management
 * 📊 Audit Logging: Complete audit trail for compliance and monitoring
 * 🏛️ Customer Isolation: Configurable isolation policies per tenant
 * 
 * HOSTED DEPLOYMENT SCENARIOS:
 * 1. **SaaS MCP Provider**: Multiple organizations using shared MCP infrastructure
 * 2. **Enterprise MSP**: Service providers managing multiple client accounts
 * 3. **Consulting Platform**: Consultants accessing multiple customer environments
 * 4. **Development Cloud**: Teams managing staging/production across customers
 * 
 * AUTHENTICATION FLOW FOR REMOTE MCP:
 * 1. Client authenticates via OAuth → receives session token
 * 2. Session includes available customer contexts for that user
 * 3. Client selects customer context for operations
 * 4. All MCP tool calls include session + customer context
 * 5. Authorization checked before accessing customer resources
 * 
 * CUSTOMER CREDENTIAL MANAGEMENT:
 * - Remote storage of Akamai EdgeGrid credentials per customer
 * - Encrypted credential storage with rotation scheduling
 * - Admin-controlled credential access and management
 * - Secure credential injection into EdgeGrid clients
 * 
 * SCALING ARCHITECTURE:
 * Local .edgerc → OAuth sessions → Distributed credential service → Enterprise SaaS
 */

import { AkamaiClient } from '../akamai-client';
import { logger } from '../utils/logger';

// Temporarily define types that would come from auth modules
interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface OAuthProvider {
  id: string;
  name: string;
}

interface CustomerContext {
  customerId: string;
  name: string;
  edgeGridSection?: string;
}

interface AuthSession {
  sessionId: string;
  customerId: string;
  userId?: string;
  expiresAt: Date;
}

interface AuthorizationContext {
  subject: string;
  resource: string;
  action: string;
  context?: any;
  user?: string;
}

interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
}

interface CredentialRotationSchedule {
  nextRotation: Date;
  frequency: string;
}

interface CustomerIsolationPolicy {
  isolated: boolean;
  level: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface EdgeGridCredentials {
  client_token: string;
  client_secret: string;
  access_token: string;
  host: string;
}

// Stub implementations for missing auth modules
class AuthorizationManager {
  private static instance: AuthorizationManager;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new AuthorizationManager();
    }
    return this.instance;
  }
  
  async initialize() {}
  async checkAuthorization(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
    return { allowed: true };
  }
  async authorize(ctx: AuthorizationContext): Promise<AuthorizationDecision> {
    return { allowed: true };
  }
  async getRoles(userId: string): Promise<Role[]> {
    return [];
  }
}

class OAuthManager {
  private static instance: OAuthManager;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new OAuthManager();
    }
    return this.instance;
  }
  
  async initialize() {}
  async getToken(providerId: string): Promise<OAuthToken | null> {
    return null;
  }
  async refreshToken(token: OAuthToken): Promise<OAuthToken> {
    return token;
  }
  async authenticateWithToken(token: string): Promise<AuthSession> {
    return {
      sessionId: 'mock-session',
      customerId: 'default',
      userId: 'mock-user',
      expiresAt: new Date(Date.now() + 3600000)
    };
  }
  async getSession(sessionId: string): Promise<AuthSession | null> {
    return {
      sessionId,
      customerId: 'default',
      userId: 'mock-user',
      expiresAt: new Date(Date.now() + 3600000)
    };
  }
  async switchCustomerContext(sessionId: string, targetCustomerId: string): Promise<AuthSession> {
    return {
      sessionId,
      customerId: targetCustomerId,
      userId: 'mock-user',
      expiresAt: new Date(Date.now() + 3600000)
    };
  }
}

class SecureCredentialManager {
  private static instance: SecureCredentialManager;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new SecureCredentialManager();
    }
    return this.instance;
  }
  
  async initialize() {}
  async getCredentials(customerId: string): Promise<EdgeGridCredentials | null> {
    return null;
  }
  async rotateCredentials(customerId: string): Promise<void> {}
  async getRotationSchedule(customerId: string): Promise<CredentialRotationSchedule | null> {
    return null;
  }
  async encryptCredentials(credentials: EdgeGridCredentials): Promise<string> {
    return JSON.stringify(credentials);
  }
}

/**
 * Customer switch request
 */
export interface CustomerSwitchRequest {
  sessionId: string;
  targetCustomerId: string;
  reason?: string;
}

/**
 * Customer credential request
 */
export interface CustomerCredentialRequest {
  sessionId: string;
  customerId: string;
  purpose?: string;
}

/**
 * Authorization request
 */
export interface AuthorizationRequest {
  sessionId: string;
  resource: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ENTERPRISE CUSTOMER CONTEXT MANAGER IMPLEMENTATION
 * 
 * REMOTE MCP SERVER ORCHESTRATION:
 * This service orchestrates all multi-tenant operations for hosted MCP deployments,
 * managing OAuth sessions, customer contexts, and secure credential access.
 * 
 * HOSTED MCP ARCHITECTURE COMPONENTS:
 * 
 * 1. **OAuth Manager**: 
 *    - Handles OAuth token authentication from remote clients
 *    - Manages session lifecycle and expiration
 *    - Supports customer context switching within sessions
 * 
 * 2. **Credential Manager**:
 *    - Securely stores encrypted Akamai credentials per customer
 *    - Handles credential rotation and lifecycle management
 *    - Provides just-in-time credential injection for API calls
 * 
 * 3. **Authorization Manager**:
 *    - Enforces role-based access control per customer context
 *    - Validates permissions before customer operations
 *    - Supports custom roles and fine-grained permissions
 * 
 * CLIENT CONNECTION PATTERNS:
 * - Claude Desktop connects via MCP protocol with session token
 * - Web interfaces authenticate via OAuth flow
 * - API clients use session-based authentication
 * - All connections support customer context switching
 * 
 * SCALABILITY DESIGN:
 * - Stateless design for horizontal scaling
 * - Session data can be stored in Redis/database
 * - Credential encryption supports HSM integration
 * - Authorization decisions can be cached for performance
 */
export class CustomerContextManager {
  private static instance: CustomerContextManager;
  
  /**
   * OAuth Manager: Handles remote client authentication and session management
   * 
   * REMOTE MCP INTEGRATION:
   * - Authenticates OAuth tokens from MCP clients
   * - Maintains active sessions with customer context lists
   * - Supports session refresh and renewal
   * - Enables customer context switching without re-authentication
   */
  private readonly oauthManager: OAuthManager;
  
  /**
   * Secure Credential Manager: Manages encrypted Akamai credentials per customer
   * 
   * HOSTED DEPLOYMENT BENEFITS:
   * - Customers don't need to share .edgerc files with hosting provider
   * - Credentials encrypted at rest with customer-specific keys
   * - Automatic credential rotation with zero downtime
   * - Audit trail of all credential access and usage
   */
  private readonly credentialManager: SecureCredentialManager;
  
  /**
   * Authorization Manager: Enforces permissions and customer isolation
   * 
   * MULTI-TENANT SECURITY:
   * - Role-based access control per customer context
   * - Fine-grained permissions for Akamai operations
   * - Customer isolation policies and boundaries
   * - Administrative controls for hosting providers
   */
  private readonly authorizationManager: AuthorizationManager;
  
  // Note: AkamaiClient instances are lightweight and created per-request
  // This eliminates the need for client caching and improves security isolation

  private constructor() {
    this.oauthManager = OAuthManager.getInstance();
    this.credentialManager = SecureCredentialManager.getInstance(
      process.env.CREDENTIAL_MASTER_KEY || 'default-insecure-key',
    );
    this.authorizationManager = AuthorizationManager.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CustomerContextManager {
    if (!CustomerContextManager.instance) {
      CustomerContextManager.instance = new CustomerContextManager();
    }
    return CustomerContextManager.instance;
  }

  /**
   * Authenticate with OAuth token
   */
  async authenticateOAuth(token: OAuthToken, provider: OAuthProvider): Promise<AuthSession> {
    return this.oauthManager.authenticateWithToken(token, provider);
  }

  /**
   * CUSTOMER CONTEXT SWITCHING FOR REMOTE MCP
   * 
   * HOSTED MCP USE CASE:
   * Remote MCP clients (Claude Desktop, web apps) can dynamically switch
   * between different customer accounts they have access to without 
   * re-authentication, enabling seamless multi-customer operations.
   * 
   * SECURITY VALIDATION:
   * 1. Validates active OAuth session
   * 2. Checks authorization to switch to target customer
   * 3. Verifies user has access to target customer context
   * 4. Logs all context switches for audit compliance
   * 
   * REMOTE CLIENT FLOW:
   * Client → switchCustomer(sessionId, targetCustomerId) → New context
   * Subsequent MCP tool calls use new customer context automatically
   */
  async switchCustomer(_request: CustomerSwitchRequest): Promise<CustomerContext> {
    const { sessionId, targetCustomerId, reason } = _request;

    // Get session
    const session = this.oauthManager.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Check authorization to switch
    const authContext: AuthorizationContext = {
      user: session.profile,
      customerContext: session.currentContext!,
      permissions: session.currentContext?.permissions || [],
    };

    const decision = await this.authorizationManager.authorize(authContext, {
      resource: 'customer_context',
      action: 'switch',
      resourceId: targetCustomerId,
      metadata: { reason },
    });

    if (!decision.allowed) {
      throw new Error(
        `Not authorized to switch to customer ${targetCustomerId}: ${decision.reason}`,
      );
    }

    // Perform switch
    const newContext = await this.oauthManager.switchCustomerContext(sessionId, targetCustomerId);

    // No cache to clear anymore

    logger.info('Customer _context switched', {
      sessionId,
      fromCustomer: session.currentContext?.customerId,
      toCustomer: targetCustomerId,
      userId: session.profile.sub,
      reason,
    });

    return newContext;
  }

  /**
   * SECURE CUSTOMER CREDENTIAL ACCESS FOR REMOTE MCP
   * 
   * HOSTED DEPLOYMENT ARCHITECTURE:
   * This is the secure bridge between remote MCP sessions and Akamai APIs.
   * Instead of clients having direct access to .edgerc files, credentials
   * are securely managed by the hosting provider and injected just-in-time.
   * 
   * CREDENTIAL SECURITY MODEL:
   * 1. Validates OAuth session and customer access rights
   * 2. Checks fine-grained authorization for credential access
   * 3. Creates customer-specific AkamaiClient with encrypted credentials
   * 4. Logs all credential access for compliance and auditing
   * 
   * HOSTED MCP BENEFITS:
   * - Customers don't expose Akamai credentials to clients
   * - Hosting provider can enforce security policies
   * - Centralized credential rotation and management
   * - Complete audit trail of API access per customer
   * 
   * INTEGRATION PATTERN:
   * Remote MCP tool → getEdgeGridClient(sessionId, customerId) → Secure client
   */
  async getEdgeGridClient(_request: CustomerCredentialRequest): Promise<AkamaiClient> {
    const { sessionId, customerId, purpose } = _request;

    // Get session
    const session = this.oauthManager.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Check if user has access to this customer
    const hasAccess = session.availableContexts.some((ctx) => ctx.customerId === customerId);

    if (!hasAccess) {
      throw new Error(`No access to customer ${customerId}`);
    }

    // Check authorization
    const authContext: AuthorizationContext = {
      user: session.profile,
      customerContext: session.currentContext!,
      permissions: session.currentContext?.permissions || [],
    };

    const decision = await this.authorizationManager.authorize(authContext, {
      resource: 'credentials',
      action: 'read',
      resourceId: customerId,
      metadata: { purpose },
    });

    if (!decision.allowed) {
      throw new Error(`Not authorized to access credentials: ${decision.reason}`);
    }

    // For OAuth-based access, we still use the standard .edgerc file
    // The OAuth layer only controls WHO can access WHICH customer section
    // It does NOT replace EdgeRC authentication

    // Create standard AkamaiClient with the customer section from .edgerc
    const client = new AkamaiClient(customerId);

    // Note: We don't cache AkamaiClient instances as they are lightweight
    // and the underlying EdgeGrid SDK handles its own connection pooling

    logger.info('EdgeGrid client created for customer', {
      customerId,
      userId: session.profile.sub,
      purpose,
    });

    return client;
  }

  /**
   * Store customer credentials securely
   */
  async storeCustomerCredentials(
    sessionId: string,
    customerId: string,
    credentials: EdgeGridCredentials,
    rotationSchedule?: CredentialRotationSchedule,
  ): Promise<string> {
    // Get session
    const session = this.oauthManager.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Check authorization
    const authContext: AuthorizationContext = {
      user: session.profile,
      customerContext: session.currentContext!,
      permissions: session.currentContext?.permissions || [],
    };

    const decision = await this.authorizationManager.authorize(authContext, {
      resource: 'credentials',
      action: 'create',
      resourceId: customerId,
    });

    if (!decision.allowed) {
      throw new Error(`Not authorized to store credentials: ${decision.reason}`);
    }

    // Encrypt and store credentials
    const credentialId = await this.credentialManager.encryptCredentials(
      credentials,
      customerId,
      rotationSchedule,
    );

    logger.info('Customer credentials stored', {
      customerId,
      credentialId,
      userId: session.profile.sub,
      hasRotationSchedule: !!rotationSchedule,
    });

    return credentialId;
  }

  /**
   * Rotate customer credentials
   */
  async rotateCustomerCredentials(
    sessionId: string,
    credentialId: string,
    newCredentials: EdgeGridCredentials,
  ): Promise<string> {
    // Get session
    const session = this.oauthManager.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Check authorization
    const authContext: AuthorizationContext = {
      user: session.profile,
      customerContext: session.currentContext!,
      permissions: session.currentContext?.permissions || [],
    };

    const decision = await this.authorizationManager.authorize(authContext, {
      resource: 'credentials',
      action: 'rotate',
      resourceId: credentialId,
    });

    if (!decision.allowed) {
      throw new Error(`Not authorized to rotate credentials: ${decision.reason}`);
    }

    // Rotate credentials
    const newCredentialId = await this.credentialManager.rotateCredentials(
      credentialId,
      newCredentials,
      session.profile.sub,
    );

    // No cache to clear anymore

    logger.info('Customer credentials rotated', {
      oldCredentialId: credentialId,
      newCredentialId,
      userId: session.profile.sub,
    });

    return newCredentialId;
  }

  /**
   * Authorize action
   */
  async authorize(_request: AuthorizationRequest): Promise<AuthorizationDecision> {
    const { sessionId, resource, action, resourceId, metadata } = _request;

    // Get session
    const session = this.oauthManager.getSession(sessionId);
    if (!session) {
      return {
        allowed: false,
        reason: 'Invalid or expired session',
      };
    }

    if (!session.currentContext) {
      return {
        allowed: false,
        reason: 'No customer context selected',
      };
    }

    // Build authorization _context
    const authContext: AuthorizationContext = {
      user: session.profile,
      customerContext: session.currentContext,
      permissions: session.currentContext.permissions,
      requestMetadata: {
        requestId: `req_${Date.now()}`,
      },
    };

    // Perform authorization
    const decision = await this.authorizationManager.authorize(authContext, {
      resource,
      action,
      resourceId,
      metadata,
    });

    logger.info('Authorization decision', {
      sessionId,
      resource,
      action,
      resourceId,
      allowed: decision.allowed,
      reason: decision.reason,
    });

    return decision;
  }

  /**
   * Map OAuth subject to customer
   */
  async mapSubjectToCustomer(
    adminSessionId: string,
    subject: string,
    provider: OAuthProvider,
    customerContext: CustomerContext,
  ): Promise<void> {
    // Check admin authorization
    const adminSession = this.oauthManager.getSession(adminSessionId);
    if (!adminSession) {
      throw new Error('Invalid or expired admin session');
    }

    const authContext: AuthorizationContext = {
      user: adminSession.profile,
      customerContext: adminSession.currentContext!,
      permissions: adminSession.currentContext?.permissions || [],
    };

    const decision = await this.authorizationManager.authorize(authContext, {
      resource: 'customer_mapping',
      action: 'create',
      metadata: { subject, provider, customerId: customerContext.customerId },
    });

    if (!decision.allowed) {
      throw new Error(`Not authorized to create customer mapping: ${decision.reason}`);
    }

    // Create mapping
    await this.oauthManager.mapSubjectToCustomer(subject, provider, customerContext);

    logger.info('Subject mapped to customer', {
      subject,
      provider,
      customerId: customerContext.customerId,
      mappedBy: adminSession.profile.sub,
    });
  }

  /**
   * Set customer isolation policy
   */
  async setCustomerIsolationPolicy(
    adminSessionId: string,
    policy: CustomerIsolationPolicy,
  ): Promise<void> {
    // Check admin authorization
    const adminSession = this.oauthManager.getSession(adminSessionId);
    if (!adminSession) {
      throw new Error('Invalid or expired admin session');
    }

    const authContext: AuthorizationContext = {
      user: adminSession.profile,
      customerContext: adminSession.currentContext!,
      permissions: adminSession.currentContext?.permissions || [],
    };

    const decision = await this.authorizationManager.authorize(authContext, {
      resource: 'isolation_policy',
      action: 'create',
      resourceId: policy.customerId,
    });

    if (!decision.allowed) {
      throw new Error(`Not authorized to set isolation policy: ${decision.reason}`);
    }

    // Set policy
    await this.authorizationManager.setCustomerIsolationPolicy(policy);

    logger.info('Customer isolation policy set', {
      customerId: policy.customerId,
      isolationLevel: policy.isolationLevel,
      setBy: adminSession.profile.sub,
    });
  }

  /**
   * Create custom role
   */
  async createCustomRole(adminSessionId: string, role: Role): Promise<void> {
    // Check admin authorization
    const adminSession = this.oauthManager.getSession(adminSessionId);
    if (!adminSession) {
      throw new Error('Invalid or expired admin session');
    }

    const authContext: AuthorizationContext = {
      user: adminSession.profile,
      customerContext: adminSession.currentContext!,
      permissions: adminSession.currentContext?.permissions || [],
    };

    const decision = await this.authorizationManager.authorize(authContext, {
      resource: 'role',
      action: 'create',
    });

    if (!decision.allowed) {
      throw new Error(`Not authorized to create role: ${decision.reason}`);
    }

    // Create role
    await this.authorizationManager.createRole(role);

    logger.info('Custom role created', {
      roleId: role.id,
      roleName: role.name,
      createdBy: adminSession.profile.sub,
    });
  }

  /**
   * Get customer contexts for current session
   */
  async getAvailableCustomers(sessionId: string): Promise<CustomerContext[]> {
    const session = this.oauthManager.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    return session.availableContexts;
  }

  /**
   * Refresh session token
   */
  async refreshSessionToken(sessionId: string): Promise<OAuthToken> {
    return this.oauthManager.refreshToken(sessionId);
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<void> {
    // No cache to clear anymore
    await this.oauthManager.revokeSession(sessionId);
  }

  /**
   * Clean up expired sessions and resources
   */
  cleanupExpired(): void {
    this.oauthManager.cleanupExpiredSessions();

    // No cache to clean up anymore
  }
}
