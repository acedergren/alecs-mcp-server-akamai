/**
 * OAuth Manager
 * Handles OAuth authentication and customer _context mapping
 */

import { randomBytes } from 'crypto';

import type {
  OAuthToken,
  OAuthProfile,
  OAuthSubjectMapping,
  CustomerContext,
  AuthSession,
  OAuthConfig,
  CredentialAuditLog,
} from './types';
import { OAuthProvider, CredentialAction } from './types';

import { logger } from '@/utils/logger';

/**
 * OAuth Manager class for handling authentication and customer mapping
 */
export class OAuthManager {
  private static instance: OAuthManager;
  private sessions: Map<string, AuthSession> = new Map();
  private subjectMappings: Map<string, OAuthSubjectMapping> = new Map();
  private oauthConfigs: Map<OAuthProvider, OAuthConfig> = new Map();

  private constructor() {
    // Initialize with default configurations
    this.initializeProviderConfigs();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): OAuthManager {
    if (!OAuthManager.instance) {
      OAuthManager.instance = new OAuthManager();
    }
    return OAuthManager.instance;
  }

  /**
   * Initialize OAuth provider configurations
   */
  private initializeProviderConfigs(): void {
    // These would typically come from environment variables or config files
    const providers = process.env.OAUTH_PROVIDERS?.split(',') || [];

    providers.forEach((provider) => {
      const config = this.loadProviderConfig(provider as OAuthProvider);
      if (config) {
        this.oauthConfigs.set(provider as OAuthProvider, config);
      }
    });
  }

  /**
   * Load provider configuration from environment
   */
  private loadProviderConfig(provider: OAuthProvider): OAuthConfig | null {
    const envPrefix = `OAUTH_${provider.toUpperCase()}_`;

    const clientId = process.env[`${envPrefix}CLIENT_ID`];
    const clientSecret = process.env[`${envPrefix}CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      logger.warn(`OAuth provider ${provider} configuration incomplete`);
      return null;
    }

    return {
      provider,
      clientId,
      clientSecret,
      authorizationUrl: process.env[`${envPrefix}AUTH_URL`] || '',
      tokenUrl: process.env[`${envPrefix}TOKEN_URL`] || '',
      userInfoUrl: process.env[`${envPrefix}USERINFO_URL`],
      redirectUri: process.env[`${envPrefix}REDIRECT_URI`] || '',
      scopes: (process.env[`${envPrefix}SCOPES`] || '').split(',').filter(Boolean),
    };
  }

  /**
   * Authenticate user with OAuth token
   */
  async authenticateWithToken(
    token: OAuthToken,
    provider: OAuthProvider,
  ): Promise<AuthSession> {
    try {
      // Validate token
      await this.validateToken(token, provider);

      // Get user profile from OAuth provider
      const profile = await this.getUserProfile(token, provider);

      // Get or create subject mapping
      const mapping = await this.getOrCreateSubjectMapping(profile.sub, provider);

      // Create session
      const session: AuthSession = {
        sessionId: this.generateSessionId(),
        token,
        profile,
        currentContext: mapping.customerContexts[0],
        availableContexts: mapping.customerContexts,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (token.expiresIn || 3600) * 1000),
      };

      // Store session
      this.sessions.set(session.sessionId, session);

      // Audit log
      await this.logCredentialAccess({
        userId: profile.sub,
        customerId: session.currentContext?.customerId || 'unknown',
        action: CredentialAction.VALIDATE,
        resource: 'oauth_session',
        success: true,
      });

      logger.info('OAuth authentication successful', {
        provider,
        userId: profile.sub,
        sessionId: session.sessionId,
      });

      return session;
    } catch (error) {
      logger.error('OAuth authentication failed', { provider, error });

      // Audit log failure
      await this.logCredentialAccess({
        userId: 'unknown',
        customerId: 'unknown',
        action: CredentialAction.VALIDATE,
        resource: 'oauth_session',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Validate OAuth token
   */
  private async validateToken(token: OAuthToken, provider: OAuthProvider): Promise<void> {
    const config = this.oauthConfigs.get(provider);
    if (!config) {
      throw new Error(`OAuth provider ${provider} not configured`);
    }

    // Check token expiration
    if (token.expiresIn) {
      const expiresAt = token.issuedAt + token.expiresIn * 1000;
      if (Date.now() > expiresAt) {
        throw new Error('OAuth token expired');
      }
    }

    // Provider-specific validation would go here
    // For example, introspection endpoint call
  }

  /**
   * Get user profile from OAuth provider
   */
  private async getUserProfile(
    _token: OAuthToken,
    provider: OAuthProvider,
  ): Promise<OAuthProfile> {
    const config = this.oauthConfigs.get(provider);
    if (!config || !config.userInfoUrl) {
      throw new Error(`User info endpoint not configured for ${provider}`);
    }

    // In a real implementation, this would make an HTTP _request to the provider
    // For now, we'll return a mock profile
    return {
      sub: `${provider}_${randomBytes(8).toString('hex')}`,
      email: 'user@example.com',
      name: 'Test User',
      emailVerified: true,
      provider,
    };
  }

  /**
   * Get or create subject mapping
   */
  private async getOrCreateSubjectMapping(
    subject: string,
    provider: OAuthProvider,
  ): Promise<OAuthSubjectMapping> {
    const key = `${provider}:${subject}`;

    let mapping = this.subjectMappings.get(key);
    if (!mapping) {
      // Create new mapping
      mapping = {
        subject,
        provider,
        customerContexts: await this.getDefaultCustomerContexts(subject),
        defaultCustomerId: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.subjectMappings.set(key, mapping);
    }

    return mapping;
  }

  /**
   * Get default customer contexts for new user
   */
  private async getDefaultCustomerContexts(_subject: string): Promise<CustomerContext[]> {
    // In a real implementation, this would query a database or configuration
    // For now, return a default _context
    return [
      {
        customerId: 'default',
        customerName: 'Default Customer',
        roles: ['viewer'],
        permissions: [
          {
            id: 'read_properties',
            resource: 'property',
            actions: ['read'],
            scope: 'customer' as any,
          },
        ],
        isActive: true,
        createdAt: new Date(),
      },
    ];
  }

  /**
   * Map OAuth subject to customer _context
   */
  async mapSubjectToCustomer(
    subject: string,
    provider: OAuthProvider,
    customerContext: CustomerContext,
  ): Promise<void> {
    const key = `${provider}:${subject}`;
    const mapping = this.subjectMappings.get(key);

    if (!mapping) {
      throw new Error('Subject mapping not found');
    }

    // Check if customer _context already exists
    const existingIndex = mapping.customerContexts.findIndex(
      (ctx) => ctx.customerId === customerContext.customerId,
    );

    if (existingIndex >= 0) {
      // Update existing _context
      mapping.customerContexts[existingIndex] = customerContext;
    } else {
      // Add new _context
      mapping.customerContexts.push(customerContext);
    }

    mapping.updatedAt = new Date();
    this.subjectMappings.set(key, mapping);

    logger.info('Subject mapped to customer', {
      subject,
      provider,
      customerId: customerContext.customerId,
    });
  }

  /**
   * Switch customer _context for session
   */
  async switchCustomerContext(
    sessionId: string,
    customerId: string,
  ): Promise<CustomerContext> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const _context = session.availableContexts.find(
      (ctx) => ctx.customerId === customerId,
    );

    if (!_context) {
      throw new Error(`Customer _context ${customerId} not available for session`);
    }

    session.currentContext = _context;
    session.currentContext.lastAccessAt = new Date();

    // Audit log
    await this.logCredentialAccess({
      userId: session.profile.sub,
      customerId,
      action: CredentialAction.READ,
      resource: 'customer_context',
      success: true,
    });

    logger.info('Customer _context switched', {
      sessionId,
      customerId,
      userId: session.profile.sub,
    });

    return _context;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AuthSession | undefined {
    const session = this.sessions.get(sessionId);

    if (session && new Date() > session.expiresAt) {
      // Session expired
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(sessionId: string): Promise<OAuthToken> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.token.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = this.oauthConfigs.get(session.profile.provider);
    if (!config) {
      throw new Error('OAuth provider not configured');
    }

    // In a real implementation, this would make a token refresh _request
    // For now, return a new mock token
    const newToken: OAuthToken = {
      ...session.token,
      issuedAt: Date.now(),
      expiresIn: 3600,
    };

    session.token = newToken;
    session.expiresAt = new Date(Date.now() + newToken.expiresIn! * 1000);

    return newToken;
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // In a real implementation, this would revoke the token with the provider
    this.sessions.delete(sessionId);

    await this.logCredentialAccess({
      userId: session.profile.sub,
      customerId: session.currentContext?.customerId || 'unknown',
      action: CredentialAction.DELETE,
      resource: 'oauth_session',
      success: true,
    });

    logger.info('Session revoked', { sessionId });
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Log credential access
   */
  private async logCredentialAccess(
    log: Omit<CredentialAuditLog, 'id' | 'timestamp'>,
  ): Promise<void> {
    const auditLog: CredentialAuditLog = {
      ...log,
      id: randomBytes(16).toString('hex'),
      timestamp: new Date(),
    };

    // In a real implementation, this would persist to a database
    logger.info('Credential access audit', auditLog);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach((sessionId) => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      logger.info('Cleaned up expired sessions', { count: expiredSessions.length });
    }
  }

  /**
   * Get customer contexts for subject
   */
  getCustomerContextsForSubject(
    subject: string,
    provider: OAuthProvider,
  ): CustomerContext[] {
    const key = `${provider}:${subject}`;
    const mapping = this.subjectMappings.get(key);

    return mapping?.customerContexts || [];
  }
}
