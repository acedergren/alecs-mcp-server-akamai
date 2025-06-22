/**
 * Authentication Middleware for ALECS Remote Access
 * Integrates token validation with security controls
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
        tokenId: validationResult.tokenId,
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
    const normalizedPath = path.split('?')[0].toLowerCase();
    
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
    const event = {
      type: SecurityEventType.AUTH_SUCCESS,
      timestamp: new Date(),
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      tokenId,
      details: {
        path: req.url,
        method: req.method,
      },
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
    const event = {
      type: SecurityEventType.AUTH_FAILURE,
      timestamp: new Date(),
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      details: {
        reason,
        path: req.url,
        method: req.method,
        tokenAttempt: tokenAttempt ? this.hashToken(tokenAttempt) : undefined,
      },
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
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return typeof realIp === 'string' ? realIp : realIp[0];
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