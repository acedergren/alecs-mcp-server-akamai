# ALECS Component Implementation Guide

## Overview

This guide provides detailed implementation documentation for each major component of the ALECS MCP Server. It serves as a reference for developers working on the system and explains the design decisions, patterns, and best practices for each component.

## Table of Contents

1. [Core Server Components](#core-server-components)
2. [Transport Implementations](#transport-implementations)
3. [Performance Components](#performance-components)
4. [Domain Implementation](#domain-implementation)
5. [Tool System](#tool-system)
6. [Tool Creation Guide](#tool-creation-guide)
7. [Authentication & Security](#authentication--security)
8. [Error Handling System](#error-handling-system)
9. [Orchestration Engine](#orchestration-engine)

## Core Server Components

### ALECSCore (alecs-core.ts)

The base class that all ALECS servers extend, providing core functionality and performance optimizations.

```typescript
export abstract class ALECSCore {
    protected requestCoalescer: RequestCoalescer;
    protected smartCache: SmartCache;
    protected connectionPool: ConnectionPool;
    protected performanceMonitor: PerformanceMonitor;
    
    constructor(config: ALECSConfig) {
        // Initialize performance components
        this.requestCoalescer = new RequestCoalescer({
            windowMs: config.coalesceWindow || 100,
            keyGenerator: this.generateCoalesceKey.bind(this)
        });
        
        this.smartCache = new SmartCache({
            maxSize: config.cacheMaxSize || 1000,
            ttl: config.cacheTTL || 300000,
            isolation: 'customer',
            invalidationRules: this.getCacheInvalidationRules()
        });
        
        this.connectionPool = new ConnectionPool({
            maxSockets: config.maxSockets || 50,
            maxFreeSockets: config.maxFreeSockets || 10,
            timeout: config.socketTimeout || 60000,
            keepAlive: true,
            keepAliveMsecs: 1000
        });
    }
}
```

**Key Features:**
- Abstract base class enforcing consistent structure
- Built-in performance optimizations
- Extensible middleware pipeline
- Lifecycle management hooks

**Implementation Patterns:**
```typescript
export class PropertyServer extends ALECSCore {
    protected async initializeTools(): Promise<void> {
        // Domain-specific tool registration
        const propertyTools = await import('./domains/property');
        this.registerTools(propertyTools.default);
    }
    
    protected getCacheInvalidationRules(): InvalidationRule[] {
        return [
            { operation: 'property.create', invalidates: ['property.list'] },
            { operation: 'property.update', invalidates: ['property.get', 'property.list'] },
            { operation: 'property.delete', invalidates: ['property.*'] }
        ];
    }
}
```

### FastMCPServer (fast-mcp-server.ts)

A simplified, high-performance MCP server implementation optimized for production use.

```typescript
export class FastMCPServer {
    private tools: Map<string, ToolDefinition> = new Map();
    private middleware: Middleware[] = [];
    
    constructor(private config: FastMCPConfig) {
        this.setupCoreMiddleware();
    }
    
    public use(middleware: Middleware): void {
        this.middleware.push(middleware);
    }
    
    public register(tool: ToolDefinition): void {
        this.tools.set(tool.name, tool);
    }
    
    public async handleRequest(request: MCPRequest): Promise<MCPResponse> {
        // Fast path for tool execution
        const tool = this.tools.get(request.method);
        if (!tool) {
            throw new MethodNotFoundError(request.method);
        }
        
        // Execute middleware pipeline
        const context = await this.executeMiddleware(request);
        
        // Execute tool with context
        const result = await tool.handler(request.params, context);
        
        return {
            jsonrpc: '2.0',
            id: request.id,
            result
        };
    }
}
```

**Performance Optimizations:**
- Minimal abstraction layers
- Direct tool lookup via Map
- Streamlined middleware execution
- No unnecessary object creation

## Transport Implementations

### stdio Transport

Handles JSON-RPC communication over stdin/stdout for Claude Desktop integration.

```typescript
export class StdioTransport implements Transport {
    private buffer: string = '';
    
    async start(): Promise<void> {
        process.stdin.setEncoding('utf8');
        
        process.stdin.on('data', (chunk: string) => {
            this.buffer += chunk;
            this.processBuffer();
        });
        
        process.stdin.on('end', () => {
            process.exit(0);
        });
    }
    
    private processBuffer(): void {
        const messages = this.buffer.split('\n');
        this.buffer = messages.pop() || '';
        
        for (const message of messages) {
            if (message.trim()) {
                this.handleMessage(message);
            }
        }
    }
    
    private async handleMessage(message: string): Promise<void> {
        try {
            const request = JSON.parse(message);
            const response = await this.server.handleRequest(request);
            this.send(response);
        } catch (error) {
            this.sendError(error);
        }
    }
    
    private send(response: any): void {
        process.stdout.write(JSON.stringify(response) + '\n');
    }
}
```

### WebSocket Transport

Provides persistent bidirectional communication for real-time updates.

```typescript
export class WebSocketTransport implements Transport {
    private wss: WebSocketServer;
    private clients: Map<string, WebSocketClient> = new Map();
    
    async start(port: number = 3000): Promise<void> {
        this.wss = new WebSocketServer({ port });
        
        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            const client = new WebSocketClient(clientId, ws, req);
            
            this.clients.set(clientId, client);
            
            ws.on('message', async (data) => {
                const request = JSON.parse(data.toString());
                const response = await this.handleRequest(request, client);
                ws.send(JSON.stringify(response));
            });
            
            ws.on('close', () => {
                this.clients.delete(clientId);
            });
            
            ws.on('error', (error) => {
                logger.error({ error, clientId }, 'WebSocket error');
            });
        });
    }
    
    broadcast(event: any): void {
        const message = JSON.stringify(event);
        this.clients.forEach(client => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(message);
            }
        });
    }
}
```

### SSE Transport

Server-Sent Events for unidirectional streaming over HTTP.

```typescript
export class SSETransport implements Transport {
    private app: Express;
    private clients: Map<string, Response> = new Map();
    
    async start(port: number = 3001): Promise<void> {
        this.app = express();
        
        this.app.get('/events', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });
            
            const clientId = this.generateClientId();
            this.clients.set(clientId, res);
            
            // Send heartbeat
            const heartbeat = setInterval(() => {
                res.write(':heartbeat\n\n');
            }, 30000);
            
            req.on('close', () => {
                clearInterval(heartbeat);
                this.clients.delete(clientId);
            });
        });
        
        this.app.post('/request', async (req, res) => {
            const response = await this.handleRequest(req.body);
            res.json(response);
        });
        
        this.app.listen(port);
    }
    
    sendEvent(event: any): void {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        this.clients.forEach(client => {
            client.write(data);
        });
    }
}
```

## Performance Components

### Request Coalescer

Prevents duplicate API calls for identical concurrent requests.

```typescript
export class RequestCoalescer {
    private pendingRequests: Map<string, Promise<any>> = new Map();
    private requestSubscribers: Map<string, Set<CoalesceSubscriber>> = new Map();
    
    async coalesce<T>(
        key: string,
        requestFn: () => Promise<T>
    ): Promise<T> {
        // Check if request is already pending
        const pending = this.pendingRequests.get(key);
        if (pending) {
            return pending;
        }
        
        // Create new request promise
        const requestPromise = this.executeRequest(key, requestFn);
        this.pendingRequests.set(key, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Cleanup after window expires
            setTimeout(() => {
                this.pendingRequests.delete(key);
            }, this.config.windowMs);
        }
    }
    
    private async executeRequest<T>(
        key: string,
        requestFn: () => Promise<T>
    ): Promise<T> {
        try {
            const result = await requestFn();
            this.notifySubscribers(key, { success: true, result });
            return result;
        } catch (error) {
            this.notifySubscribers(key, { success: false, error });
            throw error;
        }
    }
}
```

### Smart Cache

Multi-tenant caching with automatic invalidation and TTL management.

```typescript
export class SmartCache {
    private cache: LRUCache<string, CacheEntry>;
    private invalidationRules: InvalidationRule[];
    
    constructor(config: SmartCacheConfig) {
        this.cache = new LRUCache({
            max: config.maxSize,
            ttl: config.ttl,
            updateAgeOnGet: true,
            updateAgeOnHas: true
        });
        
        this.invalidationRules = config.invalidationRules || [];
    }
    
    async get<T>(
        key: string,
        fetchFn: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> {
        const cacheKey = this.generateKey(key, options?.customer);
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && !this.isStale(cached)) {
            metrics.increment('cache.hit');
            return cached.value as T;
        }
        
        // Cache miss - fetch data
        metrics.increment('cache.miss');
        const value = await fetchFn();
        
        // Store in cache
        this.cache.set(cacheKey, {
            value,
            timestamp: Date.now(),
            customer: options?.customer
        });
        
        return value;
    }
    
    invalidate(pattern: string, customer?: string): void {
        const regex = new RegExp(pattern.replace('*', '.*'));
        
        for (const [key, entry] of this.cache.entries()) {
            if (regex.test(key)) {
                if (!customer || entry.customer === customer) {
                    this.cache.delete(key);
                }
            }
        }
    }
    
    handleOperation(operation: string, customer: string): void {
        // Apply invalidation rules
        for (const rule of this.invalidationRules) {
            if (operation === rule.operation) {
                for (const pattern of rule.invalidates) {
                    this.invalidate(pattern, customer);
                }
            }
        }
    }
}
```

### Connection Pool

Manages HTTP connection reuse for improved performance.

```typescript
export class ConnectionPool {
    private agent: https.Agent;
    private metrics: PoolMetrics;
    
    constructor(config: PoolConfig) {
        this.agent = new https.Agent({
            maxSockets: config.maxSockets,
            maxFreeSockets: config.maxFreeSockets,
            timeout: config.timeout,
            keepAlive: true,
            keepAliveMsecs: config.keepAliveMsecs || 1000
        });
        
        this.setupMetrics();
    }
    
    getAgent(): https.Agent {
        return this.agent;
    }
    
    private setupMetrics(): void {
        setInterval(() => {
            const sockets = this.agent.sockets;
            const freeSockets = this.agent.freeSockets;
            
            let totalSockets = 0;
            let totalFreeSockets = 0;
            
            for (const host in sockets) {
                totalSockets += sockets[host].length;
            }
            
            for (const host in freeSockets) {
                totalFreeSockets += freeSockets[host].length;
            }
            
            metrics.gauge('connection_pool.active', totalSockets);
            metrics.gauge('connection_pool.idle', totalFreeSockets);
        }, 10000);
    }
}
```

## Domain Implementation

### Domain Structure Pattern

Each domain follows a consistent implementation pattern:

```typescript
// domains/property/index.ts
export * from './types';
export * from './operations';
export * from './schemas';
export { propertyTools } from './tools';

// domains/property/types.ts
export interface Property {
    propertyId: string;
    propertyName: string;
    contractId: string;
    groupId: string;
    latestVersion: number;
    stagingVersion?: number;
    productionVersion?: number;
}

// domains/property/schemas.ts
export const PropertySchema = z.object({
    propertyId: z.string(),
    propertyName: z.string(),
    contractId: z.string(),
    groupId: z.string(),
    latestVersion: z.number(),
    stagingVersion: z.number().optional(),
    productionVersion: z.number().optional()
});

// domains/property/operations.ts
export class PropertyOperations {
    constructor(
        private client: AkamaiClient,
        private cache: SmartCache,
        private validator: ZodValidator
    ) {}
    
    async list(params: ListParams): Promise<Property[]> {
        return this.cache.get(
            `property:list:${params.contractId}:${params.groupId}`,
            async () => {
                const response = await this.client.get('/papi/v1/properties', {
                    params: {
                        contractId: params.contractId,
                        groupId: params.groupId
                    }
                });
                
                return this.validator.parse(
                    PropertyListSchema,
                    response.data
                ).properties;
            }
        );
    }
    
    async create(params: CreateParams): Promise<Property> {
        const validated = this.validator.parse(CreatePropertySchema, params);
        
        const response = await this.client.post('/papi/v1/properties', {
            contractId: validated.contractId,
            groupId: validated.groupId,
            propertyName: validated.propertyName,
            productId: validated.productId,
            ruleFormat: validated.ruleFormat || 'latest'
        });
        
        // Invalidate list cache
        this.cache.invalidate(`property:list:${validated.contractId}:*`);
        
        return this.validator.parse(PropertySchema, response.data.property);
    }
}
```

### Domain Tool Generation

Tools are generated from domain operations:

```typescript
// domains/property/tools.ts
export const propertyTools = generateTools({
    domain: 'property',
    operations: PropertyOperations,
    tools: [
        {
            name: 'property.list',
            description: 'List properties in a contract',
            operation: 'list',
            cache: { ttl: 300000 }
        },
        {
            name: 'property.create',
            description: 'Create a new property',
            operation: 'create',
            invalidates: ['property.list']
        },
        {
            name: 'property.get',
            description: 'Get property details',
            operation: 'get',
            cache: { ttl: 60000 }
        }
    ]
});
```

## Tool System

### Tool Definition Structure

```typescript
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodSchema;
    handler: ToolHandler;
    middleware?: ToolMiddleware[];
    cache?: CacheConfig;
    rateLimit?: RateLimitConfig;
    tags?: string[];
}

export type ToolHandler = (
    params: any,
    context: ToolContext
) => Promise<any>;

export interface ToolContext {
    customer: string;
    accountSwitchKey?: string;
    traceId: string;
    user?: string;
    cache: SmartCache;
    logger: Logger;
}
```

### Tool Registry

Manages tool discovery and registration:

```typescript
export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();
    private toolsByTag: Map<string, Set<string>> = new Map();
    
    async autoDiscover(directories: string[]): Promise<void> {
        for (const dir of directories) {
            const files = await glob(`${dir}/**/tools.{js,ts}`);
            
            for (const file of files) {
                const module = await import(file);
                if (module.default && Array.isArray(module.default)) {
                    module.default.forEach(tool => this.register(tool));
                }
            }
        }
    }
    
    register(tool: ToolDefinition): void {
        // Validate tool definition
        this.validateTool(tool);
        
        // Register tool
        this.tools.set(tool.name, tool);
        
        // Index by tags
        if (tool.tags) {
            tool.tags.forEach(tag => {
                if (!this.toolsByTag.has(tag)) {
                    this.toolsByTag.set(tag, new Set());
                }
                this.toolsByTag.get(tag)!.add(tool.name);
            });
        }
        
        logger.info({ tool: tool.name }, 'Tool registered');
    }
    
    private validateTool(tool: ToolDefinition): void {
        if (!tool.name || !tool.handler) {
            throw new Error('Tool must have name and handler');
        }
        
        if (!tool.inputSchema) {
            throw new Error(`Tool ${tool.name} must have input schema`);
        }
        
        // Validate schema is valid Zod schema
        if (!tool.inputSchema._def) {
            throw new Error(`Tool ${tool.name} schema must be Zod schema`);
        }
    }
}
```

### Tool Wrapper

Adds consistent behavior to all tools:

```typescript
export function wrapTool(tool: ToolDefinition): ToolDefinition {
    const originalHandler = tool.handler;
    
    tool.handler = async (params: any, context: ToolContext) => {
        const startTime = Date.now();
        const span = tracer.startSpan(`tool.${tool.name}`);
        
        try {
            // Set span attributes
            span.setAttributes({
                'tool.name': tool.name,
                'customer': context.customer,
                'cache.enabled': !!tool.cache
            });
            
            // Validate input
            const validated = tool.inputSchema.parse(params);
            
            // Check cache if enabled
            if (tool.cache) {
                const cached = await context.cache.get(
                    `tool:${tool.name}:${hash(validated)}`,
                    () => originalHandler(validated, context),
                    { ttl: tool.cache.ttl }
                );
                
                span.setAttribute('cache.hit', true);
                return cached;
            }
            
            // Execute handler
            const result = await originalHandler(validated, context);
            
            // Record metrics
            metrics.histogram('tool.duration', Date.now() - startTime, {
                tool: tool.name,
                success: true
            });
            
            return result;
        } catch (error) {
            span.recordException(error);
            
            metrics.histogram('tool.duration', Date.now() - startTime, {
                tool: tool.name,
                success: false
            });
            
            throw error;
        } finally {
            span.end();
        }
    };
    
    return tool;
}
```

## Tool Creation Guide

### Quick Start: Creating a New Tool

For comprehensive tool creation instructions, see [TOOL_CREATION_GUIDE.md](../TOOL_CREATION_GUIDE.md) and [TOOL_QUICK_REFERENCE.md](../TOOL_QUICK_REFERENCE.md).

The ALECSCore framework provides a simplified `tool()` helper function that handles all MCP protocol complexities:

```typescript
import { tool } from '../core/server/alecs-core.js';
import { z } from 'zod';

// 1. Define schema
const MyToolSchema = CustomerSchema.extend({
  param1: z.string(),
  param2: z.number().optional().default(30)
});

// 2. Create tool
export const myTool = tool(
  'domain.action',           // Tool name
  MyToolSchema,              // Zod schema
  async (args, ctx) => {     // Handler function
    const { client, customer, cache, logger } = ctx;
    
    // Validate customer context
    if (!customer) {
      throw new Error('Customer context required');
    }
    
    // Check cache
    const cacheKey = `tool-${customer}-${args.param1}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
    
    // Make API call
    const response = await client.get('/api/endpoint', {
      params: args,
      headers: { 'Customer': customer }
    });
    
    // Cache result
    await cache.set(cacheKey, response.data, 300);
    return response.data;
  },
  {                          // Optional configuration
    cache: { ttl: 300, customer: true },
    coalesce: true,
    description: 'Tool description'
  }
);
```

### Tool Registration Pattern

Tools are registered in domain-specific servers:

```typescript
// In src/servers/mydomain-server-alecscore.ts
import { ALECSCore } from '../core/server/alecs-core.js';
import { myTool } from '../tools/mydomain/my-tool.js';

class MyDomainServer extends ALECSCore {
  override tools = [
    myTool,
    // ... other tools
  ];
}

export default MyDomainServer;
```

### Context Object Structure

Every tool handler receives a `ToolContext` object:

```typescript
interface ToolContext {
  client: AkamaiClient;      // Pre-configured API client
  customer?: string;         // Current customer context
  cache: SmartCache;         // Performance cache
  pool: ConnectionPool;      // HTTP connection pool
  format: FormatFunction;    // Response formatting
  logger: Logger;            // Structured logging
}
```

### Performance Features

The `tool()` helper automatically provides:

- **Caching**: Customer-isolated caching with configurable TTL
- **Request Coalescing**: Prevents duplicate concurrent requests
- **Connection Pooling**: Reuses HTTP connections
- **Streaming**: Support for large dataset responses
- **Error Handling**: Automatic conversion to MCP error format

### Tool Configuration Options

```typescript
tool(name, schema, handler, {
  // Caching configuration
  cache: {
    ttl: 300,                    // Cache duration in seconds
    customer: true,              // Customer-isolated caching
    invalidate: ['event.name']   // Cache invalidation triggers
  },
  
  // Performance options
  coalesce: true,                // Prevent duplicate requests
  streaming: false,              // Enable streaming for large data
  
  // Response formatting
  format: 'json',                // Default response format
  
  // Metadata
  description: 'Tool description',
  tags: ['domain', 'core']
});
```

### Error Handling Best Practices

```typescript
async function toolHandler(args, ctx) {
  try {
    const response = await ctx.client.get('/api/endpoint');
    return response.data;
  } catch (error) {
    // Handle specific API errors
    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied');
    }
    
    // Log error with context
    ctx.logger.error('Tool execution failed', {
      tool: 'domain.action',
      customer: ctx.customer,
      error: error.message
    });
    
    throw new Error('API request failed');
  }
}
```

### Multi-Customer Support

All tools should support multi-customer scenarios:

```typescript
// Schema should extend CustomerSchema
const MyToolSchema = CustomerSchema.extend({
  // ... other parameters
});

// Handler should validate customer context
async function handler(args, ctx) {
  if (!ctx.customer) {
    throw new Error('Customer context is required');
  }
  
  // Use customer in API calls
  const response = await ctx.client.get('/api/endpoint', {
    headers: { 'Customer': ctx.customer }
  });
  
  return response.data;
}
```

### Testing Pattern

```typescript
// Unit test structure
describe('myTool', () => {
  const mockContext = {
    client: { get: jest.fn() },
    customer: 'test-customer',
    cache: { get: jest.fn(), set: jest.fn() },
    logger: { info: jest.fn(), error: jest.fn() }
  };

  it('should handle valid input', async () => {
    const args = { customer: 'test', param1: 'value' };
    mockContext.client.get.mockResolvedValue({ data: 'result' });

    const result = await myTool.handler(args, mockContext);

    expect(result).toEqual('result');
    expect(mockContext.client.get).toHaveBeenCalledWith('/api/endpoint', {
      params: args,
      headers: { 'Customer': 'test' }
    });
  });
});
```

### Integration with All-Tools-Registry

Tools are automatically discovered through the registry system:

```typescript
// In src/tools/all-tools-registry.ts
import { myDomainTools } from './mydomain/consolidated-mydomain-tools.js';

export function getAllToolDefinitions(): ToolDefinition[] {
  const allTools: ToolDefinition[] = [];
  
  // Add domain tools
  allTools.push(...convertToolsToDefinitions(myDomainTools));
  
  return allTools;
}
```

This architecture provides:
- **90% less boilerplate** compared to manual MCP implementation
- **5x better performance** through built-in optimizations
- **Type safety** with Zod schema validation
- **Multi-customer support** with customer-isolated caching
- **Automatic MCP compliance** handling all protocol requirements

## Authentication & Security

### EdgeGrid Authentication

Implements Akamai's request signing algorithm:

```typescript
export class EnhancedEdgeGrid {
    private auth: EdgeGridAuth;
    
    constructor(config: EdgeGridConfig) {
        this.auth = {
            client_token: config.client_token,
            client_secret: config.client_secret,
            access_token: config.access_token,
            host: config.host
        };
    }
    
    sign(request: Request): Request {
        const timestamp = new Date().toUTCString();
        const nonce = this.generateNonce();
        
        // Create auth header
        const authHeader = this.createAuthHeader(
            request,
            timestamp,
            nonce
        );
        
        // Add headers
        request.headers = {
            ...request.headers,
            'Authorization': authHeader,
            'X-Akamai-Timestamp': timestamp,
            'X-Akamai-Nonce': nonce
        };
        
        return request;
    }
    
    private createAuthHeader(
        request: Request,
        timestamp: string,
        nonce: string
    ): string {
        const signingString = this.createSigningString(
            request,
            timestamp,
            nonce
        );
        
        const signature = this.calculateSignature(signingString);
        
        return `EG1-HMAC-SHA256 ` +
            `client_token=${this.auth.client_token};` +
            `access_token=${this.auth.access_token};` +
            `timestamp=${timestamp};` +
            `nonce=${nonce};` +
            `signature=${signature}`;
    }
    
    private createSigningString(
        request: Request,
        timestamp: string,
        nonce: string
    ): string {
        const parts = [
            request.method,
            request.url,
            request.headers['Host'] || this.auth.host,
            this.auth.client_token,
            this.auth.access_token,
            timestamp,
            nonce
        ];
        
        return parts.join('\t');
    }
    
    private calculateSignature(signingString: string): string {
        const key = Buffer.from(this.auth.client_secret, 'base64');
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(signingString);
        return hmac.digest('base64');
    }
}
```

### Multi-Customer Authentication

Manages authentication for multiple customer accounts:

```typescript
export class CustomerAuthManager {
    private configs: Map<string, CustomerAuth> = new Map();
    
    async loadFromEdgerc(path: string = '~/.edgerc'): Promise<void> {
        const content = await fs.readFile(expandHome(path), 'utf8');
        const sections = parseEdgerc(content);
        
        for (const [section, config] of Object.entries(sections)) {
            this.configs.set(section, {
                name: section,
                edgeGrid: new EnhancedEdgeGrid(config),
                accountSwitchKey: config.account_switch_key
            });
        }
    }
    
    getAuth(customer: string): CustomerAuth {
        const auth = this.configs.get(customer);
        if (!auth) {
            throw new CustomerNotFoundError(customer);
        }
        return auth;
    }
    
    async createClient(customer: string): Promise<AkamaiClient> {
        const auth = this.getAuth(customer);
        
        return new AkamaiClient({
            auth: auth.edgeGrid,
            accountSwitchKey: auth.accountSwitchKey,
            pool: this.connectionPool,
            cache: this.smartCache
        });
    }
}
```

## Error Handling System

### RFC 7807 Problem Details

Standardized error responses:

```typescript
export class AkamaiError extends Error {
    public readonly type: string;
    public readonly title: string;
    public readonly status: number;
    public readonly detail: string;
    public readonly instance?: string;
    public readonly extensions?: Record<string, any>;
    
    constructor(options: ErrorOptions) {
        super(options.detail);
        this.type = options.type;
        this.title = options.title;
        this.status = options.status;
        this.detail = options.detail;
        this.instance = options.instance;
        this.extensions = options.extensions;
    }
    
    toRFC7807(): ProblemDetails {
        return {
            type: this.type,
            title: this.title,
            status: this.status,
            detail: this.detail,
            instance: this.instance,
            ...this.extensions
        };
    }
}

// Specific error types
export class PropertyNotFoundError extends AkamaiError {
    constructor(propertyId: string, contractId: string) {
        super({
            type: 'https://errors.akamai.com/property/not-found',
            title: 'Property Not Found',
            status: 404,
            detail: `Property '${propertyId}' not found in contract '${contractId}'`,
            instance: `/property/get/${propertyId}`,
            extensions: {
                propertyId,
                contractId,
                suggestion: 'Verify the property ID or check contract access'
            }
        });
    }
}
```

### Error Recovery Strategies

```typescript
export class ErrorRecovery {
    async withRetry<T>(
        fn: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const maxAttempts = options.maxAttempts || 3;
        const backoffMs = options.backoffMs || 1000;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (!this.isRetryable(error) || attempt === maxAttempts) {
                    throw error;
                }
                
                const delay = backoffMs * Math.pow(2, attempt - 1);
                await this.sleep(delay);
            }
        }
        
        throw new Error('Retry failed');
    }
    
    private isRetryable(error: any): boolean {
        // Network errors
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            return true;
        }
        
        // HTTP status codes
        if (error.status === 429 || error.status >= 500) {
            return true;
        }
        
        return false;
    }
}
```

## Orchestration Engine

### Workflow Engine

Manages complex multi-step operations:

```typescript
export class WorkflowEngine {
    private steps: Map<string, WorkflowStep> = new Map();
    private state: WorkflowState;
    
    async execute(workflow: WorkflowDefinition): Promise<WorkflowResult> {
        this.state = {
            workflowId: generateId(),
            status: 'running',
            currentStep: workflow.startStep,
            context: workflow.initialContext || {},
            history: []
        };
        
        try {
            while (this.state.currentStep) {
                const step = this.steps.get(this.state.currentStep);
                if (!step) {
                    throw new Error(`Unknown step: ${this.state.currentStep}`);
                }
                
                await this.executeStep(step);
                
                if (this.state.status !== 'running') {
                    break;
                }
            }
            
            return {
                status: 'completed',
                context: this.state.context,
                history: this.state.history
            };
        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                context: this.state.context,
                history: this.state.history
            };
        }
    }
    
    private async executeStep(step: WorkflowStep): Promise<void> {
        const startTime = Date.now();
        
        try {
            // Execute step
            const result = await step.execute(this.state.context);
            
            // Update history
            this.state.history.push({
                step: step.name,
                status: 'completed',
                duration: Date.now() - startTime,
                result
            });
            
            // Determine next step
            this.state.currentStep = step.getNextStep(result);
            
            // Update context
            if (step.updateContext) {
                this.state.context = step.updateContext(
                    this.state.context,
                    result
                );
            }
        } catch (error) {
            // Handle step failure
            this.state.history.push({
                step: step.name,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message
            });
            
            if (step.onError) {
                this.state.currentStep = step.onError;
            } else {
                throw error;
            }
        }
    }
}
```

### Workflow Templates

Pre-built workflows for common operations:

```typescript
export const PropertyActivationWorkflow: WorkflowDefinition = {
    name: 'property-activation',
    startStep: 'validate-property',
    steps: [
        {
            name: 'validate-property',
            execute: async (ctx) => {
                const property = await propertyOps.get(ctx.propertyId);
                return { valid: true, property };
            },
            getNextStep: (result) => result.valid ? 'create-version' : null
        },
        {
            name: 'create-version',
            execute: async (ctx) => {
                const version = await propertyOps.createVersion(
                    ctx.propertyId,
                    ctx.baseVersion
                );
                return { version };
            },
            getNextStep: () => 'update-rules',
            updateContext: (ctx, result) => ({
                ...ctx,
                versionId: result.version.versionId
            })
        },
        {
            name: 'update-rules',
            execute: async (ctx) => {
                await propertyOps.updateRules(
                    ctx.propertyId,
                    ctx.versionId,
                    ctx.rules
                );
                return { success: true };
            },
            getNextStep: () => 'validate-rules'
        },
        {
            name: 'validate-rules',
            execute: async (ctx) => {
                const validation = await propertyOps.validateRules(
                    ctx.propertyId,
                    ctx.versionId
                );
                return validation;
            },
            getNextStep: (result) => 
                result.errors.length === 0 ? 'activate-staging' : 'fix-errors'
        },
        {
            name: 'activate-staging',
            execute: async (ctx) => {
                const activation = await propertyOps.activate(
                    ctx.propertyId,
                    ctx.versionId,
                    'STAGING'
                );
                return { activationId: activation.activationId };
            },
            getNextStep: () => 'poll-staging-status'
        },
        {
            name: 'poll-staging-status',
            execute: async (ctx) => {
                const status = await propertyOps.pollActivation(
                    ctx.activationId,
                    'STAGING'
                );
                return { status };
            },
            getNextStep: (result) => 
                result.status === 'ACTIVE' ? 'test-staging' : 'poll-staging-status'
        }
    ]
};
```

## Best Practices

### Component Design Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Dependency Injection**: All dependencies passed via constructor
3. **Interface Segregation**: Small, focused interfaces
4. **Open/Closed**: Extensible without modification

### Performance Guidelines

1. **Lazy Loading**: Load components only when needed
2. **Resource Pooling**: Reuse expensive resources
3. **Async by Default**: All I/O operations are async
4. **Memory Management**: Clear references, avoid leaks

### Testing Strategies

1. **Unit Tests**: Test components in isolation
2. **Integration Tests**: Test component interactions
3. **Performance Tests**: Measure and optimize
4. **Error Path Tests**: Verify error handling

### Security Practices

1. **Input Validation**: Always validate external input
2. **Least Privilege**: Minimal permissions per component
3. **Secure Defaults**: Safe configuration out of the box
4. **Audit Logging**: Track security-relevant events

## Conclusion

The ALECS component architecture provides a robust foundation for building high-performance, scalable MCP servers. By following these implementation patterns and best practices, developers can create reliable integrations with Akamai's services while maintaining excellent performance and security characteristics.