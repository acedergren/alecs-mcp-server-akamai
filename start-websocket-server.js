#!/usr/bin/env node

// WebSocket server startup script
const path = require('path');

// Set WebSocket transport mode
process.env.MCP_TRANSPORT = 'websocket';
process.env.PORT = process.env.PORT || '8082';

// Start the main server
require(path.join(__dirname, 'dist', 'index.js'));