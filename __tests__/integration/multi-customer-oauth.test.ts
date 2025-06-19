/**
 * Multi-Customer OAuth Integration Tests
 */

import { OAuthManager } from '@/auth/oauth/OAuthManager';
import { SecureCredentialManager } from '@/auth/SecureCredentialManager';
import { AuthorizationManager } from '@/auth/AuthorizationManager';
import { CustomerContextManager } from '@/services/CustomerContextManager';
import type {
  OAuthToken,
  CustomerContext,
  Permission,
  Role,
} from '@/auth/oauth/types';
import {
  OAuthProvider,
  PermissionScope,
  IsolationLevel,
} from '@/auth/oauth/types';
import type { EdgeGridCredentials } from '@/types/config';

// Mock environment
process.env.CREDENTIAL_MASTER_KEY = 'test-master-key-32-characters-long';
process.env.OAUTH_PROVIDERS = 'google,okta';
process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-google-client';
process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.OAUTH_GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v1/userinfo';
process.env.OAUTH_OKTA_CLIENT_ID = 'test-okta-client';
process.env.OAUTH_OKTA_CLIENT_SECRET = 'test-okta-secret';
process.env.OAUTH_OKTA_USERINFO_URL = 'https://okta.example.com/oauth2/v1/userinfo';

describe.skip('Multi-Customer OAuth Integration', () => {
  let contextManager: CustomerContextManager;
  let authManager: AuthorizationManager;
  
  beforeEach(() => {
    // Clear singletons
    (OAuthManager as any).instance = undefined;
    (SecureCredentialManager as any).instance = undefined;
    (AuthorizationManager as any).instance = undefined;
    (CustomerContextManager as any).instance = undefined;
    
    // Initialize managers
    contextManager = CustomerContextManager.getInstance();
    authManager = AuthorizationManager.getInstance();
  });

  describe('OAuth Authentication', () => {
    it('should authenticate user with OAuth token', async () => {
      const token: OAuthToken = {
        accessToken: 'test-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const session = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);

      expect(session).toBeDefined();
      expect(session.sessionId).toBeTruthy();
      expect(session.profile.provider).toBe(OAuthProvider.GOOGLE);
      expect(session.availableContexts.length).toBeGreaterThan(0);
    });

    it('should reject expired OAuth token', async () => {
      const token: OAuthToken = {
        accessToken: 'expired-token',
        tokenType: 'Bearer',
        expiresIn: -3600, // Expired
        issuedAt: Date.now() - 7200000,
      };

      await expect(
        contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE),
      ).rejects.toThrow('OAuth token expired');
    });
  });

  describe('Customer Context Switching', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create test session
      const token: OAuthToken = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const session = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);
      sessionId = session.sessionId;

      // Map additional customer contexts
      const additionalContext: CustomerContext = {
        customerId: 'customer-2',
        customerName: 'Customer 2',
        roles: ['system:operator'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      await contextManager.mapSubjectToCustomer(
        sessionId,
        session.profile.sub,
        OAuthProvider.GOOGLE,
        additionalContext,
      );
    });

    it('should switch between customer contexts', async () => {
      const newContext = await contextManager.switchCustomer({
        sessionId,
        targetCustomerId: 'customer-2',
        reason: 'Testing customer switch',
      });

      expect(newContext.customerId).toBe('customer-2');
      expect(newContext.customerName).toBe('Customer 2');
    });

    it('should fail to switch to unauthorized customer', async () => {
      await expect(
        contextManager.switchCustomer({
          sessionId,
          targetCustomerId: 'unauthorized-customer',
        }),
      ).rejects.toThrow('Customer context unauthorized-customer not available');
    });

    it('should list available customers', async () => {
      const customers = await contextManager.getAvailableCustomers(sessionId);

      expect(customers.length).toBeGreaterThanOrEqual(2);
      expect(customers.map((c) => c.customerId)).toContain('default');
      expect(customers.map((c) => c.customerId)).toContain('customer-2');
    });
  });

  describe('Credential Management', () => {
    let sessionId: string;
    const testCredentials: EdgeGridCredentials = {
      host: 'test.akamai.net',
      client_token: 'test-client-token',
      client_secret: 'test-client-secret',
      access_token: 'test-access-token',
      account_switch_key: 'test-switch-key',
    };

    beforeEach(async () => {
      // Create admin session
      const token: OAuthToken = {
        accessToken: 'admin-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const session = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);
      sessionId = session.sessionId;

      // Grant admin role
      const adminContext: CustomerContext = {
        ...session.currentContext!,
        roles: ['system:admin'],
      };

      await contextManager.mapSubjectToCustomer(
        sessionId,
        session.profile.sub,
        OAuthProvider.GOOGLE,
        adminContext,
      );
    });

    it('should store encrypted credentials', async () => {
      const credentialId = await contextManager.storeCustomerCredentials(
        sessionId,
        'customer-1',
        testCredentials,
        {
          intervalDays: 90,
          nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          autoRotate: true,
        },
      );

      expect(credentialId).toBeTruthy();
      expect(credentialId).toMatch(/^cred_customer-1_/);
    });

    it('should rotate credentials', async () => {
      // Store initial credentials
      const credentialId = await contextManager.storeCustomerCredentials(
        sessionId,
        'customer-1',
        testCredentials,
      );

      // Rotate with new credentials
      const newCredentials: EdgeGridCredentials = {
        ...testCredentials,
        client_secret: 'new-client-secret',
        access_token: 'new-access-token',
      };

      const newCredentialId = await contextManager.rotateCustomerCredentials(
        sessionId,
        credentialId,
        newCredentials,
      );

      expect(newCredentialId).toBeTruthy();
      expect(newCredentialId).not.toBe(credentialId);
    });

    it('should fail to access credentials without authorization', async () => {
      // Create non-admin session
      const token: OAuthToken = {
        accessToken: 'user-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const userSession = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);

      await expect(
        contextManager.storeCustomerCredentials(
          userSession.sessionId,
          'customer-1',
          testCredentials,
        ),
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('Authorization and Permissions', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create session with specific permissions
      const token: OAuthToken = {
        accessToken: 'user-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const session = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);
      sessionId = session.sessionId;

      // Set up custom permissions
      const customContext: CustomerContext = {
        customerId: 'test-customer',
        customerName: 'Test Customer',
        roles: ['system:developer'],
        permissions: [
          {
            id: 'custom-permission',
            resource: 'property',
            actions: ['read', 'update'],
            scope: PermissionScope.CUSTOMER,
            constraints: {
              environment: 'staging',
            },
          },
        ],
        isActive: true,
        createdAt: new Date(),
      };

      await contextManager.mapSubjectToCustomer(
        sessionId,
        session.profile.sub,
        OAuthProvider.GOOGLE,
        customContext,
      );

      await contextManager.switchCustomer({
        sessionId,
        targetCustomerId: 'test-customer',
      });
    });

    it('should authorize allowed actions', async () => {
      const decision = await contextManager.authorize({
        sessionId,
        resource: 'property',
        action: 'read',
        metadata: {
          environment: 'staging',
        },
      });

      expect(decision.allowed).toBe(true);
    });

    it('should deny unauthorized actions', async () => {
      const decision = await contextManager.authorize({
        sessionId,
        resource: 'property',
        action: 'delete', // Not in allowed actions
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('No matching');
    });

    it('should enforce constraints', async () => {
      const decision = await contextManager.authorize({
        sessionId,
        resource: 'property',
        action: 'update',
        metadata: {
          environment: 'production', // Constraint requires staging
        },
      });

      expect(decision.allowed).toBe(false);
    });

    it('should create custom roles', async () => {
      // Switch to admin context
      const adminContext: CustomerContext = {
        customerId: 'admin-customer',
        customerName: 'Admin Customer',
        roles: ['system:admin'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      const token: OAuthToken = {
        accessToken: 'admin-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const adminSession = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);
      
      await contextManager.mapSubjectToCustomer(
        adminSession.sessionId,
        adminSession.profile.sub,
        OAuthProvider.GOOGLE,
        adminContext,
      );

      const customRole: Role = {
        id: 'custom:tester',
        name: 'Tester Role',
        description: 'Custom testing role',
        permissions: [
          {
            id: 'test:all',
            resource: 'test',
            actions: ['*'],
            scope: PermissionScope.CUSTOMER,
          },
        ],
        isSystem: false,
        priority: 50,
      };

      await contextManager.createCustomRole(adminSession.sessionId, customRole);

      const role = authManager.getRole('custom:tester');
      expect(role).toBeDefined();
      expect(role?.name).toBe('Tester Role');
    });
  });

  describe('Customer Isolation', () => {
    let adminSessionId: string;

    beforeEach(async () => {
      // Create admin session
      const token: OAuthToken = {
        accessToken: 'admin-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const session = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);
      adminSessionId = session.sessionId;

      // Grant admin role
      const adminContext: CustomerContext = {
        customerId: 'admin-customer',
        customerName: 'Admin Customer',
        roles: ['system:admin'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      await contextManager.mapSubjectToCustomer(
        adminSessionId,
        session.profile.sub,
        OAuthProvider.GOOGLE,
        adminContext,
      );
    });

    it('should set customer isolation policy', async () => {
      await contextManager.setCustomerIsolationPolicy(adminSessionId, {
        id: 'policy-1',
        customerId: 'isolated-customer',
        isolationLevel: IsolationLevel.STRICT,
        resourceRestrictions: [
          {
            resourceType: 'property',
            allowedIds: ['prop-1', 'prop-2'],
          },
        ],
        networkRestrictions: [
          {
            allowedIpRanges: ['10.0.0.0/8'],
            requireVpn: true,
          }
        ],
      });

      const policy = authManager.getCustomerIsolationPolicy('isolated-customer');
      expect(policy).toBeDefined();
      expect(policy?.isolationLevel).toBe(IsolationLevel.STRICT);
    });

    it('should enforce isolation policies', async () => {
      // Set isolation policy
      await contextManager.setCustomerIsolationPolicy(adminSessionId, {
        id: 'policy-2',
        customerId: 'restricted-customer',
        isolationLevel: IsolationLevel.STRICT,
        resourceRestrictions: [
          {
            resourceType: 'property',
            deniedIds: ['forbidden-prop'],
          },
        ],
      });

      // Create user session with restricted customer
      const token: OAuthToken = {
        accessToken: 'user-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const userSession = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);

      const restrictedContext: CustomerContext = {
        customerId: 'restricted-customer',
        customerName: 'Restricted Customer',
        roles: ['system:operator'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
      };

      await contextManager.mapSubjectToCustomer(
        adminSessionId,
        userSession.profile.sub,
        OAuthProvider.GOOGLE,
        restrictedContext,
      );

      await contextManager.switchCustomer({
        sessionId: userSession.sessionId,
        targetCustomerId: 'restricted-customer',
      });

      // Try to access forbidden resource
      const decision = await contextManager.authorize({
        sessionId: userSession.sessionId,
        resource: 'property',
        action: 'read',
        resourceId: 'forbidden-prop',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('denied by isolation policy');
    });
  });

  describe('Session Management', () => {
    it('should refresh OAuth token', async () => {
      const token: OAuthToken = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'refresh-token',
        issuedAt: Date.now(),
      };

      const session = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);
      
      const newToken = await contextManager.refreshSessionToken(session.sessionId);

      expect(newToken.accessToken).toBeTruthy();
      expect(newToken.issuedAt).toBeGreaterThan(token.issuedAt);
    });

    it('should revoke session', async () => {
      const token: OAuthToken = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        issuedAt: Date.now(),
      };

      const session = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);
      
      await contextManager.revokeSession(session.sessionId);

      // Session should no longer be available
      await expect(
        contextManager.getAvailableCustomers(session.sessionId),
      ).rejects.toThrow();
    });

    it('should clean up expired sessions', async () => {
      // Create expired session
      const token: OAuthToken = {
        accessToken: 'expired-session-token',
        tokenType: 'Bearer',
        expiresIn: 0, // Expires immediately
        issuedAt: Date.now(),
      };

      const session = await contextManager.authenticateOAuth(token, OAuthProvider.GOOGLE);
      
      // Clean up
      contextManager.cleanupExpired();

      // Session should be removed
      await expect(
        contextManager.getAvailableCustomers(session.sessionId),
      ).rejects.toThrow();
    });
  });
});