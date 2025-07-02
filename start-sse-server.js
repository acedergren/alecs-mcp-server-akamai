#!/usr/bin/env node

// SSE server startup script
const path = require('path');

// Set SSE transport mode
process.env.MCP_TRANSPORT = 'sse';
process.env.PORT = process.env.PORT || '8081';

// Start the main server
require(path.join(__dirname, 'dist', 'index.js'));