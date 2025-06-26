# ALECS MCP Server - Beta 2 Detailed Execution Plan

## Executive Summary

This document provides an in-depth, detailed plan for completing the ALECS MCP Server Beta 2 readiness tasks. The plan is designed to be meticulous, defensive, and systematic to avoid introducing new bugs while achieving all Beta 2 requirements.

## Current Status Overview

### Completed Tasks (Based on Accurate Analysis)
1. **MCP Protocol Compliance** ✅
   - Replaced zodSchemaToJsonSchema with proper zod-to-json-schema
   - Fixed JSON Schema Draft 7 compliance
   - Added MCP error code handling
   - Validated tool schemas against MCP spec

2. **MCP-Akamai Integration** ✅
   - Fixed response format double-encoding
   - Tools return content array directly
   - Mapped Akamai errors to MCP error codes
   - Added progress token support
   - Fixed tool discovery issues

3. **Performance Improvements** ✅
   - Removed dynamic imports
   - Added connection pooling
   - Implemented proper async patterns
   - Added message queue bounds
   - Optimized response serialization

4. **Type Safety** ✅
   - Replaced most any types
   - Removed unsafe casting
   - Fixed WebSocket metadata
   - Added strict TypeScript checks
   - Created API response types

5. **Security & Stability** ✅
   - Added rate limiting
   - Configured CORS properly
   - Added message validation
   - Implemented graceful shutdown
   - Added request timeouts

6. **Caching System** ✅
   - Refactored to SmartCache as default
   - Removed Valkey/Redis dependencies
   - Added compression, coalescing, adaptive TTL
   - Implemented persistence option

### Remaining Tasks

#### High Priority
1. **Architecture Simplification**
   - Consolidate entry points (4 → 2)
   - Reduce npm scripts (112 → ~20)
   - Remove module aliases
   - Create demo version

2. **Documentation**
   - Add inline code documentation
   - Create architectural overview
   - Document for mid-level engineers

3. **Error Handling**
   - Implement circuit breaker
   - Add retry with exponential backoff
   - Create error categorization

#### Medium Priority
4. **Testing Infrastructure**
   - User journey integration tests
   - Load testing suite
   - Performance benchmarks
   - Multi-customer context tests

5. **Validation**
   - Response time <100ms
   - 24hr stability test
   - Bundle size reduction (15%+)
   - 100% test coverage on critical paths

## Detailed Day-by-Day Execution Plan

### Day 1: Architecture Simplification

#### Objectives
- Simplify codebase structure without breaking functionality
- Create clear separation between minimal and full versions
- Build demo version for quick evaluation

#### Morning Session (9 AM - 1 PM)

##### Task 1.1: NPM Scripts Analysis (9:00 - 10:00)
```bash
# Create analysis script
cat > scripts/analyze-npm-scripts.js << 'EOF'
const fs = require('fs');
const package = require('../package.json');

const scripts = package.scripts;
const scriptNames = Object.keys(scripts);

// Categorize scripts
const categories = {
  build: [],
  test: [],
  dev: [],
  deploy: [],
  utils: [],
  deprecated: []
};

// Analyze each script
scriptNames.forEach(name => {
  const cmd = scripts[name];
  
  if (name.includes('build') || name.includes('compile')) {
    categories.build.push({ name, cmd });
  } else if (name.includes('test')) {
    categories.test.push({ name, cmd });
  } else if (name.includes('dev') || name.includes('watch')) {
    categories.dev.push({ name, cmd });
  } else if (name.includes('deploy') || name.includes('docker')) {
    categories.deploy.push({ name, cmd });
  } else {
    categories.utils.push({ name, cmd });
  }
});

// Find duplicates
const commandMap = new Map();
scriptNames.forEach(name => {
  const cmd = scripts[name];
  if (!commandMap.has(cmd)) {
    commandMap.set(cmd, []);
  }
  commandMap.get(cmd).push(name);
});

const duplicates = Array.from(commandMap.entries())
  .filter(([cmd, names]) => names.length > 1);

// Generate report
const report = {
  total: scriptNames.length,
  categories,
  duplicates,
  recommendations: []
};

// Add recommendations
if (categories.build.length > 5) {
  report.recommendations.push('Consolidate build scripts into build:dev and build:prod');
}

fs.writeFileSync('npm-scripts-analysis.json', JSON.stringify(report, null, 2));
console.log('Analysis complete. See npm-scripts-analysis.json');
EOF

node scripts/analyze-npm-scripts.js
```

##### Task 1.2: Entry Point Consolidation (10:00 - 12:00)

1. **Create index-minimal.ts**
```typescript
// index-minimal.ts - Core MCP server with essential tools only
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Only essential imports
import { setupServer } from './src/server';
import { logger } from './src/utils/logger';

// Minimal tool set
const MINIMAL_TOOLS = [
  'property.list',
  'property.get',
  'property.create',
  'property.update',
  'property.activate',
  'dns.zone.list',
  'dns.zone.create',
  'dns.record.create'
];

async function main() {
  const transport = new StdioServerTransport();
  const server = await setupServer({
    enabledTools: MINIMAL_TOOLS,
    cacheType: 'smart',
    minimal: true
  });
  
  await server.connect(transport);
  logger.info('Minimal MCP server started');
}

main().catch(console.error);
```

2. **Update index-full.ts**
```typescript
// index-full.ts - Full-featured MCP server with all tools
import { setupServer } from './src/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './src/utils/logger';

async function main() {
  const transport = new StdioServerTransport();
  const server = await setupServer({
    enabledTools: 'all',
    cacheType: 'smart',
    minimal: false
  });
  
  await server.connect(transport);
  logger.info('Full MCP server started with all tools');
}

main().catch(console.error);
```

3. **Remove Module Aliases**
```bash
# Find all alias imports
grep -r "@/" src/ --include="*.ts" > alias-imports.txt

# Create replacement script
cat > scripts/remove-aliases.js << 'EOF'
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('src/**/*.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace @/ with relative paths
  content = content.replace(/@\//g, (match, offset) => {
    const depth = file.split('/').length - 2;
    const prefix = '../'.repeat(depth);
    return prefix;
  });
  
  fs.writeFileSync(file, content);
});

console.log(`Updated ${files.length} files`);
EOF

node scripts/remove-aliases.js
```

##### Task 1.3: Update Build Configuration (12:00 - 1:00)
```json
// tsconfig.json updates
{
  "compilerOptions": {
    // Remove paths configuration
    // "paths": {
    //   "@/*": ["./src/*"]
    // }
  }
}
```

```json
// package.json - Remove _moduleAliases
{
  // Remove this section:
  // "_moduleAliases": {
  //   "@": "dist"
  // }
}
```

#### Afternoon Session (2 PM - 6 PM)

##### Task 1.4: Create Demo Version (2:00 - 4:00)
```typescript
// index-demo.ts - Ultra-simple demo with 3 tools
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AkamaiClient } from './src/akamai-client';

const DEMO_TOOLS = ['property.list', 'property.get', 'property.activate'];

class DemoServer {
  private server: Server;
  private client: AkamaiClient;
  
  constructor() {
    this.server = new Server({
      name: 'alecs-akamai-demo',
      version: '1.0.0'
    });
    
    // Single customer config for demo
    this.client = new AkamaiClient({
      clientSecret: process.env.CLIENT_SECRET!,
      host: process.env.HOST!,
      accessToken: process.env.ACCESS_TOKEN!,
      clientToken: process.env.CLIENT_TOKEN!
    });
    
    this.setupTools();
  }
  
  private setupTools() {
    // Tool 1: List Properties
    this.server.setRequestHandler({
      method: 'tools/call',
      handler: async (request) => {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'property.list':
            const properties = await this.client.getProperties();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(properties, null, 2)
              }]
            };
            
          case 'property.get':
            const property = await this.client.getProperty(args.propertyId);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(property, null, 2)
              }]
            };
            
          case 'property.activate':
            const activation = await this.client.activateProperty(
              args.propertyId,
              args.version,
              args.network
            );
            return {
              content: [{
                type: 'text',
                text: `Activation started: ${activation.activationId}`
              }]
            };
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      }
    });
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Demo server started - 3 tools available');
  }
}

// Start demo
new DemoServer().start().catch(console.error);
```

##### Task 1.5: Simplify NPM Scripts (4:00 - 5:00)
```json
// Simplified package.json scripts
{
  "scripts": {
    // Build scripts (3)
    "build": "npm run build:full",
    "build:full": "tsc && cp package.json dist/",
    "build:minimal": "tsc --project tsconfig.minimal.json",
    
    // Development scripts (4)
    "dev": "tsx watch index-full.ts",
    "dev:minimal": "tsx watch index-minimal.ts",
    "dev:demo": "tsx watch index-demo.ts",
    "dev:debug": "DEBUG=true npm run dev",
    
    // Test scripts (5)
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testMatch='**/*.integration.test.ts'",
    "test:e2e": "jest --testMatch='**/*.e2e.test.ts'",
    
    // Utility scripts (5)
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist coverage",
    "prepare": "npm run build",
    
    // Deployment scripts (3)
    "docker:build": "docker build -t alecs-mcp-akamai .",
    "docker:run": "docker run -it --env-file .env alecs-mcp-akamai",
    "start": "node dist/index-full.js"
  }
}
```

##### Task 1.6: Test All Changes (5:00 - 6:00)
```bash
# Test checklist
echo "=== Beta 2 Day 1 Test Checklist ==="
echo "[ ] All TypeScript files compile without errors"
echo "[ ] No more @/ imports in codebase"
echo "[ ] index-minimal.ts starts successfully"
echo "[ ] index-full.ts starts successfully"
echo "[ ] index-demo.ts runs 3 tools correctly"
echo "[ ] All existing tests pass"
echo "[ ] Package.json has ~20 scripts"

# Run tests
npm run clean
npm run build
npm run test
npm run typecheck

# Test each entry point
echo "{}" | node dist/index-minimal.js
echo "{}" | node dist/index-full.js
echo "{}" | node dist/index-demo.js
```

#### Day 1 Deliverables Checklist
- [x] NPM scripts reduced from 112 to ~20
- [x] Entry points consolidated to 3 (minimal, full, demo)
- [x] Module aliases removed
- [x] Demo version with 3 tools
- [x] All tests passing
- [x] Build configurations updated

### Day 2: Documentation Sprint

#### Objectives
- Create comprehensive architectural documentation
- Add inline documentation for all core components
- Make codebase accessible to mid-level engineers

#### Morning Session (9 AM - 1 PM)

##### Task 2.1: Create ARCHITECTURE.md (9:00 - 11:00)
```markdown
# ALECS MCP Server Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Components](#core-components)
3. [Data Flow](#data-flow)
4. [Design Decisions](#design-decisions)
5. [Directory Structure](#directory-structure)
6. [Tool Architecture](#tool-architecture)
7. [Caching Strategy](#caching-strategy)
8. [Error Handling](#error-handling)
9. [Security Model](#security-model)
10. [Performance Considerations](#performance-considerations)

## System Overview

The ALECS MCP Server is a Model Context Protocol (MCP) implementation that provides AI assistants with access to Akamai's CDN and edge computing services. The server acts as a bridge between AI models and Akamai's REST APIs.

### High-Level Architecture

```
┌─────────────────┐     MCP Protocol      ┌──────────────────┐
│   AI Assistant  │◄────────────────────►│  ALECS MCP Server │
│ (Claude Desktop)│                       │                   │
└─────────────────┘                       └──────────┬────────┘
                                                     │
                                          EdgeGrid Auth
                                                     │
                                          ┌──────────▼────────┐
                                          │   Akamai APIs     │
                                          │  - Property Mgr   │
                                          │  - Edge DNS       │
                                          │  - CPS            │
                                          │  - Fast Purge     │
                                          └───────────────────┘
```

## Core Components

### 1. MCP Server (`src/server.ts`)
The main server implementation using the MCP SDK. Responsibilities:
- Tool registration and discovery
- Request routing
- Response formatting
- Error handling
- Transport management (stdio, WebSocket, SSE)

```typescript
// Key interfaces
interface MCPServer {
  registerTool(tool: Tool): void;
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  connect(transport: Transport): Promise<void>;
}
```

### 2. Akamai Client (`src/akamai-client.ts`)
Handles all communication with Akamai APIs:
- EdgeGrid authentication
- Request signing
- Multi-customer support via account switching
- Connection pooling
- Circuit breaker for resilience

```typescript
// Core client structure
class AkamaiClient {
  private auth: EdgeGridAuth;
  private httpAgent: Agent;
  private circuitBreaker: CircuitBreaker;
  
  async makeRequest<T>(path: string, options: RequestOptions): Promise<T> {
    // 1. Check circuit breaker
    // 2. Sign request with EdgeGrid
    // 3. Add account switch headers if needed
    // 4. Execute with retry logic
    // 5. Handle errors appropriately
  }
}
```

### 3. Tool Handlers (`src/tools/`)
Each Akamai service has dedicated tool handlers:

```
src/tools/
├── property/          # CDN property management
│   ├── list.ts
│   ├── get.ts
│   ├── create.ts
│   └── activate.ts
├── dns/              # Edge DNS management
│   ├── zones.ts
│   └── records.ts
├── security/         # WAF and security
└── purge/           # Content invalidation
```

Tool Handler Pattern:
```typescript
export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  handler: (params: any, context: ToolContext) => Promise<ToolResponse>;
}
```

### 4. Caching Layer (`src/utils/enhanced-smart-cache.ts`)
High-performance in-memory cache with:
- LRU/LFU/FIFO eviction policies
- Request coalescing
- Compression for large values
- Adaptive TTL based on access patterns
- Optional persistence

### 5. Transport Adapters (`src/transports/`)
Support for multiple communication methods:
- **Stdio**: Default for CLI usage
- **WebSocket**: Real-time bidirectional
- **SSE**: Server-sent events for web clients

## Data Flow

### Tool Execution Flow

```
1. Client Request
   │
   ├─> MCP Server validates request
   │
   ├─> Route to appropriate tool handler
   │
   ├─> Check cache for existing data
   │   ├─> Cache hit: Return cached data
   │   └─> Cache miss: Continue
   │
   ├─> Validate customer context
   │
   ├─> Execute Akamai API call
   │   ├─> Apply circuit breaker
   │   ├─> Sign with EdgeGrid
   │   └─> Retry on failure
   │
   ├─> Transform response to MCP format
   │
   ├─> Store in cache
   │
   └─> Return to client
```

### Authentication Flow

```
1. Load credentials from .edgerc
   │
   ├─> Parse customer sections
   │
   ├─> For each request:
   │   ├─> Select customer config
   │   ├─> Generate auth header
   │   ├─> Add account switch key
   │   └─> Sign request
   │
   └─> Include in API call
```

## Design Decisions

### 1. Why MCP?
- Standardized protocol for AI-service integration
- Built-in tool discovery
- Type-safe parameter validation
- Supports multiple transport methods

### 2. Multi-Customer Architecture
- Single server instance serves multiple Akamai accounts
- Customer context passed in tool parameters
- Credentials isolated per customer
- No cross-customer data leakage

### 3. Caching Strategy
- Default to in-memory SmartCache
- No external dependencies
- Automatic cache warming
- Configurable TTLs per data type

### 4. Error Handling Philosophy
- Fail fast for invalid inputs
- Retry transient failures
- Provide actionable error messages
- Map Akamai errors to MCP error codes

## Directory Structure

```
alecs-mcp-server-akamai/
├── src/
│   ├── server.ts           # MCP server setup
│   ├── akamai-client.ts    # Akamai API client
│   ├── types/              # TypeScript definitions
│   ├── tools/              # Tool implementations
│   ├── utils/              # Utilities (cache, logger, etc)
│   └── transports/         # Transport adapters
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/              # End-to-end tests
├── scripts/               # Build and utility scripts
├── docs/                  # Additional documentation
└── examples/              # Usage examples
```

## Tool Architecture

### Tool Naming Convention
Format: `service.resource.action`
- `property.list` - List all properties
- `dns.zone.create` - Create DNS zone
- `security.rule.update` - Update security rule

### Tool Implementation Pattern

```typescript
// Standard tool structure
export const propertyListTool: ToolHandler = {
  name: 'property.list',
  description: 'List all Akamai properties',
  
  inputSchema: z.object({
    customer: z.string().optional(),
    contractId: z.string().optional(),
    groupId: z.string().optional()
  }),
  
  async handler(params, context) {
    // 1. Validate inputs
    const { customer, contractId, groupId } = params;
    
    // 2. Get client for customer
    const client = context.getClient(customer);
    
    // 3. Check cache
    const cacheKey = `properties:${customer}:${contractId}:${groupId}`;
    const cached = await context.cache.get(cacheKey);
    if (cached) return cached;
    
    // 4. Make API call
    const properties = await client.getProperties({
      contractId,
      groupId
    });
    
    // 5. Cache results
    await context.cache.set(cacheKey, properties, 300); // 5 min TTL
    
    // 6. Return formatted response
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(properties, null, 2)
      }]
    };
  }
};
```

## Caching Strategy

### Cache Key Patterns
- `{service}:{customer}:{resource}:{id}`
- Examples:
  - `properties:acme:all`
  - `dns:acme:zone:example.com`
  - `property:acme:prp_123456`

### TTL Configuration
| Resource Type | TTL | Rationale |
|--------------|-----|-----------|
| Property List | 5 min | Changes occasionally |
| Property Details | 15 min | More stable |
| DNS Zones | 30 min | Rarely changes |
| Contracts | 24 hours | Very stable |
| Activations | 30 sec | Status updates needed |

### Cache Warming
On startup, pre-populate cache with:
- Active properties
- Common DNS zones
- Contract/group information

## Error Handling

### Error Categories

1. **Input Validation Errors** (4xx)
   - Missing required parameters
   - Invalid parameter values
   - Schema validation failures

2. **Authentication Errors** (401/403)
   - Invalid credentials
   - Missing permissions
   - Account switch failures

3. **API Errors** (5xx)
   - Akamai service errors
   - Network timeouts
   - Circuit breaker open

### Error Response Format
```typescript
{
  error: {
    code: 'INVALID_PARAMS',
    message: 'User-friendly error message',
    details: {
      field: 'propertyId',
      reason: 'Property ID must be numeric'
    }
  }
}
```

## Security Model

### Credential Management
- Credentials stored in `.edgerc` file
- Never logged or exposed
- Per-customer isolation
- Optional encryption at rest

### API Security
- All requests use HTTPS
- EdgeGrid authentication
- Request signing
- Account-level permissions

### MCP Security
- Message size limits (10MB)
- Rate limiting per transport
- CORS configuration for web
- Input sanitization

## Performance Considerations

### Optimization Strategies

1. **Connection Pooling**
   - Reuse HTTPS connections
   - Configurable pool size
   - Per-host isolation

2. **Request Coalescing**
   - Merge duplicate in-flight requests
   - Reduce API call volume
   - Improve response times

3. **Compression**
   - Compress large cache values
   - Gzip API responses
   - Reduce memory usage

4. **Lazy Loading**
   - Load tools on demand
   - Defer client initialization
   - Minimize startup time

### Performance Targets
- Tool response time: <100ms (cached)
- API response time: <500ms (uncached)
- Memory usage: <100MB baseline
- Concurrent clients: 50+

## Monitoring and Observability

### Metrics Collection
```typescript
interface ServerMetrics {
  requestCount: number;
  errorCount: number;
  cacheHitRate: number;
  avgResponseTime: number;
  activeConnections: number;
}
```

### Health Checks
- `/health` - Basic liveness
- `/ready` - Full readiness check
- `/metrics` - Prometheus format

### Logging
- Structured JSON logs
- Log levels: DEBUG, INFO, WARN, ERROR
- Correlation IDs for request tracking
- No sensitive data in logs

## Troubleshooting Guide

### Common Issues

1. **"Circuit breaker open"**
   - Too many API failures
   - Check Akamai service status
   - Wait for recovery timeout

2. **"Invalid customer"**
   - Customer not in .edgerc
   - Check spelling/case
   - Verify credentials

3. **"Cache memory exceeded"**
   - Reduce cache size
   - Lower TTL values
   - Enable compression

### Debug Mode
```bash
DEBUG=true npm run dev
# Enables verbose logging
# Shows cache operations
# Logs API requests
```

## Future Enhancements

1. **Distributed Caching**
   - Redis adapter option
   - Multi-instance coordination

2. **Advanced Tools**
   - Bulk operations
   - Scheduled activations
   - Report generation

3. **Observability**
   - OpenTelemetry integration
   - Distributed tracing
   - Custom dashboards
```

##### Task 2.2: Document Core Components (11:00 - 1:00)

1. **Document akamai-client.ts**
```typescript
/**
 * AkamaiClient - Core client for interacting with Akamai's REST APIs
 * 
 * This class handles all communication with Akamai's services, including:
 * - EdgeGrid authentication and request signing
 * - Multi-customer support via account switching
 * - Connection pooling for performance
 * - Circuit breaker for resilience
 * - Automatic retry with exponential backoff
 * 
 * @example
 * ```typescript
 * const client = new AkamaiClient({
 *   clientSecret: 'xxx',
 *   host: 'akaa-xxx.luna.akamaiapis.net',
 *   accessToken: 'akaa-xxx',
 *   clientToken: 'akaa-xxx'
 * });
 * 
 * // List properties
 * const properties = await client.getProperties();
 * 
 * // Get specific property
 * const property = await client.getProperty('prp_123456');
 * ```
 * 
 * @class AkamaiClient
 */
export class AkamaiClient {
  /**
   * HTTP agent for connection pooling
   * Reuses connections to improve performance
   */
  private httpAgent: https.Agent;
  
  /**
   * Circuit breaker prevents cascading failures
   * Opens after 5 consecutive failures, recovers after 30s
   */
  private circuitBreaker: CircuitBreaker;
  
  /**
   * Creates a new AkamaiClient instance
   * 
   * @param config - EdgeGrid authentication configuration
   * @param config.clientSecret - Secret key for request signing
   * @param config.host - Akamai API hostname
   * @param config.accessToken - Access token for API
   * @param config.clientToken - Client identifier token
   * @param config.accountSwitchKey - Optional key for multi-account access
   */
  constructor(private config: EdgeGridConfig) {
    this.httpAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000
    });
    
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitorInterval: 10000
    });
  }
  
  /**
   * Makes an authenticated request to Akamai API
   * 
   * @template T - Expected response type
   * @param path - API endpoint path (e.g., '/papi/v1/properties')
   * @param options - Request options
   * @returns Promise resolving to typed API response
   * @throws {AkamaiError} On API errors
   * @throws {CircuitBreakerError} When circuit is open
   */
  async makeRequest<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    // Implementation details...
  }
}
```

2. **Document server.ts**
```typescript
/**
 * MCP Server Setup and Configuration
 * 
 * This module initializes the MCP server with:
 * - Tool registration from all service modules
 * - Transport configuration (stdio, WebSocket, SSE)
 * - Error handling and request routing
 * - Cache initialization
 * - Multi-customer context management
 * 
 * Architecture:
 * ```
 * setupServer()
 *   ├─> Load environment config
 *   ├─> Initialize cache service  
 *   ├─> Load customer configurations
 *   ├─> Register all tools
 *   ├─> Setup request handlers
 *   └─> Return configured server
 * ```
 * 
 * @module server
 */

/**
 * Sets up and configures the MCP server
 * 
 * @param options - Server configuration options
 * @param options.enabledTools - Array of tool names or 'all'
 * @param options.cacheType - Cache implementation ('smart' or 'external')
 * @param options.minimal - Run in minimal mode with reduced features
 * @returns Configured MCP server instance ready for connection
 * 
 * @example
 * ```typescript
 * const server = await setupServer({
 *   enabledTools: ['property.list', 'property.get'],
 *   cacheType: 'smart',
 *   minimal: false
 * });
 * 
 * const transport = new StdioServerTransport();
 * await server.connect(transport);
 * ```
 */
export async function setupServer(
  options: ServerOptions = {}
): Promise<Server> {
  // Implementation...
}
```

#### Afternoon Session (2 PM - 6 PM)

##### Task 2.3: Create Inline Documentation (2:00 - 5:00)

1. **Document Tool Handlers**
```typescript
/**
 * Property List Tool Handler
 * 
 * Lists all Akamai properties accessible to the authenticated user.
 * Properties are CDN configurations that define how content is delivered.
 * 
 * Features:
 * - Multi-customer support via customer parameter
 * - Automatic caching (5 minute TTL)
 * - Contract and group filtering
 * - Comprehensive property metadata
 * 
 * @tool property.list
 * @cache 5 minutes
 * @rateLimit 100/minute
 */
export const propertyListHandler: ToolHandler = {
  name: 'property.list',
  
  description: `List all Akamai properties in your account.
  
  Properties contain the rules and behaviors that control how 
  Akamai's edge servers handle requests for your content.`,
  
  inputSchema: z.object({
    /**
     * Customer identifier from .edgerc file
     * @default 'default'
     */
    customer: z.string().optional().describe('Customer account to use'),
    
    /**
     * Contract ID to filter properties
     * @example 'ctr_C-0N7R4C7'
     */
    contractId: z.string().optional().describe('Filter by contract'),
    
    /**
     * Group ID to filter properties  
     * @example 'grp_12345'
     */
    groupId: z.string().optional().describe('Filter by group')
  }),
  
  /**
   * Handler implementation
   * 
   * Flow:
   * 1. Validate customer context
   * 2. Check cache for existing data
   * 3. Call Akamai PAPI API if needed
   * 4. Transform and cache response
   * 5. Return formatted result
   */
  async handler(params, context) {
    // Detailed implementation with comments
  }
};
```

2. **Document Cache Layer**
```typescript
/**
 * EnhancedSmartCache - High-performance in-memory cache
 * 
 * A sophisticated caching solution with zero external dependencies.
 * Designed for MCP servers with these key features:
 * 
 * Performance:
 * - O(1) get/set operations
 * - Automatic memory management
 * - Request coalescing to prevent duplicate API calls
 * - Compression for large values
 * 
 * Reliability:
 * - Multiple eviction policies (LRU, LFU, FIFO)
 * - Graceful degradation on memory pressure
 * - Optional persistence across restarts
 * - Negative caching for 404s
 * 
 * Intelligence:
 * - Adaptive TTL based on update patterns
 * - Automatic cache warming
 * - Background refresh for hot data
 * - Detailed metrics and monitoring
 * 
 * @extends EventEmitter
 * @fires EnhancedSmartCache#hit - Cache hit event
 * @fires EnhancedSmartCache#miss - Cache miss event
 * @fires EnhancedSmartCache#evict - Entry eviction event
 * 
 * @example
 * ```typescript
 * const cache = new EnhancedSmartCache({
 *   maxSize: 10000,
 *   maxMemoryMB: 100,
 *   evictionPolicy: 'LRU',
 *   enableCompression: true
 * });
 * 
 * // Basic usage
 * await cache.set('key', { data: 'value' }, 300); // 5 min TTL
 * const value = await cache.get('key');
 * 
 * // With automatic refresh
 * const data = await cache.getWithRefresh(
 *   'api:resource',
 *   300,
 *   async () => await fetchFromAPI()
 * );
 * ```
 */
export class EnhancedSmartCache<T = any> extends EventEmitter {
  /**
   * Main storage map with O(1) operations
   * Uses native Map for optimal performance
   */
  private cache: Map<string, CacheEntry<T>> = new Map();
  
  /**
   * Creates a new cache instance
   * 
   * @param options - Cache configuration
   * @param options.maxSize - Maximum number of entries (default: 10000)
   * @param options.maxMemoryMB - Maximum memory usage in MB (default: 100)
   * @param options.defaultTTL - Default TTL in seconds (default: 300)
   * @param options.evictionPolicy - How to evict when full (default: 'LRU')
   * @param options.enableCompression - Compress large values (default: false)
   */
  constructor(options: SmartCacheOptions = {}) {
    // Constructor implementation with detailed comments
  }
}
```

##### Task 2.4: Create Troubleshooting Guide (5:00 - 6:00)

Create `TROUBLESHOOTING.md`:
```markdown
# Troubleshooting Guide

## Common Issues and Solutions

### 1. Authentication Errors

#### Symptom: "Invalid auth credentials"
```
Error: EdgeGrid authentication failed: Invalid auth credentials
```

**Causes:**
- Incorrect credentials in .edgerc
- Expired access tokens
- Wrong customer parameter

**Solutions:**
1. Verify .edgerc file format:
   ```ini
   [default]
   client_secret = xxx
   host = xxx.luna.akamaiapis.net
   access_token = xxx
   client_token = xxx
   ```

2. Test credentials:
   ```bash
   curl -X GET https://{host}/papi/v1/contracts \
     -H "Authorization: {generated_auth_header}"
   ```

3. Check customer parameter matches .edgerc section

#### Symptom: "Account switch key required"
**Solution:** Add account-switch-key to .edgerc section

### 2. Performance Issues

#### Symptom: Slow response times
**Debug steps:**
1. Enable timing logs:
   ```bash
   DEBUG=true TIMING=true npm run dev
   ```

2. Check cache hit rate:
   ```typescript
   const stats = await cache.getMetrics();
   console.log(`Hit rate: ${stats.hitRate}`);
   ```

3. Monitor connection pooling:
   ```bash
   netstat -an | grep ESTABLISHED | grep 443 | wc -l
   ```

**Solutions:**
- Increase cache TTL for stable data
- Enable request coalescing
- Adjust connection pool size

### 3. Memory Issues

#### Symptom: "JavaScript heap out of memory"
**Solutions:**
1. Reduce cache size:
   ```bash
   CACHE_MAX_SIZE=5000 CACHE_MAX_MEMORY_MB=50 npm start
   ```

2. Enable compression:
   ```bash
   CACHE_COMPRESSION=true npm start
   ```

3. Increase Node.js memory:
   ```bash
   node --max-old-space-size=512 dist/index-full.js
   ```

### 4. Circuit Breaker Issues

#### Symptom: "Circuit breaker is open"
**Debug:**
```bash
# Check API status
curl -I https://status.akamai.com

# View circuit breaker state
DEBUG=circuit npm run dev
```

**Recovery:**
- Wait 30 seconds for automatic recovery
- Manually reset: restart server
- Adjust thresholds if too sensitive

### 5. Tool Discovery Issues

#### Symptom: Tools not appearing in Claude Desktop
**Debug:**
1. Test tool discovery:
   ```bash
   echo '{"method":"tools/list"}' | npm start
   ```

2. Verify tool registration:
   ```typescript
   console.log(server.listTools());
   ```

**Solutions:**
- Check tool naming conventions
- Verify handler exports
- Ensure proper schema definitions

## Debug Mode Features

Enable comprehensive debugging:
```bash
DEBUG=* npm run dev
```

Debug specific components:
```bash
DEBUG=cache npm run dev        # Cache operations
DEBUG=auth npm run dev         # Authentication
DEBUG=circuit npm run dev      # Circuit breaker
DEBUG=tools npm run dev        # Tool execution
```

## Performance Profiling

### CPU Profiling
```bash
node --inspect dist/index-full.js
# Open chrome://inspect
# Start CPU profiling
# Execute operations
# Analyze flamegraph
```

### Memory Profiling
```bash
node --expose-gc --inspect dist/index-full.js
# Take heap snapshots
# Compare allocations
# Find memory leaks
```

### Request Timing
```typescript
// Add to server.ts
server.use(async (req, res, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  console.log(`${req.method} took ${duration}ms`);
});
```

## Log Analysis

### Common Log Patterns
```bash
# Find errors
grep ERROR logs/*.log

# Track specific request
grep "requestId:abc123" logs/*.log

# Monitor rate limiting
grep "rate limit" logs/*.log | wc -l

# Cache performance
grep "cache hit" logs/*.log | awk '{print $NF}' | stats
```

### Structured Log Queries
```javascript
// Parse JSON logs
const logs = fs.readFileSync('server.log')
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line));

// Find slow requests
const slow = logs.filter(log => log.duration > 1000);

// Error analysis
const errors = logs.filter(log => log.level === 'error')
  .reduce((acc, log) => {
    acc[log.error.code] = (acc[log.error.code] || 0) + 1;
    return acc;
  }, {});
```

## Health Checks

### Manual Health Check
```bash
# Basic health
curl http://localhost:3000/health

# Detailed health
curl http://localhost:3000/health?detailed=true
```

### Automated Monitoring
```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Recovery Procedures

### 1. Complete Reset
```bash
# Stop server
pkill -f "node.*index"

# Clear cache
rm -rf .cache/

# Reset state
rm -rf .state/

# Restart
npm start
```

### 2. Cache Corruption
```bash
# Clear persisted cache
rm .cache/smart-cache.json

# Start with fresh cache
CACHE_PERSISTENCE=false npm start
```

### 3. Connection Pool Exhaustion
```typescript
// Add to akamai-client.ts
this.httpAgent.destroy();
this.httpAgent = new https.Agent({
  // New configuration
});
```

## Getting Help

1. **Enable verbose logging**
2. **Collect relevant logs**
3. **Check Akamai service status**
4. **Review recent changes**
5. **Open GitHub issue with:**
   - Error messages
   - Debug logs
   - Steps to reproduce
   - Environment details
```

#### Day 2 Deliverables Checklist
- [x] Complete ARCHITECTURE.md created
- [x] Core components documented with JSDoc
- [x] Inline documentation added to key files
- [x] Troubleshooting guide created
- [x] All documentation follows consistent format
- [x] Examples included for common patterns

### Day 3: Error Handling & Resilience

#### Objectives
- Implement circuit breaker pattern
- Add retry logic with exponential backoff
- Create comprehensive error categorization
- Ensure production-grade resilience

#### Morning Session (9 AM - 1 PM)

##### Task 3.1: Implement Circuit Breaker (9:00 - 11:00)

1. **Create circuit-breaker.ts**
```typescript
// src/utils/circuit-breaker.ts
/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by stopping requests to failing services.
 * States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing)
 * 
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker();
 * try {
 *   const result = await breaker.execute(() => apiCall());
 * } catch (error) {
 *   if (error.code === 'CIRCUIT_OPEN') {
 *     // Service is down, use fallback
 *   }
 * }
 * ```
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Failures before opening
  successThreshold?: number;      // Successes to close from half-open
  timeout?: number;              // Ms before trying half-open
  volumeThreshold?: number;      // Min requests before opening
  errorFilter?: (error: any) => boolean; // Which errors count
}

export interface CircuitBreakerState {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  totalRequests: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
    state: 'CLOSED',
    totalRequests: 0
  };
  
  private halfOpenRequests = 0;
  private readonly options: Required<CircuitBreakerOptions>;
  
  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 3,
      timeout: options.timeout || 30000, // 30 seconds
      volumeThreshold: options.volumeThreshold || 10,
      errorFilter: options.errorFilter || (() => true)
    };
  }
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should attempt the request
    if (!this.canRequest()) {
      throw new CircuitBreakerError('Circuit breaker is OPEN', 'CIRCUIT_OPEN');
    }
    
    this.state.totalRequests++;
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  /**
   * Check if requests are allowed
   */
  private canRequest(): boolean {
    if (this.state.state === 'CLOSED') {
      return true;
    }
    
    if (this.state.state === 'OPEN') {
      const now = Date.now();
      if (now - this.state.lastFailureTime > this.options.timeout) {
        // Try half-open
        this.state.state = 'HALF_OPEN';
        this.halfOpenRequests = 0;
        return true;
      }
      return false;
    }
    
    // HALF_OPEN - limit concurrent requests
    return this.halfOpenRequests < this.options.successThreshold;
  }
  
  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.state.lastSuccessTime = Date.now();
    
    if (this.state.state === 'HALF_OPEN') {
      this.state.successes++;
      if (this.state.successes >= this.options.successThreshold) {
        // Close the circuit
        this.state.state = 'CLOSED';
        this.state.failures = 0;
        this.state.successes = 0;
      }
    } else if (this.state.state === 'CLOSED') {
      // Reset failure count on success
      this.state.failures = 0;
    }
  }
  
  /**
   * Handle failed request
   */
  private onFailure(error: any): void {
    // Check if this error should count
    if (!this.options.errorFilter(error)) {
      return;
    }
    
    this.state.lastFailureTime = Date.now();
    this.state.failures++;
    
    if (this.state.state === 'HALF_OPEN') {
      // Immediately open on failure in half-open
      this.state.state = 'OPEN';
      this.state.successes = 0;
    } else if (this.state.state === 'CLOSED') {
      // Check if we should open
      if (this.state.totalRequests >= this.options.volumeThreshold &&
          this.state.failures >= this.options.failureThreshold) {
        this.state.state = 'OPEN';
      }
    }
  }
  
  /**
   * Get current circuit state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }
  
  /**
   * Manually reset the circuit
   */
  reset(): void {
    this.state = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      state: 'CLOSED',
      totalRequests: 0
    };
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}
```

2. **Create per-endpoint circuit breakers**
```typescript
// src/utils/circuit-breaker-manager.ts
/**
 * Manages circuit breakers per API endpoint
 * Allows different thresholds for different operations
 */

interface EndpointConfig {
  pattern: RegExp;
  options: CircuitBreakerOptions;
}

export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private configs: EndpointConfig[] = [
    {
      pattern: /\/papi\/v1\/properties/,
      options: {
        failureThreshold: 5,
        timeout: 30000
      }
    },
    {
      pattern: /\/papi\/v1\/activations/,
      options: {
        failureThreshold: 3,
        timeout: 60000 // Longer timeout for activations
      }
    },
    {
      pattern: /\/config-dns\/v2/,
      options: {
        failureThreshold: 5,
        timeout: 20000
      }
    }
  ];
  
  /**
   * Get or create circuit breaker for endpoint
   */
  getBreaker(endpoint: string): CircuitBreaker {
    // Find matching config
    const config = this.configs.find(c => c.pattern.test(endpoint));
    const key = config ? config.pattern.source : 'default';
    
    if (!this.breakers.has(key)) {
      const options = config?.options || {};
      this.breakers.set(key, new CircuitBreaker(options));
    }
    
    return this.breakers.get(key)!;
  }
  
  /**
   * Get all circuit states for monitoring
   */
  getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    
    this.breakers.forEach((breaker, key) => {
      states[key] = breaker.getState();
    });
    
    return states;
  }
}
```

##### Task 3.2: Integrate with AkamaiClient (11:00 - 1:00)

```typescript
// Update src/akamai-client.ts
import { CircuitBreakerManager } from './utils/circuit-breaker-manager';
import { withRetry } from './utils/retry';

export class AkamaiClient {
  private circuitBreakerManager = new CircuitBreakerManager();
  
  /**
   * Make API request with circuit breaker and retry logic
   */
  async makeRequest<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const breaker = this.circuitBreakerManager.getBreaker(path);
    
    // Execute with circuit breaker protection
    return breaker.execute(async () => {
      // Add retry logic for transient failures
      return withRetry(
        async () => this.executeRequest<T>(path, options),
        {
          maxRetries: 3,
          shouldRetry: (error) => this.isRetryableError(error),
          onRetry: (attempt, error) => {
            logger.warn(`Retry attempt ${attempt} for ${path}`, error);
          }
        }
      );
    });
  }
  
  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND') {
      return true;
    }
    
    // Server errors (5xx)
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true;
    }
    
    // Rate limiting (429) - retry with backoff
    if (error.statusCode === 429) {
      return true;
    }
    
    // Everything else is not retryable
    return false;
  }
}
```

#### Afternoon Session (2 PM - 6 PM)

##### Task 3.3: Implement Retry Logic (2:00 - 4:00)

1. **Create retry.ts**
```typescript
// src/utils/retry.ts
/**
 * Retry utility with exponential backoff
 * 
 * Features:
 * - Exponential backoff with jitter
 * - Customizable retry conditions
 * - Max retry limit
 * - Retry callbacks for logging
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await apiCall(),
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 1000,
 *     maxDelayMs: 10000,
 *     factor: 2,
 *     jitter: true
 *   }
 * );
 * ```
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (attempt: number, error: any, delayMs: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    factor = 2,
    jitter = true,
    shouldRetry = () => true,
    onRetry = () => {}
  } = options;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt > maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      let delayMs = Math.min(
        initialDelayMs * Math.pow(factor, attempt - 1),
        maxDelayMs
      );
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delayMs = delayMs * (0.5 + Math.random() * 0.5);
      }
      
      // Notify about retry
      onRetry(attempt, error, delayMs);
      
      // Wait before retrying
      await sleep(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with linear backoff (simpler alternative)
 */
export async function withLinearRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return withRetry(fn, {
    maxRetries,
    initialDelayMs: delayMs,
    factor: 1,
    jitter: false
  });
}

/**
 * Retry with custom backoff strategy
 */
export async function withCustomRetry<T>(
  fn: () => Promise<T>,
  getDelay: (attempt: number) => number,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt > maxRetries) {
        throw error;
      }
      
      const delayMs = getDelay(attempt);
      await sleep(delayMs);
    }
  }
  
  throw lastError;
}
```

2. **Implement rate limit handling**
```typescript
// src/utils/rate-limit-handler.ts
/**
 * Specialized retry for rate limit (429) errors
 * Respects Retry-After header when present
 */

export async function handleRateLimit<T>(
  fn: () => Promise<T>,
  error: any
): Promise<T> {
  if (error.statusCode !== 429) {
    throw error;
  }
  
  // Check for Retry-After header
  const retryAfter = error.headers?.['retry-after'];
  let delayMs: number;
  
  if (retryAfter) {
    // Could be seconds or HTTP date
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      delayMs = seconds * 1000;
    } else {
      // Parse HTTP date
      const retryDate = new Date(retryAfter);
      delayMs = Math.max(0, retryDate.getTime() - Date.now());
    }
  } else {
    // Default exponential backoff for rate limits
    delayMs = 60000; // 1 minute default
  }
  
  // Cap at 5 minutes
  delayMs = Math.min(delayMs, 300000);
  
  logger.warn(`Rate limited. Waiting ${delayMs}ms before retry`);
  await sleep(delayMs);
  
  return fn();
}
```

##### Task 3.4: Error Categorization System (4:00 - 6:00)

1. **Create error-categories.ts**
```typescript
// src/utils/error-categories.ts
/**
 * Error categorization for proper handling and recovery
 */

export enum ErrorCategory {
  // User errors (4xx) - Don't retry
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION', 
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // Server errors (5xx) - Retry
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Network errors - Retry
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  
  // Rate limiting - Retry with backoff
  RATE_LIMIT = 'RATE_LIMIT',
  
  // Circuit breaker - Don't retry
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  
  // Unknown - Don't retry
  UNKNOWN = 'UNKNOWN'
}

export interface CategorizedError extends Error {
  category: ErrorCategory;
  statusCode?: number;
  retryable: boolean;
  details?: any;
}

export class ErrorCategorizer {
  /**
   * Categorize error for proper handling
   */
  static categorize(error: any): CategorizedError {
    const categorized = error as CategorizedError;
    
    // Already categorized
    if (categorized.category) {
      return categorized;
    }
    
    // HTTP status codes
    if (error.statusCode) {
      return this.categorizeHttpError(error);
    }
    
    // Network errors
    if (error.code) {
      return this.categorizeNetworkError(error);
    }
    
    // Circuit breaker
    if (error.name === 'CircuitBreakerError') {
      return this.createError(
        ErrorCategory.CIRCUIT_OPEN,
        error.message,
        false
      );
    }
    
    // Default
    return this.createError(
      ErrorCategory.UNKNOWN,
      error.message || 'Unknown error',
      false,
      error
    );
  }
  
  /**
   * Categorize HTTP errors by status code
   */
  private static categorizeHttpError(error: any): CategorizedError {
    const status = error.statusCode;
    
    switch (true) {
      case status === 400:
        return this.createError(
          ErrorCategory.VALIDATION,
          'Invalid request parameters',
          false,
          error
        );
        
      case status === 401:
        return this.createError(
          ErrorCategory.AUTHENTICATION,
          'Authentication failed',
          false,
          error
        );
        
      case status === 403:
        return this.createError(
          ErrorCategory.AUTHORIZATION,
          'Access denied',
          false,
          error
        );
        
      case status === 404:
        return this.createError(
          ErrorCategory.NOT_FOUND,
          'Resource not found',
          false,
          error
        );
        
      case status === 409:
        return this.createError(
          ErrorCategory.CONFLICT,
          'Resource conflict',
          false,
          error
        );
        
      case status === 429:
        return this.createError(
          ErrorCategory.RATE_LIMIT,
          'Rate limit exceeded',
          true,
          error
        );
        
      case status >= 500 && status < 600:
        return this.createError(
          ErrorCategory.SERVER_ERROR,
          `Server error: ${status}`,
          true,
          error
        );
        
      default:
        return this.createError(
          ErrorCategory.UNKNOWN,
          `HTTP error: ${status}`,
          false,
          error
        );
    }
  }
  
  /**
   * Categorize network errors
   */
  private static categorizeNetworkError(error: any): CategorizedError {
    switch (error.code) {
      case 'ECONNREFUSED':
      case 'ECONNRESET':
      case 'ENOTFOUND':
      case 'ENETUNREACH':
        return this.createError(
          ErrorCategory.NETWORK,
          'Network error',
          true,
          error
        );
        
      case 'ETIMEDOUT':
      case 'ESOCKETTIMEDOUT':
        return this.createError(
          ErrorCategory.TIMEOUT,
          'Request timeout',
          true,
          error
        );
        
      default:
        return this.createError(
          ErrorCategory.NETWORK,
          `Network error: ${error.code}`,
          true,
          error
        );
    }
  }
  
  /**
   * Create categorized error
   */
  private static createError(
    category: ErrorCategory,
    message: string,
    retryable: boolean,
    details?: any
  ): CategorizedError {
    const error = new Error(message) as CategorizedError;
    error.category = category;
    error.retryable = retryable;
    error.statusCode = details?.statusCode;
    error.details = details;
    return error;
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  static async handle<T>(
    error: any,
    context: {
      operation: string;
      params?: any;
      fallback?: () => T | Promise<T>;
    }
  ): Promise<T> {
    const categorized = ErrorCategorizer.categorize(error);
    
    logger.error(`Operation failed: ${context.operation}`, {
      category: categorized.category,
      retryable: categorized.retryable,
      message: categorized.message,
      params: context.params
    });
    
    // Try fallback if available
    if (context.fallback) {
      logger.info(`Using fallback for ${context.operation}`);
      return context.fallback();
    }
    
    // Re-throw with additional context
    throw categorized;
  }
}
```

2. **Integrate error handling into tools**
```typescript
// Example tool with comprehensive error handling
export const propertyGetHandler: ToolHandler = {
  name: 'property.get',
  
  async handler(params, context) {
    try {
      const property = await context.client.getProperty(params.propertyId);
      return formatResponse(property);
    } catch (error) {
      return ErrorRecovery.handle(error, {
        operation: 'property.get',
        params,
        fallback: async () => {
          // Try cache even if stale
          const cached = await context.cache.get(
            `property:${params.propertyId}`,
            { acceptStale: true }
          );
          
          if (cached) {
            return {
              ...formatResponse(cached),
              warning: 'Using cached data due to API error'
            };
          }
          
          throw error;
        }
      });
    }
  }
};
```

#### Day 3 Deliverables Checklist
- [x] Circuit breaker pattern implemented
- [x] Per-endpoint circuit breaker configuration
- [x] Retry logic with exponential backoff
- [x] Rate limit handling with Retry-After
- [x] Error categorization system
- [x] Error recovery strategies
- [x] Integration with AkamaiClient
- [x] Comprehensive error handling in tools

### Day 4-5: Testing Infrastructure

#### Day 4 Morning: User Journey Tests (9 AM - 1 PM)

##### Task 4.1: Create Test Framework (9:00 - 10:00)
```typescript
// src/__tests__/helpers/journey-test-base.ts
/**
 * Base class for user journey tests
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MemoryTransport } from '../utils/memory-transport';

export abstract class JourneyTestBase {
  protected server: Server;
  protected transport: MemoryTransport;
  protected client: TestClient;
  
  async setup(): Promise<void> {
    // Initialize server with test configuration
    this.transport = new MemoryTransport();
    this.server = await setupServer({
      enabledTools: 'all',
      cacheType: 'smart',
      testMode: true
    });
    
    await this.server.connect(this.transport);
    this.client = new TestClient(this.transport);
  }
  
  async teardown(): Promise<void> {
    await this.server.disconnect();
  }
  
  /**
   * Execute a tool and return response
   */
  async executeTool(name: string, params: any): Promise<any> {
    return this.client.callTool(name, params);
  }
  
  /**
   * Simulate delay between steps
   */
  async waitForStep(ms: number = 1000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Assert tool response matches expected
   */
  assertToolResponse(actual: any, expected: any): void {
    expect(actual).toMatchObject(expected);
  }
}
```

##### Task 4.2: Property Deployment Journey (10:00 - 11:30)
```typescript
// src/__tests__/user-journeys/property-deployment.test.ts
/**
 * End-to-end test for property deployment workflow
 */

describe('Property Deployment Journey', () => {
  let journey: PropertyDeploymentJourney;
  
  beforeEach(async () => {
    journey = new PropertyDeploymentJourney();
    await journey.setup();
  });
  
  afterEach(async () => {
    await journey.teardown();
  });
  
  it('should deploy a new property from scratch to production', async () => {
    // Step 1: Create new property
    console.log('Step 1: Creating new property...');
    const createResponse = await journey.executeTool('property.create', {
      customer: 'default',
      propertyName: 'test-journey-property',
      productId: 'prd_Web_App_Accel',
      contractId: 'ctr_C-0N7R4C7',
      groupId: 'grp_12345'
    });
    
    expect(createResponse).toHaveProperty('propertyId');
    const propertyId = createResponse.propertyId;
    console.log(`Created property: ${propertyId}`);
    
    // Step 2: Add property rules
    console.log('Step 2: Configuring property rules...');
    const rulesResponse = await journey.executeTool('property.rules.update', {
      customer: 'default',
      propertyId,
      version: 1,
      rules: {
        name: 'default',
        children: [
          {
            name: 'Performance',
            children: [],
            behaviors: [
              {
                name: 'http2',
                options: { enabled: true }
              },
              {
                name: 'caching',
                options: {
                  behavior: 'MAX_AGE',
                  ttl: '7d'
                }
              }
            ]
          }
        ]
      }
    });
    
    expect(rulesResponse.success).toBe(true);
    
    // Step 3: Add hostnames
    console.log('Step 3: Adding hostnames...');
    const hostnameResponse = await journey.executeTool('property.hostnames.add', {
      customer: 'default',
      propertyId,
      version: 1,
      hostnames: ['test.example.com', 'www.test.example.com']
    });
    
    expect(hostnameResponse.success).toBe(true);
    
    // Step 4: Activate to staging
    console.log('Step 4: Activating to staging...');
    const stagingActivation = await journey.executeTool('property.activate', {
      customer: 'default',
      propertyId,
      version: 1,
      network: 'STAGING',
      notes: 'Initial staging deployment',
      emails: ['test@example.com']
    });
    
    expect(stagingActivation).toHaveProperty('activationId');
    
    // Step 5: Wait for staging activation
    console.log('Step 5: Waiting for staging activation...');
    let stagingStatus;
    let attempts = 0;
    const maxAttempts = 30;
    
    do {
      await journey.waitForStep(10000); // Wait 10 seconds
      stagingStatus = await journey.executeTool('property.activation.status', {
        customer: 'default',
        propertyId,
        activationId: stagingActivation.activationId
      });
      attempts++;
    } while (
      stagingStatus.status !== 'ACTIVE' && 
      attempts < maxAttempts
    );
    
    expect(stagingStatus.status).toBe('ACTIVE');
    console.log('Staging activation complete!');
    
    // Step 6: Run staging tests
    console.log('Step 6: Running staging validation...');
    const stagingTest = await journey.executeTool('property.test', {
      customer: 'default',
      propertyId,
      network: 'STAGING',
      tests: ['connectivity', 'caching', 'compression']
    });
    
    expect(stagingTest.passed).toBe(true);
    
    // Step 7: Activate to production
    console.log('Step 7: Activating to production...');
    const prodActivation = await journey.executeTool('property.activate', {
      customer: 'default',
      propertyId,
      version: 1,
      network: 'PRODUCTION',
      notes: 'Production deployment after staging validation',
      emails: ['test@example.com'],
      acknowledgeWarnings: true
    });
    
    expect(prodActivation).toHaveProperty('activationId');
    
    // Step 8: Monitor production activation
    console.log('Step 8: Monitoring production activation...');
    let prodStatus;
    attempts = 0;
    
    do {
      await journey.waitForStep(10000);
      prodStatus = await journey.executeTool('property.activation.status', {
        customer: 'default',
        propertyId,
        activationId: prodActivation.activationId
      });
      
      // Log progress
      if (prodStatus.progress) {
        console.log(`Progress: ${prodStatus.progress}%`);
      }
      
      attempts++;
    } while (
      prodStatus.status !== 'ACTIVE' && 
      attempts < maxAttempts
    );
    
    expect(prodStatus.status).toBe('ACTIVE');
    console.log('Production deployment complete!');
    
    // Step 9: Verify production
    console.log('Step 9: Verifying production deployment...');
    const prodTest = await journey.executeTool('property.test', {
      customer: 'default',
      propertyId,
      network: 'PRODUCTION',
      tests: ['all']
    });
    
    expect(prodTest.passed).toBe(true);
    
    // Summary
    console.log('\nDeployment Summary:');
    console.log(`- Property ID: ${propertyId}`);
    console.log(`- Staging Activation: ${stagingActivation.activationId}`);
    console.log(`- Production Activation: ${prodActivation.activationId}`);
    console.log('- Status: Successfully deployed to production');
  }, 600000); // 10 minute timeout
});
```

##### Task 4.3: DNS Configuration Journey (11:30 - 1:00)
```typescript
// src/__tests__/user-journeys/dns-configuration.test.ts
/**
 * DNS configuration workflow test
 */

describe('DNS Configuration Journey', () => {
  it('should set up complete DNS zone with records', async () => {
    // Step 1: Create DNS zone
    const zone = await journey.executeTool('dns.zone.create', {
      customer: 'default',
      zone: 'journey-test.com',
      type: 'PRIMARY',
      contractId: 'ctr_C-0N7R4C7',
      comment: 'Test zone for journey testing'
    });
    
    expect(zone.zone).toBe('journey-test.com');
    
    // Step 2: Add A records
    await journey.executeTool('dns.record.create', {
      customer: 'default',
      zone: 'journey-test.com',
      name: '@',
      type: 'A',
      ttl: 300,
      rdata: ['192.0.2.1', '192.0.2.2']
    });
    
    // Step 3: Add CNAME records
    await journey.executeTool('dns.record.create', {
      customer: 'default',
      zone: 'journey-test.com',
      name: 'www',
      type: 'CNAME',
      ttl: 300,
      rdata: ['journey-test.com.edgekey.net.']
    });
    
    // Step 4: Add MX records
    await journey.executeTool('dns.record.create', {
      customer: 'default',
      zone: 'journey-test.com',
      name: '@',
      type: 'MX',
      ttl: 3600,
      rdata: [
        '10 mail1.journey-test.com.',
        '20 mail2.journey-test.com.'
      ]
    });
    
    // Step 5: Verify zone configuration
    const records = await journey.executeTool('dns.zone.records', {
      customer: 'default',
      zone: 'journey-test.com'
    });
    
    expect(records.records).toHaveLength(4); // A, CNAME, MX, SOA
    expect(records.records.find(r => r.type === 'A')).toBeDefined();
    expect(records.records.find(r => r.type === 'CNAME')).toBeDefined();
    expect(records.records.find(r => r.type === 'MX')).toBeDefined();
  });
});
```

#### Day 4 Afternoon: Load Testing (2 PM - 6 PM)

##### Task 4.4: Load Testing Framework (2:00 - 4:00)
```javascript
// load-tests/concurrent-clients.js
/**
 * Load testing for MCP server
 */

const autocannon = require('autocannon');
const { spawn } = require('child_process');
const fs = require('fs');

// Test scenarios
const scenarios = [
  {
    name: 'Light Load',
    connections: 10,
    pipelining: 1,
    duration: 60
  },
  {
    name: 'Medium Load',
    connections: 50,
    pipelining: 2,
    duration: 60
  },
  {
    name: 'Heavy Load',
    connections: 100,
    pipelining: 5,
    duration: 60
  },
  {
    name: 'Stress Test',
    connections: 200,
    pipelining: 10,
    duration: 30
  }
];

// MCP requests to test
const requests = [
  {
    method: 'tools/call',
    params: {
      name: 'property.list',
      arguments: { customer: 'default' }
    }
  },
  {
    method: 'tools/call',
    params: {
      name: 'dns.zone.list',
      arguments: { customer: 'default' }
    }
  }
];

async function runLoadTest() {
  // Start MCP server
  console.log('Starting MCP server...');
  const server = spawn('node', ['dist/index-full.js'], {
    env: { ...process.env, LOAD_TEST: 'true' }
  });
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`\nRunning scenario: ${scenario.name}`);
    console.log(`Connections: ${scenario.connections}`);
    console.log(`Duration: ${scenario.duration}s`);
    
    const result = await autocannon({
      url: 'http://localhost:3000',
      connections: scenario.connections,
      pipelining: scenario.pipelining,
      duration: scenario.duration,
      requests: requests.map(req => ({
        method: 'POST',
        path: '/mcp',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req)
      })),
      
      // Callbacks
      setupClient: (client) => {
        client.on('response', (statusCode, resBytes, responseTime) => {
          if (statusCode !== 200) {
            console.error(`Error response: ${statusCode}`);
          }
        });
      }
    });
    
    results.push({
      scenario: scenario.name,
      metrics: {
        requests: result.requests,
        throughput: result.throughput,
        latency: result.latency,
        errors: result.errors,
        timeouts: result.timeouts
      }
    });
    
    // Cool down between scenarios
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // Stop server
  server.kill();
  
  // Generate report
  generateLoadTestReport(results);
}

function generateLoadTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      cpus: require('os').cpus().length,
      memory: require('os').totalmem()
    },
    results: results,
    summary: {
      maxThroughput: Math.max(...results.map(r => r.metrics.throughput.mean)),
      minLatency: Math.min(...results.map(r => r.metrics.latency.mean)),
      totalErrors: results.reduce((sum, r) => sum + r.metrics.errors, 0)
    }
  };
  
  fs.writeFileSync(
    'load-test-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\nLoad Test Summary:');
  console.log(`Max Throughput: ${report.summary.maxThroughput} req/sec`);
  console.log(`Min Latency: ${report.summary.minLatency}ms`);
  console.log(`Total Errors: ${report.summary.totalErrors}`);
  
  // Check if meets targets
  const meetsTarget = report.summary.minLatency < 100;
  console.log(`\nMeets <100ms target: ${meetsTarget ? 'YES' : 'NO'}`);
}

// Run the tests
runLoadTest().catch(console.error);
```

##### Task 4.5: Performance Benchmarks (4:00 - 6:00)
```typescript
// benchmarks/tool-performance.ts
/**
 * Benchmark individual tool performance
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  tool: string;
  samples: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

class ToolBenchmark {
  private results: Map<string, number[]> = new Map();
  
  async benchmarkTool(
    name: string,
    params: any,
    samples: number = 100
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    
    // Warm up
    console.log(`Warming up ${name}...`);
    for (let i = 0; i < 10; i++) {
      await this.executeTool(name, params);
    }
    
    // Actual benchmark
    console.log(`Benchmarking ${name} with ${samples} samples...`);
    for (let i = 0; i < samples; i++) {
      const start = performance.now();
      await this.executeTool(name, params);
      const duration = performance.now() - start;
      times.push(duration);
      
      // Progress
      if (i % 10 === 0) {
        process.stdout.write('.');
      }
    }
    console.log('');
    
    // Calculate statistics
    times.sort((a, b) => a - b);
    
    return {
      tool: name,
      samples,
      mean: times.reduce((a, b) => a + b) / times.length,
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
      min: times[0],
      max: times[times.length - 1]
    };
  }
  
  async benchmarkAllTools(): Promise<void> {
    const tools = [
      { name: 'property.list', params: { customer: 'default' } },
      { name: 'property.get', params: { customer: 'default', propertyId: 'prp_123' } },
      { name: 'dns.zone.list', params: { customer: 'default' } },
      { name: 'dns.record.list', params: { customer: 'default', zone: 'example.com' } },
      { name: 'purge.url', params: { customer: 'default', urls: ['http://example.com'] } }
    ];
    
    const results: BenchmarkResult[] = [];
    
    for (const tool of tools) {
      const result = await this.benchmarkTool(tool.name, tool.params);
      results.push(result);
    }
    
    // Generate report
    this.generateReport(results);
  }
  
  private generateReport(results: BenchmarkResult[]): void {
    console.log('\n=== Performance Benchmark Report ===\n');
    
    // Summary table
    console.log('Tool Performance Summary:');
    console.log('Tool Name              | Mean    | P95     | P99     | Target');
    console.log('----------------------|---------|---------|---------|--------');
    
    let allMeetTarget = true;
    
    for (const result of results) {
      const meetsTarget = result.p95 < 100;
      allMeetTarget = allMeetTarget && meetsTarget;
      
      console.log(
        `${result.tool.padEnd(21)} | ` +
        `${result.mean.toFixed(1).padStart(6)}ms | ` +
        `${result.p95.toFixed(1).padStart(6)}ms | ` +
        `${result.p99.toFixed(1).padStart(6)}ms | ` +
        `${meetsTarget ? 'PASS' : 'FAIL'}`
      );
    }
    
    console.log('\nDetailed Statistics:');
    for (const result of results) {
      console.log(`\n${result.tool}:`);
      console.log(`  Samples: ${result.samples}`);
      console.log(`  Mean: ${result.mean.toFixed(2)}ms`);
      console.log(`  Median: ${result.median.toFixed(2)}ms`);
      console.log(`  Min: ${result.min.toFixed(2)}ms`);
      console.log(`  Max: ${result.max.toFixed(2)}ms`);
      console.log(`  P95: ${result.p95.toFixed(2)}ms`);
      console.log(`  P99: ${result.p99.toFixed(2)}ms`);
    }
    
    console.log(`\nOverall Result: ${allMeetTarget ? 'ALL PASS' : 'SOME FAIL'}`);
    console.log(`Target: <100ms for P95 response time\n`);
    
    // Save to file
    fs.writeFileSync(
      'performance-benchmark.json',
      JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
    );
  }
}
```

#### Day 5: Final Testing & Validation

##### Task 5.1: Multi-Customer Context Testing (9:00 - 11:00)
```typescript
// src/__tests__/integration/multi-customer.test.ts
/**
 * Test multi-customer context switching
 */

describe('Multi-Customer Context Switching', () => {
  const customers = ['default', 'customer-a', 'customer-b'];
  
  beforeAll(async () => {
    // Setup .edgerc with multiple customers
    const edgercContent = `
[default]
client_secret = xxx
host = default.luna.akamaiapis.net
access_token = xxx
client_token = xxx

[customer-a]
client_secret = yyy
host = customer-a.luna.akamaiapis.net
access_token = yyy
client_token = yyy
account-switch-key = ACCOUNT-A

[customer-b]
client_secret = zzz
host = customer-b.luna.akamaiapis.net
access_token = zzz
client_token = zzz
account-switch-key = ACCOUNT-B
`;
    
    fs.writeFileSync('.edgerc.test', edgercContent);
    process.env.EDGERC_PATH = '.edgerc.test';
  });
  
  it('should maintain customer isolation', async () => {
    // Create properties for each customer
    const properties = new Map();
    
    for (const customer of customers) {
      const result = await executeTool('property.list', { customer });
      properties.set(customer, result.properties);
    }
    
    // Verify each customer has different properties
    expect(properties.get('default')).not.toEqual(properties.get('customer-a'));
    expect(properties.get('customer-a')).not.toEqual(properties.get('customer-b'));
  });
  
  it('should handle concurrent requests from different customers', async () => {
    // Execute requests concurrently
    const promises = customers.map(customer =>
      executeTool('property.list', { customer })
    );
    
    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(result => {
      expect(result).toHaveProperty('properties');
    });
  });
  
  it('should properly cache per customer', async () => {
    // First request - cache miss
    const result1 = await executeTool('property.list', { 
      customer: 'customer-a' 
    });
    
    // Second request - should be cache hit
    const result2 = await executeTool('property.list', { 
      customer: 'customer-a' 
    });
    
    // Different customer - should be cache miss
    const result3 = await executeTool('property.list', { 
      customer: 'customer-b' 
    });
    
    // Verify cache isolation
    expect(result1).toEqual(result2); // Same data
    expect(result1).not.toEqual(result3); // Different data
  });
});
```

##### Task 5.2: 24-Hour Stability Test (11:00 - 12:00)
```bash
#!/bin/bash
# scripts/stability-test.sh

echo "=== 24-Hour Stability Test ==="
echo "Start time: $(date)"

# Build the server
npm run build

# Start server with monitoring
node --expose-gc dist/index-full.js &
SERVER_PID=$!

# Output files
METRICS_FILE="stability-metrics.csv"
LOG_FILE="stability.log"

# CSV header
echo "timestamp,memory_rss,memory_heap,cpu_percent,handles,connections" > $METRICS_FILE

# Monitoring function
monitor_server() {
  while kill -0 $SERVER_PID 2>/dev/null; do
    # Get process metrics
    METRICS=$(ps -p $SERVER_PID -o pid,rss,vsz,%cpu | tail -1)
    RSS=$(echo $METRICS | awk '{print $2}')
    CPU=$(echo $METRICS | awk '{print $4}')
    
    # Get Node.js metrics via debug endpoint
    HEAP=$(curl -s http://localhost:3000/debug/heap | jq -r '.heapUsed')
    HANDLES=$(lsof -p $SERVER_PID 2>/dev/null | wc -l)
    CONNECTIONS=$(netstat -an | grep ":3000" | grep ESTABLISHED | wc -l)
    
    # Log metrics
    TIMESTAMP=$(date +%s)
    echo "$TIMESTAMP,$RSS,$HEAP,$CPU,$HANDLES,$CONNECTIONS" >> $METRICS_FILE
    
    # Check for issues
    if [ $RSS -gt 512000 ]; then
      echo "WARNING: High memory usage detected: ${RSS}KB" >> $LOG_FILE
    fi
    
    # Sleep 60 seconds
    sleep 60
  done
}

# Simulate load function
simulate_load() {
  while kill -0 $SERVER_PID 2>/dev/null; do
    # Random delay between requests (1-5 seconds)
    sleep $((1 + RANDOM % 5))
    
    # Random tool selection
    TOOLS=("property.list" "dns.zone.list" "property.get")
    TOOL=${TOOLS[$RANDOM % ${#TOOLS[@]}]}
    
    # Make request
    echo "{\"method\":\"tools/call\",\"params\":{\"name\":\"$TOOL\",\"arguments\":{\"customer\":\"default\"}}}" | \
      timeout 10 node dist/index-full.js >> $LOG_FILE 2>&1
  done
}

# Start monitoring
monitor_server &
MONITOR_PID=$!

# Start load simulation (5 concurrent clients)
for i in {1..5}; do
  simulate_load &
done

# Wait 24 hours
echo "Test running for 24 hours..."
sleep 86400

# Stop everything
kill $SERVER_PID
kill $MONITOR_PID
pkill -f simulate_load

# Generate report
echo "=== Stability Test Report ===" > stability-report.txt
echo "End time: $(date)" >> stability-report.txt
echo "" >> stability-report.txt

# Analyze metrics
awk -F, '
  NR>1 {
    sum_rss+=$2; sum_heap+=$3; sum_cpu+=$4;
    if ($2>max_rss) max_rss=$2;
    if ($3>max_heap) max_heap=$3;
    count++;
  }
  END {
    print "Average RSS Memory: " sum_rss/count/1024 "MB";
    print "Max RSS Memory: " max_rss/1024 "MB";
    print "Average Heap: " sum_heap/1024/1024 "MB";
    print "Max Heap: " max_heap/1024/1024 "MB";
    print "Average CPU: " sum_cpu/count "%";
  }
' $METRICS_FILE >> stability-report.txt

# Check for memory leaks
INITIAL_RSS=$(head -2 $METRICS_FILE | tail -1 | cut -d, -f2)
FINAL_RSS=$(tail -1 $METRICS_FILE | cut -d, -f2)
GROWTH=$((FINAL_RSS - INITIAL_RSS))

echo "" >> stability-report.txt
echo "Memory Growth: ${GROWTH}KB" >> stability-report.txt

if [ $GROWTH -lt 51200 ]; then
  echo "Result: PASS - No significant memory leak detected" >> stability-report.txt
else
  echo "Result: FAIL - Possible memory leak detected" >> stability-report.txt
fi

cat stability-report.txt
```

##### Task 5.3: Bundle Size Analysis (2:00 - 4:00)
```javascript
// scripts/bundle-analysis.js
/**
 * Analyze bundle sizes and find optimization opportunities
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// Build configurations
const configs = [
  {
    name: 'minimal',
    entry: './index-minimal.ts',
    target: 'baseline'
  },
  {
    name: 'full',
    entry: './index-full.ts',
    target: 'optimized'
  },
  {
    name: 'demo',
    entry: './index-demo.ts',
    target: 'minimal'
  }
];

async function analyzeBundle(config) {
  console.log(`\nAnalyzing ${config.name} bundle...`);
  
  // Webpack config for analysis
  const webpackConfig = {
    mode: 'production',
    entry: config.entry,
    output: {
      path: path.resolve(__dirname, '../dist'),
      filename: `${config.name}.bundle.js`
    },
    target: 'node',
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    optimization: {
      minimize: true,
      usedExports: true,
      sideEffects: false
    },
    externals: {
      // Don't bundle these
      'ioredis': 'commonjs ioredis'
    },
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: 'json',
        reportFilename: `${config.name}-stats.json`
      })
    ]
  };
  
  // Build with webpack
  return new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => {
      if (err) return reject(err);
      
      const info = stats.toJson();
      
      resolve({
        name: config.name,
        size: info.assets[0].size,
        modules: info.modules.length,
        chunks: info.chunks.length,
        warnings: info.warnings.length
      });
    });
  });
}

async function findOptimizations() {
  console.log('Looking for optimization opportunities...\n');
  
  // Check for duplicate modules
  execSync('npm dedupe');
  
  // Find large dependencies
  const output = execSync('npm list --prod --json', { encoding: 'utf8' });
  const deps = JSON.parse(output);
  
  const largeDeps = [];
  
  function analyzeDep(dep, name) {
    const depPath = path.join('node_modules', name);
    if (fs.existsSync(depPath)) {
      const size = getDirSize(depPath);
      if (size > 1024 * 1024) { // > 1MB
        largeDeps.push({ name, size });
      }
    }
  }
  
  Object.keys(deps.dependencies).forEach(name => {
    analyzeDep(deps.dependencies[name], name);
  });
  
  largeDeps.sort((a, b) => b.size - a.size);
  
  return largeDeps;
}

function getDirSize(dir) {
  let size = 0;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += stat.size;
    }
  });
  
  return size;
}

async function generateReport() {
  console.log('=== Bundle Size Analysis ===\n');
  
  // Analyze each bundle
  const results = [];
  for (const config of configs) {
    const result = await analyzeBundle(config);
    results.push(result);
  }
  
  // Find optimizations
  const largeDeps = await findOptimizations();
  
  // Generate report
  console.log('Bundle Sizes:');
  console.log('-------------');
  
  let baseline = 0;
  results.forEach(result => {
    const sizeMB = (result.size / 1024 / 1024).toFixed(2);
    console.log(`${result.name}: ${sizeMB}MB (${result.modules} modules)`);
    
    if (result.name === 'full') {
      baseline = result.size;
    }
  });
  
  console.log('\nLarge Dependencies:');
  console.log('------------------');
  largeDeps.slice(0, 10).forEach(dep => {
    const sizeMB = (dep.size / 1024 / 1024).toFixed(2);
    console.log(`${dep.name}: ${sizeMB}MB`);
  });
  
  console.log('\nOptimization Suggestions:');
  console.log('------------------------');
  
  // Check if we met 15% reduction target
  const currentSize = baseline;
  const targetSize = baseline * 0.85;
  const reduction = ((baseline - currentSize) / baseline * 100).toFixed(1);
  
  console.log(`Current reduction: ${reduction}%`);
  console.log(`Target: 15% reduction`);
  console.log(`Status: ${reduction >= 15 ? 'PASS' : 'FAIL'}`);
  
  if (reduction < 15) {
    console.log('\nSuggested optimizations:');
    console.log('1. Remove unused dependencies');
    console.log('2. Use dynamic imports for optional features');
    console.log('3. Externalize heavy dependencies');
    console.log('4. Enable tree shaking');
    console.log('5. Minimize with terser');
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    bundles: results,
    largeDependencies: largeDeps,
    reduction: reduction,
    targetMet: reduction >= 15
  };
  
  fs.writeFileSync(
    'bundle-analysis-report.json',
    JSON.stringify(report, null, 2)
  );
}

// Run analysis
generateReport().catch(console.error);
```

##### Task 5.4: Final Validation Checklist (4:00 - 6:00)
```typescript
// scripts/final-validation.ts
/**
 * Run all validation checks for Beta 2 readiness
 */

interface ValidationResult {
  check: string;
  passed: boolean;
  details: string;
}

class FinalValidator {
  private results: ValidationResult[] = [];
  
  async runAllChecks(): Promise<void> {
    console.log('=== Beta 2 Final Validation ===\n');
    
    // Run all checks
    await this.checkMCPCompliance();
    await this.checkTypeScript();
    await this.checkTests();
    await this.checkPerformance();
    await this.checkMemory();
    await this.checkBundleSize();
    await this.checkDocumentation();
    await this.checkErrorHandling();
    
    // Generate report
    this.generateReport();
  }
  
  private async checkMCPCompliance(): Promise<void> {
    console.log('Checking MCP protocol compliance...');
    
    // Run MCP tests
    const result = execSync('npm test -- --testMatch="**/mcp-*.test.ts"', {
      encoding: 'utf8'
    });
    
    const passed = !result.includes('FAIL');
    
    this.results.push({
      check: 'MCP Protocol Compliance',
      passed,
      details: passed ? 'All MCP tests passing' : 'Some MCP tests failing'
    });
  }
  
  private async checkTypeScript(): Promise<void> {
    console.log('Checking TypeScript strict mode...');
    
    try {
      execSync('npx tsc --noEmit --strict', { encoding: 'utf8' });
      
      this.results.push({
        check: 'TypeScript Strict Mode',
        passed: true,
        details: 'No TypeScript errors'
      });
    } catch (error) {
      this.results.push({
        check: 'TypeScript Strict Mode',
        passed: false,
        details: 'TypeScript errors found'
      });
    }
  }
  
  private async checkTests(): Promise<void> {
    console.log('Checking test coverage...');
    
    const coverage = execSync('npm test -- --coverage --json', {
      encoding: 'utf8'
    });
    
    const data = JSON.parse(coverage);
    const lineCoverage = data.coverageMap.total.lines.pct;
    
    this.results.push({
      check: 'Test Coverage',
      passed: lineCoverage >= 80,
      details: `${lineCoverage}% line coverage`
    });
  }
  
  private async checkPerformance(): Promise<void> {
    console.log('Checking response times...');
    
    // Read performance benchmark results
    const benchmarks = JSON.parse(
      fs.readFileSync('performance-benchmark.json', 'utf8')
    );
    
    const allUnder100ms = benchmarks.results.every(r => r.p95 < 100);
    
    this.results.push({
      check: 'Response Time <100ms',
      passed: allUnder100ms,
      details: allUnder100ms ? 'All tools under 100ms' : 'Some tools over 100ms'
    });
  }
  
  private async checkMemory(): Promise<void> {
    console.log('Checking memory stability...');
    
    // Read stability test results
    if (fs.existsSync('stability-report.txt')) {
      const report = fs.readFileSync('stability-report.txt', 'utf8');
      const passed = report.includes('PASS');
      
      this.results.push({
        check: '24hr Memory Stability',
        passed,
        details: passed ? 'No memory leaks detected' : 'Possible memory leak'
      });
    } else {
      this.results.push({
        check: '24hr Memory Stability',
        passed: false,
        details: 'Stability test not run'
      });
    }
  }
  
  private async checkBundleSize(): Promise<void> {
    console.log('Checking bundle size reduction...');
    
    const report = JSON.parse(
      fs.readFileSync('bundle-analysis-report.json', 'utf8')
    );
    
    this.results.push({
      check: 'Bundle Size Reduction',
      passed: report.targetMet,
      details: `${report.reduction}% reduction (target: 15%)`
    });
  }
  
  private async checkDocumentation(): Promise<void> {
    console.log('Checking documentation...');
    
    const requiredDocs = [
      'README.md',
      'ARCHITECTURE.md',
      'TROUBLESHOOTING.md',
      'CACHE_CONFIGURATION.md'
    ];
    
    const allExist = requiredDocs.every(doc => fs.existsSync(doc));
    
    this.results.push({
      check: 'Documentation Complete',
      passed: allExist,
      details: allExist ? 'All docs present' : 'Missing documentation'
    });
  }
  
  private async checkErrorHandling(): Promise<void> {
    console.log('Checking error handling...');
    
    // Check for circuit breaker implementation
    const hasCircuitBreaker = fs.existsSync('src/utils/circuit-breaker.ts');
    const hasRetry = fs.existsSync('src/utils/retry.ts');
    
    const passed = hasCircuitBreaker && hasRetry;
    
    this.results.push({
      check: 'Error Handling',
      passed,
      details: passed ? 'Circuit breaker and retry implemented' : 'Missing error handling'
    });
  }
  
  private generateReport(): void {
    console.log('\n=== Beta 2 Readiness Report ===\n');
    
    let passCount = 0;
    let failCount = 0;
    
    this.results.forEach(result => {
      const status = result.passed ? 'PASS' : 'FAIL';
      const icon = result.passed ? '✓' : '✗';
      
      console.log(`${icon} ${result.check}: ${status}`);
      console.log(`  ${result.details}\n`);
      
      if (result.passed) passCount++;
      else failCount++;
    });
    
    const allPassed = failCount === 0;
    
    console.log('Summary:');
    console.log(`- Passed: ${passCount}`);
    console.log(`- Failed: ${failCount}`);
    console.log(`- Overall: ${allPassed ? 'READY FOR BETA 2' : 'NOT READY'}`);
    
    if (!allPassed) {
      console.log('\nAction items:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`- Fix: ${r.check}`);
        });
    }
    
    // Save report
    fs.writeFileSync(
      'beta2-validation-report.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        results: this.results,
        ready: allPassed
      }, null, 2)
    );
  }
}

// Run validation
new FinalValidator().runAllChecks();
```

## Daily Execution Schedule

### Week Overview
- **Day 1**: Architecture Simplification ✓
- **Day 2**: Documentation Sprint ✓
- **Day 3**: Error Handling & Resilience ✓
- **Day 4**: Testing Infrastructure Part 1 ✓
- **Day 5**: Testing Infrastructure Part 2 & Final Validation ✓

### Daily Routine
1. **Morning Standup (9:00 AM)**
   - Review previous day's work
   - Check todo file status
   - Plan day's tasks

2. **Execution (9:30 AM - 5:30 PM)**
   - Follow detailed task plan
   - Test after each change
   - Document decisions

3. **End of Day (5:30 PM)**
   - Update todo file
   - Commit completed work
   - Prepare for next day

## Success Metrics

### Must Have (Beta 2 Requirements)
- [x] All MCP protocol tests passing
- [x] Zero TypeScript errors with strict mode
- [ ] Response time <100ms for all tools
- [ ] Memory usage stable over 24hr test
- [x] Successfully tested with Claude Desktop
- [ ] Bundle size reduced by 15%+

### Should Have
- [ ] 100% test coverage on critical paths
- [ ] Complete documentation
- [ ] Demo completes in <5 minutes
- [ ] All user journeys tested

### Nice to Have
- [ ] Performance benchmarks published
- [ ] Video walkthrough created
- [ ] Migration guide for v1 users

## Risk Mitigation

### Backup Plans
1. **If tests fail**: Revert to last known good state
2. **If performance degrades**: Profile and optimize incrementally
3. **If memory leaks found**: Use heap snapshots to identify source
4. **If bundle too large**: Externalize heavy dependencies

### Defensive Practices
1. **Small commits**: One feature per commit
2. **Feature branches**: Isolate risky changes
3. **Continuous testing**: Run tests before each commit
4. **Performance monitoring**: Check metrics after each change
5. **Documentation first**: Document before implementing

## Conclusion

This detailed plan provides a systematic approach to completing Beta 2 readiness in 5 working days. By following this plan meticulously, we can ensure all requirements are met without introducing new bugs.

Key principles:
- Test everything
- Document as you go
- Keep changes small
- Monitor performance
- Be ready to rollback

The plan is designed to be executed sequentially, with each day building on the previous day's work. Daily check-ins and continuous testing ensure we stay on track and catch issues early.