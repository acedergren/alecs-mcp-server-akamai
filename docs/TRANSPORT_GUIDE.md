# MCP Transport Guide

## Overview

The ALECS MCP Server supports multiple transport types for different deployment scenarios. All transports are fully MCP-compliant and implement the official Transport interface.

## Available Transports

### 1. Standard I/O (stdio) - Default
- **Use Case**: Claude Desktop, local CLI tools
- **Protocol**: stdin/stdout communication
- **Configuration**: None required (default)
- **Start Command**: `npm start` or `npm run start:stdio`

### 2. Streamable HTTP (New!) 
- **Use Case**: CDN deployment, web-based clients, modern MCP applications
- **Protocol**: HTTP POST + Server-Sent Events (SSE)
- **Configuration**:
  - `HTTP_PORT`: Port number (default: 8080)
  - `HTTP_HOST`: Host address (default: 0.0.0.0)
  - `HTTP_PATH`: Base path (default: /mcp)
- **Start Command**: `npm run start:http`
- **Endpoints**:
  - `POST /mcp/message` - Send messages to server
  - `GET /mcp/events` - Receive server events via SSE
  - `GET /mcp/health` - Health check endpoint

### 3. WebSocket
- **Use Case**: Real-time bidirectional communication
- **Protocol**: WebSocket with JSON-RPC
- **Configuration**:
  - `WS_PORT`: Port number (default: 8080)
  - `WS_HOST`: Host address (default: 0.0.0.0)
  - `WS_PATH`: WebSocket path (default: /mcp)
- **Start Command**: `npm run start:websocket`

### 4. Server-Sent Events (Legacy)
- **Status**: Deprecated - use Streamable HTTP instead
- **Use Case**: Legacy compatibility
- **Start Command**: `npm run start:sse`

## Transport Selection

The transport is selected via the `MCP_TRANSPORT` environment variable:

```bash
# Standard I/O (default)
MCP_TRANSPORT=stdio npm start

# Streamable HTTP (recommended for web/CDN)
MCP_TRANSPORT=streamable-http npm start

# WebSocket
MCP_TRANSPORT=websocket npm start
```

## CDN Deployment Guide

For CDN deployment, use the **Streamable HTTP** transport:

### Benefits
- Stateless HTTP requests work perfectly with CDN edge nodes
- SSE for efficient server-to-client streaming
- CORS support for browser-based clients
- Resumable connections with token support
- Geographic distribution friendly

### Configuration Example
```bash
# Environment variables for CDN deployment
HTTP_PORT=443
HTTP_HOST=0.0.0.0
HTTP_PATH=/api/mcp
CORS_ENABLED=true
MCP_TRANSPORT=streamable-http

npm start
```

### CDN Configuration
Configure your CDN (e.g., Akamai) to:
1. Cache `GET /mcp/health` responses (TTL: 60s)
2. Pass through `POST /mcp/message` without caching
3. Enable long-lived connections for `GET /mcp/events`
4. Set appropriate CORS headers if not handled by the server

## Legacy Compatibility

### Claude Desktop
Claude Desktop currently requires the stdio transport. This is the default, so no special configuration is needed:

```bash
npm start  # Uses stdio by default
```

### Protocol Version Compatibility
The server includes a compatibility wrapper that handles differences between MCP protocol versions:
- **2024-11-05**: Used by Claude Desktop (legacy)
- **2025-06-18**: Current protocol version

The wrapper automatically detects and adapts to the client's protocol version.

## Client Implementation Examples

### Streamable HTTP Client (JavaScript)
```javascript
// Send a message
const response = await fetch('http://localhost:8080/mcp/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-ID': 'my-client-id'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 1
  })
});

// Receive events
const eventSource = new EventSource('http://localhost:8080/mcp/events');
eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### WebSocket Client (JavaScript)
```javascript
const ws = new WebSocket('ws://localhost:8080/mcp');

ws.onopen = () => {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 1
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## Security Considerations

1. **Authentication**: All network transports support token-based authentication via the `AUTH_TYPE` environment variable
2. **TLS/SSL**: For production, always use HTTPS/WSS with proper certificates
3. **CORS**: Configure CORS appropriately for your deployment scenario
4. **Rate Limiting**: Network transports include built-in rate limiting

## Troubleshooting

### Transport Won't Start
- Check that the required port is not already in use
- Ensure all dependencies are installed (`npm install`)
- Check logs for specific error messages

### Connection Issues
- Verify firewall rules allow the configured port
- For CDN deployment, ensure edge nodes can reach the origin
- Check CORS configuration if connecting from a browser

### Protocol Errors
- Ensure client sends proper JSON-RPC 2.0 messages
- Check that the client includes required headers
- Verify the protocol version compatibility

## Future Enhancements

- HTTP/2 transport for improved CDN performance
- gRPC transport for high-performance scenarios
- QUIC/HTTP/3 transport for ultra-low latency