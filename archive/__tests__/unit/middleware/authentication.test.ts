/**
 * Authentication Middleware Test Suite
 * Validates token authentication and integration with security middleware
 */

import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import { AuthenticationMiddleware } from '@/middleware/authentication';
import { SecurityMiddleware, SecurityEventType } from '@/middleware/security';
import { TokenManager } from '@/auth/TokenManager';

// Mock modules
jest.mock('@/utils/logger');
jest.mock('@/auth/TokenManager');

describe('AuthenticationMiddleware', () => {
  let authMiddleware: AuthenticationMiddleware;
  let securityMiddleware: SecurityMiddleware;
  let mockReq: IncomingMessage;
  let mockRes: ServerResponse;
  let mockTokenManager: jest.Mocked<TokenManager>;
  
  beforeEach(() => {
    // Mock TokenManager
    mockTokenManager = {
      validateToken: jest.fn(),
    } as any;
    (TokenManager.getInstance as jest.Mock).mockReturnValue(mockTokenManager);
    
    // Create security middleware
    securityMiddleware = new SecurityMiddleware({
      windowMs: 60000,
      maxRequests: 100,
    });
    
    // Create auth middleware
    authMiddleware = new AuthenticationMiddleware(
      { enabled: true },
      securityMiddleware
    );
    
    // Create mock request
    const socket = new Socket();
    mockReq = new IncomingMessage(socket);
    mockReq.headers = {};
    mockReq.url = '/jsonrpc';
    mockReq.method = 'POST';
    (mockReq.socket as any).remoteAddress = '127.0.0.1';
    
    // Create mock response
    mockRes = new ServerResponse(mockReq);
    mockRes.setHeader = jest.fn();
    mockRes.writeHead = jest.fn();
    mockRes.end = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    securityMiddleware.destroy();
  });
  
  describe('Basic Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('No authorization header');
    });
    
    it('should reject requests with invalid authorization format', async () => {
      mockReq.headers.authorization = 'Basic dGVzdDp0ZXN0';  // Basic auth instead of Bearer
      
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Invalid authorization format');
    });
    
    it('should accept valid Bearer token', async () => {
      mockReq.headers.authorization = 'Bearer valid-token-123';
      mockTokenManager.validateToken.mockResolvedValue({
        valid: true,
        tokenId: 'tok_123',
      });
      
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      
      expect(result.authenticated).toBe(true);
      expect(result.tokenId).toBe('tok_123');
      expect(mockTokenManager.validateToken).toHaveBeenCalledWith('Bearer valid-token-123');
    });
    
    it('should reject invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockTokenManager.validateToken.mockResolvedValue({
        valid: false,
        error: 'Token not found',
      });
      
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Token not found');
    });
  });
  
  describe('Public Paths', () => {
    it('should allow access to public paths without authentication', async () => {
      authMiddleware = new AuthenticationMiddleware({
        enabled: true,
        publicPaths: ['/health', '/metrics', '/.well-known/*'],
      });
      
      // Test exact match
      mockReq.url = '/health';
      let result = await authMiddleware.authenticate(mockReq, mockRes);
      expect(result.authenticated).toBe(true);
      
      // Test wildcard match
      mockReq.url = '/.well-known/resource-metadata';
      result = await authMiddleware.authenticate(mockReq, mockRes);
      expect(result.authenticated).toBe(true);
      
      // Test non-public path
      mockReq.url = '/jsonrpc';
      result = await authMiddleware.authenticate(mockReq, mockRes);
      expect(result.authenticated).toBe(false);
    });
    
    it('should normalize paths for comparison', async () => {
      authMiddleware = new AuthenticationMiddleware({
        enabled: true,
        publicPaths: ['/health'],
      });
      
      // Path with query parameters
      mockReq.url = '/health?check=true';
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      expect(result.authenticated).toBe(true);
    });
  });
  
  describe('Security Integration', () => {
    it('should apply security headers', async () => {
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.any(String)
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
    });
    
    it('should apply rate limiting', async () => {
      mockReq.headers.authorization = 'Bearer test-token';
      
      // Make multiple requests
      for (let i = 0; i < 101; i++) {
        await authMiddleware.authenticate(mockReq, mockRes);
      }
      
      // Should be rate limited
      expect(mockRes.writeHead).toHaveBeenCalledWith(429, expect.any(Object));
    });
    
    it('should log security events', async () => {
      // Successful auth
      mockReq.headers.authorization = 'Bearer valid-token';
      mockTokenManager.validateToken.mockResolvedValue({
        valid: true,
        tokenId: 'tok_123',
      });
      
      await authMiddleware.authenticate(mockReq, mockRes);
      
      const events = securityMiddleware.getSecurityEvents();
      const authEvent = events.find(e => e.type === SecurityEventType.AUTH_SUCCESS);
      expect(authEvent).toBeDefined();
      expect(authEvent?.tokenId).toBe('tok_123');
      
      // Failed auth
      mockTokenManager.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });
      
      await authMiddleware.authenticate(mockReq, mockRes);
      
      const failEvent = events.find(e => e.type === SecurityEventType.AUTH_FAILURE);
      expect(failEvent).toBeDefined();
      expect(failEvent?.details.reason).toBe('Invalid token');
    });
  });
  
  describe('Response Handling', () => {
    it('should send 401 response for unauthenticated requests', () => {
      const result = { authenticated: false, error: 'Invalid token' };
      
      const handled = authMiddleware.handleAuthResponse(mockRes, result);
      
      expect(handled).toBe(false);
      expect(mockRes.writeHead).toHaveBeenCalledWith(401, expect.objectContaining({
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="ALECS MCP Server"',
      }));
      expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('Invalid token'));
    });
    
    it('should not modify response for authenticated requests', () => {
      const result = { authenticated: true, tokenId: 'tok_123' };
      
      const handled = authMiddleware.handleAuthResponse(mockRes, result);
      
      expect(handled).toBe(true);
      expect(mockRes.writeHead).not.toHaveBeenCalled();
      expect(mockRes.end).not.toHaveBeenCalled();
    });
  });
  
  describe('Configuration', () => {
    it('should allow disabling authentication', async () => {
      authMiddleware = new AuthenticationMiddleware({ enabled: false });
      
      // No auth header
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      
      expect(result.authenticated).toBe(true);
      expect(mockTokenManager.validateToken).not.toHaveBeenCalled();
    });
    
    it('should support verbose logging in development', async () => {
      authMiddleware = new AuthenticationMiddleware({
        enabled: true,
        verbose: true,
      });
      
      mockReq.headers.authorization = 'Bearer valid-token';
      mockTokenManager.validateToken.mockResolvedValue({
        valid: true,
        tokenId: 'tok_123',
      });
      
      await authMiddleware.authenticate(mockReq, mockRes);
      
      // In verbose mode, additional logging would occur
      // (verified through logger mock if needed)
    });
  });
  
  describe('Error Handling', () => {
    it('should handle token validation errors gracefully', async () => {
      mockReq.headers.authorization = 'Bearer error-token';
      mockTokenManager.validateToken.mockRejectedValue(new Error('Database error'));
      
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
    
    it('should handle malformed requests', async () => {
      mockReq.headers.authorization = 'Bearer ';  // Empty token
      
      const result = await authMiddleware.authenticate(mockReq, mockRes);
      
      expect(result.authenticated).toBe(false);
      expect(mockTokenManager.validateToken).toHaveBeenCalledWith('Bearer ');
    });
  });
  
  describe('IP Address Tracking', () => {
    it('should track IP from x-forwarded-for header', async () => {
      mockReq.headers['x-forwarded-for'] = '10.0.0.1, 192.168.1.1';
      mockReq.headers.authorization = 'Bearer invalid';
      mockTokenManager.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid',
      });
      
      await authMiddleware.authenticate(mockReq, mockRes);
      
      const events = securityMiddleware.getSecurityEvents();
      const authEvent = events.find(e => e.type === SecurityEventType.AUTH_FAILURE);
      expect(authEvent?.ip).toBe('10.0.0.1');
    });
    
    it('should track IP from x-real-ip header', async () => {
      mockReq.headers['x-real-ip'] = '10.0.0.2';
      mockReq.headers.authorization = 'Bearer invalid';
      mockTokenManager.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid',
      });
      
      await authMiddleware.authenticate(mockReq, mockRes);
      
      const events = securityMiddleware.getSecurityEvents();
      const authEvent = events.find(e => e.type === SecurityEventType.AUTH_FAILURE);
      expect(authEvent?.ip).toBe('10.0.0.2');
    });
  });
});