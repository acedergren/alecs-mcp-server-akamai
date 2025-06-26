#!/usr/bin/env node

/**
 * Launch ALECS with Server-Sent Events (SSE) transport
 */

process.env.MCP_TRANSPORT = 'sse';

// Default SSE settings if not already set
if (!process.env.SSE_PORT) process.env.SSE_PORT = '3001';
if (!process.env.SSE_HOST) process.env.SSE_HOST = '0.0.0.0';
if (!process.env.SSE_PATH) process.env.SSE_PATH = '/mcp/sse';
if (!process.env.CORS_ENABLED) process.env.CORS_ENABLED = 'true';

// Import and run the unified launcher
import('../index-unified').catch(error => {
  console.error('[ERROR] Failed to start ALECS SSE server:', error);
  process.exit(1);
});