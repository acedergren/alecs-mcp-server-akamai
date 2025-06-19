/**
 * OAuth 2.1 Middleware for MCP Server
 * Provides authentication and authorization for MCP tool calls
 */

import type {
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import {
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { ValkeyCache } from '../services/valkey-cache-service';
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
 * Authentication context
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
 */
export class OAuthMiddleware {
  private config: OAuthMiddlewareConfig;
  private tokenValidator: TokenValidator;
  private complianceManager: OAuth21ComplianceManager;
  private cache?: ValkeyCache;
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();

  constructor(config: OAuthMiddlewareConfig, cache?: ValkeyCache) {
    this.config = config;
    this.cache = cache;

    // Initialize token validator
    this.tokenValidator = new TokenValidator(
      {
        introspectionEndpoint: config.tokenValidator.introspectionEndpoint,
        jwksUri: config.tokenValidator.jwksUri,
        clientId: config.tokenValidator.clientId,
        clientSecret: config.tokenValidator.clientSecret,
        ...(config.tokenValidator as any).algorithms && {
          allowedAlgorithms: (config.tokenValidator as any).algorithms
        },
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
   * Authenticate request
   */
  async authenticate(request: CallToolRequest): Promise<AuthContext | null> {
    // Skip authentication if disabled
    if (!this.config.enabled) {
      return null;
    }

    // Check if tool is public
    const toolName = request.params.name;
    if (this.config.publicTools.includes(toolName)) {
      logger.debug('Skipping authentication for public tool', { tool: toolName });
      return null;
    }

    // Extract authorization header
    const authHeader = this.extractAuthHeader(request);
    if (!authHeader) {
      throw this.createAuthError('Missing authorization header');
    }

    // Parse bearer token
    const token = this.parseBearerToken(authHeader);
    if (!token) {
      throw this.createAuthError('Invalid authorization header format');
    }

    // Validate token
    const validation = await this.tokenValidator.validateAccessToken(token);
    if (!validation.valid) {
      throw this.createAuthError(`Token validation failed: ${validation.error}`);
    }

    if (!validation.claims) {
      throw this.createAuthError('Token missing claims');
    }

    // Check token binding if required
    if (this.config.requireTokenBinding) {
      const bindingValid = await this.validateTokenBinding(request, token);
      if (!bindingValid) {
        throw this.createAuthError('Token binding validation failed');
      }
    }

    // Create auth context
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
   * Authorize request
   */
  async authorize(
    request: CallToolRequest,
    authContext: AuthContext | null,
  ): Promise<void> {
    // Skip authorization if authentication is disabled
    if (!this.config.enabled || !authContext) {
      return;
    }

    const toolName = request.params.name;

    // Get required scopes for tool
    const requiredScopes = this.config.toolScopes[toolName] || this.config.defaultScopes;

    if (requiredScopes.length === 0) {
      return; // No scopes required
    }

    // Check if user has required scopes
    const hasRequiredScopes = requiredScopes.every(scope =>
      authContext.scopes.includes(scope),
    );

    if (!hasRequiredScopes) {
      const missingScopes = requiredScopes.filter(scope =>
        !authContext.scopes.includes(scope),
      );

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
  wrapHandler<T extends (...args: any[]) => Promise<any>>(
    handler: T,
    toolName: string,
  ): T {
    return (async (...args: Parameters<T>) => {
      const request = args[0] as CallToolRequest;

      try {
        // Authenticate
        const authContext = await this.authenticate(request);

        // Apply rate limiting
        await this.applyRateLimit(authContext);

        // Authorize
        await this.authorize(request, authContext);

        // Add auth context to request
        if (authContext) {
          (request as any)._authContext = authContext;
        }

        // Call original handler
        return await handler(...args);
      } catch (error) {
        // Log authentication/authorization failures
        if (error instanceof McpError) {
          logger.warn('Authentication/authorization failed', {
            tool: toolName,
            error: error.message,
          });
        }
        throw error;
      }
    }) as T;
  }

  /**
   * Extract authorization header from request
   */
  private extractAuthHeader(request: CallToolRequest): string | null {
    // Check various possible locations for auth header
    const headers = (request as any).headers ||
                   (request as any)._meta?.headers ||
                   (request.params as any)._headers;

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
  private async validateTokenBinding(
    request: CallToolRequest,
    token: string,
  ): Promise<boolean> {
    if (!this.config.tokenBindingType) {
      return true;
    }

    // Extract binding value based on type
    let bindingValue: string | null = null;

    switch (this.config.tokenBindingType) {
      case TokenBindingType.TLS_CLIENT_CERT:
        // Extract client certificate thumbprint
        bindingValue = (request as any)._meta?.tlsClientCertThumbprint;
        break;

      case TokenBindingType.DPoP:
        // Extract DPoP proof
        const dpopHeader = this.extractDPoPHeader(request);
        if (dpopHeader) {
          // Validate DPoP proof and extract thumbprint
          // This is simplified - implement full DPoP validation
          bindingValue = 'dpop-thumbprint';
        }
        break;

      case TokenBindingType.MTLS:
        // Extract mTLS certificate
        bindingValue = (request as any)._meta?.mtlsCertThumbprint;
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
  private extractDPoPHeader(request: CallToolRequest): string | null {
    const headers = (request as any).headers ||
                   (request as any)._meta?.headers ||
                   (request.params as any)._headers;

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
    return new McpError(
      ErrorCode.InvalidRequest,
      message,
      { code: 'AUTHENTICATION_REQUIRED' },
    );
  }

  /**
   * Create rate limit error
   */
  private createRateLimitError(message: string, retryAfter: number): McpError {
    return new McpError(
      ErrorCode.InvalidRequest,
      message,
      {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      },
    );
  }

  /**
   * Get auth context from request
   */
  static getAuthContext(request: CallToolRequest): AuthContext | null {
    return (request as any)._authContext || null;
  }
}

/**
 * Create OAuth-protected MCP server configuration
 */
export function createOAuthProtectedServer(
  baseConfig: any,
  oauthConfig: OAuthMiddlewareConfig,
  cache?: ValkeyCache,
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
