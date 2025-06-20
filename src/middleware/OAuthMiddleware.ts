/**
 * OAuth Authentication Middleware
 * Provides OAuth authentication and authorization for MCP tools
 */

import type { AuthorizationDecision } from '@/auth/oauth/types';
import { CustomerContextManager } from '@/services/CustomerContextManager';
import type {
  MiddlewareFunction,
  MiddlewareRequest,
  MiddlewareResponse,
  NextFunction,
} from '@/types/middleware';
import { logger } from '@/utils/logger';

/**
 * OAuth middleware configuration
 */
export interface OAuthMiddlewareConfig {
  /** Required authentication for all tools */
  requireAuth?: boolean;
  /** Tools that don't require authentication */
  publicTools?: string[];
  /** Tools that require admin privileges */
  adminTools?: string[];
  /** Session header name */
  sessionHeader?: string;
  /** Enable detailed logging */
  debug?: boolean;
}

/**
 * Tool permission mapping
 */
interface ToolPermission {
  resource: string;
  action: string;
  requiresResourceId?: boolean;
}

/**
 * Default tool permission mappings
 */
const TOOL_PERMISSIONS: Record<string, ToolPermission> = {
  // Property management tools
  'property.list': { resource: 'property', action: 'read' },
  'property.get': { resource: 'property', action: 'read', requiresResourceId: true },
  'property.create': { resource: 'property', action: 'create' },
  'property.update': { resource: 'property', action: 'update', requiresResourceId: true },
  'property.delete': { resource: 'property', action: 'delete', requiresResourceId: true },
  'property.activate': { resource: 'property', action: 'activate', requiresResourceId: true },

  // Configuration tools
  'configuration.list': { resource: 'configuration', action: 'read' },
  'configuration.get': { resource: 'configuration', action: 'read', requiresResourceId: true },
  'configuration.create': { resource: 'configuration', action: 'create' },
  'configuration.update': { resource: 'configuration', action: 'update', requiresResourceId: true },

  // Purge tools
  'purge.url': { resource: 'purge', action: 'create' },
  'purge.cpcode': { resource: 'purge', action: 'create' },
  'purge.tag': { resource: 'purge', action: 'create' },

  // Reporting tools
  'reporting.traffic': { resource: 'reporting', action: 'read' },
  'reporting.errors': { resource: 'reporting', action: 'read' },
  'reporting.performance': { resource: 'reporting', action: 'read' },

  // Security tools
  'security.list': { resource: 'security', action: 'read' },
  'security.get': { resource: 'security', action: 'read', requiresResourceId: true },
  'security.update': { resource: 'security', action: 'update', requiresResourceId: true },

  // Customer management (admin only)
  'customer.create': { resource: 'customer_mapping', action: 'create' },
  'customer.switch': { resource: 'customer_context', action: 'switch' },
  'customer.list': { resource: 'customer_context', action: 'read' },

  // Credential management
  'credentials.store': { resource: 'credentials', action: 'create' },
  'credentials.rotate': { resource: 'credentials', action: 'rotate' },
  'credentials.list': { resource: 'credentials', action: 'read' },
};

/**
 * Create OAuth authentication middleware
 */
export function createOAuthMiddleware(
  config: OAuthMiddlewareConfig = {},
): MiddlewareFunction {
  const {
    requireAuth = true,
    publicTools = [],
    adminTools = [],
    sessionHeader = 'x-session-id',
    debug = false,
  } = config;

  const contextManager = CustomerContextManager.getInstance();

  return async (
    _req: MiddlewareRequest,
    _res: MiddlewareResponse,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      // Check if tool requires authentication
      if (!requireAuth || publicTools.includes(req.toolName)) {
        if (debug) {
          logger.debug('Tool does not require authentication', {
            tool: req.toolName,
          });
        }
        return next();
      }

      // Extract session ID from request
      const sessionId = extractSessionId(req, sessionHeader);
      if (!sessionId) {
        return res.error('Authentication required', 'AUTH_REQUIRED');
      }

      // Store session ID in request context
      req.context.sessionId = sessionId;

      // Get tool permissions
      const toolPermission = TOOL_PERMISSIONS[req.toolName];
      if (!toolPermission) {
        if (debug) {
          logger.warn('No permission mapping for tool', { tool: req.toolName });
        }
        // Default to requiring read permission on unknown resource
        const decision = await authorizeRequest(
          contextManager,
          sessionId,
          'unknown',
          'read',
          req,
        );

        if (!decision.allowed) {
          return res.error(
            `Not authorized: ${decision.reason}`,
            'AUTHORIZATION_FAILED',
          );
        }

        return next();
      }

      // Extract resource ID if required
      let resourceId: string | undefined;
      if (toolPermission.requiresResourceId) {
        resourceId = extractResourceId(req);
      }

      // Perform authorization
      const decision = await authorizeRequest(
        contextManager,
        sessionId,
        toolPermission.resource,
        toolPermission.action,
        req,
        resourceId,
      );

      if (!decision.allowed) {
        return res.error(
          `Not authorized to ${toolPermission.action} ${toolPermission.resource}: ${decision.reason}`,
          'AUTHORIZATION_FAILED',
        );
      }

      // Check admin requirement
      if (adminTools.includes(req.toolName)) {
        const adminDecision = await authorizeRequest(
          contextManager,
          sessionId,
          'admin',
          'access',
          req,
        );

        if (!adminDecision.allowed) {
          return res.error(
            'Admin privileges required',
            'ADMIN_REQUIRED',
          );
        }
      }

      // Store authorization context
      req.context.authorization = {
        allowed: true,
        resource: toolPermission.resource,
        action: toolPermission.action,
        resourceId,
      };

      if (debug) {
        logger.debug('Authorization successful', {
          tool: req.toolName,
          resource: toolPermission.resource,
          action: toolPermission.action,
          sessionId,
        });
      }

      next();
    } catch (_error) {
      logger._error('OAuth middleware _error', {
        tool: req.toolName,
        _error,
      });

      res._error(
        _error instanceof Error ? _error.message : 'Authentication _error',
        'AUTH_ERROR',
      );
    }
  };
}

/**
 * Extract session ID from request
 */
function extractSessionId(
  _req: MiddlewareRequest,
  headerName: string,
): string | undefined {
  // Check context first
  if (req.context.sessionId) {
    return req.context.sessionId as string;
  }

  // Check params for session ID
  if (typeof req.params === 'object' && req.params !== null) {
    const params = req.params as Record<string, unknown>;

    // Check header-style parameter
    if (params[headerName]) {
      return String(params[headerName]);
    }

    // Check common session parameter names
    if (params.sessionId) {
      return String(params.sessionId);
    }

    if (params.session) {
      return String(params.session);
    }
  }

  return undefined;
}

/**
 * Extract resource ID from request
 */
function extractResourceId(_req: MiddlewareRequest): string | undefined {
  if (typeof req.params === 'object' && req.params !== null) {
    const params = req.params as Record<string, unknown>;

    // Common resource ID parameter names
    const idParams = ['id', 'resourceId', 'propertyId', 'configId', 'credentialId'];

    for (const param of idParams) {
      if (params[param]) {
        return String(params[param]);
      }
    }
  }

  return undefined;
}

/**
 * Perform authorization request
 */
async function authorizeRequest(
  contextManager: CustomerContextManager,
  sessionId: string,
  resource: string,
  action: string,
  _req: MiddlewareRequest,
  resourceId?: string,
): Promise<AuthorizationDecision> {
  return contextManager.authorize({
    sessionId,
    resource,
    action,
    resourceId,
    metadata: {
      toolName: req.toolName,
      requestId: req.requestId,
      timestamp: req.timestamp,
    },
  });
}

/**
 * Create customer context middleware
 */
export function createCustomerContextMiddleware(): MiddlewareFunction {
  const contextManager = CustomerContextManager.getInstance();

  return async (
    _req: MiddlewareRequest,
    _res: MiddlewareResponse,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      // Check if session ID is available
      const sessionId = req.context.sessionId as string | undefined;
      if (!sessionId) {
        // No session, continue without customer context
        return next();
      }

      // Get available customers for session
      const customers = await contextManager.getAvailableCustomers(sessionId);

      // Store in request context
      req.context.availableCustomers = customers;
      req.context.currentCustomer = customers.find((c) => c.customerId === req.customer);

      // If customer specified but not available, error
      if (req.customer && !req.context.currentCustomer) {
        return res.error(
          `Customer ${req.customer} not available for session`,
          'CUSTOMER_NOT_AVAILABLE',
        );
      }

      // If no customer specified, use first available
      if (!req.customer && customers.length > 0) {
        req.customer = customers[0]!.customerId;
        req.context.currentCustomer = customers[0];
      }

      next();
    } catch (_error) {
      logger._error('Customer context middleware _error', {
        tool: req.toolName,
        _error,
      });

      // Continue without customer context
      next();
    }
  };
}

/**
 * Create credential access middleware
 */
export function createCredentialAccessMiddleware(): MiddlewareFunction {
  const contextManager = CustomerContextManager.getInstance();

  return async (
    _req: MiddlewareRequest,
    _res: MiddlewareResponse,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      // Check if this tool requires EdgeGrid access
      const requiresEdgeGrid = [
        'property',
        'configuration',
        'purge',
        'reporting',
        'security',
      ].some((prefix) => req.toolName.startsWith(prefix));

      if (!requiresEdgeGrid) {
        return next();
      }

      // Check session and customer
      const sessionId = req.context.sessionId as string | undefined;
      const customerId = req.customer;

      if (!sessionId || !customerId) {
        return next(); // Let other middleware handle authentication
      }

      // Get EdgeGrid client for customer
      const client = await contextManager.getEdgeGridClient({
        sessionId,
        customerId,
        purpose: `${req.toolName} API call`,
      });

      // Store in context for tool to use
      req.context.edgeGridClient = client;
      req.context.hasCredentialAccess = true;

      logger.debug('EdgeGrid client provided for request', {
        tool: req.toolName,
        customerId,
      });

      next();
    } catch (_error) {
      logger._error('Credential access middleware _error', {
        tool: req.toolName,
        customer: req.customer,
        _error,
      });

      res._error(
        _error instanceof Error ? _error.message : 'Credential access _error',
        'CREDENTIAL_ERROR',
      );
    }
  };
}
