# Remote Transport Support

The ALECS MCP Server supports multiple transport protocols for remote access, enabling integration with web applications, remote services, and distributed systems.

## Available Transports

### 1. **Standard I/O (Default)**
- Used by Claude Desktop and CLI
- Direct process communication
- Most efficient for local use

### 2. **WebSocket Transport**
- Real-time bidirectional communication
- Ideal for web applications
- Supports all MCP features

### 3. **Server-Sent Events (SSE)**
- One-way server-to-client streaming
- Good for progress updates
- Lightweight alternative to WebSocket

### 4. **HTTP Transport**
- Simple request/response
- REST-like interface
- Easy to integrate

## WebSocket Transport

### Starting the Server

```bash
# Default port 8080
node dist/index-websocket.js

# Custom port
PORT=3000 node dist/index-websocket.js
```

### Client Example

```javascript
const ws = new WebSocket('ws://localhost:8080/mcp');

ws.on('open', () => {
  // Send MCP request
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  console.log('Tools:', response.result.tools);
});
```

### Features
- Full MCP protocol support
- Authentication via headers
- Progress token support
- Connection pooling

## SSE Transport

### Starting the Server

```bash
# Default port 8081
node dist/index-sse.js

# Custom port
PORT=3001 node dist/index-sse.js
```

### Client Example

```javascript
const eventSource = new EventSource('http://localhost:8081/mcp/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};

// Listen for specific events
eventSource.addEventListener('progress', (event) => {
  const progress = JSON.parse(event.data);
  console.log('Progress:', progress.percentage);
});
```

### Features
- Server push updates
- Progress streaming
- Automatic reconnection
- Lightweight protocol

## HTTP Transport

### Endpoint

```
POST http://localhost:8082/mcp
Content-Type: application/json
```

### Request Example

```bash
curl -X POST http://localhost:8082/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Features
- Simple REST-like API
- CORS support
- Stateless requests
- Easy integration

## Security Considerations

### Authentication

All transports support authentication:

1. **API Key**: Pass in headers
   ```
   Authorization: Bearer YOUR_API_KEY
   ```

2. **Customer Context**: Include in requests
   ```json
   {
     "params": {
       "arguments": {
         "customer": "customer-name"
       }
     }
   }
   ```

### CORS Configuration

For web clients, configure CORS:

```javascript
// Environment variables
CORS_ORIGIN=https://your-app.com
CORS_CREDENTIALS=true
```

### Rate Limiting

All transports include rate limiting:
- Default: 100 requests per minute
- Configurable via environment variables
- Per-client tracking

## Use Cases

### WebSocket
- Real-time dashboards
- Interactive web applications
- Collaborative tools
- Progress monitoring

### SSE
- Live logs streaming
- Status updates
- Notification systems
- Progress bars

### HTTP
- Simple integrations
- Webhook endpoints
- Batch operations
- Stateless requests

## Performance Considerations

| Transport | Latency | Throughput | Resource Usage |
|-----------|---------|------------|----------------|
| StdIO     | Lowest  | Highest    | Lowest         |
| WebSocket | Low     | High       | Medium         |
| SSE       | Medium  | Medium     | Low            |
| HTTP      | High    | Low        | Low            |

## Example: Web Dashboard

```html
<!DOCTYPE html>
<html>
<head>
  <title>Akamai Dashboard</title>
</head>
<body>
  <div id="properties"></div>
  
  <script>
    const ws = new WebSocket('ws://localhost:8080/mcp');
    
    ws.onopen = () => {
      // List properties
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list-properties',
          arguments: {}
        }
      }));
    };
    
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.id === 1) {
        // Display properties
        const properties = JSON.parse(response.result.content[0].text);
        document.getElementById('properties').innerHTML = 
          properties.map(p => `<div>${p.propertyName}</div>`).join('');
      }
    };
  </script>
</body>
</html>
```

## Troubleshooting

### WebSocket Connection Fails
- Check firewall settings
- Verify port is not in use
- Ensure server is running

### SSE Reconnection Loop
- Check CORS headers
- Verify event format
- Monitor server logs

### HTTP Timeout
- Increase timeout settings
- Check payload size
- Verify network connectivity