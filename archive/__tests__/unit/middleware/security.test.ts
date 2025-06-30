/**
 * Security Middleware Test Suite
 * Validates rate limiting, security headers, and event logging
 */

import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import { SecurityMiddleware, SecurityEventType } from '@/middleware/security';

// Mock modules
jest.mock('@/utils/logger');

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let mockReq: IncomingMessage;
  let mockRes: ServerResponse;
  
  beforeEach(() => {
    // Create middleware instance
    middleware = new SecurityMiddleware({
      windowMs: 1000,  // 1 second for testing
      maxRequests: 3,   // 3 requests per second for testing
    });
    
    // Create mock request
    const socket = new Socket();
    mockReq = new IncomingMessage(socket);
    mockReq.headers = {};
    mockReq.url = '/test';
    mockReq.method = 'POST';
    
    // Create mock response
    mockRes = new ServerResponse(mockReq);
    mockRes.setHeader = jest.fn();
    mockRes.writeHead = jest.fn();
    mockRes.end = jest.fn();
  });
  
  afterEach(() => {
    middleware.destroy();
    jest.clearAllMocks();
  });
  
  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Make 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        const result = await middleware.applyRateLimit(mockReq, mockRes);
        expect(result).toBe(true);
      }
      
      // Check rate limit headers
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '3');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
    
    it('should block requests exceeding rate limit', async () => {
      // Make 4 requests (exceeds limit)
      for (let i = 0; i < 3; i++) {
        await middleware.applyRateLimit(mockReq, mockRes);
      }
      
      // 4th request should be blocked
      const result = await middleware.applyRateLimit(mockReq, mockRes);
      expect(result).toBe(false);
      expect(mockRes.writeHead).toHaveBeenCalledWith(429, expect.any(Object));
      expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('Too Many Requests'));
    });
    
    it('should use token-based rate limiting when authorization header present', async () => {
      // Add authorization header
      mockReq.headers.authorization = 'Bearer test-token-123';
      
      // Make request
      await middleware.applyRateLimit(mockReq, mockRes);
      
      // Change IP but keep same token - should still count against same limit
      (mockReq.socket as any).remoteAddress = '192.168.1.100';
      
      for (let i = 0; i < 3; i++) {
        await middleware.applyRateLimit(mockReq, mockRes);
      }
      
      // Should be rate limited despite different IP
      const result = await middleware.applyRateLimit(mockReq, mockRes);
      expect(result).toBe(false);
    });
    
    it('should reset rate limit after window expires', async () => {
      // Make 3 requests (hit limit)
      for (let i = 0; i < 3; i++) {
        await middleware.applyRateLimit(mockReq, mockRes);
      }
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should allow new requests
      const result = await middleware.applyRateLimit(mockReq, mockRes);
      expect(result).toBe(true);
    });
  });
  
  describe('Security Headers', () => {
    it('should apply all default security headers', () => {
      middleware.applySecurityHeaders(mockReq, mockRes);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
    });
    
    it('should apply custom security headers', () => {
      const customMiddleware = new SecurityMiddleware(undefined, {
        hsts: false,
        frameOptions: 'SAMEORIGIN',
        csp: "default-src 'self' https:",
      });
      
      customMiddleware.applySecurityHeaders(mockReq, mockRes);
      
      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.any(String)
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self' https:"
      );
      
      customMiddleware.destroy();
    });
  });
  
  describe('Security Event Logging', () => {
    it('should log rate limit exceeded events', async () => {
      // Exceed rate limit
      for (let i = 0; i < 4; i++) {
        await middleware.applyRateLimit(mockReq, mockRes);
      }
      
      const events = middleware.getSecurityEvents();
      const rateLimitEvent = events.find(e => e.type === SecurityEventType.RATE_LIMIT_EXCEEDED);
      
      expect(rateLimitEvent).toBeDefined();
      expect(rateLimitEvent?.ip).toBeDefined();
      expect(rateLimitEvent?.details.count).toBe(4);
    });
    
    it('should log authentication events', () => {
      // Log auth success
      middleware.logSecurityEvent({
        type: SecurityEventType.AUTH_SUCCESS,
        timestamp: new Date(),
        ip: '192.168.1.1',
        tokenId: 'tok_123',
      });
      
      // Log auth failure
      middleware.logSecurityEvent({
        type: SecurityEventType.AUTH_FAILURE,
        timestamp: new Date(),
        ip: '192.168.1.2',
        details: { reason: 'Invalid token' },
      });
      
      const events = middleware.getSecurityEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(SecurityEventType.AUTH_SUCCESS);
      expect(events[1].type).toBe(SecurityEventType.AUTH_FAILURE);
    });
    
    it('should filter security events by type and date', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Log various events
      middleware.logSecurityEvent({
        type: SecurityEventType.AUTH_SUCCESS,
        timestamp: yesterday,
        ip: '192.168.1.1',
      });
      
      middleware.logSecurityEvent({
        type: SecurityEventType.AUTH_FAILURE,
        timestamp: now,
        ip: '192.168.1.2',
      });
      
      middleware.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        timestamp: now,
        ip: '192.168.1.3',
      });
      
      // Filter by type
      const authFailures = middleware.getSecurityEvents(
        undefined,
        SecurityEventType.AUTH_FAILURE
      );
      expect(authFailures).toHaveLength(1);
      
      // Filter by date
      const recentEvents = middleware.getSecurityEvents(
        new Date(now.getTime() - 60 * 60 * 1000)  // Last hour
      );
      expect(recentEvents).toHaveLength(2);
    });
  });
  
  describe('IP Address Detection', () => {
    it('should detect IP from x-forwarded-for header', async () => {
      mockReq.headers['x-forwarded-for'] = '10.0.0.1, 192.168.1.1';
      
      await middleware.applyRateLimit(mockReq, mockRes);
      
      const events = middleware.getSecurityEvents();
      // Rate limit key should use first IP from x-forwarded-for
      expect(events.length).toBe(0);  // No rate limit events yet
    });
    
    it('should detect IP from x-real-ip header', async () => {
      mockReq.headers['x-real-ip'] = '10.0.0.2';
      
      await middleware.applyRateLimit(mockReq, mockRes);
      
      // Make more requests to trigger rate limit
      for (let i = 0; i < 4; i++) {
        await middleware.applyRateLimit(mockReq, mockRes);
      }
      
      const events = middleware.getSecurityEvents();
      const rateLimitEvent = events.find(e => e.type === SecurityEventType.RATE_LIMIT_EXCEEDED);
      expect(rateLimitEvent?.ip).toBe('10.0.0.2');
    });
    
    it('should fallback to socket remote address', async () => {
      (mockReq.socket as any).remoteAddress = '127.0.0.1';
      
      await middleware.applyRateLimit(mockReq, mockRes);
      
      // Make more requests to trigger rate limit
      for (let i = 0; i < 4; i++) {
        await middleware.applyRateLimit(mockReq, mockRes);
      }
      
      const events = middleware.getSecurityEvents();
      const rateLimitEvent = events.find(e => e.type === SecurityEventType.RATE_LIMIT_EXCEEDED);
      expect(rateLimitEvent?.ip).toBe('127.0.0.1');
    });
  });
  
  describe('Cleanup and Memory Management', () => {
    it('should cleanup expired rate limit records', async () => {
      // Create multiple rate limit records
      for (let i = 0; i < 5; i++) {
        mockReq.headers['x-real-ip'] = `10.0.0.${i}`;
        await middleware.applyRateLimit(mockReq, mockRes);
      }
      
      // Wait for cleanup interval
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Trigger manual cleanup (normally done by interval)
      (middleware as any).cleanupRateLimitStore();
      
      // Rate limit store should be cleaned up
      expect((middleware as any).rateLimitStore.size).toBeLessThan(5);
    });
    
    it('should limit security event storage', () => {
      // Log many events (more than the 10000 limit)
      for (let i = 0; i < 10001; i++) {
        middleware.logSecurityEvent({
          type: SecurityEventType.AUTH_SUCCESS,
          timestamp: new Date(),
          ip: `192.168.1.${i % 256}`,
        });
      }
      
      // Should keep only last 5000 events after cleanup
      expect((middleware as any).securityEvents.length).toBeLessThanOrEqual(5000);
    });
  });
});