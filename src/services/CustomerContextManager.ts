/**
 * Customer Context Manager
 * Integrates OAuth authentication, credential management, and authorization
 */

import { AuthorizationManager } from '@/auth/AuthorizationManager';
// import { EdgeGridAuth } from '@/auth/EdgeGridAuth'; // Not used after refactor
import { OAuthManager } from '@/auth/oauth/OAuthManager';
import { AkamaiClient } from '@/akamai-client';
import type {
  OAuthToken,
  OAuthProvider,
  CustomerContext,
  AuthSession,
  AuthorizationContext,
  AuthorizationDecision,
  CredentialRotationSchedule,
  CustomerIsolationPolicy,
  Role,
} from '@/auth/oauth/types';
import { SecureCredentialManager } from '@/auth/SecureCredentialManager';
import type { EdgeGridCredentials } from '@/types/config';
import { logger } from '@/utils/logger';

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
 * Customer context manager service
 */
export class CustomerContextManager {
  private static instance: CustomerContextManager;
  private readonly oauthManager: OAuthManager;
  private readonly credentialManager: SecureCredentialManager;
  private readonly authorizationManager: AuthorizationManager;
  // Note: We no longer cache AkamaiClient instances as they are lightweight
  // private edgeGridClients: Map<string, AkamaiClient> = new Map();

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
   * Switch customer context
   */
  async switchCustomer(_request: CustomerSwitchRequest): Promise<CustomerContext> {
    const { sessionId, targetCustomerId, reason } = request;

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

    logger.info('Customer context switched', {
      sessionId,
      fromCustomer: session.currentContext?.customerId,
      toCustomer: targetCustomerId,
      userId: session.profile.sub,
      reason,
    });

    return newContext;
  }

  /**
   * Get EdgeGrid client for customer
   */
  async getEdgeGridClient(_request: CustomerCredentialRequest): Promise<AkamaiClient> {
    const { sessionId, customerId, purpose } = request;

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
    const { sessionId, resource, action, resourceId, metadata } = request;

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

    // Build authorization context
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
