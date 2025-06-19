/**
 * OAuthMiddleware Test Suite
 * Comprehensive tests for OAuth authentication middleware, rate limiting, and error handling
 */

import {
  createOAuthMiddleware,
  createCustomerContextMiddleware,
  createCredentialAccessMiddleware,
  type OAuthMiddlewareConfig,
} from '@/middleware/OAuthMiddleware';
import { CustomerContextManager } from '@/services/CustomerContextManager';
import type {
  MiddlewareRequest,
  MiddlewareResponse,
  NextFunction,
} from '@/types/middleware';
import type { AuthorizationDecision } from '@/auth/oauth/types';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/services/CustomerContextManager');
jest.mock('@/utils/logger');

describe('OAuthMiddleware', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockContextManager = CustomerContextManager as jest.Mocked<
    typeof CustomerContextManager
  >;
  
  let mockRequest: MiddlewareRequest;
  let mockResponse: MiddlewareResponse;
  let mockNext: NextFunction;
  let mockContextManagerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      toolName: 'property.list',
      params: {},
      context: {},
      requestId: 'req-123',
      timestamp: Date.now(),
    } as MiddlewareRequest;

    // Setup mock response
    mockResponse = {
      error: jest.fn(),
      send: jest.fn(),
    } as unknown as MiddlewareResponse;

    // Setup mock next function
    mockNext = jest.fn();

    // Setup mock context manager instance
    mockContextManagerInstance = {
      authorize: jest.fn(),
      getAvailableCustomers: jest.fn(),
      getEdgeGridClient: jest.fn(),
    };

    mockContextManager.getInstance.mockReturnValue(mockContextManagerInstance);
  });

  describe('createOAuthMiddleware', () => {
    it('should pass through public tools without authentication', async () => {
      const config: OAuthMiddlewareConfig = {
        requireAuth: true,
        publicTools: ['public.tool'],
      };

      const middleware = createOAuthMiddleware(config);
      mockRequest.toolName = 'public.tool';

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.error).not.toHaveBeenCalled();
      expect(mockContextManagerInstance.authorize).not.toHaveBeenCalled();
    });

    it('should require authentication for protected tools', async () => {
      const middleware = createOAuthMiddleware();

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.error).toHaveBeenCalledWith(
        'Authentication required',
        'AUTH_REQUIRED',
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should extract session ID from context', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.context.sessionId = 'session-123';

      const authDecision: AuthorizationDecision = {
        allowed: true,
        appliedPolicies: ['policy-1'],
      };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockContextManagerInstance.authorize).toHaveBeenCalledWith({
        sessionId: 'session-123',
        resource: 'property',
        action: 'read',
        metadata: {
          toolName: 'property.list',
          requestId: 'req-123',
          timestamp: mockRequest.timestamp,
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract session ID from params header', async () => {
      const middleware = createOAuthMiddleware({ sessionHeader: 'x-session-id' });
      mockRequest.params = { 'x-session-id': 'session-from-header' };

      const authDecision: AuthorizationDecision = {
        allowed: true,
      };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.context.sessionId).toBe('session-from-header');
      expect(mockContextManagerInstance.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-from-header',
        }),
      );
    });

    it('should extract session ID from common parameter names', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.params = { sessionId: 'session-from-param' };

      const authDecision: AuthorizationDecision = {
        allowed: true,
      };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.context.sessionId).toBe('session-from-param');
    });

    it('should handle authorization failure', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.context.sessionId = 'session-123';

      const authDecision: AuthorizationDecision = {
        allowed: false,
        reason: 'Insufficient permissions',
      };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.error).toHaveBeenCalledWith(
        'Not authorized to read property: Insufficient permissions',
        'AUTHORIZATION_FAILED',
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should enforce admin requirements', async () => {
      const config: OAuthMiddlewareConfig = {
        adminTools: ['customer.create'],
      };
      const middleware = createOAuthMiddleware(config);
      
      mockRequest.toolName = 'customer.create';
      mockRequest.context.sessionId = 'session-123';

      // First authorization succeeds
      const authDecision: AuthorizationDecision = {
        allowed: true,
      };
      // Admin check fails
      const adminDecision: AuthorizationDecision = {
        allowed: false,
      };

      mockContextManagerInstance.authorize
        .mockResolvedValueOnce(authDecision)
        .mockResolvedValueOnce(adminDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockContextManagerInstance.authorize).toHaveBeenCalledTimes(2);
      expect(mockContextManagerInstance.authorize).toHaveBeenLastCalledWith({
        sessionId: 'session-123',
        resource: 'admin',
        action: 'access',
        metadata: expect.any(Object),
      });
      expect(mockResponse.error).toHaveBeenCalledWith(
        'Admin privileges required',
        'ADMIN_REQUIRED',
      );
    });

    it('should extract resource ID for tools that require it', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.toolName = 'property.get';
      mockRequest.context.sessionId = 'session-123';
      mockRequest.params = { propertyId: 'prop-123' };

      const authDecision: AuthorizationDecision = {
        allowed: true,
      };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockContextManagerInstance.authorize).toHaveBeenCalledWith({
        sessionId: 'session-123',
        resource: 'property',
        action: 'read',
        resourceId: 'prop-123',
        metadata: expect.any(Object),
      });
      expect(mockRequest.context.authorization).toEqual({
        allowed: true,
        resource: 'property',
        action: 'read',
        resourceId: 'prop-123',
      });
    });

    it('should handle unknown tools with default permissions', async () => {
      const middleware = createOAuthMiddleware({ debug: true });
      mockRequest.toolName = 'unknown.tool';
      mockRequest.context.sessionId = 'session-123';

      const authDecision: AuthorizationDecision = {
        allowed: true,
      };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No permission mapping for tool',
        { tool: 'unknown.tool' },
      );
      expect(mockContextManagerInstance.authorize).toHaveBeenCalledWith({
        sessionId: 'session-123',
        resource: 'unknown',
        action: 'read',
        metadata: expect.any(Object),
      });
    });

    it('should handle middleware errors gracefully', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.context.sessionId = 'session-123';

      mockContextManagerInstance.authorize.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth middleware error',
        expect.objectContaining({
          tool: 'property.list',
          error: expect.any(Error),
        }),
      );
      expect(mockResponse.error).toHaveBeenCalledWith(
        'Database connection failed',
        'AUTH_ERROR',
      );
    });

    it('should log debug information when enabled', async () => {
      const middleware = createOAuthMiddleware({ debug: true });
      mockRequest.context.sessionId = 'session-123';

      const authDecision: AuthorizationDecision = {
        allowed: true,
      };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Authorization successful',
        expect.objectContaining({
          tool: 'property.list',
          resource: 'property',
          action: 'read',
          sessionId: 'session-123',
        }),
      );
    });

    it('should skip authentication when requireAuth is false', async () => {
      const middleware = createOAuthMiddleware({ requireAuth: false });

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContextManagerInstance.authorize).not.toHaveBeenCalled();
    });

    it('should handle all standard tool permissions', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.context.sessionId = 'session-123';

      const authDecision: AuthorizationDecision = {
        allowed: true,
      };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      const toolTests = [
        { tool: 'property.create', resource: 'property', action: 'create' },
        { tool: 'property.update', resource: 'property', action: 'update' },
        { tool: 'property.delete', resource: 'property', action: 'delete' },
        { tool: 'property.activate', resource: 'property', action: 'activate' },
        { tool: 'configuration.list', resource: 'configuration', action: 'read' },
        { tool: 'purge.url', resource: 'purge', action: 'create' },
        { tool: 'reporting.traffic', resource: 'reporting', action: 'read' },
        { tool: 'security.update', resource: 'security', action: 'update' },
        { tool: 'credentials.rotate', resource: 'credentials', action: 'rotate' },
      ];

      for (const test of toolTests) {
        mockRequest.toolName = test.tool;
        await middleware(mockRequest, mockResponse, mockNext);

        expect(mockContextManagerInstance.authorize).toHaveBeenCalledWith(
          expect.objectContaining({
            resource: test.resource,
            action: test.action,
          }),
        );
      }
    });
  });

  describe('createCustomerContextMiddleware', () => {
    let middleware: ReturnType<typeof createCustomerContextMiddleware>;

    beforeEach(() => {
      middleware = createCustomerContextMiddleware();
    });

    it('should skip when no session ID is available', async () => {
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockContextManagerInstance.getAvailableCustomers).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should load available customers for session', async () => {
      mockRequest.context.sessionId = 'session-123';

      const customers = [
        { customerId: 'customer-1', customerName: 'Customer 1' },
        { customerId: 'customer-2', customerName: 'Customer 2' },
      ];
      mockContextManagerInstance.getAvailableCustomers.mockResolvedValue(customers);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockContextManagerInstance.getAvailableCustomers).toHaveBeenCalledWith(
        'session-123',
      );
      expect(mockRequest.context.availableCustomers).toEqual(customers);
      expect(mockRequest.context.currentCustomer).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set current customer when specified', async () => {
      mockRequest.context.sessionId = 'session-123';
      mockRequest.customer = 'customer-2';

      const customers = [
        { customerId: 'customer-1', customerName: 'Customer 1' },
        { customerId: 'customer-2', customerName: 'Customer 2' },
      ];
      mockContextManagerInstance.getAvailableCustomers.mockResolvedValue(customers);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.context.currentCustomer).toEqual(customers[1]);
    });

    it('should error when specified customer is not available', async () => {
      mockRequest.context.sessionId = 'session-123';
      mockRequest.customer = 'customer-3';

      const customers = [
        { customerId: 'customer-1', customerName: 'Customer 1' },
        { customerId: 'customer-2', customerName: 'Customer 2' },
      ];
      mockContextManagerInstance.getAvailableCustomers.mockResolvedValue(customers);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.error).toHaveBeenCalledWith(
        'Customer customer-3 not available for session',
        'CUSTOMER_NOT_AVAILABLE',
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should auto-select first customer when none specified', async () => {
      mockRequest.context.sessionId = 'session-123';

      const customers = [
        { customerId: 'customer-1', customerName: 'Customer 1' },
        { customerId: 'customer-2', customerName: 'Customer 2' },
      ];
      mockContextManagerInstance.getAvailableCustomers.mockResolvedValue(customers);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.customer).toBe('customer-1');
      expect(mockRequest.context.currentCustomer).toEqual(customers[0]);
    });

    it('should handle errors gracefully and continue', async () => {
      mockRequest.context.sessionId = 'session-123';
      
      mockContextManagerInstance.getAvailableCustomers.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Customer context middleware error',
        expect.objectContaining({
          tool: 'property.list',
          error: expect.any(Error),
        }),
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.error).not.toHaveBeenCalled();
    });
  });

  describe('createCredentialAccessMiddleware', () => {
    let middleware: ReturnType<typeof createCredentialAccessMiddleware>;

    beforeEach(() => {
      middleware = createCredentialAccessMiddleware();
    });

    it('should skip for tools that do not require EdgeGrid', async () => {
      mockRequest.toolName = 'customer.list';

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockContextManagerInstance.getEdgeGridClient).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should provide EdgeGrid client for API tools', async () => {
      mockRequest.toolName = 'property.list';
      mockRequest.context.sessionId = 'session-123';
      mockRequest.customer = 'customer-123';

      const mockClient = { request: jest.fn() };
      mockContextManagerInstance.getEdgeGridClient.mockResolvedValue(mockClient);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockContextManagerInstance.getEdgeGridClient).toHaveBeenCalledWith({
        sessionId: 'session-123',
        customerId: 'customer-123',
        purpose: 'property.list API call',
      });
      expect(mockRequest.context.edgeGridClient).toBe(mockClient);
      expect(mockRequest.context.hasCredentialAccess).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should require both session and customer for EdgeGrid access', async () => {
      mockRequest.toolName = 'property.list';
      mockRequest.context.sessionId = 'session-123';
      // No customer specified

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockContextManagerInstance.getEdgeGridClient).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle EdgeGrid client errors', async () => {
      mockRequest.toolName = 'property.list';
      mockRequest.context.sessionId = 'session-123';
      mockRequest.customer = 'customer-123';

      mockContextManagerInstance.getEdgeGridClient.mockRejectedValue(
        new Error('Credentials not found'),
      );

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Credential access middleware error',
        expect.objectContaining({
          tool: 'property.list',
          customer: 'customer-123',
          error: expect.any(Error),
        }),
      );
      expect(mockResponse.error).toHaveBeenCalledWith(
        'Credentials not found',
        'CREDENTIAL_ERROR',
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should recognize all EdgeGrid-requiring tool prefixes', async () => {
      const toolPrefixes = [
        'property.something',
        'configuration.action',
        'purge.cache',
        'reporting.data',
        'security.policy',
      ];

      mockRequest.context.sessionId = 'session-123';
      mockRequest.customer = 'customer-123';
      
      const mockClient = { request: jest.fn() };
      mockContextManagerInstance.getEdgeGridClient.mockResolvedValue(mockClient);

      for (const tool of toolPrefixes) {
        mockRequest.toolName = tool;
        await middleware(mockRequest, mockResponse, mockNext);

        expect(mockContextManagerInstance.getEdgeGridClient).toHaveBeenCalled();
      }
    });

    it('should log debug information', async () => {
      mockRequest.toolName = 'property.list';
      mockRequest.context.sessionId = 'session-123';
      mockRequest.customer = 'customer-123';

      const mockClient = { request: jest.fn() };
      mockContextManagerInstance.getEdgeGridClient.mockResolvedValue(mockClient);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'EdgeGrid client provided for request',
        {
          tool: 'property.list',
          customerId: 'customer-123',
        },
      );
    });
  });

  describe('Middleware Integration', () => {
    it('should work together in a middleware chain', async () => {
      // Create all middleware
      const authMiddleware = createOAuthMiddleware();
      const contextMiddleware = createCustomerContextMiddleware();
      const credentialMiddleware = createCredentialAccessMiddleware();

      // Setup request with session
      mockRequest.context.sessionId = 'session-123';
      mockRequest.toolName = 'property.list';

      // Mock successful auth
      const authDecision: AuthorizationDecision = { allowed: true };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      // Mock customer context
      const customers = [{ customerId: 'customer-1', customerName: 'Customer 1' }];
      mockContextManagerInstance.getAvailableCustomers.mockResolvedValue(customers);

      // Mock EdgeGrid client
      const mockClient = { request: jest.fn() };
      mockContextManagerInstance.getEdgeGridClient.mockResolvedValue(mockClient);

      // Run middleware chain
      await authMiddleware(mockRequest, mockResponse, async () => {
        await contextMiddleware(mockRequest, mockResponse, async () => {
          await credentialMiddleware(mockRequest, mockResponse, mockNext);
        });
      });

      // Verify complete flow
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.customer).toBe('customer-1');
      expect(mockRequest.context.edgeGridClient).toBe(mockClient);
      expect(mockRequest.context.hasCredentialAccess).toBe(true);
    });

    it('should handle rate limiting scenarios', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.context.sessionId = 'session-123';

      // Simulate multiple rapid requests
      const authDecision: AuthorizationDecision = { allowed: true };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      const requests = Array(10).fill(null).map(() => 
        middleware({ ...mockRequest }, mockResponse, mockNext)
      );

      await Promise.all(requests);

      expect(mockContextManagerInstance.authorize).toHaveBeenCalledTimes(10);
      expect(mockNext).toHaveBeenCalledTimes(10);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed params gracefully', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.params = null;

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.error).toHaveBeenCalledWith(
        'Authentication required',
        'AUTH_REQUIRED',
      );
    });

    it('should handle non-object params', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.params = 'string-params' as any;

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.error).toHaveBeenCalledWith(
        'Authentication required',
        'AUTH_REQUIRED',
      );
    });

    it('should handle missing tool name', async () => {
      const middleware = createOAuthMiddleware();
      mockRequest.toolName = '';
      mockRequest.context.sessionId = 'session-123';

      const authDecision: AuthorizationDecision = { allowed: true };
      mockContextManagerInstance.authorize.mockResolvedValue(authDecision);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});