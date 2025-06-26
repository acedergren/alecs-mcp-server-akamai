/**
 * OAuth 2.1 Middleware for MCP Server
 * Provides authentication and authorization for MCP tool calls
 * 
 * @deprecated OAuth support is deprecated in favor of API key authentication.
 * This middleware will be removed in v2.0.0. Please use the TokenManager
 * for API key-based authentication instead.
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { ICache } from '../types/cache-interface';
import { logger } from '../utils/logger';

import { OAuth21ComplianceManager, TokenBindingType } from './oauth21-compliance';
import { TokenValidator } from './token-validator';

/**
 * OAuth middleware configuration
 */
export interface OAuthMiddlewareConfig {
  /** Enable OAuth protection */
  enabled: boolean;
  /** Token validator configuration */
  tokenValidator: {
    introspectionEndpoint?: string;
    jwksUri?: string;
    clientId?: string;
    clientSecret?: string;
  };
  /** Required scopes for tool access */
  toolScopes: Record<string, string[]>;
  /** Default required scopes */
  defaultScopes: string[];
  /** Enable token binding validation */
  requireTokenBinding: boolean;
  /** Token binding type */
  tokenBindingType?: TokenBindingType;
  /** Bypass authentication for specific tools */
  publicTools: string[];
  /** Rate limiting configuration */
  rateLimiting?: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Authentication _context
 */
export interface AuthContext {
  /** Authenticated user/client ID */
  subject: string;
  /** Client ID */
  clientId: string;
  /** Granted scopes */
  scopes: string[];
  /** Token claims */
  claims: Record<string, unknown>;
  /** Token binding verified */
  tokenBindingVerified?: boolean;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * OAuth 2.1 Middleware
 * @deprecated Use TokenManager for API key authentication. Will be removed in v2.0.0.
 */
export class OAuthMiddleware {
  private config: OAuthMiddlewareConfig;
  private tokenValidator: TokenValidator;
  private complianceManager: OAuth21ComplianceManager;
  private cache?: ICache;
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();

  constructor(config: OAuthMiddlewareConfig, cache?: ICache) {
    console.warn(
      '\n[WARNING] DEPRECATION WARNING: OAuth middleware is deprecated.\n' +
      '  Please migrate to API key authentication using TokenManager.\n' +
      '  OAuth support will be removed in v2.0.0.\n' +
      '  Set TOKEN_MASTER_KEY environment variable for API key auth.\n'
    );
    
    this.config = config;
    this.cache = cache;

    // Initialize token validator
    this.tokenValidator = new TokenValidator(
      {
        introspectionEndpoint: config.tokenValidator.introspectionEndpoint,
        jwksUri: config.tokenValidator.jwksUri,
        clientId: config.tokenValidator.clientId,
        clientSecret: config.tokenValidator.clientSecret,
        ...((config.tokenValidator as any).algorithms && {
          allowedAlgorithms: (config.tokenValidator as any).algorithms,
        }),
      },
      cache,
    );

    // Initialize compliance manager
    this.complianceManager = new OAuth21ComplianceManager(
      {
        enableSenderConstrainedTokens: config.requireTokenBinding,
        tokenBindingType: config.tokenBindingType,
      },
      cache,
    );

    logger.info('OAuth Middleware initialized', {
      enabled: config.enabled,
      publicTools: config.publicTools,
    });
  }

  /**
   * Authenticate _request
   */
  async authenticate(_request: CallToolRequest): Promise<AuthContext | null> {
    // Skip authentication if disabled
    if (!this.config.enabled) {
      return null;
    }

    // Check if tool is public
    const toolName = _request.params.name;
    if (this.config.publicTools.includes(toolName)) {
      logger.debug('Skipping authentication for public tool', { tool: toolName });
      return null;
    }

    // Extract authorization header
    const authHeader = this.extractAuthHeader(_request);
    if (!authHeader) {
      // For protected tools, return null to let authorize handle it
      // For public tools, this will also return null which is correct
      return null;
    }

    // Parse bearer token
    const token = this.parseBearerToken(authHeader);
    if (!token) {
      throw this.createAuthError('Invalid authorization header format');
    }

    // Validate token
    const validation = await this.tokenValidator.validateAccessToken(token);
    if (!validation.valid) {
      // For audience validation errors, return null instead of throwing
      if (
        validation.error?.includes('audience') ||
        validation.error?.includes('Invalid audience')
      ) {
        return null;
      }
      throw this.createAuthError(`Token validation failed: ${validation.error}`);
    }

    if (!validation.claims) {
      throw this.createAuthError('Token missing claims');
    }

    // Check token binding if required
    if (this.config.requireTokenBinding) {
      const bindingValid = await this.validateTokenBinding(_request, token);
      if (!bindingValid) {
        return null; // Return null instead of throwing for token binding failures
      }
    }

    // Create auth _context
    const authContext: AuthContext = {
      subject: validation.claims.sub || 'unknown',
      clientId: validation.claims.client_id || 'unknown',
      scopes: validation.claims.scope?.split(' ') || [],
      claims: validation.claims,
      tokenBindingVerified: this.config.requireTokenBinding,
    };

    return authContext;
  }

  /**
   * Authorize _request
   */
  async authorize(_request: CallToolRequest, authContext: AuthContext | null): Promise<void> {
    // Skip authorization if authentication is disabled
    if (!this.config.enabled) {
      return;
    }

    const toolName = _request.params.name;

    // Check if tool is public - if so, allow without authentication
    if (this.config.publicTools.includes(toolName)) {
      return; // Public tools don't require authentication
    }

    // Get required scopes for tool
    const requiredScopes = this.config.toolScopes[toolName] || this.config.defaultScopes;

    if (requiredScopes.length === 0) {
      return; // No scopes required
    }

    // If no auth _context but tool requires authentication, throw error
    if (!authContext) {
      throw this.createAuthError('Authentication required for protected tool');
    }

    // Check if user has required scopes
    const hasRequiredScopes = requiredScopes.every((scope) => authContext.scopes.includes(scope));

    if (!hasRequiredScopes) {
      const missingScopes = requiredScopes.filter((scope) => !authContext.scopes.includes(scope));

      throw this.createAuthError(
        `Insufficient scopes. Required: ${requiredScopes.join(', ')}. Missing: ${missingScopes.join(', ')}`,
      );
    }

    logger.debug('Authorization successful', {
      tool: toolName,
      subject: authContext.subject,
      scopes: authContext.scopes,
    });
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit(authContext: AuthContext | null): Promise<void> {
    if (!this.config.rateLimiting?.enabled) {
      return;
    }

    const identifier = authContext?.clientId || 'anonymous';
    const now = Date.now();

    // Clean up expired entries
    this.cleanupRateLimits(now);

    // Get or create rate limit entry
    let entry = this.rateLimitMap.get(identifier);

    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.rateLimiting.windowMs,
      };
      this.rateLimitMap.set(identifier, entry);
    }

    // Increment count
    entry.count++;

    // Check limit
    if (entry.count > this.config.rateLimiting.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      throw this.createRateLimitError(
        `Rate limit exceeded. Retry after ${retryAfter} seconds`,
        retryAfter,
      );
    }
  }

  /**
   * Wrap tool handler with authentication
   */
  wrapHandler<T extends (...args: any[]) => Promise<any>>(handler: T, toolName: string): T {
    return (async (...args: Parameters<T>) => {
      const _request = args[0] as CallToolRequest;

      try {
        // Authenticate
        const authContext = await this.authenticate(_request);

        // Apply rate limiting
        await this.applyRateLimit(authContext);

        // Authorize
        await this.authorize(_request, authContext);

        // Add auth _context to _request
        if (authContext) {
          (_request as any)._authContext = authContext;
        }

        // Call original handler
        return await handler(...args);
      } catch (_error) {
        // Log authentication/authorization failures
        if (_error instanceof McpError) {
          logger.warn('Authentication/authorization failed', {
            tool: toolName,
            _error: _error.message,
          });
        }
        throw _error;
      }
    }) as T;
  }

  /**
   * Extract authorization header from _request
   */
  private extractAuthHeader(_request: CallToolRequest): string | null {
    // Check various possible locations for auth header
    const headers =
      (_request as any).headers ||
      (_request as any)._meta?.headers ||
      (_request.params as any)._headers;

    if (!headers) {
      return null;
    }

    // Look for authorization header (case-insensitive)
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'authorization') {
        return value as string;
      }
    }

    return null;
  }

  /**
   * Parse bearer token from authorization header
   */
  private parseBearerToken(authHeader: string): string | null {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
  }

  /**
   * Validate token binding
   */
  private async validateTokenBinding(_request: CallToolRequest, token: string): Promise<boolean> {
    if (!this.config.tokenBindingType) {
      return true;
    }

    // Extract binding value based on type
    let bindingValue: string | null = null;

    switch (this.config.tokenBindingType) {
      case TokenBindingType.TLS_CLIENT_CERT:
        // Extract client certificate thumbprint
        bindingValue = (_request as any)._meta?.tlsClientCertThumbprint;
        break;

      case TokenBindingType.DPoP: {
        // Extract DPoP proof
        const dpopHeader = this.extractDPoPHeader(_request);
        if (dpopHeader) {
          // Validate DPoP proof and extract thumbprint
          // This is simplified - implement full DPoP validation
          bindingValue = 'dpop-thumbprint';
        }
        break;
      }

      case TokenBindingType.MTLS:
        // Extract mTLS certificate
        bindingValue = (_request as any)._meta?.mtlsCertThumbprint;
        break;
    }

    if (!bindingValue) {
      logger.warn('Token binding value not found', { type: this.config.tokenBindingType });
      return false;
    }

    // Validate binding
    return await this.tokenValidator.validateTokenBinding(
      token,
      this.config.tokenBindingType,
      bindingValue,
    );
  }

  /**
   * Extract DPoP header
   */
  private extractDPoPHeader(_request: CallToolRequest): string | null {
    const headers =
      (_request as any).headers ||
      (_request as any)._meta?.headers ||
      (_request.params as any)._headers;

    if (!headers) {
      return null;
    }

    // Look for DPoP header
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'dpop') {
        return value as string;
      }
    }

    return null;
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimits(now: number): void {
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now >= entry.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  /**
   * Create authentication error
   */
  private createAuthError(message: string): McpError {
    return new McpError(ErrorCode.InvalidRequest, message, { code: 'AUTHENTICATION_REQUIRED' });
  }

  /**
   * Create rate limit error
   */
  private createRateLimitError(message: string, retryAfter: number): McpError {
    return new McpError(ErrorCode.InvalidRequest, message, {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    });
  }

  /**
   * Get auth _context from _request
   */
  static getAuthContext(_request: CallToolRequest): AuthContext | null {
    return (_request as any)._authContext || null;
  }
}

/**
 * Create OAuth-protected MCP server configuration
 * @deprecated Use API key authentication via TokenManager. Will be removed in v2.0.0.
 */
export function createOAuthProtectedServer(
  baseConfig: any,
  oauthConfig: OAuthMiddlewareConfig,
  cache?: ICache,
): any {
  const middleware = new OAuthMiddleware(oauthConfig, cache);

  // Wrap all tool handlers
  if (baseConfig.tools) {
    for (const [toolName, tool] of Object.entries(baseConfig.tools)) {
      if (typeof (tool as any).handler === 'function') {
        (tool as any).handler = middleware.wrapHandler((tool as any).handler, toolName);
      }
    }
  }

  return baseConfig;
}
