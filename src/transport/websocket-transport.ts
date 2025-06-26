/**
 * WebSocket Transport for MCP
 * Production-ready implementation with proper session management,
 * authentication, and error handling
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HttpServer } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { readFileSync } from 'fs';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCRequest, JSONRPCResponse } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger';
import { validateApiToken } from '../auth/TokenManager';
import { SmartCache } from '../utils/smart-cache';

/**
 * WebSocket session information
 */
interface WebSocketSession {
  id: string;
  client: WebSocket;
  authenticated: boolean;
  tokenId?: string;
  lastActivity: Date;
  lastPing?: Date;
  pendingRequests: Map<string, {
    request: JSONRPCRequest;
    timestamp: Date;
  }>;
  messageCount: number;
  rateLimitWindow: Date;
}

/**
 * WebSocket transport options
 */
export interface WebSocketServerTransportOptions {
  port: number;
  host?: string;
  ssl?: {
    cert: string;
    key: string;
  };
  path?: string;
  auth?: {
    required: boolean;
    tokenHeader?: string;
  };
  limits?: {
    maxMessageSize?: number;
    maxMessagesPerMinute?: number;
    maxPendingRequests?: number;
    requestTimeout?: number;
  };
  heartbeat?: {
    interval?: number;
    timeout?: number;
  };
}

/**
 * Production-ready WebSocket transport
 */
export class WebSocketServerTransport implements Transport {
  private wss?: WebSocketServer;
  private httpServer?: HttpServer | HttpsServer;
  private sessions: Map<string, WebSocketSession> = new Map();
  private messageHandlers: Map<string, (message: JSONRPCMessage) => void> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  
  // Rate limiting cache
  private rateLimitCache = new SmartCache<number>({
    maxSize: 10000,
    ttl: 60000, // 1 minute windows
  });
  
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;
  
  private readonly options: Required<WebSocketServerTransportOptions>;
  
  constructor(options: WebSocketServerTransportOptions) {
    this.options = {
      port: options.port,
      host: options.host || '0.0.0.0',
      ssl: options.ssl,
      path: options.path || '/mcp',
      auth: {
        required: options.auth?.required ?? true,
        tokenHeader: options.auth?.tokenHeader || 'sec-websocket-protocol',
      },
      limits: {
        maxMessageSize: options.limits?.maxMessageSize || 1024 * 1024, // 1MB
        maxMessagesPerMinute: options.limits?.maxMessagesPerMinute || 100,
        maxPendingRequests: options.limits?.maxPendingRequests || 50,
        requestTimeout: options.limits?.requestTimeout || 30000, // 30s
      },
      heartbeat: {
        interval: options.heartbeat?.interval || 30000, // 30s
        timeout: options.heartbeat?.timeout || 60000, // 60s
      },
    };
    
    this.sessionId = `ws-server-${Date.now()}`;
  }
  
  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    try {
      // Create HTTP/HTTPS server
      if (this.options.ssl) {
        this.httpServer = createHttpsServer({
          cert: readFileSync(this.options.ssl.cert),
          key: readFileSync(this.options.ssl.key),
        });
      } else {
        this.httpServer = createServer();
      }
      
      // Create WebSocket server with authentication
      this.wss = new WebSocketServer({
        server: this.httpServer,
        path: this.options.path,
        verifyClient: this.options.auth.required ? 
          this.verifyClient.bind(this) : undefined,
      });
      
      // Set up connection handler
      this.wss.on('connection', this.handleConnection.bind(this));
      
      // Set up error handler
      this.wss.on('error', (error) => {
        logger.error('WebSocket server error', { error });
        this.onerror?.(error);
      });
      
      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.options.port, this.options.host, () => {
          logger.info('WebSocket server listening', {
            port: this.options.port,
            host: this.options.host,
            ssl: !!this.options.ssl,
            path: this.options.path,
          });
          resolve();
        });
        
        this.httpServer!.on('error', reject);
      });
      
      // Start heartbeat monitoring
      this.startHeartbeat();
      
      // Start cleanup interval
      this.startCleanup();
      
    } catch (error) {
      logger.error('Failed to start WebSocket server', { error });
      throw error;
    }
  }
  
  /**
   * Verify client during handshake
   */
  private async verifyClient(
    info: { origin: string; secure: boolean; req: any },
    callback: (res: boolean, code?: number, message?: string) => void
  ): Promise<void> {
    try {
      // Extract token from protocol header or authorization
      const token = info.req.headers[this.options.auth.tokenHeader] ||
                   info.req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        callback(false, 401, 'Unauthorized');
        return;
      }
      
      // Validate token
      const tokenInfo = await validateApiToken(token);
      if (!tokenInfo) {
        callback(false, 401, 'Invalid token');
        return;
      }
      
      // Store token info for session
      info.req.tokenInfo = tokenInfo;
      callback(true);
      
    } catch (error) {
      logger.error('Client verification failed', { error });
      callback(false, 500, 'Internal error');
    }
  }
  
  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const sessionId = `ws-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Create session
    const session: WebSocketSession = {
      id: sessionId,
      client: ws,
      authenticated: !!request.tokenInfo,
      tokenId: request.tokenInfo?.id,
      lastActivity: new Date(),
      pendingRequests: new Map(),
      messageCount: 0,
      rateLimitWindow: new Date(),
    };
    
    this.sessions.set(sessionId, session);
    
    logger.info('WebSocket client connected', {
      sessionId,
      authenticated: session.authenticated,
      remoteAddress: request.socket.remoteAddress,
    });
    
    // Set up message handler
    ws.on('message', (data: Buffer) => {
      this.handleMessage(session, data);
    });
    
    // Set up close handler
    ws.on('close', () => {
      this.handleDisconnect(session);
    });
    
    // Set up error handler
    ws.on('error', (error) => {
      logger.error('WebSocket client error', { sessionId, error });
      this.handleDisconnect(session);
    });
    
    // Set up ping/pong
    ws.on('pong', () => {
      session.lastPing = new Date();
    });
  }
  
  /**
   * Handle incoming message from client
   */
  private async handleMessage(session: WebSocketSession, data: Buffer): Promise<void> {
    try {
      // Check message size
      if (data.length > this.options.limits.maxMessageSize) {
        this.sendError(session, null, -32600, 'Message too large');
        return;
      }
      
      // Rate limiting
      if (!this.checkRateLimit(session)) {
        this.sendError(session, null, -32029, 'Rate limit exceeded');
        return;
      }
      
      // Parse message
      const message = JSON.parse(data.toString()) as JSONRPCMessage;
      
      // Update activity
      session.lastActivity = new Date();
      
      // Handle request
      if ('method' in message) {
        await this.handleRequest(session, message as JSONRPCRequest);
      } else {
        // This is a response - should not happen from client
        logger.warn('Received response from client', { sessionId: session.id });
      }
      
    } catch (error) {
      logger.error('Failed to handle message', { sessionId: session.id, error });
      this.sendError(session, null, -32700, 'Parse error');
    }
  }
  
  /**
   * Handle JSON-RPC request
   */
  private async handleRequest(session: WebSocketSession, request: JSONRPCRequest): Promise<void> {
    // Check pending requests limit
    if (session.pendingRequests.size >= this.options.limits.maxPendingRequests) {
      this.sendError(session, request.id, -32000, 'Too many pending requests');
      return;
    }
    
    // Store pending request
    session.pendingRequests.set(String(request.id), {
      request,
      timestamp: new Date(),
    });
    
    // Forward to MCP handler
    if (this.onmessage) {
      this.onmessage(request);
    }
  }
  
  /**
   * Send message to specific client
   */
  async send(message: JSONRPCMessage): Promise<void> {
    // If this is a response, route to correct client
    if ('id' in message && !('method' in message)) {
      const response = message as JSONRPCResponse;
      
      // Find the session that made this request
      for (const [sessionId, session] of this.sessions) {
        if (session.pendingRequests.has(String(response.id))) {
          // Remove from pending
          session.pendingRequests.delete(String(response.id));
          
          // Send to client
          if (session.client.readyState === WebSocket.OPEN) {
            session.client.send(JSON.stringify(message));
          }
          return;
        }
      }
      
      logger.warn('No client found for response', { id: response.id });
      
    } else {
      // This is a notification - broadcast to all authenticated clients
      const messageStr = JSON.stringify(message);
      
      for (const session of this.sessions.values()) {
        if (session.authenticated && session.client.readyState === WebSocket.OPEN) {
          session.client.send(messageStr);
        }
      }
    }
  }
  
  /**
   * Check rate limit for session
   */
  private checkRateLimit(session: WebSocketSession): boolean {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // 1 minute ago
    
    // Reset window if needed
    if (session.rateLimitWindow < windowStart) {
      session.messageCount = 0;
      session.rateLimitWindow = now;
    }
    
    // Check limit
    session.messageCount++;
    return session.messageCount <= this.options.limits.maxMessagesPerMinute;
  }
  
  /**
   * Send error to client
   */
  private sendError(
    session: WebSocketSession, 
    id: any, 
    code: number, 
    message: string
  ): void {
    const error: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: id || null,
      error: { code, message },
    };
    
    if (session.client.readyState === WebSocket.OPEN) {
      session.client.send(JSON.stringify(error));
    }
  }
  
  /**
   * Handle client disconnect
   */
  private handleDisconnect(session: WebSocketSession): void {
    logger.info('WebSocket client disconnected', { 
      sessionId: session.id,
      pendingRequests: session.pendingRequests.size,
    });
    
    // Clean up session
    this.sessions.delete(session.id);
    
    // Notify if no more clients
    if (this.sessions.size === 0) {
      this.onclose?.();
    }
  }
  
  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = new Date(now.getTime() - this.options.heartbeat.timeout);
      
      for (const [sessionId, session] of this.sessions) {
        // Check if client is alive
        if (session.lastActivity < timeout) {
          logger.warn('Client timeout, disconnecting', { sessionId });
          session.client.close();
          this.sessions.delete(sessionId);
        } else {
          // Send ping
          if (session.client.readyState === WebSocket.OPEN) {
            session.client.ping();
          }
        }
      }
    }, this.options.heartbeat.interval);
  }
  
  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const timeout = new Date(now.getTime() - this.options.limits.requestTimeout);
      
      // Clean up stale pending requests
      for (const session of this.sessions.values()) {
        for (const [id, pending] of session.pendingRequests) {
          if (pending.timestamp < timeout) {
            logger.warn('Request timeout', { 
              sessionId: session.id, 
              requestId: id 
            });
            session.pendingRequests.delete(id);
            
            // Send timeout error
            this.sendError(session, id, -32000, 'Request timeout');
          }
        }
      }
      
      // Clean up rate limit cache
      this.rateLimitCache.prune();
      
    }, 10000); // Every 10 seconds
  }
  
  /**
   * Close the transport
   */
  async close(): Promise<void> {
    logger.info('Closing WebSocket server');
    
    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Close all sessions
    for (const session of this.sessions.values()) {
      session.client.close(1000, 'Server shutting down');
    }
    this.sessions.clear();
    
    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
    }
    
    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
    }
    
    this.onclose?.();
  }
}