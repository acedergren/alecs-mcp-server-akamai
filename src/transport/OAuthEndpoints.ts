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
 * OAuth login request
 */
interface OAuthLoginRequest {
  token: OAuthToken;
  provider: OAuthProvider;
}

/**
 * Customer switch request
 */
interface CustomerSwitchRequest {
  targetCustomerId: string;
  reason?: string;
}

/**
 * Customer mapping request
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
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
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
      const { token, provider } = req.body as OAuthLoginRequest;

      if (!token || !provider) {
        return res.status(400).json({
          error: 'Missing required fields: token, provider',
        });
      }

      // Authenticate with OAuth
      const session = await contextManager.authenticateOAuth(token, provider);

      return res.json({
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
    } catch (_error) {
      logger._error('OAuth login failed', { _error });
      return res.status(401).json({
        _error: _error instanceof Error ? _error.message : 'Authentication failed',
      });
    }
  }));

  /**
   * Refresh token endpoint
   */
  router.post('/auth/oauth/refresh', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;

      if (!sessionId) {
        return res.status(401).json({
          error: 'Session ID required',
        });
      }

      const newToken = await contextManager.refreshSessionToken(sessionId);

      return res.json({
        token: newToken,
        expiresIn: newToken.expiresIn,
      });
    } catch (_error) {
      logger._error('Token refresh failed', { _error });
      return res.status(401).json({
        _error: _error instanceof Error ? _error.message : 'Token refresh failed',
      });
    }
  }));

  /**
   * Logout endpoint
   */
  router.post('/auth/oauth/logout', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;

      if (!sessionId) {
        return res.status(401).json({
          error: 'Session ID required',
        });
      }

      await contextManager.revokeSession(sessionId);

      return res.json({
        message: 'Logout successful',
      });
    } catch (_error) {
      logger._error('Logout failed', { _error });
      return res.status(500).json({
        _error: _error instanceof Error ? _error.message : 'Logout failed',
      });
    }
  }));

  /**
   * Get available customers
   */
  router.get('/auth/customers', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;

      if (!sessionId) {
        return res.status(401).json({
          error: 'Session ID required',
        });
      }

      const customers = await contextManager.getAvailableCustomers(sessionId);

      return res.json({
        customers,
      });
    } catch (_error) {
      logger._error('Failed to get customers', { _error });
      return res.status(500).json({
        _error: _error instanceof Error ? _error.message : 'Failed to get customers',
      });
    }
  }));

  /**
   * Switch customer context
   */
  router.post('/auth/customers/switch', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      const { targetCustomerId, reason } = req.body as CustomerSwitchRequest;

      if (!sessionId) {
        return res.status(401).json({
          error: 'Session ID required',
        });
      }

      if (!targetCustomerId) {
        return res.status(400).json({
          error: 'Target customer ID required',
        });
      }

      const newContext = await contextManager.switchCustomer({
        sessionId,
        targetCustomerId,
        reason,
      });

      return res.json({
        currentCustomer: newContext,
        message: 'Customer context switched successfully',
      });
    } catch (_error) {
      logger._error('Customer switch failed', { _error });
      return res.status(403).json({
        _error: _error instanceof Error ? _error.message : 'Customer switch failed',
      });
    }
  }));

  /**
   * Admin: Map subject to customer
   */
  router.post('/admin/customers/mapping', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      const { subject, provider, customerContext } = req.body as CustomerMappingRequest;

      if (!sessionId) {
        return res.status(401).json({
          error: 'Session ID required',
        });
      }

      if (!subject || !provider || !customerContext) {
        return res.status(400).json({
          error: 'Missing required fields: subject, provider, customerContext',
        });
      }

      await contextManager.mapSubjectToCustomer(
        sessionId,
        subject,
        provider,
        customerContext,
      );

      return res.json({
        message: 'Customer mapping created successfully',
      });
    } catch (_error) {
      logger._error('Customer mapping failed', { _error });
      return res.status(403).json({
        _error: _error instanceof Error ? _error.message : 'Customer mapping failed',
      });
    }
  }));

  /**
   * Admin: Create custom role
   */
  router.post('/admin/roles', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      const role = req.body as Role;

      if (!sessionId) {
        return res.status(401).json({
          error: 'Session ID required',
        });
      }

      if (!role.id || !role.name || !role.permissions) {
        return res.status(400).json({
          error: 'Missing required fields: id, name, permissions',
        });
      }

      await contextManager.createCustomRole(sessionId, role);

      return res.json({
        message: 'Role created successfully',
        roleId: role.id,
      });
    } catch (_error) {
      logger._error('Role creation failed', { _error });
      return res.status(403).json({
        _error: _error instanceof Error ? _error.message : 'Role creation failed',
      });
    }
  }));

  /**
   * Admin: Set customer isolation policy
   */
  router.post('/admin/customers/:customerId/isolation-policy', asyncHandler(async (_req: Request, _res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      const { customerId } = req.params;
      const policy = req.body as Omit<CustomerIsolationPolicy, 'customerId'>;

      if (!sessionId) {
        return res.status(401).json({
          error: 'Session ID required',
        });
      }

      if (!policy.isolationLevel) {
        return res.status(400).json({
          error: 'Missing required field: isolationLevel',
        });
      }

      await contextManager.setCustomerIsolationPolicy(sessionId, {
        ...policy,
        customerId,
        id: `policy_${customerId}_${Date.now()}`,
      });

      return res.json({
        message: 'Isolation policy set successfully',
        customerId,
      });
    } catch (_error) {
      logger._error('Isolation policy creation failed', { _error });
      return res.status(403).json({
        _error: _error instanceof Error ? _error.message : 'Isolation policy creation failed',
      });
    }
  }));

  /**
   * Health check endpoint
   */
  router.get('/auth/health', (_req: Request, _res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Error handling middleware
  router.use((_error: Error, _req: Request, _res: Response, _next: NextFunction) => {
    logger.error('OAuth endpoint error', {
      path: req.path,
      method: req.method,
      error,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? _error.message : undefined,
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
      const sessionId = req.headers['x-session-id'] as string;

      if (!sessionId) {
        // No session, continue without authentication
        return next();
      }

      // Validate session exists
      const customers = await contextManager.getAvailableCustomers(sessionId);

      // Attach session info to request
      (req as any).session = {
        id: sessionId,
        customers,
      };

      next();
    } catch (_error) {
      // Invalid session, continue without authentication
      logger.debug('Invalid session', { sessionId: req.headers['x-session-id'] });
      next();
    }
  };
}

/**
 * Require authentication middleware
 */
export function requireAuth(_req: Request, _res: Response, _next: NextFunction): void {
  if (!(req as any).session?.id) {
    res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }
  next();
}

/**
 * Require admin middleware
 */
export function requireAdmin(_req: Request, _res: Response, _next: NextFunction): void {
  const session = (req as any).session;

  if (!session?.id) {
    res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }

  // Check if user has admin role in any customer context
  const hasAdmin = session.customers?.some((customer: CustomerContext) =>
    customer.roles.includes('system:admin'),
  );

  if (!hasAdmin) {
    res.status(403).json({
      error: 'Admin privileges required',
    });
    return;
  }

  next();
}
