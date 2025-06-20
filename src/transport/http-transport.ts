/**
 * HTTP Transport implementation for MCP 2025-06-18 specification
 * Adds MCP-Protocol-Version header support
 */

import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import {
  JsonRpcRequest,
  JsonRpcResponse,
  createJsonRpcError,
  JsonRpcErrorCode,
  isJsonRpcRequest,
  isValidRequestId,
} from '../types/jsonrpc';

/**
 * MCP Protocol version for 2025-06-18 spec
 */
const MCP_PROTOCOL_VERSION = '2025-06-18';

/**
 * HTTP Server Transport configuration
 */
export interface HttpTransportConfig {
  /** Port to listen on */
  port?: number;
  /** Host to bind to */
  host?: string;
  /** Optional CORS configuration */
  cors?: {
    enabled: boolean;
    origin?: string | string[];
    credentials?: boolean;
  };
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * HTTP Server Transport for MCP
 * Implements the 2025-06-18 specification requirements
 */
export class HttpServerTransport {
  private httpServer: HttpServer | null = null;
  private server: Server | null = null;
  private config: Required<HttpTransportConfig>;

  constructor(config: HttpTransportConfig = {}) {
    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? 'localhost',
      cors: config.cors ?? { enabled: false },
      timeout: config.timeout ?? 30000,
    };
  }

  /**
   * Connect the transport to an MCP server
   */
  async connect(server: Server): Promise<void> {
    this.server = server;

    return new Promise((resolve, reject) => {
      this.httpServer = createServer(this.handleRequest.bind(this));

      this.httpServer.on('error', reject);

      this.httpServer.listen(this.config.port, this.config.host, () => {
        console.log(`MCP HTTP Server listening on http://${this.config.host}:${this.config.port}`);
        console.log(`MCP Protocol Version: ${MCP_PROTOCOL_VERSION}`);
        resolve();
      });
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(_req: IncomingMessage, _res: ServerResponse): Promise<void> {
    // Set MCP-Protocol-Version header on all responses
    _res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
    _res.setHeader('Content-Type', 'application/json');

    // Handle CORS if enabled
    if (this.config.cors.enabled) {
      this.setCorsHeaders(_req, _res);

      // Handle preflight requests
      if (_req.method === 'OPTIONS') {
        _res.writeHead(204);
        _res.end();
        return;
      }
    }

    // Only accept POST requests
    if (_req.method !== 'POST') {
      _res.writeHead(405, { Allow: 'POST' });
      _res.end(
        JSON.stringify(
          createJsonRpcError(null, JsonRpcErrorCode.InvalidRequest, 'Only POST method is allowed'),
        ),
      );
      return;
    }

    // Check for JSON-RPC path
    if (_req.url !== '/jsonrpc' && _req.url !== '/') {
      _res.writeHead(404);
      _res.end(
        JSON.stringify(createJsonRpcError(null, JsonRpcErrorCode.InvalidRequest, 'Not found')),
      );
      return;
    }

    try {
      // Parse _request body
      const body = await this.parseRequestBody(_req);

      // Validate JSON-RPC _request
      if (!isJsonRpcRequest(body)) {
        _res.writeHead(400);
        _res.end(
          JSON.stringify(
            createJsonRpcError(null, JsonRpcErrorCode.InvalidRequest, 'Invalid JSON-RPC _request'),
          ),
        );
        return;
      }

      // Validate _request ID
      if ('id' in body && !isValidRequestId(body.id)) {
        _res.writeHead(400);
        _res.end(
          JSON.stringify(
            createJsonRpcError(null, JsonRpcErrorCode.InvalidRequest, 'Invalid _request ID'),
          ),
        );
        return;
      }

      // Process the _request through MCP server
      const response = await this.processRequest(body);

      // Send response
      _res.writeHead(200);
      _res.end(JSON.stringify(response));
    } catch (_error) {
      // Handle parsing errors
      if (_error instanceof SyntaxError) {
        _res.writeHead(400);
        _res.end(
          JSON.stringify(createJsonRpcError(null, JsonRpcErrorCode.ParseError, 'Parse _error')),
        );
      } else {
        _res.writeHead(500);
        _res.end(
          JSON.stringify(
            createJsonRpcError(
              null,
              JsonRpcErrorCode.InternalError,
              'Internal server _error',
              _error instanceof Error ? _error.message : undefined,
            ),
          ),
        );
      }
    }
  }

  /**
   * Parse _request body as JSON
   */
  private parseRequestBody(_req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';

      _req.on('data', (chunk) => {
        body += chunk.toString();
      });

      _req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (_error) {
          reject(_error);
        }
      });

      _req.on('error', reject);

      // Set timeout
      _req.setTimeout(this.config.timeout, () => {
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Process JSON-RPC _request through MCP server
   */
  private async processRequest(_request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.server) {
      return createJsonRpcError(
        _request.id,
        JsonRpcErrorCode.InternalError,
        'Server not initialized',
      );
    }

    try {
      // TODO: The MCP SDK Server doesn't expose a direct handleRequest method
      // This would need to be implemented based on the specific server implementation
      // For now, return a method not found error
      return createJsonRpcError(
        _request.id,
        JsonRpcErrorCode.MethodNotFound,
        'HTTP transport integration not yet implemented',
      );
    } catch (_error) {
      return createJsonRpcError(
        _request.id,
        JsonRpcErrorCode.InternalError,
        _error instanceof Error ? _error.message : 'Unknown _error',
        undefined,
        _request._meta, // Preserve metadata in _error responses
      );
    }
  }

  /**
   * Set CORS headers
   */
  private setCorsHeaders(_req: IncomingMessage, _res: ServerResponse): void {
    const origin = _req.headers.origin;
    const allowedOrigins = Array.isArray(this.config.cors.origin)
      ? this.config.cors.origin
      : [this.config.cors.origin || '*'];

    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      _res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.includes('*')) {
      _res.setHeader('Access-Control-Allow-Origin', '*');
    }

    _res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    _res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Protocol-Version');

    if (this.config.cors.credentials) {
      _res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.httpServer = null;
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

/**
 * Factory function to create HTTP transport
 */
export function createHttpTransport(config?: HttpTransportConfig): HttpServerTransport {
  return new HttpServerTransport(config);
}
