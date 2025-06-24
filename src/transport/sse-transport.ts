/**
 * Server-Sent Events (SSE) Transport for MCP
 * Implements the Streamable HTTP transport from MCP spec 2025-03-26
 * 
 * This transport uses:
 * - POST /messages for client-to-server messages
 * - GET /sse for server-to-client event stream
 */

import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/shared/types.js';
import express, { Request, Response } from 'express';
import { EventEmitter } from 'events';
import { createServer, Server as HttpServer } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { readFileSync } from 'fs';
import { logger } from '@utils/logger';
import { validateApiToken } from '../utils/token-generator';

interface SSETransportOptions {
  port: number;
  host?: string;
  ssl?: {
    cert: string;
    key: string;
  };
  path?: string;
  authHandler?: (req: Request) => Promise<boolean>;
}

interface SSEClient {
  id: string;
  response: Response;
  lastActivity: number;
}

export class SSEServerTransport implements Transport {
  private app: express.Application;
  private server?: HttpServer | HttpsServer;
  private clients: Map<string, SSEClient> = new Map();
  private messageEmitter = new EventEmitter();
  private messageQueue: JSONRPCMessage[] = [];
  private options: SSETransportOptions;

  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(options: SSETransportOptions) {
    this.options = options;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // CORS headers for browser-based clients
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      next();
    });

    // Authentication middleware
    this.app.use(async (req, res, next) => {
      // Extract token from query params or Authorization header
      const token = this.extractToken(req);
      
      if (!this.authenticateConnection(token)) {
        logger.warn('SSE connection rejected - invalid token', {
          remoteAddress: req.ip,
          token: token ? 'present' : 'missing',
        });
        return res.status(401).json({ error: 'Authentication failed' });
      }
      
      // Call custom auth handler if provided
      if (this.options.authHandler) {
        const authorized = await this.options.authHandler(req);
        if (!authorized) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      }
      
      next();
    });

    const basePath = this.options.path || '';

    // POST /messages - Client to server messages
    this.app.post(`${basePath}/messages`, async (req, res) => {
      try {
        const message = req.body as JSONRPCMessage;
        const clientId = req.headers['x-client-id'] as string || 'default';
        
        logger.info('Received message via SSE transport', { 
          clientId, 
          method: 'method' in message ? message.method : 'response' 
        });

        // Process the message
        this.messageQueue.push(message);
        this.messageEmitter.emit('message');

        res.json({ success: true });
      } catch (error) {
        logger.error('Error processing message', { error });
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GET /sse - Server to client event stream
    this.app.get(`${basePath}/sse`, (req, res) => {
      const clientId = req.headers['x-client-id'] as string || `client-${Date.now()}`;
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

      // Store client
      const client: SSEClient = {
        id: clientId,
        response: res,
        lastActivity: Date.now()
      };
      this.clients.set(clientId, client);

      logger.info('SSE client connected', { clientId, totalClients: this.clients.size });

      // Send initial connection event
      res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (res.writableEnded) {
          clearInterval(heartbeat);
          return;
        }
        res.write(':heartbeat\n\n');
      }, 30000);

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(heartbeat);
        this.clients.delete(clientId);
        logger.info('SSE client disconnected', { 
          clientId, 
          remainingClients: this.clients.size 
        });
      });
    });

    // Health check endpoint
    this.app.get(`${basePath}/health`, (req, res) => {
      res.json({
        status: 'healthy',
        transport: 'sse',
        clients: this.clients.size,
        uptime: process.uptime()
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP or HTTPS server
        if (this.options.ssl) {
          const sslOptions = {
            cert: readFileSync(this.options.ssl.cert),
            key: readFileSync(this.options.ssl.key)
          };
          this.server = createHttpsServer(sslOptions, this.app);
        } else {
          this.server = createServer(this.app);
        }

        this.server.listen(
          this.options.port,
          this.options.host || '0.0.0.0',
          () => {
            logger.info('SSE transport server started', {
              port: this.options.port,
              host: this.options.host || '0.0.0.0',
              ssl: !!this.options.ssl,
              path: this.options.path || '/'
            });
            resolve();
          }
        );

        this.server.on('error', (error) => {
          logger.error('SSE server error', { error });
          this.onerror?.(error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    // Close all SSE connections
    for (const [clientId, client] of this.clients) {
      client.response.write(`event: shutdown\ndata: ${JSON.stringify({ message: 'Server shutting down' })}\n\n`);
      client.response.end();
    }
    this.clients.clear();

    // Close HTTP server
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('SSE transport server closed');
          this.onclose?.();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  send(message: JSONRPCMessage): Promise<void> {
    // Broadcast to all connected SSE clients
    const data = JSON.stringify(message);
    const sseMessage = `event: message\ndata: ${data}\n\n`;

    let sent = 0;
    for (const [clientId, client] of this.clients) {
      try {
        if (!client.response.writableEnded) {
          client.response.write(sseMessage);
          sent++;
        }
      } catch (error) {
        logger.error('Error sending to SSE client', { clientId, error });
        this.clients.delete(clientId);
      }
    }

    logger.debug('Sent message to SSE clients', { 
      clientsSent: sent, 
      totalClients: this.clients.size 
    });

    return Promise.resolve();
  }

  /**
   * Extract token from request (query params or Authorization header)
   */
  private extractToken(req: Request): string | null {
    // Try query parameter first
    const token = req.query.token as string;
    if (token) {return token;}
    
    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return null;
  }
  
  /**
   * Authenticate connection using token
   */
  private authenticateConnection(token: string | null): boolean {
    if (!token) {
      return false;
    }
    
    // Check against environment token (auto-generated)
    if (process.env.ALECS_API_TOKEN && token === process.env.ALECS_API_TOKEN) {
      return true;
    }
    
    // Validate token format
    return validateApiToken(token);
  }

  // Read messages from the queue
  *[Symbol.asyncIterator](): AsyncIterator<JSONRPCMessage> {
    return {
      next: async (): Promise<IteratorResult<JSONRPCMessage>> => {
        // Wait for a message if queue is empty
        if (this.messageQueue.length === 0) {
          await new Promise<void>((resolve) => {
            this.messageEmitter.once('message', resolve);
          });
        }

        const message = this.messageQueue.shift();
        if (message) {
          return { value: message, done: false };
        }

        // This shouldn't happen, but handle it
        return { done: true } as IteratorResult<JSONRPCMessage>;
      }
    };
  }
}

/**
 * Example usage:
 * 
 * const sseTransport = new SSEServerTransport({
 *   port: 3000,
 *   path: '/mcp',
 *   authHandler: async (req) => {
 *     const token = req.headers.authorization?.replace('Bearer ', '');
 *     return validateToken(token);
 *   }
 * });
 * 
 * await sseTransport.start();
 * 
 * // Connect to MCP server
 * await mcpServer.connect(sseTransport);
 */