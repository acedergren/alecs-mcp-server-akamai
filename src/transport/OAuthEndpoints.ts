/**
 * OAuth HTTP Endpoints
 * Provides OAuth authentication endpoints for the MCP server
 */

import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';

import type {
  OAuthToken,
  OAuthProvider,
  CustomerContext,
  Role,
  CustomerIsolationPolicy,
} from '@/auth/oauth/types';
import { CustomerContextManager } from '@/services/CustomerContextManager';
import { logger } from '@/utils/logger';

/**
 * OAuth login _request
 */
interface OAuthLoginRequest {
  token: OAuthToken;
  provider: OAuthProvider;
}

/**
 * Customer switch _request
 */
interface CustomerSwitchRequest {
  targetCustomerId: string;
  reason?: string;
}

/**
 * Customer mapping _request
 */
interface CustomerMappingRequest {
  subject: string;
  provider: OAuthProvider;
  customerContext: CustomerContext;
}

/**
 * Wrapper for async route handlers
 */
function asyncHandler(fn: (_req: Request, _res: Response, _next: NextFunction) => Promise<any>): RequestHandler {
  return (_req, _res, _next) => {
    Promise.resolve(fn(_req, _res, _next)).catch(_next);
  };
}

/**
 * Create OAuth routes
 */
export function createOAuthRoutes(): Router {
  const router = Router();
  const contextManager = CustomerContextManager.getInstance();

  /**
   * OAuth login endpoint
   */
  router.post('/auth/oauth/login', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const { token, provider } = _req.body as OAuthLoginRequest;

      if (!token || !provider) {
        return _res.status(400).json({
          error: 'Missing required fields: token, provider',
        });
      }

      // Authenticate with OAuth
      const session = await contextManager.authenticateOAuth(token, provider);

      return _res.json({
        sessionId: session.sessionId,
        profile: {
          sub: session.profile.sub,
          email: session.profile.email,
          name: session.profile.name,
        },
        currentCustomer: session.currentContext,
        availableCustomers: session.availableContexts,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      logger.error('OAuth login failed', { error: _error });
      return _res.status(401).json({
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }));

  /**
   * Refresh token endpoint
   */
  router.post('/auth/oauth/refresh', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = _req.headers['x-session-id'] as string;

      if (!sessionId) {
        return _res.status(401).json({
          error: 'Session ID required',
        });
      }

      const newToken = await contextManager.refreshSessionToken(sessionId);

      return _res.json({
        token: newToken,
        expiresIn: newToken.expiresIn,
      });
    } catch (error) {
      logger.error('Token refresh failed', { error: _error });
      return _res.status(401).json({
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  }));

  /**
   * Logout endpoint
   */
  router.post('/auth/oauth/logout', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = _req.headers['x-session-id'] as string;

      if (!sessionId) {
        return _res.status(401).json({
          error: 'Session ID required',
        });
      }

      await contextManager.revokeSession(sessionId);

      return _res.json({
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout failed', { error: _error });
      return _res.status(500).json({
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  }));

  /**
   * Get available customers
   */
  router.get('/auth/customers', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = _req.headers['x-session-id'] as string;

      if (!sessionId) {
        return _res.status(401).json({
          error: 'Session ID required',
        });
      }

      const customers = await contextManager.getAvailableCustomers(sessionId);

      return _res.json({
        customers,
      });
    } catch (error) {
      logger.error('Failed to get customers', { error: _error });
      return _res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get customers',
      });
    }
  }));

  /**
   * Switch customer context
   */
  router.post('/auth/customers/switch', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = _req.headers['x-session-id'] as string;
      const { targetCustomerId, reason } = _req.body as CustomerSwitchRequest;

      if (!sessionId) {
        return _res.status(401).json({
          error: 'Session ID required',
        });
      }

      if (!targetCustomerId) {
        return _res.status(400).json({
          error: 'Target customer ID required',
        });
      }

      const newContext = await contextManager.switchCustomer({
        sessionId,
        targetCustomerId,
        reason,
      });

      return _res.json({
        currentCustomer: newContext,
        message: 'Customer context switched successfully',
      });
    } catch (error) {
      logger.error('Customer switch failed', { error: _error });
      return _res.status(403).json({
        error: error instanceof Error ? error.message : 'Customer switch failed',
      });
    }
  }));

  /**
   * Admin: Map subject to customer
   */
  router.post('/admin/customers/mapping', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = _req.headers['x-session-id'] as string;
      const { subject, provider, customerContext } = _req.body as CustomerMappingRequest;

      if (!sessionId) {
        return _res.status(401).json({
          error: 'Session ID required',
        });
      }

      if (!subject || !provider || !customerContext) {
        return _res.status(400).json({
          error: 'Missing required fields: subject, provider, customerContext',
        });
      }

      await contextManager.mapSubjectToCustomer(
        sessionId,
        subject,
        provider,
        customerContext,
      );

      return _res.json({
        message: 'Customer mapping created successfully',
      });
    } catch (error) {
      logger.error('Customer mapping failed', { error: _error });
      return _res.status(403).json({
        error: error instanceof Error ? error.message : 'Customer mapping failed',
      });
    }
  }));

  /**
   * Admin: Create custom role
   */
  router.post('/admin/roles', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = _req.headers['x-session-id'] as string;
      const role = _req.body as Role;

      if (!sessionId) {
        return _res.status(401).json({
          error: 'Session ID required',
        });
      }

      if (!role.id || !role.name || !role.permissions) {
        return _res.status(400).json({
          error: 'Missing required fields: id, name, permissions',
        });
      }

      await contextManager.createCustomRole(sessionId, role);

      return _res.json({
        message: 'Role created successfully',
        roleId: role.id,
      });
    } catch (error) {
      logger.error('Role creation failed', { error: _error });
      return _res.status(403).json({
        error: error instanceof Error ? error.message : 'Role creation failed',
      });
    }
  }));

  /**
   * Admin: Set customer isolation policy
   */
  router.post('/admin/customers/:customerId/isolation-policy', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = _req.headers['x-session-id'] as string;
      const { customerId } = _req.params;
      const policy = _req.body as Omit<CustomerIsolationPolicy, 'customerId'>;

      if (!sessionId) {
        return _res.status(401).json({
          error: 'Session ID required',
        });
      }

      if (!policy.isolationLevel) {
        return _res.status(400).json({
          error: 'Missing required field: isolationLevel',
        });
      }

      await contextManager.setCustomerIsolationPolicy(sessionId, {
        ...policy,
        customerId,
        id: `policy_${customerId}_${Date.now()}`,
      });

      return _res.json({
        message: 'Isolation policy set successfully',
        customerId,
      });
    } catch (error) {
      logger.error('Isolation policy creation failed', { error: _error });
      return _res.status(403).json({
        error: error instanceof Error ? error.message : 'Isolation policy creation failed',
      });
    }
  }));

  /**
   * Health check endpoint
   */
  router.get('/auth/health', (_req: Request, _res: Response) => {
    _res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Error handling middleware
  router.use((error: Error, _req: Request, _res: Response, _next: NextFunction) => {
    logger.error('OAuth endpoint error', {
      path: _req.path,
      method: _req.method,
      _error,
    });

    _res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  });

  return router;
}

/**
 * Session validation middleware for Express
 */
export function createSessionMiddleware() {
  const contextManager = CustomerContextManager.getInstance();

  return async (_req: Request, _res: Response, _next: NextFunction) => {
    try {
      const sessionId = _req.headers['x-session-id'] as string;

      if (!sessionId) {
        // No session, continue without authentication
        return _next();
      }

      // Validate session exists
      const customers = await contextManager.getAvailableCustomers(sessionId);

      // Attach session info to _request
      (_req as any).session = {
        id: sessionId,
        customers,
      };

      _next();
    } catch (error) {
      // Invalid session, continue without authentication
      logger.debug('Invalid session', { sessionId: _req.headers['x-session-id'] });
      _next();
    }
  };
}

/**
 * Require authentication middleware
 */
export function requireAuth(_req: Request, _res: Response, _next: NextFunction): void {
  if (!(_req as any).session?.id) {
    _res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }
  _next();
}

/**
 * Require admin middleware
 */
export function requireAdmin(_req: Request, _res: Response, _next: NextFunction): void {
  const session = (_req as any).session;

  if (!session?.id) {
    _res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }

  // Check if user has admin role in any customer context
  const hasAdmin = session.customers?.some((customer: CustomerContext) =>
    customer.roles.includes('system:admin'),
  );

  if (!hasAdmin) {
    _res.status(403).json({
      error: 'Admin privileges required',
    });
    return;
  }

  _next();
}
