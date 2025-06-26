#!/usr/bin/env node

/**
 * Launch ALECS with HTTP transport
 */

process.env.MCP_TRANSPORT = 'http';

// Default HTTP settings if not already set
if (!process.env.HTTP_PORT) process.env.HTTP_PORT = '3000';
if (!process.env.HTTP_HOST) process.env.HTTP_HOST = '0.0.0.0';
if (!process.env.HTTP_PATH) process.env.HTTP_PATH = '/mcp';
if (!process.env.CORS_ENABLED) process.env.CORS_ENABLED = 'true';

// Import and run the unified launcher
import('../index-unified').catch(error => {
  console.error('[ERROR] Failed to start ALECS HTTP server:', error);
  process.exit(1);
});