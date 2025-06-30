/**
 * HTTP Mock Server for MCP 2025-06-18 Testing
 * Implements HTTP transport with OAuth 2.0 support
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { BaseMockServer, MockServerConfig, OAuthConfig } from './base-mock-server';
import { JsonRpcRequest as JSONRPCRequest, JsonRpcResponse as JSONRPCResponse, RequestContext } from '../../../src/types/jsonrpc';
import { URL } from 'url';

export interface HttpMockServerOptions extends Partial<MockServerConfig> {
  port?: number;
  host?: string;
  enableCors?: boolean;
  enableHttp2?: boolean;
  enableWebSocket?: boolean;
}

export interface TokenValidationResult {
  valid: boolean;
  scopes?: string[];
  resource?: string[];
  expiresAt?: number;
  subject?: string;
}

export class HttpMockServer extends BaseMockServer {
  private server: Server | null = null;
  private port: number;
  private host: string;
  private enableCors: boolean;
  private handlers: Map<string, (params: any, context?: RequestContext) => Promise<any>> = new Map();
  private validTokens: Map<string, TokenValidationResult> = new Map();
  private wsConnections: Set<any> = new Set();

  constructor(options: HttpMockServerOptions = {}) {
    super({
      transport: 'http',
      protocolVersion: '2025-06-18',
      serverName: options.serverName || 'http-mock-server',
      serverVersion: options.serverVersion || '1.0.0',
      capabilities: options.capabilities || { tools: true },
      oauth: options.oauth || {
        authorizationServer: 'https://auth.example.com',
        resourceIndicators: ['https://api.example.com/mcp'],
        protectedResourceMetadata: {
          resource: 'https://api.example.com/mcp',
          scopes: ['mcp:read', 'mcp:write']
        }
      },
      ...options
    });

    this.port = options.port || 0; // 0 means random port
    this.host = options.host || 'localhost';
    this.enableCors = options.enableCors !== false;
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);
      
      this.server.listen(this.port, this.host, () => {
        const address = this.server!.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
        }
        resolve(this.port);
      });

      // Set up WebSocket support if enabled
      if (this.config.enableWebSocket) {
        this.setupWebSocket();
      }
    });
  }

  /**
   * Handle HTTP request
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Set CORS headers if enabled
    if (this.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Handle OAuth metadata endpoint
    if (url.pathname === '/.well-known/oauth-protected-resource' && req.method === 'GET') {
      this.handleProtectedResourceMetadata(res);
      return;
    }

    // Handle JSON-RPC endpoint
    if (url.pathname === '/rpc' && req.method === 'POST') {
      this.handleJsonRpc(req, res);
      return;
    }

    // 404 for other paths
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Handle protected resource metadata endpoint
   */
  private handleProtectedResourceMetadata(res: ServerResponse): void {
    const metadata = {
      authorization_server: this.config.oauth!.authorizationServer,
      resource: this.config.oauth!.protectedResourceMetadata.resource,
      scopes_supported: this.config.oauth!.protectedResourceMetadata.scopes,
      bearer_methods_supported: ['header', 'body', 'query'],
      resource_documentation: 'https://modelcontextprotocol.io/docs',
      resource_policy_uri: 'https://modelcontextprotocol.io/policy'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metadata));
  }

  /**
   * Handle JSON-RPC requests
   */
  private async handleJsonRpc(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Check content type
    const contentType = req.headers['content-type'];
    if (!contentType?.includes('application/json')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Invalid content type'
        }
      }));
      return;
    }

    // Validate OAuth token if configured
    const authContext = await this.validateAuthorization(req);
    if (this.config.oauth && this.config.strictMode && !authContext.authenticated) {
      res.writeHead(401, { 
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="${this.config.oauth.protectedResourceMetadata.resource}"`
      });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Authentication required'
        }
      }));
      return;
    }

    // Read request body
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        // Parse request(s)
        const data = JSON.parse(body);
        const isBatch = Array.isArray(data);
        const requests = isBatch ? data : [data];
        
        // Process requests
        const responses = await Promise.all(
          requests.map(request => this.processAuthenticatedRequest(request, authContext))
        );
        
        // Send response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(isBatch ? responses : responses[0]));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error'
          }
        }));
      }
    });
  }

  /**
   * Validate OAuth authorization
   */
  private async validateAuthorization(req: IncomingMessage): Promise<RequestContext> {
    const context: RequestContext = {
      id: '',
      timestamp: Date.now(),
      transport: 'http',
      authenticated: false
    };

    // Extract bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return context;
    }

    const token = authHeader.substring(7);
    const validation = await this.validateToken(token);
    
    if (validation.valid) {
      // Check resource indicators
      if (validation.resource && 
          !validation.resource.includes(this.config.oauth!.protectedResourceMetadata.resource)) {
        return context;
      }

      context.authenticated = true;
      context.token = token;
    }

    return context;
  }

  /**
   * Validate a bearer token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    // Check mock token store
    const stored = this.validTokens.get(token);
    if (stored) {
      // Check expiration
      if (stored.expiresAt && stored.expiresAt < Date.now()) {
        this.validTokens.delete(token);
        return { valid: false };
      }
      return stored;
    }

    // In real implementation, would introspect with authorization server
    return { valid: false };
  }

  /**
   * Add a valid token for testing
   */
  addValidToken(token: string, details: Partial<TokenValidationResult>): void {
    this.validTokens.set(token, {
      valid: true,
      expiresAt: Date.now() + 3600000, // 1 hour default
      ...details
    });
  }

  /**
   * Process an authenticated request
   */
  private async processAuthenticatedRequest(
    request: JSONRPCRequest, 
    context: RequestContext
  ): Promise<JSONRPCResponse> {
    // Add auth context to request processing
    const requestWithContext = { ...request, _context: context };
    return this.processRequest(requestWithContext);
  }

  /**
   * Register a method handler
   */
  protected registerHandler(
    method: string, 
    handler: (params: any, context?: RequestContext) => Promise<any>
  ): void {
    this.handlers.set(method, handler);
  }

  /**
   * Execute a request
   */
  protected async executeRequest(request: JSONRPCRequest & { _context?: RequestContext }): Promise<any> {
    const handler = this.handlers.get(request.method);
    
    if (!handler) {
      throw this.createError(
        -32601,
        `Method not found: ${request.method}`
      );
    }

    return handler(request.params || {}, request._context);
  }

  /**
   * Set up WebSocket support
   */
  private setupWebSocket(): void {
    if (!this.server) return;

    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ server: this.server });

    wss.on('connection', (ws: any) => {
      this.wsConnections.add(ws);
      
      ws.on('message', async (message: string) => {
        try {
          const request = JSON.parse(message);
          const response = await this.processRequest(request);
          ws.send(JSON.stringify(response));
        } catch (error) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error'
            }
          }));
        }
      });

      ws.on('close', () => {
        this.wsConnections.delete(ws);
      });
    });
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Shutdown the server
   */
  async shutdown(): Promise<void> {
    // Close WebSocket connections
    for (const ws of this.wsConnections) {
      ws.close();
    }
    this.wsConnections.clear();

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }

    // Clear tokens
    this.validTokens.clear();
    
    // Call parent shutdown
    await super.shutdown();
  }
}

/**
 * HTTP client for testing
 */
export class HttpTestClient {
  constructor(private baseUrl: string) {}

  async sendRequest(
    request: JSONRPCRequest,
    token?: string
  ): Promise<JSONRPCResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/rpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok && response.status !== 400) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getProtectedResourceMetadata(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/.well-known/oauth-protected-resource`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }
}