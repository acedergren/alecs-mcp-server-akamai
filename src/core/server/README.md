# Core Server Infrastructure

## Overview
This directory contains the consolidated server infrastructure that eliminates ~1,500+ lines of duplicate code across 8 MCP servers.

## Architecture

```
src/core/server/
├── base-mcp-server.ts          # Abstract base class for all MCP servers
├── middleware/
│   ├── auth.middleware.ts      # Authentication & customer validation
│   ├── cache.middleware.ts     # Response caching layer
│   ├── rate-limit.middleware.ts # Rate limiting & throttling
│   ├── batch.middleware.ts     # Batch operation handling
│   └── coalesce.middleware.ts  # Request coalescing
├── utils/
│   ├── logging.ts              # Standardized logging
│   ├── monitoring.ts           # Health checks & metrics
│   ├── error-handler.ts        # Unified error handling
│   └── response-formatter.ts   # Consistent response formatting
├── registry/
│   ├── tool-registry.ts        # Tool registration & caching
│   └── schema-cache.ts         # Zod schema caching
└── types/
    └── server.types.ts         # Shared server types

## Features Consolidated

### 1. **Base Server Class** (~400 LOC saved)
- Server initialization
- MCP protocol handlers
- Transport management
- Lifecycle management

### 2. **Authentication & Authorization** (~200 LOC saved)
- Customer validation middleware
- Multi-tenant support
- API key management
- Permission checking

### 3. **Request/Response Pipeline** (~300 LOC saved)
- Request validation
- Response formatting
- Error standardization
- Performance tracking

### 4. **Monitoring & Observability** (~150 LOC saved)
- Centralized logging
- Health monitoring
- Metrics collection
- Audit logging

### 5. **Caching Infrastructure** (~200 LOC saved)
- Response caching
- Schema caching
- Customer config caching
- Cache invalidation

### 6. **Batch Operations** (~150 LOC saved)
- Bulk request handling
- Progress tracking
- Transaction support
- Error aggregation

### 7. **Resource Management** (~100 LOC saved)
- Interval cleanup
- Connection pooling
- Memory management
- Graceful shutdown

## Usage Example

```typescript
import { BaseMCPServer } from '../core/server/base-mcp-server';
import { authMiddleware } from '../core/server/middleware/auth.middleware';
import { cacheMiddleware } from '../core/server/middleware/cache.middleware';

class PropertyServer extends BaseMCPServer {
  constructor() {
    super({
      name: 'alecs-property-server',
      version: '2.0.0',
      middleware: [
        authMiddleware(),
        cacheMiddleware({ ttl: 300 }),
      ],
    });
  }

  protected registerTools(): void {
    this.toolRegistry.register({
      name: 'list_properties',
      schema: PropertyListSchema,
      handler: this.listProperties.bind(this),
      cache: { key: 'properties', ttl: 60 },
    });
  }
}
```

## Migration Guide

1. Extend `BaseMCPServer` instead of creating Server directly
2. Move tool definitions to `registerTools()`
3. Remove duplicate logging, error handling, monitoring code
4. Use middleware for cross-cutting concerns
5. Leverage built-in caching and batch support

## Benefits

- **Code Reduction**: ~1,500 lines eliminated
- **Consistency**: Uniform behavior across all servers
- **Performance**: Built-in caching, coalescing, pooling
- **Maintainability**: Single source of truth
- **Testability**: Mock-friendly architecture
- **Extensibility**: Plugin middleware system