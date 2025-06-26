# ALECS MCP Server Architecture

## Overview

ALECS (Akamai Legacy Edge Configuration Server) uses a modular architecture that supports multiple transport modes and deployment configurations.

## Architecture Principles

1. **Modular Design**: Each Akamai service (Property Manager, DNS, Certificates, etc.) is a separate module
2. **Transport Agnostic**: Core server logic is decoupled from transport layer
3. **Configuration-Driven**: Behavior controlled via environment variables and configuration files
4. **Customer Multi-Tenancy**: Support for multiple Akamai accounts via `.edgerc` sections

## Directory Structure

```
src/
├── index.ts                # Main entry point (streamlined)
├── index-full.ts          # Full server implementation
├── config/
│   └── transport-config.ts # Transport configuration
├── servers/               # Modular service implementations
│   ├── property-server.ts # Property management
│   ├── dns-server.ts      # DNS management
│   ├── certs-server.ts    # Certificate management
│   ├── reporting-server.ts # Analytics/reporting
│   └── security-server.ts  # Security/WAF
├── tools/                 # Tool implementations
├── transport/             # Transport implementations
├── utils/                 # Shared utilities
└── types/                 # TypeScript type definitions
```

## Transport Modes

### 1. Standard I/O (stdio)
- Default mode for Claude Desktop
- Direct process communication
- No network exposure
- Local integrations only

### 2. WebSocket
- Bidirectional communication
- Persistent connection
- Real-time updates
- Token-based authentication
- Ideal for interactive sessions

### 3. Server-Sent Events (SSE) / Streamable HTTP
- One-way server-to-client streaming
- HTTP POST for client-to-server
- SSE stream for server-to-client responses
- Token-based authentication
- CORS support for web clients

## Configuration

Transport selection via environment variables:

```bash
# Transport type
MCP_TRANSPORT=stdio|websocket|sse

# WebSocket Configuration
WS_PORT=8080
WS_HOST=0.0.0.0
WS_PATH=/mcp

# SSE Configuration
SSE_PORT=3001
SSE_HOST=0.0.0.0
SSE_PATH=/mcp/sse

# Common Configuration
CORS_ENABLED=true
AUTH_TYPE=none|token
TOKEN_MASTER_KEY=your-secret-key
SSL_ENABLED=true
ALECS_SSL_CERT=/path/to/cert.pem
ALECS_SSL_KEY=/path/to/key.pem
```

## Usage Examples

### Default Mode (stdio for Claude Desktop)
```bash
# Standard I/O (Claude Desktop) - Default
npm start

# WebSocket Server
MCP_TRANSPORT=websocket WS_PORT=8080 npm start

# SSE Server
MCP_TRANSPORT=sse SSE_PORT=3001 npm start
```

### Environment-Based Transport Selection
```bash
# Default (stdio for local/Claude Desktop)
npm start

# WebSocket (bidirectional remote)
MCP_TRANSPORT=websocket npm start

# SSE (Streamable HTTP remote)
MCP_TRANSPORT=sse npm start
```

### Modular Servers
```bash
# Single service module
node dist/servers/property-server.js
node dist/servers/dns-server.js
node dist/servers/certs-server.js
node dist/servers/reporting-server.js
node dist/servers/security-server.js
```

## Authentication

### Token Authentication (WebSocket/SSE)
- Master token via `TOKEN_MASTER_KEY` environment variable
- Per-connection token validation
- Automatic token expiration

### OAuth 2.1 (HTTP)
- Standards-compliant OAuth flow
- JWKS validation
- Scope-based authorization

### No Authentication (stdio)
- Process-level security
- Trusted by design

## Caching

- **In-Memory**: EnhancedSmartCache with LRU/LFU/FIFO eviction
- **Compression**: Automatic for large responses
- **Request Coalescing**: Prevents duplicate API calls
- **Adaptive TTL**: Based on data freshness requirements

## Error Handling

- MCP-compliant error codes
- Structured error responses
- Request ID tracking
- Comprehensive logging

## Performance Optimizations

1. **Connection Pooling**: Reuse HTTP connections
2. **Parallel Processing**: Concurrent tool execution
3. **Smart Caching**: Reduce API calls
4. **Compression**: Minimize payload size
5. **Circuit Breakers**: Prevent cascade failures

## Security Considerations

1. **Transport Security**: TLS/SSL support
2. **Authentication**: Multiple auth methods
3. **Rate Limiting**: Prevent abuse
4. **Input Validation**: Zod schemas
5. **Audit Logging**: Track all operations

## Future Enhancements

1. **GraphQL Transport**: Alternative query interface
2. **gRPC Support**: High-performance RPC
3. **Metrics Export**: Prometheus/OpenTelemetry
4. **Hot Reload**: Dynamic tool updates
5. **Plugin System**: Third-party extensions