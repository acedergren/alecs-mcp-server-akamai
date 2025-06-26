/**
 * WebSocket Server Transport for MCP
 * Enables remote access to ALECS server via WebSocket protocol
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HttpServer } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { readFileSync } from 'fs';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger';

export interface WebSocketServerTransportOptions {
  port: number;
  host?: string;
  ssl?: {
    cert: string;
    key: string;
  };
  path?: string;
}

export class WebSocketServerTransport implements Transport {
  private wss?: WebSocketServer;
  private httpServer?: HttpServer | HttpsServer;
  private clients: Set<WebSocket> = new Set();
  private messageQueue: Array<{ message: JSONRPCMessage; client: WebSocket }> = [];

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;

  constructor(private options: WebSocketServerTransportOptions) {
    this.sessionId = `ws-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

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

      // Create WebSocket server
      this.wss = new WebSocketServer({
        server: this.httpServer,
        path: this.options.path || '/',
      });

      // Handle WebSocket connections
      this.wss.on('connection', (ws: WebSocket, request) => {
        logger.info('WebSocket client connected', {
          remoteAddress: request.socket.remoteAddress,
          headers: request.headers,
        });

        this.clients.add(ws);

        // Handle incoming messages from this client
        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as JSONRPCMessage;
            logger.debug('Received WebSocket message', { message });

            // Store which client sent this message for response routing
            (ws as any)._lastRequestId = (message as any).id;

            if (this.onmessage) {
              this.onmessage(message);
            }
          } catch (error) {
            logger.error('Failed to parse WebSocket message', { error });
            if (this.onerror) {
              this.onerror(new Error(`Failed to parse message: ${error}`));
            }
          }
        });

        // Handle client disconnection
        ws.on('close', () => {
          logger.info('WebSocket client disconnected');
          this.clients.delete(ws);

          if (this.clients.size === 0 && this.onclose) {
            this.onclose();
          }
        });

        // Handle client errors
        ws.on('error', (error) => {
          logger.error('WebSocket client error', { error });
          if (this.onerror) {
            this.onerror(error);
          }
        });

        // Send any queued messages
        while (this.messageQueue.length > 0) {
          const queued = this.messageQueue.shift();
          if (queued && queued.client === ws) {
            ws.send(JSON.stringify(queued.message));
          }
        }
      });

      // Handle server errors
      this.wss.on('error', (error) => {
        logger.error('WebSocket server error', { error });
        if (this.onerror) {
          this.onerror(error);
        }
      });

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.options.port, this.options.host || '0.0.0.0', () => {
          logger.info('WebSocket server listening', {
            port: this.options.port,
            host: this.options.host || '0.0.0.0',
            ssl: !!this.options.ssl,
          });
          resolve();
        });

        this.httpServer!.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to start WebSocket server', { error });
      throw error;
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const messageStr = JSON.stringify(message);

    // If this is a response, try to route it to the correct client
    if ('id' in message && !('method' in message)) {
      // This is a response, find the client that made the request
      for (const client of this.clients) {
        if ((client as any)._lastRequestId === message.id) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
            return;
          }
        }
      }
    }

    // Otherwise, broadcast to all connected clients
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      } else {
        // Queue message for when client reconnects
        this.messageQueue.push({ message, client });
      }
    }
  }

  async close(): Promise<void> {
    logger.info('Closing WebSocket server');

    // Close all client connections
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          resolve();
        });
      });
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => {
          resolve();
        });
      });
    }

    if (this.onclose) {
      this.onclose();
    }
  }
}
