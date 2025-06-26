#!/usr/bin/env node

/**
 * Launch ALECS with WebSocket transport
 */

process.env.MCP_TRANSPORT = 'websocket';

// Default WebSocket settings if not already set
if (!process.env.WS_PORT) process.env.WS_PORT = '8080';
if (!process.env.WS_HOST) process.env.WS_HOST = '0.0.0.0';
if (!process.env.WS_PATH) process.env.WS_PATH = '/mcp';
if (!process.env.AUTH_TYPE) process.env.AUTH_TYPE = 'token';

// Import and run the unified launcher
import('../index-unified').catch(error => {
  console.error('[ERROR] Failed to start ALECS WebSocket server:', error);
  process.exit(1);
});