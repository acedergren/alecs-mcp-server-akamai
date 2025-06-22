/**
 * HTTP Transport Security Test Suite
 * Validates security features of the HTTP transport layer
 */

import { createServer } from 'http';
import { HttpServerTransport } from '@/transport/http-transport';
import { TokenManager } from '@/auth/TokenManager';
import axios from 'axios';

// Mock modules
jest.mock('@/utils/logger');
jest.mock('@/auth/TokenManager');

describe('HTTP Transport Security', () => {
  let transport: HttpServerTransport;
  let mockTokenManager: jest.Mocked<TokenManager>;
  const port = 3001;
  const baseURL = `http://localhost:${port}`;
  
  beforeEach(async () => {
    // Mock TokenManager
    mockTokenManager = {
      validateToken: jest.fn(),
      generateToken: jest.fn(),
    } as any;
    (TokenManager.getInstance as jest.Mock).mockReturnValue(mockTokenManager);
    
    // Create transport with test config
    transport = new HttpServerTransport({
      port,
      host: 'localhost',
      timeout: 5000,
      auth: { enabled: true },
      cors: {
        enabled: true,
        origin: 'http://localhost:3000',
        credentials: true,
      },
    });
  });
  
  afterEach(async () => {
    await transport.close();
    jest.clearAllMocks();
  });
  
  describe('Authentication', () => {
    it('should reject requests without authorization', async () => {
      // Start server (mock connect method)
      const server = jest.fn() as any;
      await transport.connect(server);
      
      try {
        await axios.post(`${baseURL}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'test',
          params: {},
          id: 1,
        });
        fail('Should have thrown 401 error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.headers['www-authenticate']).toBe('Bearer realm="ALECS MCP Server"');
      }
    });
    
    it('should accept requests with valid token', async () => {
      mockTokenManager.validateToken.mockResolvedValue({
        valid: true,
        tokenId: 'tok_123',
      });
      
      const server = jest.fn() as any;
      await transport.connect(server);
      
      try {
        await axios.post(
          `${baseURL}/jsonrpc`,
          {
            jsonrpc: '2.0',
            method: 'test',
            params: {},
            id: 1,
          },
          {
            headers: {
              Authorization: 'Bearer valid-token-123',
            },
          }
        );
      } catch (error: any) {
        // Will fail with 404 since we don't have actual MCP server
        // But should not be 401
        expect(error.response.status).not.toBe(401);
      }
    });
  });
  
  describe('Rate Limiting', () => {
    it('should enforce rate limits per token', async () => {
      mockTokenManager.validateToken.mockResolvedValue({
        valid: true,
        tokenId: 'tok_123',
      });
      
      const server = jest.fn() as any;
      await transport.connect(server);
      
      // Make 101 requests rapidly (exceeds 100/min limit)
      const requests = [];
      for (let i = 0; i < 101; i++) {
        requests.push(
          axios.post(
            `${baseURL}/jsonrpc`,
            { jsonrpc: '2.0', method: 'test', params: {}, id: i },
            { headers: { Authorization: 'Bearer test-token' } }
          ).catch(e => e.response)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.headers['x-ratelimit-limit']).toBeDefined();
      expect(lastResponse.headers['x-ratelimit-remaining']).toBeDefined();
      expect(lastResponse.headers['retry-after']).toBeDefined();
    });
  });
  
  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const server = jest.fn() as any;
      await transport.connect(server);
      
      try {
        await axios.post(`${baseURL}/jsonrpc`, {});
      } catch (error: any) {
        const headers = error.response.headers;
        
        // Check security headers
        expect(headers['strict-transport-security']).toBeDefined();
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['x-xss-protection']).toBe('1; mode=block');
        expect(headers['referrer-policy']).toBeDefined();
        expect(headers['content-security-policy']).toBeDefined();
      }
    });
    
    it('should include MCP protocol version header', async () => {
      const server = jest.fn() as any;
      await transport.connect(server);
      
      try {
        await axios.post(`${baseURL}/jsonrpc`, {});
      } catch (error: any) {
        expect(error.response.headers['mcp-protocol-version']).toBe('2025-06-18');
      }
    });
  });
  
  describe('CORS Support', () => {
    it('should handle CORS preflight requests', async () => {
      const server = jest.fn() as any;
      await transport.connect(server);
      
      const response = await axios.options(`${baseURL}/jsonrpc`, {
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });
      
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
    
    it('should reject CORS requests from unauthorized origins', async () => {
      const server = jest.fn() as any;
      await transport.connect(server);
      
      try {
        await axios.post(
          `${baseURL}/jsonrpc`,
          {},
          {
            headers: {
              Origin: 'http://evil.com',
            },
          }
        );
      } catch (error: any) {
        // Should not have CORS headers for unauthorized origin
        expect(error.response.headers['access-control-allow-origin']).toBeUndefined();
      }
    });
  });
  
  describe('Security Event Monitoring', () => {
    it('should track security events', async () => {
      const server = jest.fn() as any;
      await transport.connect(server);
      
      // Make some failed auth attempts
      for (let i = 0; i < 3; i++) {
        try {
          await axios.post(`${baseURL}/jsonrpc`, {});
        } catch (e) {
          // Expected
        }
      }
      
      // Get security events
      const events = transport.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'AUTH_FAILURE')).toBe(true);
    });
  });
  
  describe('Request Validation', () => {
    it('should only accept POST requests', async () => {
      const server = jest.fn() as any;
      await transport.connect(server);
      
      try {
        await axios.get(`${baseURL}/jsonrpc`);
        fail('Should have rejected GET request');
      } catch (error: any) {
        expect(error.response.status).toBe(405);
        expect(error.response.headers['allow']).toBe('POST');
      }
    });
    
    it('should only accept /jsonrpc or / paths', async () => {
      mockTokenManager.validateToken.mockResolvedValue({
        valid: true,
        tokenId: 'tok_123',
      });
      
      const server = jest.fn() as any;
      await transport.connect(server);
      
      try {
        await axios.post(
          `${baseURL}/invalid-path`,
          {},
          {
            headers: { Authorization: 'Bearer valid' },
          }
        );
        fail('Should have rejected invalid path');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });
});