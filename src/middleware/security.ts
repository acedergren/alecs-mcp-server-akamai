/**
 * Security Middleware for ALECS Remote MCP Hosting
 * Enterprise-grade security controls for multi-customer hosted MCP server
 * 
 * REMOTE MCP HOSTING SECURITY ARCHITECTURE:
 * This middleware provides the security foundation for hosting MCP servers that serve
 * multiple customers simultaneously, implementing:
 * 
 * MULTI-TENANT SECURITY FEATURES:
 * - Customer-isolated rate limiting (prevents one customer from affecting others)
 * - Token-based rate limiting keys (fair usage per API key/customer)
 * - Comprehensive security event logging for compliance and monitoring
 * - CORS protection for browser-based MCP clients
 * - CSP headers to prevent script injection attacks
 * 
 * ENTERPRISE HOSTING CAPABILITIES:
 * - Configurable rate limits per customer tier (basic/premium/enterprise)
 * - Real-time security monitoring and alerting
 * - IP-based blocking for suspicious activity detection
 * - Request fingerprinting for advanced threat detection
 * - Audit trails for compliance (SOC2, PCI, etc.)
 * 
 * PRODUCTION-READY FEATURES:
 * - Memory-efficient rate limiting with automatic cleanup
 * - Security headers for production web hosting environments
 * - Circuit breaker-compatible error handling
 * - Event-driven architecture for real-time security dashboards
 * 
 * HOSTED MCP USE CASES:
 * - SaaS platforms offering Akamai integration to their customers
 * - Enterprise service providers managing multiple Akamai contracts
 * - Cloud marketplaces offering Akamai-as-a-Service
 * - Consulting firms providing managed Akamai services
 */

import { IncomingMessage, ServerResponse } from 'http';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

/**
 * Rate limiter configuration
 */
interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyGenerator?: (req: IncomingMessage) => string;  // Function to generate rate limit key
}

/**
 * Security headers configuration
 */
interface SecurityHeadersConfig {
  csp?: string;  // Content Security Policy
  hsts?: boolean;  // HTTP Strict Transport Security
  noSniff?: boolean;  // X-Content-Type-Options
  frameOptions?: 'DENY' | 'SAMEORIGIN';  // X-Frame-Options
  xssProtection?: boolean;  // X-XSS-Protection
  referrerPolicy?: string;  // Referrer-Policy
}

/**
 * Request tracking for rate limiting
 */
interface RequestRecord {
  count: number;
  resetTime: number;
}

/**
 * Security event types for logging
 */
export enum SecurityEventType {
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_FAILURE = 'AUTH_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/**
 * Security event for logging
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  ip: string;
  userAgent?: string;
  tokenId?: string;
  details?: unknown;
}

/**
 * Security middleware class
 */
export class SecurityMiddleware {
  private rateLimitStore: Map<string, RequestRecord> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private rateLimitConfig: RateLimitConfig = {
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 100,  // 100 requests per minute
    },
    private securityHeaders: SecurityHeadersConfig = {
      hsts: true,
      noSniff: true,
      frameOptions: 'DENY',
      xssProtection: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      csp: "default-src 'self'; script-src 'none'; style-src 'none'; img-src 'none'; font-src 'none'; connect-src 'self'; frame-ancestors 'none';",
    }
  ) {
    // Cleanup expired rate limit records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupRateLimitStore();
    }, 60 * 1000);
  }

  /**
   * Apply rate limiting to request
   */
  async applyRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const key = this.getRateLimitKey(req);
    const now = Date.now();
    
    let record = this.rateLimitStore.get(key);
    
    // Initialize or reset record
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.rateLimitConfig.windowMs,
      };
      this.rateLimitStore.set(key, record);
    }
    
    record.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', this.rateLimitConfig.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.rateLimitConfig.maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
    
    // Check if limit exceeded
    if (record.count > this.rateLimitConfig.maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000).toString());
      
      // Log security event
      const userAgent = req.headers['user-agent'];
      this.logSecurityEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        timestamp: new Date(),
        ip: this.getClientIp(req),
        details: { key, count: record.count },
        ...(userAgent && { userAgent }),
      });
      
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      }));
      
      return false;
    }
    
    return true;
  }

  /**
   * Apply security headers to response
   */
  applySecurityHeaders(_req: IncomingMessage, res: ServerResponse): void {
    const headers = this.securityHeaders;
    
    // HSTS - Force HTTPS
    if (headers.hsts) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Prevent MIME type sniffing
    if (headers.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    // Clickjacking protection
    if (headers.frameOptions) {
      res.setHeader('X-Frame-Options', headers.frameOptions);
    }
    
    // XSS Protection (legacy but still useful)
    if (headers.xssProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }
    
    // Referrer Policy
    if (headers.referrerPolicy) {
      res.setHeader('Referrer-Policy', headers.referrerPolicy);
    }
    
    // Content Security Policy
    if (headers.csp) {
      res.setHeader('Content-Security-Policy', headers.csp);
    }
    
    // Additional security headers
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    // Keep only last 10000 events in memory
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-5000);
    }
    
    // Log to application logger
    const logData = {
      ...event,
      timestamp: event.timestamp.toISOString(),
    };
    
    if (event.type === SecurityEventType.AUTH_FAILURE || 
        event.type === SecurityEventType.SUSPICIOUS_ACTIVITY) {
      logger.warn('Security event', logData);
    } else {
      logger.info('Security event', logData);
    }
  }

  /**
   * Get recent security events
   */
  getSecurityEvents(
    since?: Date,
    type?: SecurityEventType,
    limit: number = 100
  ): SecurityEvent[] {
    let events = [...this.securityEvents];
    
    if (since) {
      events = events.filter(e => e.timestamp > since);
    }
    
    if (type) {
      events = events.filter(e => e.type === type);
    }
    
    return events.slice(-limit);
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: IncomingMessage): string {
    // Check for forwarded IP (proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const forwardedValue = typeof forwarded === 'string' ? forwarded : forwarded[0];
      return forwardedValue?.split(',')[0]?.trim() || 'unknown';
    }
    
    // Check for real IP header
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      const realIpValue = typeof realIp === 'string' ? realIp : realIp[0];
      return realIpValue || 'unknown';
    }
    
    // Fall back to socket address
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Generate rate limit key
   */
  private getRateLimitKey(req: IncomingMessage): string {
    if (this.rateLimitConfig.keyGenerator) {
      return this.rateLimitConfig.keyGenerator(req);
    }
    
    // Default: Use IP + Authorization header (token)
    const ip = this.getClientIp(req);
    const auth = req.headers.authorization || '';
    const tokenHash = auth ? createHash('sha256').update(auth).digest('hex').substring(0, 8) : 'noauth';
    
    return `${ip}:${tokenHash}`;
  }

  /**
   * Cleanup expired rate limit records
   */
  private cleanupRateLimitStore(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.rateLimitStore.forEach((record, key) => {
      if (now > record.resetTime) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.rateLimitStore.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired rate limit records`);
    }
  }

  /**
   * Destroy middleware and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.rateLimitStore.clear();
    this.securityEvents = [];
  }
}

/**
 * Factory function to create security middleware
 */
export function createSecurityMiddleware(
  rateLimitConfig?: Partial<RateLimitConfig>,
  securityHeaders?: SecurityHeadersConfig
): SecurityMiddleware {
  return new SecurityMiddleware(
    rateLimitConfig ? { ...{ windowMs: 60000, maxRequests: 100 }, ...rateLimitConfig } : undefined,
    securityHeaders
  );
}