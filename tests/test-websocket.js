const WebSocket = require('ws');

const url = 'ws://localhost:8082/mcp';
const token = 'NJn6J0Z7Hq0WkXGCGnv5ESzGJZTiabHIe9I9u509OyI';

console.log('Connecting to WebSocket server...');

const ws = new WebSocket(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

ws.on('open', () => {
  console.log('Connected successfully!');
  
  // Send MCP initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  console.log('Sending initialize request:', JSON.stringify(initRequest, null, 2));
  ws.send(JSON.stringify(initRequest));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
});

// Keep the connection alive
setTimeout(() => {
  console.log('Test complete, closing connection...');
  ws.close();
}, 5000);