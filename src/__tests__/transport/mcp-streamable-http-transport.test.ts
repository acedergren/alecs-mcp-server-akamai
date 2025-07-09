/**
 * Tests for MCP Streamable HTTP Transport
 * 
 * Verifies that the streamable HTTP transport correctly implements
 * the MCP Transport interface and handles all required scenarios
 */

import { MCPStreamableHTTPTransport } from '../../transport/mcp-streamable-http-transport';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { EventSource } from 'eventsource';
import fetch from 'node-fetch';

// Mock express for testing
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn((port, host, callback) => {
      // Simulate server start
      if (callback) callback();
      return { on: jest.fn(), close: jest.fn() };
    })
  };
  return jest.fn(() => mockApp);
});

// Polyfill fetch for Node.js test environment
global.fetch = fetch as any;

describe('MCPStreamableHTTPTransport', () => {
  let transport: MCPStreamableHTTPTransport;
  let mockApp: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get mock app instance
    mockApp = express();
    
    // Create transport instance
    transport = new MCPStreamableHTTPTransport({
      port: 8080,
      host: 'localhost',
      path: '/mcp'
    });
  });

  afterEach(async () => {
    // Clean up transport
    if (transport) {
      await transport.close();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(transport).toBeDefined();
      expect(transport.sessionId).toBeDefined();
      expect(transport.setProtocolVersion).toBeDefined();
    });

    it('should set up middleware and routes', () => {
      expect(mockApp.use).toHaveBeenCalled();
      expect(mockApp.get).toHaveBeenCalledWith('/mcp/health', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/mcp/message', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/mcp/events', expect.any(Function));
    });
  });

  describe('Protocol Version', () => {
    it('should allow setting protocol version', () => {
      const version = '2025-06-18';
      transport.setProtocolVersion!(version);
      // Protocol version should be set internally
      expect(transport.setProtocolVersion).toBeDefined();
    });
  });

  describe('Start Method', () => {
    it('should start the HTTP server', async () => {
      await transport.start();
      
      expect(mockApp.listen).toHaveBeenCalledWith(
        8080,
        'localhost',
        expect.any(Function)
      );
    });

    it('should not start twice', async () => {
      await transport.start();
      await transport.start(); // Should not throw but log warning
      
      expect(mockApp.listen).toHaveBeenCalledTimes(1);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const healthHandler = mockApp.get.mock.calls.find(
        call => call[0] === '/mcp/health'
      )?.[1];

      expect(healthHandler).toBeDefined();

      const mockReq = {};
      const mockRes = {
        json: jest.fn()
      };

      healthHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'healthy',
        transport: 'streamable-http',
        sessionId: expect.any(String),
        protocolVersion: '2025-06-18',
        clients: 0,
        uptime: expect.any(Number)
      });
    });
  });

  describe('Message Handling', () => {
    it('should handle valid JSON-RPC messages', async () => {
      const messageHandler = mockApp.post.mock.calls.find(
        call => call[0] === '/mcp/message'
      )?.[1];

      expect(messageHandler).toBeDefined();

      const testMessage: JSONRPCMessage = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      };

      const mockReq = {
        body: testMessage,
        headers: { 'x-client-id': 'test-client' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Set up message handler
      let capturedMessage: JSONRPCMessage | undefined;
      transport.onmessage = (message) => {
        capturedMessage = message;
      };

      messageHandler(mockReq, mockRes);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        sessionId: expect.any(String),
        timestamp: expect.any(Number)
      });

      expect(capturedMessage).toEqual(testMessage);
    });

    it('should reject invalid JSON-RPC version', async () => {
      const messageHandler = mockApp.post.mock.calls.find(
        call => call[0] === '/mcp/message'
      )?.[1];

      const mockReq = {
        body: { jsonrpc: '1.0', method: 'test' },
        headers: {}
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      messageHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid JSON-RPC version',
        expected: '2.0',
        received: '1.0'
      });
    });
  });

  describe('SSE Connection', () => {
    it('should handle SSE client connections', () => {
      const sseHandler = mockApp.get.mock.calls.find(
        call => call[0] === '/mcp/events'
      )?.[1];

      expect(sseHandler).toBeDefined();

      const mockReq = {
        headers: { 'x-client-id': 'test-sse-client' },
        on: jest.fn()
      };
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        writableEnded: false
      };

      sseHandler(mockReq, mockRes);

      // Check SSE headers
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');

      // Check initial connection event
      expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('event: open'));
    });
  });

  describe('Send Method', () => {
    it('should broadcast messages to all SSE clients', async () => {
      // Set up a mock SSE client
      const sseHandler = mockApp.get.mock.calls.find(
        call => call[0] === '/mcp/events'
      )?.[1];

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        writableEnded: false
      };
      const mockReq = {
        headers: {},
        on: jest.fn()
      };

      sseHandler(mockReq, mockRes);

      // Send a message
      const testMessage: JSONRPCMessage = {
        jsonrpc: '2.0',
        result: { tools: [] },
        id: 1
      };

      await transport.send(testMessage);

      // Check that message was sent to client
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('event: response')
      );
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(testMessage))
      );
    });

    it('should handle resumption tokens', async () => {
      let capturedToken: string | undefined;
      
      await transport.send(
        { jsonrpc: '2.0', result: {}, id: 1 },
        { 
          onresumptiontoken: (token) => {
            capturedToken = token;
          }
        }
      );

      expect(capturedToken).toBeDefined();
      expect(capturedToken).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
    });
  });

  describe('Async Iterator', () => {
    it('should yield messages from the queue', async () => {
      const messageHandler = mockApp.post.mock.calls.find(
        call => call[0] === '/mcp/message'
      )?.[1];

      const testMessage: JSONRPCMessage = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1
      };

      // Start consuming messages
      const messages: JSONRPCMessage[] = [];
      const iterator = transport[Symbol.asyncIterator]();
      
      // Get first message (non-blocking with timeout)
      const messagePromise = iterator.next();

      // Send a message
      messageHandler(
        { body: testMessage, headers: {} },
        { status: jest.fn().mockReturnThis(), json: jest.fn() }
      );

      // Wait for message with timeout
      const result = await Promise.race([
        messagePromise,
        new Promise(resolve => setTimeout(() => resolve({ done: true }), 100))
      ]);

      if (!result.done) {
        messages.push(result.value);
      }

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(testMessage);
    });
  });

  describe('Close Method', () => {
    it('should gracefully close all connections', async () => {
      // Set up a mock SSE client
      const sseHandler = mockApp.get.mock.calls.find(
        call => call[0] === '/mcp/events'
      )?.[1];

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        writableEnded: false
      };
      const mockReq = {
        headers: {},
        on: jest.fn()
      };

      sseHandler(mockReq, mockRes);

      // Mock server close
      const mockServer = {
        close: jest.fn((callback) => callback())
      };
      (transport as any).server = mockServer;

      // Close transport
      await transport.close();

      // Check that SSE client was notified
      expect(mockRes.write).toHaveBeenCalledWith('event: close\n');
      expect(mockRes.end).toHaveBeenCalled();

      // Check that server was closed
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should call onclose handler', async () => {
      const onCloseMock = jest.fn();
      transport.onclose = onCloseMock;

      const mockServer = {
        close: jest.fn((callback) => callback())
      };
      (transport as any).server = mockServer;

      await transport.close();

      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in message processing', () => {
      const messageHandler = mockApp.post.mock.calls.find(
        call => call[0] === '/mcp/message'
      )?.[1];

      const onErrorMock = jest.fn();
      transport.onerror = onErrorMock;

      // Simulate error by passing invalid data
      const mockReq = {
        body: null, // This will cause an error
        headers: {}
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      messageHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: expect.any(String)
      });
    });
  });

  describe('CORS Support', () => {
    it('should handle CORS headers', () => {
      const corsMiddleware = mockApp.use.mock.calls[1]?.[0];
      expect(corsMiddleware).toBeDefined();

      const mockReq = { method: 'OPTIONS' };
      const mockRes = {
        header: jest.fn(),
        sendStatus: jest.fn()
      };
      const mockNext = jest.fn();

      corsMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      expect(mockRes.sendStatus).toHaveBeenCalledWith(204);
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should send heartbeats to connected clients', async () => {
      jest.useFakeTimers();

      // Create transport with short heartbeat interval
      const testTransport = new MCPStreamableHTTPTransport({
        port: 8081,
        heartbeatInterval: 1000 // 1 second for testing
      });

      await testTransport.start();

      // Set up a mock SSE client
      const sseHandler = mockApp.get.mock.calls.find(
        call => call[0] === '/mcp/events'
      )?.[1];

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        writableEnded: false
      };
      const mockReq = {
        headers: {},
        on: jest.fn()
      };

      sseHandler(mockReq, mockRes);

      // Fast forward time
      jest.advanceTimersByTime(1100);

      // Check that heartbeat was sent
      expect(mockRes.write).toHaveBeenCalledWith(':heartbeat\n\n');

      await testTransport.close();
      jest.useRealTimers();
    });
  });
});