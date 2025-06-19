/**
 * STDIO Mock Server for MCP 2025-06-18 Testing
 * Implements STDIO transport with newline-delimited JSON
 */

import { Readable, Writable } from 'stream';
import { BaseMockServer, MockServerConfig } from './base-mock-server';
import { JsonRpcRequest as JSONRPCRequest, JsonRpcResponse as JSONRPCResponse } from '../../../src/types/jsonrpc';

export interface StdioMockServerOptions extends Partial<MockServerConfig> {
  stdin?: Readable;
  stdout?: Writable;
  stderr?: Writable;
}

export class StdioMockServer extends BaseMockServer {
  private stdin: Readable;
  private stdout: Writable;
  private stderr: Writable;
  private buffer = '';
  private handlers: Map<string, (params: any) => Promise<any>> = new Map();
  private isShuttingDown = false;

  constructor(options: StdioMockServerOptions = {}) {
    super({
      transport: 'stdio',
      protocolVersion: '2025-06-18',
      serverName: options.serverName || 'stdio-mock-server',
      serverVersion: options.serverVersion || '1.0.0',
      capabilities: options.capabilities || { tools: true },
      ...options
    });

    this.stdin = options.stdin || process.stdin;
    this.stdout = options.stdout || process.stdout;
    this.stderr = options.stderr || process.stderr;

    this.setupStreams();
  }

  /**
   * Set up stream handlers
   */
  private setupStreams(): void {
    // Handle incoming data
    this.stdin.on('data', (chunk: Buffer) => {
      if (this.isShuttingDown) return;
      this.handleData(chunk.toString());
    });

    // Handle stream errors
    this.stdin.on('error', (error) => {
      this.emit('error', error);
      this.logError(`stdin error: ${error.message}`);
    });

    this.stdout.on('error', (error) => {
      this.emit('error', error);
      this.logError(`stdout error: ${error.message}`);
    });

    // Handle stream close
    this.stdin.on('close', () => {
      this.emit('close');
      this.shutdown();
    });
  }

  /**
   * Handle incoming data chunks
   */
  private handleData(data: string): void {
    this.buffer += data;
    
    // Process complete messages (newline-delimited)
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const message = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      
      if (message) {
        this.processMessage(message);
      }
    }
  }

  /**
   * Process a complete message
   */
  private async processMessage(message: string): Promise<void> {
    try {
      // Parse JSON-RPC request
      const request = JSON.parse(message) as JSONRPCRequest;
      
      // Process the request
      const response = await this.processRequest(request);
      
      // Send response if not a notification
      if (request.id !== undefined) {
        this.sendResponse(response);
      }
    } catch (error) {
      // Handle parse errors
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700, // Parse error
          message: 'Parse error',
          data: error instanceof Error ? error.message : 'Invalid JSON'
        }
      };
      this.sendResponse(errorResponse);
    }
  }

  /**
   * Send a response
   */
  private sendResponse(response: JSONRPCResponse): void {
    if (this.isShuttingDown) return;
    
    try {
      const message = JSON.stringify(response) + '\n';
      this.stdout.write(message);
    } catch (error) {
      this.logError(`Failed to send response: ${error}`);
    }
  }

  /**
   * Log error to stderr
   */
  private logError(message: string): void {
    if (this.stderr && !this.isShuttingDown) {
      this.stderr.write(`[ERROR] ${message}\n`);
    }
  }

  /**
   * Register a method handler
   */
  protected registerHandler(method: string, handler: (params: any) => Promise<any>): void {
    this.handlers.set(method, handler);
  }

  /**
   * Execute a request
   */
  protected async executeRequest(request: JSONRPCRequest): Promise<any> {
    const handler = this.handlers.get(request.method);
    
    if (!handler) {
      throw this.createError(
        -32601, // Method not found
        `Method not found: ${request.method}`
      );
    }

    // STDIO transport should NOT require OAuth
    if (this.config.oauth && this.config.strictMode) {
      this.logError('Warning: OAuth configuration ignored for STDIO transport');
    }

    return handler(request.params || {});
  }

  /**
   * Send server initialization
   */
  async initialize(): Promise<void> {
    const initMessage = {
      jsonrpc: '2.0',
      method: 'initialized',
      params: this.getServerInfo()
    };
    
    this.sendResponse(initMessage as any);
  }

  /**
   * Simulate sending a notification
   */
  sendNotification(method: string, params?: any): void {
    const notification: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params
    };
    
    this.sendResponse(notification as any);
  }

  /**
   * Simulate a client request (for testing)
   */
  async simulateRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return this.processRequest(request);
  }

  /**
   * Create a test harness
   */
  static createTestHarness(): {
    server: StdioMockServer;
    clientIn: Writable;
    clientOut: Readable;
    serverIn: Readable;
    serverOut: Writable;
  } {
    // Create paired streams for testing
    const { PassThrough } = require('stream');
    
    const clientToServer = new PassThrough();
    const serverToClient = new PassThrough();
    
    const server = new StdioMockServer({
      stdin: clientToServer,
      stdout: serverToClient,
      stderr: new PassThrough()
    });

    return {
      server,
      clientIn: clientToServer,
      clientOut: serverToClient,
      serverIn: clientToServer,
      serverOut: serverToClient
    };
  }

  /**
   * Shutdown the server
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    // Remove stream listeners
    this.stdin.removeAllListeners();
    this.stdout.removeAllListeners();
    this.stderr.removeAllListeners();
    
    // Clear handlers
    this.handlers.clear();
    
    // Call parent shutdown
    await super.shutdown();
  }
}

/**
 * Helper class for testing STDIO communication
 */
export class StdioTestClient {
  private responses: JSONRPCResponse[] = [];
  private responsePromises: Map<string | number, {
    resolve: (response: JSONRPCResponse) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(
    private input: Writable,
    private output: Readable
  ) {
    this.setupOutput();
  }

  private setupOutput(): void {
    let buffer = '';
    
    this.output.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const message = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        
        if (message) {
          try {
            const response = JSON.parse(message) as JSONRPCResponse;
            this.handleResponse(response);
          } catch (error) {
            console.error('Failed to parse response:', error);
          }
        }
      }
    });
  }

  private handleResponse(response: JSONRPCResponse): void {
    this.responses.push(response);
    
    if (response.id !== undefined && response.id !== null) {
      const promise = this.responsePromises.get(response.id);
      if (promise) {
        promise.resolve(response);
        this.responsePromises.delete(response.id);
      }
    }
  }

  async sendRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      if (request.id !== undefined) {
        this.responsePromises.set(request.id, { resolve, reject });
      }
      
      const message = JSON.stringify(request) + '\n';
      this.input.write(message);
      
      // Set timeout for response
      if (request.id !== undefined) {
        setTimeout(() => {
          if (this.responsePromises.has(request.id!)) {
            this.responsePromises.delete(request.id!);
            reject(new Error('Request timeout'));
          }
        }, 5000);
      }
    });
  }

  getResponses(): JSONRPCResponse[] {
    return [...this.responses];
  }

  clearResponses(): void {
    this.responses = [];
  }
}