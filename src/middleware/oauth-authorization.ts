/**
 * OAuth 2.0 Authorization Middleware
 * Handles token validation and resource authorization
 */

// import { createHash } from 'crypto';

import { type Request, type Response, type NextFunction, type RequestHandler } from 'express';

import { OAuthResourceServer, ResourceUri } from '@/services/oauth-resource-server';
import {
  type OAuthOperation,
  type OAuthResourceType,
  type OAuthAccessTokenClaims,
  type OAuthProtectedResource,
  type OAuthResourceAccessContext,
} from '@/types/oauth';

/**
 * Extended Express Request with OAuth context
 */
export interface OAuthRequest extends Request {
  oauth?: {
    token: OAuthAccessTokenClaims;
    resource?: OAuthProtectedResource;
    scopes: string[];
    clientId: string;
  };
}

/**
 * OAuth Authorization Middleware Options
 */
export interface OAuthAuthorizationOptions {
  /** Resource server instance */
  resourceServer: OAuthResourceServer;
  /** Optional realm for WWW-Authenticate header */
  realm?: string;
  /** Whether to require authentication for all routes */
  requireAuth?: boolean;
  /** Custom token extractor */
  tokenExtractor?: (_req: Request) => string | undefined;
  /** Custom error handler */
  errorHandler?: (_err: OAuthError, _req: Request, _res: Response, _next: NextFunction) => void;
}

/**
 * OAuth Error class
 */
export class OAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly error: string,
    public readonly errorDescription?: string,
    public readonly errorUri?: string,
  ) {
    super(message);
    this.name = 'OAuthError';
  }

  toJSON() {
    return {
      error: this.error,
      error_description: this.errorDescription,
      error_uri: this.errorUri,
    };
  }
}

/**
 * Create OAuth authorization middleware
 */
export function createOAuthMiddleware(options: OAuthAuthorizationOptions): RequestHandler {
  const {
    resourceServer,
    // realm = 'Akamai API',
    requireAuth = true,
    tokenExtractor = extractBearerToken,
    errorHandler = defaultErrorHandler,
  } = options;

  return async (_req: OAuthRequest, _res: Response, _next: NextFunction) => {
    try {
      // Extract token
      const token = tokenExtractor(_req);

      if (!token) {
        if (requireAuth) {
          throw new OAuthError(
            'No authorization token provided',
            401,
            'unauthorized',
            'Missing Bearer token in Authorization header',
          );
        }
        return _next();
      }

      // Introspect token
      const introspection = await resourceServer.introspectToken(token);

      if (!introspection.active) {
        throw new OAuthError(
          'Token is not active',
          401,
          'invalid_token',
          'The access token is expired, revoked, or invalid',
        );
      }

      // Build token claims from introspection
      const tokenClaims: OAuthAccessTokenClaims = {
        iss: introspection.iss || '',
        sub: introspection.sub || '',
        aud: introspection.aud || [],
        exp: introspection.exp || 0,
        iat: introspection.iat || 0,
        scope: introspection.scope || '',
        client_id: introspection.client_id || '',
        akamai: {
          account_id: (introspection.account_id as string) || '',
          contract_ids: introspection.contract_ids as string[],
          group_ids: introspection.group_ids as string[],
        },
      };

      // Attach OAuth context to request
      _req.oauth = {
        token: tokenClaims,
        scopes: tokenClaims.scope.split(' '),
        clientId: tokenClaims.client_id,
      };

      _next();
    } catch (_error) {
      if (_error instanceof OAuthError) {
        errorHandler(_error, _req, _res, _next);
      } else {
        const oauthError = new OAuthError(
          'Internal server _error',
          500,
          'server_error',
          _error instanceof Error ? _error.message : 'Unknown _error',
        );
        errorHandler(oauthError, _req, _res, _next);
      }
    }
  };
}

/**
 * Create resource authorization middleware
 */
export function requireResourceAccess(
  resourceType: OAuthResourceType,
  operation: OAuthOperation,
  resourceIdExtractor?: (_req: Request) => string,
): RequestHandler {
  return async (_req: OAuthRequest, _res: Response, _next: NextFunction) => {
    try {
      if (!_req.oauth?.token) {
        throw new OAuthError(
          'Authentication required',
          401,
          'unauthorized',
          'No valid authentication token found',
        );
      }

      // Get resource server from request context (set by previous middleware)
      const resourceServer = (_req as any).resourceServer as OAuthResourceServer;
      if (!resourceServer) {
        throw new Error('Resource server not found in request context');
      }

      // Extract resource ID
      const resourceId = resourceIdExtractor
        ? resourceIdExtractor(_req)
        : _req.params.id || _req.params.resourceId;

      if (!resourceId) {
        throw new OAuthError(
          'Resource ID not found',
          400,
          'invalid_request',
          'Unable to determine resource ID from request',
        );
      }

      // Build resource URI
      const accountId = _req.oauth.token.akamai?.account_id || 'unknown';
      const resourceUri = new ResourceUri(resourceType, accountId, resourceId);

      // Get resource metadata
      const resource = resourceServer.getResource(resourceUri.toString());
      if (!resource) {
        // Create a temporary resource for authorization check
        const tempResource: OAuthProtectedResource = {
          uri: resourceUri.toString(),
          type: resourceType,
          name: `${resourceType}/${resourceId}`,
          requiredScopes: [`${resourceType}:${operation}`],
          owner: {
            accountId,
          },
          metadata: {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          },
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        };
        resourceServer.registerProtectedResource(tempResource);
        _req.oauth.resource = tempResource;
      } else {
        _req.oauth.resource = resource;
      }

      // Build access context
      const _context: OAuthResourceAccessContext = {
        token: _req.oauth.token,
        resource: _req.oauth.resource,
        operation,
        method: _req.method,
        path: _req.path,
        context: {
          ip: _req.ip,
          userAgent: _req.get('user-agent'),
        },
      };

      // Authorize access
      const decision = await resourceServer.authorizeResourceAccess(_context);

      if (!decision.allowed) {
        throw new OAuthError(
          decision.reason || 'Access denied',
          403,
          'insufficient_scope',
          decision.reason,
          undefined,
        );
      }

      // Log successful authorization
      console.log('Authorization granted:', decision.audit);

      _next();
    } catch (_error) {
      if (_error instanceof OAuthError) {
        defaultErrorHandler(_error, _req, _res, _next);
      } else {
        const oauthError = new OAuthError(
          'Authorization _error',
          500,
          'server_error',
          _error instanceof Error ? _error.message : 'Unknown _error',
        );
        defaultErrorHandler(oauthError, _req, _res, _next);
      }
    }
  };
}

/**
 * Create scope validation middleware
 */
export function requireScopes(...requiredScopes: string[]): RequestHandler {
  return (_req: OAuthRequest, _res: Response, _next: NextFunction) => {
    if (!_req.oauth?.token) {
      return defaultErrorHandler(
        new OAuthError(
          'Authentication required',
          401,
          'unauthorized',
          'No valid authentication token found',
        ),
        _req,
        _res,
        _next,
      );
    }

    const tokenScopes = _req.oauth.scopes;
    const missingScopes = requiredScopes.filter((scope) => !tokenScopes.includes(scope));

    if (missingScopes.length > 0) {
      return defaultErrorHandler(
        new OAuthError(
          'Insufficient scopes',
          403,
          'insufficient_scope',
          `Required scopes: ${missingScopes.join(', ')}`,
        ),
        _req,
        _res,
        _next,
      );
    }

    _next();
  };
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(_req: Request): string | undefined {
  const authHeader = _req.get('Authorization');
  if (!authHeader) {
    return undefined;
  }

  const [type, token] = authHeader.split(' ');
  if (type.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }

  return token;
}

/**
 * Default OAuth error handler
 */
function defaultErrorHandler(
  err: OAuthError,
  _req: Request,
  _res: Response,
  _next: NextFunction,
): void {
  // Set WWW-Authenticate header for 401 errors
  if (err.status === 401) {
    const wwwAuthenticate = ['Bearer', `realm="${_req.get('host') || 'Akamai API'}"`];

    if (err.error) {
      wwwAuthenticate.push(`error="${err.error}"`);
    }

    if (err.errorDescription) {
      wwwAuthenticate.push(`error_description="${err.errorDescription}"`);
    }

    _res.set('WWW-Authenticate', wwwAuthenticate.join(', '));
  }

  _res.status(err.status).json(err.toJSON());
}

/**
 * Create resource discovery endpoint
 */
export function createResourceDiscoveryEndpoint(
  resourceServer: OAuthResourceServer,
): RequestHandler {
  return (_req: Request, _res: Response) => {
    const discovery = resourceServer.generateResourceDiscovery();
    _res.json(discovery);
  };
}

/**
 * Create well-known authorization server endpoint
 */
export function createAuthServerMetadataEndpoint(
  resourceServer: OAuthResourceServer,
): RequestHandler {
  return (_req: Request, _res: Response) => {
    const metadata = resourceServer.getAuthorizationServerMetadata();
    _res.json(metadata);
  };
}

/**
 * Create well-known resource server endpoint
 */
export function createResourceServerMetadataEndpoint(
  resourceServer: OAuthResourceServer,
): RequestHandler {
  return (_req: Request, _res: Response) => {
    const metadata = resourceServer.getResourceServerMetadata();
    _res.json(metadata);
  };
}

/**
 * OAuth middleware factory
 */
export class OAuthMiddlewareFactory {
  constructor(private readonly resourceServer: OAuthResourceServer) {}

  /**
   * Create authentication middleware
   */
  authenticate(options?: Partial<OAuthAuthorizationOptions>): RequestHandler {
    return createOAuthMiddleware({
      resourceServer: this.resourceServer,
      ...options,
    });
  }

  /**
   * Create resource authorization middleware
   */
  authorizeResource(
    resourceType: OAuthResourceType,
    operation: OAuthOperation,
    resourceIdExtractor?: (_req: Request) => string,
  ): RequestHandler {
    return requireResourceAccess(resourceType, operation, resourceIdExtractor);
  }

  /**
   * Create scope validation middleware
   */
  requireScopes(...scopes: string[]): RequestHandler {
    return requireScopes(...scopes);
  }

  /**
   * Create discovery endpoints
   */
  createDiscoveryEndpoints(): {
    authServer: RequestHandler;
    resourceServer: RequestHandler;
    resources: RequestHandler;
  } {
    return {
      authServer: createAuthServerMetadataEndpoint(this.resourceServer),
      resourceServer: createResourceServerMetadataEndpoint(this.resourceServer),
      resources: createResourceDiscoveryEndpoint(this.resourceServer),
    };
  }
}
