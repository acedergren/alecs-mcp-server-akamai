#!/usr/bin/env node

/**
 * Launch ALECS with stdio transport (for Claude Desktop)
 */

process.env.MCP_TRANSPORT = 'stdio';

// Import and run the unified launcher
import('../index-unified').catch(error => {
  console.error('[ERROR] Failed to start ALECS:', error);
  process.exit(1);
});