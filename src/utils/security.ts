/**
 * Security utilities for MCP server
 * Implements rate limiting, message validation, and security headers
 */

import { createHash } from 'crypto';
import { logger } from './logger';

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up old entries every minute with proper cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', { 
        identifier, 
        requests: validRequests.length,
        limit: this.maxRequests 
      });
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Destroy rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.requests.clear();
  }
}

/**
 * Message validator for MCP protocol
 */
export class MessageValidator {
  private static readonly MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly REQUIRED_FIELDS = ['jsonrpc', 'method'];
  
  /**
   * Validate incoming MCP message
   */
  static validate(message: unknown): { valid: boolean; error?: string } {
    // Check if message is an object
    if (!message || typeof message !== 'object') {
      return { valid: false, error: 'Message must be an object' };
    }

    const msg = message as Record<string, unknown>;

    // Check message size (rough estimate)
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.MAX_MESSAGE_SIZE) {
      return { 
        valid: false, 
        error: `Message size ${messageSize} exceeds maximum ${this.MAX_MESSAGE_SIZE}` 
      };
    }

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!(field in msg)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    // Validate jsonrpc version
    if (msg['jsonrpc'] !== '2.0') {
      return { valid: false, error: 'Invalid jsonrpc version, must be "2.0"' };
    }

    // Validate method is a string
    if (typeof msg['method'] !== 'string' || msg['method'].length === 0) {
      return { valid: false, error: 'Method must be a non-empty string' };
    }

    // Validate ID if present
    if ('id' in msg && typeof msg['id'] !== 'string' && typeof msg['id'] !== 'number' && msg['id'] !== null) {
      return { valid: false, error: 'ID must be string, number, or null' };
    }

    // Validate params if present
    if ('params' in msg && msg['params'] !== null && typeof msg['params'] !== 'object') {
      return { valid: false, error: 'Params must be an object or null' };
    }

    return { valid: true };
  }

  /**
   * Sanitize parameters to prevent injection attacks
   */
  static sanitizeParams(params: unknown): unknown {
    if (!params || typeof params !== 'object') {
      return params;
    }

    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(params));
    
    // Remove any potentially dangerous fields
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    const removeDangerous = (obj: any): any => {
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        if (!dangerousKeys.includes(key)) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            cleaned[key] = removeDangerous(obj[key]);
          } else {
            cleaned[key] = obj[key];
          }
        }
      }
      return cleaned;
    };

    return removeDangerous(sanitized);
  }
}

/**
 * CORS configuration for HTTP transports
 */
export interface CorsConfig {
  origin: string | string[] | ((origin: string) => boolean);
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export const defaultCorsConfig: CorsConfig = {
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Generate security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
  };
}

/**
 * Create request identifier for rate limiting
 */
export function createRequestIdentifier(request: any): string {
  // Use a combination of IP and user agent for identification
  const ip = request.ip || request.connection?.remoteAddress || 'unknown';
  const userAgent = request.headers?.['user-agent'] || 'unknown';
  
  return createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex');
}

/**
 * Graceful shutdown handler
 */
export class GracefulShutdown {
  private shutdownCallbacks: Array<() => Promise<void>> = [];
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds

  /**
   * Register a cleanup callback
   */
  register(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Initialize shutdown handlers
   */
  initialize(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }
      
      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      const shutdownPromise = this.executeShutdown();
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          logger.error('Graceful shutdown timeout, forcing exit');
          resolve();
        }, this.shutdownTimeout);
      });

      await Promise.race([shutdownPromise, timeoutPromise]);
      
      logger.info('Shutdown complete');
      process.exit(0);
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart
  }

  /**
   * Execute all shutdown callbacks
   */
  private async executeShutdown(): Promise<void> {
    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        logger.error('Error during shutdown callback', { error });
      }
    }
  }
}

// Export singleton instances
export const rateLimiter = new RateLimiter(
  parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'),
  parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100')
);

export const gracefulShutdown = new GracefulShutdown();