/**
 * Reality Check Tests for Transport Implementation
 * 
 * These tests verify that the transport implementation actually works
 * with the real ALECS server components, not just in isolation
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import fetch from 'node-fetch';
import { WebSocket } from 'ws';
import { EventSource } from 'eventsource';

// Polyfill
global.fetch = fetch as any;

// Helper to wait for server to be ready
async function waitForServer(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not start after ${maxAttempts} attempts`);
}

// Helper to start server process
function startServer(env: NodeJS.ProcessEnv): ChildProcess {
  const serverPath = join(__dirname, '../../index.js');
  
  return spawn('node', [serverPath], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

describe('Transport Reality Check', () => {
  let serverProcess: ChildProcess | null = null;

  afterEach(async () => {
    // Kill server process
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      serverProcess = null;
    }
  });

  describe('Streamable HTTP Transport', () => {
    it('should work with real ALECS server', async () => {
      const port = 9000 + Math.floor(Math.random() * 1000);
      
      // Start server with streamable HTTP transport
      serverProcess = startServer({
        MCP_TRANSPORT: 'streamable-http',
        HTTP_PORT: port.toString(),
        HTTP_HOST: 'localhost',
        LOG_LEVEL: 'error' // Reduce noise in tests
      });

      // Capture server output for debugging
      let serverOutput = '';
      serverProcess.stderr?.on('data', (data) => {
        serverOutput += data.toString();
      });

      // Wait for server to start
      try {
        await waitForServer(`http://localhost:${port}/mcp/health`);
      } catch (error) {
        console.error('Server output:', serverOutput);
        throw error;
      }

      // Test health endpoint
      const healthResponse = await fetch(`http://localhost:${port}/mcp/health`);
      const health = await healthResponse.json();
      
      expect(health).toMatchObject({
        status: 'healthy',
        transport: 'streamable-http',
        sessionId: expect.any(String),
        protocolVersion: expect.any(String)
      });

      // Test listing tools (MCP protocol)
      const listResponse = await fetch(`http://localhost:${port}/mcp/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': 'reality-check-test'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1
        })
      });

      expect(listResponse.ok).toBe(true);
      const listResult = await listResponse.json();
      expect(listResult.success).toBe(true);

      // Test SSE connection
      const eventSource = new EventSource(`http://localhost:${port}/mcp/events`);
      
      const connectionPromise = new Promise<void>((resolve, reject) => {
        eventSource.addEventListener('open', () => resolve());
        eventSource.addEventListener('error', reject);
      });

      await connectionPromise;
      eventSource.close();

      // Test calling a real tool
      const toolResponse = await fetch(`http://localhost:${port}/mcp/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'property_list',
            arguments: { customer: 'testing' }
          },
          id: 2
        })
      });

      expect(toolResponse.ok).toBe(true);
    }, 30000); // Extended timeout for server startup

    it('should handle CORS correctly', async () => {
      const port = 9100 + Math.floor(Math.random() * 1000);
      
      serverProcess = startServer({
        MCP_TRANSPORT: 'streamable-http',
        HTTP_PORT: port.toString(),
        CORS_ENABLED: 'true',
        LOG_LEVEL: 'error'
      });

      await waitForServer(`http://localhost:${port}/mcp/health`);

      // Test CORS preflight
      const corsResponse = await fetch(`http://localhost:${port}/mcp/message`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://app.example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      expect(corsResponse.status).toBe(204);
      expect(corsResponse.headers.get('access-control-allow-origin')).toBe('*');
      expect(corsResponse.headers.get('access-control-allow-methods')).toContain('POST');
    }, 30000);
  });

  describe('WebSocket Transport', () => {
    it('should work with real ALECS server', async () => {
      const port = 9200 + Math.floor(Math.random() * 1000);
      
      serverProcess = startServer({
        MCP_TRANSPORT: 'websocket',
        MCP_WEBSOCKET_PORT: port.toString(),
        LOG_LEVEL: 'error'
      });

      // Wait a bit for WebSocket server to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Connect WebSocket
      const ws = new WebSocket(`ws://localhost:${port}/mcp`);
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

      // Test sending message
      const responsePromise = new Promise((resolve) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      }));

      const response = await responsePromise;
      expect(response).toBeDefined();

      ws.close();
    }, 30000);
  });

  describe('Transport Switching', () => {
    it('should respect MCP_TRANSPORT environment variable', async () => {
      // Test different transports sequentially
      const transports = [
        { type: 'streamable-http', port: 9300, healthUrl: '/mcp/health' },
        { type: 'websocket', port: 9301, healthUrl: null }
      ];

      for (const transport of transports) {
        if (serverProcess) {
          serverProcess.kill('SIGTERM');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const env: any = {
          MCP_TRANSPORT: transport.type,
          LOG_LEVEL: 'error'
        };

        if (transport.type === 'streamable-http') {
          env.HTTP_PORT = transport.port.toString();
        } else if (transport.type === 'websocket') {
          env.MCP_WEBSOCKET_PORT = transport.port.toString();
        }

        serverProcess = startServer(env);

        if (transport.healthUrl) {
          await waitForServer(`http://localhost:${transport.port}${transport.healthUrl}`);
          
          const response = await fetch(`http://localhost:${transport.port}${transport.healthUrl}`);
          const data = await response.json();
          expect(data.transport).toBe(transport.type);
        } else {
          // For WebSocket, just wait a bit
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }, 60000); // Extended timeout for multiple server starts
  });

  describe('Error Handling', () => {
    it('should handle invalid transport type gracefully', async () => {
      serverProcess = startServer({
        MCP_TRANSPORT: 'invalid-transport',
        LOG_LEVEL: 'error'
      });

      // Capture stderr
      let errorOutput = '';
      serverProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Wait for process to exit
      const exitCode = await new Promise<number>((resolve) => {
        serverProcess!.on('exit', (code) => resolve(code || 1));
      });

      expect(exitCode).not.toBe(0);
      expect(errorOutput).toContain('Unknown transport type');
    });

    it('should handle port conflicts gracefully', async () => {
      const port = 9400;
      
      // Start first server
      serverProcess = startServer({
        MCP_TRANSPORT: 'streamable-http',
        HTTP_PORT: port.toString(),
        LOG_LEVEL: 'error'
      });

      await waitForServer(`http://localhost:${port}/mcp/health`);

      // Try to start second server on same port
      const secondProcess = startServer({
        MCP_TRANSPORT: 'streamable-http',
        HTTP_PORT: port.toString(),
        LOG_LEVEL: 'error'
      });

      let errorOutput = '';
      secondProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        secondProcess.on('exit', (code) => resolve(code || 1));
      });

      expect(exitCode).not.toBe(0);
      expect(errorOutput.toLowerCase()).toMatch(/eaddrinuse|address already in use/);

      secondProcess.kill('SIGTERM');
    }, 30000);
  });

  describe('Production Readiness', () => {
    it('should handle high message volume', async () => {
      const port = 9500 + Math.floor(Math.random() * 100);
      
      serverProcess = startServer({
        MCP_TRANSPORT: 'streamable-http',
        HTTP_PORT: port.toString(),
        LOG_LEVEL: 'error'
      });

      await waitForServer(`http://localhost:${port}/mcp/health`);

      // Send multiple requests rapidly
      const requests = Array.from({ length: 50 }, (_, i) => 
        fetch(`http://localhost:${port}/mcp/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: i
          })
        })
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.ok).length;
      
      expect(successCount).toBe(50);
    }, 30000);

    it('should recover from client disconnections', async () => {
      const port = 9600 + Math.floor(Math.random() * 100);
      
      serverProcess = startServer({
        MCP_TRANSPORT: 'streamable-http',
        HTTP_PORT: port.toString(),
        LOG_LEVEL: 'error'
      });

      await waitForServer(`http://localhost:${port}/mcp/health`);

      // Create SSE connection and abruptly close it
      const eventSource = new EventSource(`http://localhost:${port}/mcp/events`);
      await new Promise(resolve => setTimeout(resolve, 100));
      eventSource.close();

      // Server should still be responsive
      const response = await fetch(`http://localhost:${port}/mcp/health`);
      expect(response.ok).toBe(true);
    }, 30000);
  });
});

// Configure Jest for longer timeouts on integration tests
jest.setTimeout(60000);