/**
 * Authentication Middleware for ALECS Remote MCP Hosting
 * Enterprise token validation and multi-customer authentication system
 * 
 * REMOTE MCP HOSTING AUTHENTICATION ARCHITECTURE:
 * This middleware enables secure multi-customer hosted MCP services by providing:
 * 
 * MULTI-TENANT AUTHENTICATION FEATURES:
 * - API key-based customer identification and isolation
 * - Token-scoped access control (customers can only access their own resources)
 * - Customer context extraction from authentication tokens
 * - Audit logging for compliance and security monitoring
 * - Rate limiting integration per authenticated customer
 * 
 * ENTERPRISE HOSTING SECURITY:
 * - Bearer token validation with customer context binding
 * - Public path exemptions for health checks and documentation
 * - Security event logging for failed authentication attempts
 * - IP-based tracking for suspicious activity detection
 * - Token hash logging (secure, auditable, non-reversible)
 * 
 * HOSTED MCP INTEGRATION POINTS:
 * - Works with TokenManager for customer-specific API key management
 * - Integrates with SecurityMiddleware for comprehensive protection
 * - Supports multiple authentication schemes (OAuth, API keys, JWT)
 * - Enables customer-scoped tool access and data isolation
 * 
 * PRODUCTION DEPLOYMENT FEATURES:
 * - Configurable authentication bypass for development environments
 * - Detailed authentication metrics and monitoring
 * - Support for multiple customer authentication providers
 * - Circuit breaker compatibility for authentication service failures
 * 
 * USE CASES FOR HOSTED REMOTE MCP:
 * - Multi-customer SaaS platforms offering Akamai integration
 * - Enterprise service providers with multiple customer contracts
 * - Managed service providers offering Akamai-as-a-Service
 * - Cloud marketplaces with pay-per-use Akamai access
 */

import { IncomingMessage, ServerResponse } from 'http';
import { TokenManager } from '../auth/TokenManager';
import { SecurityMiddleware, SecurityEventType } from './security';
import { logger } from '../utils/logger';

/**
 * Authentication result
 */
export interface AuthenticationResult {
  authenticated: boolean;
  tokenId?: string;
  error?: string;
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  /** Enable authentication (can be disabled for development) */
  enabled: boolean;
  /** Paths that don't require authentication */
  publicPaths?: string[];
  /** Enable detailed auth logging */
  verbose?: boolean;
}

/**
 * Authentication middleware class
 */
export class AuthenticationMiddleware {
  private tokenManager: TokenManager;
  private securityMiddleware: SecurityMiddleware;
  
  constructor(
    private config: AuthenticationConfig = { enabled: true },
    securityMiddleware?: SecurityMiddleware
  ) {
    this.tokenManager = TokenManager.getInstance();
    this.securityMiddleware = securityMiddleware || new SecurityMiddleware();
  }

  /**
   * Main authentication handler
   */
  async authenticate(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<AuthenticationResult> {
    try {
      // Apply security headers first
      this.securityMiddleware.applySecurityHeaders(req, res);
      
      // Apply rate limiting
      const rateLimitOk = await this.securityMiddleware.applyRateLimit(req, res);
      if (!rateLimitOk) {
        return { authenticated: false, error: 'Rate limit exceeded' };
      }
      
      // Check if authentication is enabled
      if (!this.config.enabled) {
        logger.warn('Authentication disabled - allowing request');
        return { authenticated: true };
      }
      
      // Check if path is public
      if (this.isPublicPath(req.url || '')) {
        return { authenticated: true };
      }
      
      // Extract authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        this.logAuthFailure(req, 'No authorization header');
        return { authenticated: false, error: 'No authorization header' };
      }
      
      // Validate Bearer token format
      if (!authHeader.startsWith('Bearer ')) {
        this.logAuthFailure(req, 'Invalid authorization format');
        return { authenticated: false, error: 'Invalid authorization format' };
      }
      
      // Extract and validate token
      const token = authHeader.substring(7);
      const validationResult = await this.tokenManager.validateToken(token);
      
      if (!validationResult.valid) {
        this.logAuthFailure(req, validationResult.error || 'Invalid token', token);
        return { 
          authenticated: false, 
          error: validationResult.error || 'Invalid token' 
        };
      }
      
      // Authentication successful
      this.logAuthSuccess(req, validationResult.tokenId!);
      
      return {
        authenticated: true,
        ...(validationResult.tokenId && { tokenId: validationResult.tokenId }),
      };
    } catch (error) {
      logger.error('Authentication error', { error });
      this.logAuthFailure(req, 'Internal authentication error');
      return { 
        authenticated: false, 
        error: 'Authentication failed' 
      };
    }
  }

  /**
   * Handle authentication response
   */
  handleAuthResponse(
    res: ServerResponse,
    result: AuthenticationResult
  ): boolean {
    if (!result.authenticated) {
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="ALECS MCP Server"',
      });
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: result.error || 'Authentication required',
      }));
      return false;
    }
    return true;
  }

  /**
   * Check if path is public
   */
  private isPublicPath(path: string): boolean {
    if (!this.config.publicPaths) {
      return false;
    }
    
    // Normalize path
    const normalizedPath = path.split('?')[0]?.toLowerCase() || '';
    
    return this.config.publicPaths.some(publicPath => {
      if (publicPath.endsWith('*')) {
        return normalizedPath.startsWith(publicPath.slice(0, -1));
      }
      return normalizedPath === publicPath;
    });
  }

  /**
   * Log authentication success
   */
  private logAuthSuccess(req: IncomingMessage, tokenId: string): void {
    const userAgent = req.headers['user-agent'];
    const event = {
      type: SecurityEventType.AUTH_SUCCESS,
      timestamp: new Date(),
      ip: this.getClientIp(req),
      tokenId,
      details: {
        path: req.url,
        method: req.method,
      },
      ...(userAgent && { userAgent }),
    };
    
    this.securityMiddleware.logSecurityEvent(event);
    
    if (this.config.verbose) {
      logger.info('Authentication successful', {
        tokenId,
        ip: event.ip,
        path: req.url,
      });
    }
  }

  /**
   * Log authentication failure
   */
  private logAuthFailure(
    req: IncomingMessage, 
    reason: string,
    tokenAttempt?: string
  ): void {
    const userAgent = req.headers['user-agent'];
    const event = {
      type: SecurityEventType.AUTH_FAILURE,
      timestamp: new Date(),
      ip: this.getClientIp(req),
      details: {
        reason,
        path: req.url,
        method: req.method,
        tokenAttempt: tokenAttempt ? this.hashToken(tokenAttempt) : undefined,
      },
      ...(userAgent && { userAgent }),
    };
    
    this.securityMiddleware.logSecurityEvent(event);
    
    logger.warn('Authentication failed', {
      reason,
      ip: event.ip,
      path: req.url,
    });
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const forwardedValue = typeof forwarded === 'string' ? forwarded : forwarded[0];
      return forwardedValue?.split(',')[0]?.trim() || 'unknown';
    }
    
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      const realIpValue = typeof realIp === 'string' ? realIp : realIp[0];
      return realIpValue || 'unknown';
    }
    
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Hash token for logging (security)
   */
  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 8);
  }

  /**
   * Get security middleware instance
   */
  getSecurityMiddleware(): SecurityMiddleware {
    return this.securityMiddleware;
  }
}

/**
 * Factory function to create authentication middleware
 */
export function createAuthenticationMiddleware(
  config?: Partial<AuthenticationConfig>,
  securityMiddleware?: SecurityMiddleware
): AuthenticationMiddleware {
  return new AuthenticationMiddleware(
    config ? { enabled: true, ...config } : undefined,
    securityMiddleware
  );
}