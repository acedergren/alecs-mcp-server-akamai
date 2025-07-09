/**
 * MCP-Compliant Streamable HTTP Transport
 * 
 * Implements the official MCP Transport interface for HTTP-based communication
 * Following the MCP specification for streamable HTTP transport:
 * - HTTP POST for client-to-server messages
 * - Server-Sent Events (SSE) for server-to-client streaming
 * 
 * This transport is CDN-friendly and supports resumable connections
 */

import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { 
  JSONRPCMessage, 
  MessageExtraInfo as MCPMessageExtraInfo
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

interface StreamableHTTPOptions {
  port: number;
  host?: string;
  path?: string;
  corsOrigin?: string;
  maxMessageSize?: number;
  heartbeatInterval?: number;
}

interface SSEClient {
  id: string;
  response: express.Response;
  lastActivity: number;
  sessionId: string;
}

// Use MCP's MessageExtraInfo type
type MessageExtraInfo = MCPMessageExtraInfo;

// Import proper types from MCP SDK
import type { TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';

export class MCPStreamableHTTPTransport implements Transport {
  private app: express.Application;
  private server?: any;
  private sseClients = new Map<string, SSEClient>();
  private messageQueue: JSONRPCMessage[] = [];
  private messageEmitter = new EventEmitter();
  private started = false;
  private heartbeatTimer?: NodeJS.Timeout;
  
  // Required MCP Transport properties
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  sessionId?: string;
  setProtocolVersion?: (version: string) => void;
  
  private protocolVersion = '2025-06-18';

  constructor(private options: StreamableHTTPOptions) {
    this.app = express();
    this.sessionId = randomUUID();
    this.setupMiddleware();
    this.setupRoutes();
    
    // Handle protocol version setting
    this.setProtocolVersion = (version: string) => {
      this.protocolVersion = version;
      logger.info(`Streamable HTTP transport protocol version set to: ${version}`);
    };
  }

  private setupMiddleware(): void {
    // JSON body parser with size limit
    this.app.use(express.json({ 
      limit: this.options.maxMessageSize || '10mb' 
    }));
    
    // CORS configuration for CDN compatibility
    this.app.use((req, res, next) => {
      const origin = this.options.corsOrigin || '*';
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-ID, X-Session-ID, X-Resumption-Token');
      res.header('Access-Control-Expose-Headers', 'X-Session-ID, X-Resumption-Token');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });
    
    // Request logging
    this.app.use((req, _res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        headers: req.headers,
        transport: 'streamable-http'
      });
      next();
    });
  }

  private setupRoutes(): void {
    const basePath = this.options.path || '';
    
    // Health check endpoint
    this.app.get(`${basePath}/health`, (_req, res) => {
      res.json({
        status: 'healthy',
        transport: 'streamable-http',
        sessionId: this.sessionId,
        protocolVersion: this.protocolVersion,
        clients: this.sseClients.size,
        uptime: process.uptime()
      });
    });
    
    // HTTP POST endpoint for client-to-server messages
    this.app.post(`${basePath}/message`, (req, res) => {
      try {
        const message = req.body as JSONRPCMessage;
        const clientId = req.headers['x-client-id'] as string || 'anonymous';
        
        // Validate JSON-RPC message
        if (!message.jsonrpc || message.jsonrpc !== '2.0') {
          res.status(400).json({
            error: 'Invalid JSON-RPC version',
            expected: '2.0',
            received: message.jsonrpc
          });
          return;
        }
        
        // Add to message queue for async iteration
        this.messageQueue.push(message);
        this.messageEmitter.emit('message');
        
        // Call handler with extra info
        if (this.onmessage) {
          // Create MCP-compliant extra info
          const extra: MessageExtraInfo = {
            // MCP SDK doesn't have specific fields, it's extensible
          };
          
          // Don't await - process asynchronously
          setImmediate(() => {
            this.onmessage!(message, extra);
          });
        }
        
        // Send response with session info
        res.json({
          success: true,
          sessionId: this.sessionId,
          timestamp: Date.now()
        });
        
        logger.debug('Received message via HTTP POST', {
          clientId,
          method: 'method' in message ? message.method : 'response',
          id: this.getMessageId(message)
        });
      } catch (error) {
        logger.error('Error processing message', { error });
        this.onerror?.(error as Error);
        res.status(500).json({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // SSE endpoint for server-to-client streaming
    this.app.get(`${basePath}/events`, (req, res) => {
      const clientId = req.headers['x-client-id'] as string || randomUUID();
      const sessionId = req.headers['x-session-id'] as string || this.sessionId || '';
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
      res.setHeader('X-Session-ID', this.sessionId!);
      
      // CDN-friendly headers
      res.setHeader('Access-Control-Allow-Origin', this.options.corsOrigin || '*');
      res.setHeader('Access-Control-Expose-Headers', 'X-Session-ID');
      
      // Store client connection
      const client: SSEClient = {
        id: clientId,
        response: res,
        lastActivity: Date.now(),
        sessionId
      };
      this.sseClients.set(clientId, client);
      
      logger.info('SSE client connected', {
        clientId,
        sessionId,
        totalClients: this.sseClients.size
      });
      
      // Send initial connection event
      res.write(`event: open\n`);
      res.write(`data: ${JSON.stringify({
        sessionId: this.sessionId,
        protocolVersion: this.protocolVersion,
        clientId
      })}\n\n`);
      
      // Note: Express doesn't have a flush method by default
      
      // Handle client disconnect
      req.on('close', () => {
        this.sseClients.delete(clientId);
        logger.info('SSE client disconnected', {
          clientId,
          remainingClients: this.sseClients.size
        });
      });
      
      // Handle errors
      req.on('error', (error) => {
        logger.error('SSE connection error', { clientId, error });
        this.sseClients.delete(clientId);
      });
    });
  }

  async start(): Promise<void> {
    if (this.started) {
      logger.warn('Transport already started');
      return;
    }
    
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(
        this.options.port,
        this.options.host || 'localhost',
        () => {
          this.started = true;
          const address = this.server.address();
          logger.info('MCP Streamable HTTP transport started', {
            address,
            sessionId: this.sessionId,
            protocolVersion: this.protocolVersion
          });
          
          // Start heartbeat
          this.startHeartbeat();
          
          resolve();
        }
      );
      
      this.server.on('error', (error: Error) => {
        logger.error('Server error', { error });
        this.onerror?.(error);
        reject(error);
      });
    });
  }

  private startHeartbeat(): void {
    const interval = this.options.heartbeatInterval || 30000; // 30 seconds default
    
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const staleClients: string[] = [];
      
      // Send heartbeat to all clients
      for (const [clientId, client] of Array.from(this.sseClients)) {
        try {
          // Check if connection is still alive
          if (client.response.writableEnded) {
            staleClients.push(clientId);
            continue;
          }
          
          // Send heartbeat
          client.response.write(':heartbeat\n\n');
          client.lastActivity = now;
        } catch (error) {
          logger.debug('Failed to send heartbeat', { clientId, error });
          staleClients.push(clientId);
        }
      }
      
      // Clean up stale connections
      for (const clientId of staleClients) {
        this.sseClients.delete(clientId);
      }
      
      if (staleClients.length > 0) {
        logger.debug('Cleaned up stale SSE connections', {
          count: staleClients.length,
          remaining: this.sseClients.size
        });
      }
    }, interval);
  }

  async send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    // Ensure message has correct JSON-RPC version
    message.jsonrpc = '2.0';
    
    // Format SSE data
    const eventType = 'method' in message ? 'request' : 
                     'result' in message ? 'response' : 
                     'error' in message ? 'error' : 'notification';
    
    const sseData = `event: ${eventType}\n` +
                   `data: ${JSON.stringify(message)}\n` +
                   `id: ${this.getMessageId(message) || Date.now()}\n\n`;
    
    // Send to specific client or broadcast
    if (options?.relatedRequestId) {
      // Send to specific client
      const clientId = String(options.relatedRequestId);
      const client = this.sseClients.get(clientId);
      if (client && !client.response.writableEnded) {
        try {
          client.response.write(sseData);
          client.lastActivity = Date.now();
        } catch (error) {
          logger.error('Failed to send to specific client', {
            clientId: clientId,
            error
          });
          this.sseClients.delete(clientId);
        }
      }
    } else {
      // Broadcast to all clients
      let sent = 0;
      const failedClients: string[] = [];
      
      for (const [clientId, client] of Array.from(this.sseClients)) {
        try {
          if (!client.response.writableEnded) {
            client.response.write(sseData);
            client.lastActivity = Date.now();
            sent++;
          } else {
            failedClients.push(clientId);
          }
        } catch (error) {
          logger.debug('Failed to send to client', { clientId, error });
          failedClients.push(clientId);
        }
      }
      
      // Clean up failed clients
      for (const clientId of failedClients) {
        this.sseClients.delete(clientId);
      }
      
      logger.debug('Broadcast message to SSE clients', {
        sent,
        failed: failedClients.length,
        total: this.sseClients.size,
        messageType: eventType
      });
    }
    
    // Handle resumption token if requested
    if (options?.onresumptiontoken) {
      const token = Buffer.from(JSON.stringify({
        messageId: this.getMessageId(message),
        timestamp: Date.now(),
        sessionId: this.sessionId
      })).toString('base64');
      
      options.onresumptiontoken(token);
    }
  }

  async close(): Promise<void> {
    logger.info('Closing MCP Streamable HTTP transport');
    
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    // Close all SSE connections gracefully
    for (const [clientId, client] of Array.from(this.sseClients)) {
      try {
        client.response.write('event: close\n');
        client.response.write(`data: ${JSON.stringify({ 
          reason: 'Server shutting down' 
        })}\n\n`);
        client.response.end();
      } catch (error) {
        logger.debug('Error closing SSE connection', { clientId, error });
      }
    }
    this.sseClients.clear();
    
    // Close HTTP server
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.started = false;
          logger.info('MCP Streamable HTTP transport closed');
          this.onclose?.();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Async iterator for incoming messages (required by MCP Transport interface)
  async *[Symbol.asyncIterator](): AsyncIterator<JSONRPCMessage> {
    while (true) {
      // Wait for a message if queue is empty
      if (this.messageQueue.length === 0) {
        await new Promise<void>((resolve) => {
          this.messageEmitter.once('message', resolve);
        });
      }
      
      // Get next message from queue
      const message = this.messageQueue.shift();
      if (message) {
        yield message;
      }
    }
  }

  /**
   * Helper to get message ID from any JSONRPCMessage type
   */
  private getMessageId(message: JSONRPCMessage): string | number | null {
    if ('id' in message && message.id !== undefined) {
      return message.id;
    }
    return null;
  }
}