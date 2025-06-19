/**
 * OAuthManager Test Suite
 * Comprehensive tests for OAuth authentication, token management, and customer mapping
 */

import { OAuthManager } from '@/auth/oauth/OAuthManager';
import type {
  OAuthToken,
  OAuthProfile,
  CustomerContext,
  AuthSession,
  OAuthConfig,
} from '@/auth/oauth/types';
import { OAuthProvider, CredentialAction } from '@/auth/oauth/types';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/logger');

describe('OAuthManager', () => {
  let oauthManager: OAuthManager;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (OAuthManager as any).instance = undefined;
    
    // Set up environment variables
    process.env.OAUTH_PROVIDERS = 'google,github';
    process.env.OAUTH_GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.OAUTH_GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    process.env.OAUTH_GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
    process.env.OAUTH_GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v1/userinfo';
    process.env.OAUTH_GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback';
    process.env.OAUTH_GOOGLE_SCOPES = 'email,profile';
    
    process.env.OAUTH_GITHUB_CLIENT_ID = 'github-client-id';
    process.env.OAUTH_GITHUB_CLIENT_SECRET = 'github-client-secret';
    
    oauthManager = OAuthManager.getInstance();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.OAUTH_PROVIDERS;
    delete process.env.OAUTH_GOOGLE_CLIENT_ID;
    delete process.env.OAUTH_GOOGLE_CLIENT_SECRET;
    delete process.env.OAUTH_GOOGLE_AUTH_URL;
    delete process.env.OAUTH_GOOGLE_TOKEN_URL;
    delete process.env.OAUTH_GOOGLE_USERINFO_URL;
    delete process.env.OAUTH_GOOGLE_REDIRECT_URI;
    delete process.env.OAUTH_GOOGLE_SCOPES;
    delete process.env.OAUTH_GITHUB_CLIENT_ID;
    delete process.env.OAUTH_GITHUB_CLIENT_SECRET;
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = OAuthManager.getInstance();
      const instance2 = OAuthManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with provider configurations from environment', () => {
      // Set providers to check
      process.env.OAUTH_PROVIDERS = 'github';
      
      // Reset singleton to trigger initialization
      (OAuthManager as any).instance = undefined;
      const manager = OAuthManager.getInstance();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'OAuth provider github configuration incomplete'
      );
      
      delete process.env.OAUTH_PROVIDERS;
    });
  });

  describe('authenticateWithToken', () => {
    const mockToken: OAuthToken = {
      accessToken: 'mock-access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: 'mock-refresh-token',
      scope: 'email profile',
      issuedAt: Date.now(),
    };

    it('should authenticate successfully with valid token', async () => {
      const session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      expect(session).toMatchObject({
        sessionId: expect.any(String),
        token: mockToken,
        profile: expect.objectContaining({
          sub: expect.stringMatching(/^google_/),
          email: 'user@example.com',
          name: 'Test User',
          emailVerified: true,
          provider: OAuthProvider.GOOGLE,
        }),
        currentContext: expect.objectContaining({
          customerId: 'default',
          customerName: 'Default Customer',
          roles: ['viewer'],
        }),
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'OAuth authentication successful',
        expect.objectContaining({
          provider: OAuthProvider.GOOGLE,
          userId: expect.any(String),
          sessionId: expect.any(String),
        }),
      );
    });

    it('should fail authentication with expired token', async () => {
      const expiredToken: OAuthToken = {
        ...mockToken,
        issuedAt: Date.now() - 7200000, // 2 hours ago
        expiresIn: 3600, // 1 hour
      };

      await expect(
        oauthManager.authenticateWithToken(expiredToken, OAuthProvider.GOOGLE),
      ).rejects.toThrow('OAuth token expired');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth authentication failed',
        expect.objectContaining({
          provider: OAuthProvider.GOOGLE,
        }),
      );
    });

    it('should fail authentication with unconfigured provider', async () => {
      await expect(
        oauthManager.authenticateWithToken(mockToken, 'invalid' as OAuthProvider),
      ).rejects.toThrow('OAuth provider invalid not configured');
    });

    it('should create subject mapping for new user', async () => {
      const session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      expect(session.availableContexts).toHaveLength(1);
      expect(session.availableContexts[0]).toMatchObject({
        customerId: 'default',
        customerName: 'Default Customer',
        roles: ['viewer'],
        permissions: expect.arrayContaining([
          expect.objectContaining({
            id: 'read_properties',
            resource: 'property',
            actions: ['read'],
          }),
        ]),
      });
    });

    it('should reuse existing subject mapping', async () => {
      // First authentication
      const session1 = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      // Mock getUserProfile to return the same subject
      const getUserProfileSpy = jest.spyOn(
        oauthManager as any,
        'getUserProfile',
      );
      getUserProfileSpy.mockResolvedValueOnce({
        sub: session1.profile.sub,
        email: 'user@example.com',
        name: 'Test User',
        emailVerified: true,
        provider: OAuthProvider.GOOGLE,
      });

      // Second authentication with same user
      const session2 = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      expect(session2.profile.sub).toBe(session1.profile.sub);
      expect(session2.availableContexts).toEqual(session1.availableContexts);
    });

    it('should log audit trail for successful authentication', async () => {
      await oauthManager.authenticateWithToken(mockToken, OAuthProvider.GOOGLE);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          action: CredentialAction.VALIDATE,
          resource: 'oauth_session',
          success: true,
        }),
      );
    });

    it('should log audit trail for failed authentication', async () => {
      const invalidToken: OAuthToken = {
        ...mockToken,
        issuedAt: Date.now() - 7200000,
        expiresIn: 3600,
      };

      try {
        await oauthManager.authenticateWithToken(invalidToken, OAuthProvider.GOOGLE);
      } catch {
        // Expected to throw
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          action: CredentialAction.VALIDATE,
          resource: 'oauth_session',
          success: false,
          error: 'OAuth token expired',
        }),
      );
    });
  });

  describe('mapSubjectToCustomer', () => {
    const mockToken: OAuthToken = {
      accessToken: 'mock-access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: 'mock-refresh-token',
      scope: 'email profile',
      issuedAt: Date.now(),
    };

    it('should map subject to new customer context', async () => {
      // First authenticate to create subject mapping
      const session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      const newContext: CustomerContext = {
        customerId: 'customer-123',
        customerName: 'Test Customer',
        roles: ['operator'],
        permissions: [
          {
            id: 'manage_properties',
            resource: 'property',
            actions: ['create', 'read', 'update', 'delete'],
            scope: 'customer' as any,
          },
        ],
        isActive: true,
        createdAt: new Date(),
      };

      await oauthManager.mapSubjectToCustomer(
        session.profile.sub,
        OAuthProvider.GOOGLE,
        newContext,
      );

      const contexts = oauthManager.getCustomerContextsForSubject(
        session.profile.sub,
        OAuthProvider.GOOGLE,
      );

      expect(contexts).toHaveLength(2);
      expect(contexts).toContainEqual(expect.objectContaining(newContext));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Subject mapped to customer',
        expect.objectContaining({
          subject: session.profile.sub,
          provider: OAuthProvider.GOOGLE,
          customerId: 'customer-123',
        }),
      );
    });

    it('should update existing customer context', async () => {
      const session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      const updatedContext: CustomerContext = {
        customerId: 'default',
        customerName: 'Updated Default Customer',
        roles: ['operator', 'viewer'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      await oauthManager.mapSubjectToCustomer(
        session.profile.sub,
        OAuthProvider.GOOGLE,
        updatedContext,
      );

      const contexts = oauthManager.getCustomerContextsForSubject(
        session.profile.sub,
        OAuthProvider.GOOGLE,
      );

      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.customerName).toBe('Updated Default Customer');
      expect(contexts[0]?.roles).toEqual(['operator', 'viewer']);
    });

    it('should throw error for non-existent subject mapping', async () => {
      const context: CustomerContext = {
        customerId: 'customer-123',
        customerName: 'Test Customer',
        roles: ['viewer'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      await expect(
        oauthManager.mapSubjectToCustomer(
          'non-existent-subject',
          OAuthProvider.GOOGLE,
          context,
        ),
      ).rejects.toThrow('Subject mapping not found');
    });
  });

  describe('switchCustomerContext', () => {
    let session: AuthSession;

    beforeEach(async () => {
      const mockToken: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      // Add additional customer context
      const additionalContext: CustomerContext = {
        customerId: 'customer-123',
        customerName: 'Test Customer',
        roles: ['operator'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      await oauthManager.mapSubjectToCustomer(
        session.profile.sub,
        OAuthProvider.GOOGLE,
        additionalContext,
      );

      // Update the session's available contexts manually
      // (in real implementation, this would be done via re-authentication)
      session.availableContexts.push(additionalContext);
    });

    it('should switch to available customer context', async () => {
      const newContext = await oauthManager.switchCustomerContext(
        session.sessionId,
        'customer-123',
      );

      expect(newContext.customerId).toBe('customer-123');
      expect(newContext.customerName).toBe('Test Customer');

      const updatedSession = oauthManager.getSession(session.sessionId);
      expect(updatedSession?.currentContext?.customerId).toBe('customer-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Customer context switched',
        expect.objectContaining({
          sessionId: session.sessionId,
          customerId: 'customer-123',
          userId: session.profile.sub,
        }),
      );
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        oauthManager.switchCustomerContext('non-existent-session', 'customer-123'),
      ).rejects.toThrow('Session not found');
    });

    it('should throw error for unavailable customer context', async () => {
      await expect(
        oauthManager.switchCustomerContext(session.sessionId, 'unavailable-customer'),
      ).rejects.toThrow('Customer context unavailable-customer not available for session');
    });

    it('should update lastAccessAt timestamp', async () => {
      const before = new Date();
      await oauthManager.switchCustomerContext(session.sessionId, 'customer-123');
      const after = new Date();

      const updatedSession = oauthManager.getSession(session.sessionId);
      const lastAccess = updatedSession?.currentContext?.lastAccessAt;

      expect(lastAccess).toBeDefined();
      expect(lastAccess!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastAccess!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should log audit trail for context switch', async () => {
      await oauthManager.switchCustomerContext(session.sessionId, 'customer-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          userId: session.profile.sub,
          customerId: 'customer-123',
          action: CredentialAction.READ,
          resource: 'customer_context',
          success: true,
        }),
      );
    });
  });

  describe('getSession', () => {
    it('should return valid session', async () => {
      const mockToken: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      const createdSession = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      const retrievedSession = oauthManager.getSession(createdSession.sessionId);

      expect(retrievedSession).toEqual(createdSession);
    });

    it('should return undefined for non-existent session', () => {
      const session = oauthManager.getSession('non-existent-session');
      expect(session).toBeUndefined();
    });

    it('should return undefined and clean up expired session', async () => {
      const mockToken: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 1, // 1 second
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      const session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const retrievedSession = oauthManager.getSession(session.sessionId);
      expect(retrievedSession).toBeUndefined();

      // Try again to ensure it was cleaned up
      const secondRetrieval = oauthManager.getSession(session.sessionId);
      expect(secondRetrieval).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    let session: AuthSession;

    beforeEach(async () => {
      const mockToken: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );
    });

    it('should refresh token successfully', async () => {
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const newToken = await oauthManager.refreshToken(session.sessionId);

      expect(newToken).toMatchObject({
        accessToken: session.token.accessToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: expect.any(Number),
      });

      expect(newToken.issuedAt).toBeGreaterThan(session.token.issuedAt);

      const updatedSession = oauthManager.getSession(session.sessionId);
      expect(updatedSession?.token).toEqual(newToken);
      expect(updatedSession?.expiresAt.getTime()).toBeGreaterThan(
        session.expiresAt.getTime(),
      );
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        oauthManager.refreshToken('non-existent-session'),
      ).rejects.toThrow('Session not found');
    });

    it('should throw error when no refresh token available', async () => {
      // Create session without refresh token
      const tokenWithoutRefresh: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      const sessionWithoutRefresh = await oauthManager.authenticateWithToken(
        tokenWithoutRefresh,
        OAuthProvider.GOOGLE,
      );

      await expect(
        oauthManager.refreshToken(sessionWithoutRefresh.sessionId),
      ).rejects.toThrow('No refresh token available');
    });

    it('should throw error for unconfigured provider', async () => {
      // Mock a session with unconfigured provider
      const mockSession: AuthSession = {
        ...session,
        profile: {
          ...session.profile,
          provider: 'unconfigured' as OAuthProvider,
        },
      };

      (oauthManager as any).sessions.set(session.sessionId, mockSession);

      await expect(
        oauthManager.refreshToken(session.sessionId),
      ).rejects.toThrow('OAuth provider not configured');
    });
  });

  describe('revokeSession', () => {
    let session: AuthSession;

    beforeEach(async () => {
      const mockToken: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );
    });

    it('should revoke session successfully', async () => {
      await oauthManager.revokeSession(session.sessionId);

      const revokedSession = oauthManager.getSession(session.sessionId);
      expect(revokedSession).toBeUndefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Session revoked', {
        sessionId: session.sessionId,
      });
    });

    it('should log audit trail for session revocation', async () => {
      await oauthManager.revokeSession(session.sessionId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Credential access audit',
        expect.objectContaining({
          userId: session.profile.sub,
          customerId: 'default',
          action: CredentialAction.DELETE,
          resource: 'oauth_session',
          success: true,
        }),
      );
    });

    it('should handle revocation of non-existent session gracefully', async () => {
      await expect(
        oauthManager.revokeSession('non-existent-session'),
      ).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      const activeToken: OAuthToken = {
        accessToken: 'active-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      const expiredToken: OAuthToken = {
        accessToken: 'expired-token',
        tokenType: 'Bearer',
        expiresIn: -1, // Already expired
        refreshToken: 'refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      const activeSession = await oauthManager.authenticateWithToken(
        activeToken,
        OAuthProvider.GOOGLE,
      );

      // Create expired session directly to bypass validation
      const expiredSessionId = (oauthManager as any).generateSessionId();
      (oauthManager as any).sessions.set(expiredSessionId, {
        sessionId: expiredSessionId,
        token: expiredToken,
        profile: { sub: 'user-2', provider: OAuthProvider.GOOGLE },
        currentContext: null,
        availableContexts: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      oauthManager.cleanupExpiredSessions();

      expect(oauthManager.getSession(activeSession.sessionId)).toBeDefined();
      expect(oauthManager.getSession(expiredSessionId)).toBeUndefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Cleaned up expired sessions', {
        count: 1,
      });
    });

    it('should not log when no sessions are expired', () => {
      oauthManager.cleanupExpiredSessions();

      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up expired sessions'),
        expect.any(Object),
      );
    });
  });

  describe('getCustomerContextsForSubject', () => {
    it('should return empty array for unknown subject', () => {
      const contexts = oauthManager.getCustomerContextsForSubject(
        'unknown-subject',
        OAuthProvider.GOOGLE,
      );

      expect(contexts).toEqual([]);
    });

    it('should return contexts for known subject', async () => {
      const mockToken: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      const session = await oauthManager.authenticateWithToken(
        mockToken,
        OAuthProvider.GOOGLE,
      );

      const contexts = oauthManager.getCustomerContextsForSubject(
        session.profile.sub,
        OAuthProvider.GOOGLE,
      );

      expect(contexts).toHaveLength(1);
      expect(contexts[0]).toMatchObject({
        customerId: 'default',
        customerName: 'Default Customer',
        roles: ['viewer'],
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle provider configuration with missing optional fields', () => {
      delete process.env.OAUTH_GOOGLE_USERINFO_URL;
      delete process.env.OAUTH_GOOGLE_SCOPES;

      // Reset instance to reload configuration
      (OAuthManager as any).instance = undefined;
      const manager = OAuthManager.getInstance();

      expect(manager).toBeDefined();
    });

    it('should generate unique session IDs', async () => {
      const sessions: string[] = [];
      const mockToken: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      for (let i = 0; i < 10; i++) {
        const session = await oauthManager.authenticateWithToken(
          mockToken,
          OAuthProvider.GOOGLE,
        );
        sessions.push(session.sessionId);
      }

      const uniqueSessions = new Set(sessions);
      expect(uniqueSessions.size).toBe(10);
    });

    it('should handle concurrent authentication requests', async () => {
      const mockToken: OAuthToken = {
        accessToken: 'mock-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'mock-refresh-token',
        scope: 'email profile',
        issuedAt: Date.now(),
      };

      const promises = Array(5)
        .fill(null)
        .map(() => oauthManager.authenticateWithToken(mockToken, OAuthProvider.GOOGLE));

      const sessions = await Promise.all(promises);

      expect(sessions).toHaveLength(5);
      sessions.forEach((session) => {
        expect(session.sessionId).toBeDefined();
        expect(session.profile).toBeDefined();
      });
    });
  });
});