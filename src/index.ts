#!/usr/bin/env node

/**
 * ALECS MCP Server - Main Entry Point
 * 
 * This is the main entry point that:
 * 1. Checks for MCP_TRANSPORT environment variable
 * 2. If set, launches unified transport mode
 * 3. If not set, launches interactive server selector
 */

import { getTransportFromEnv } from './config/transport-config';

// Check if transport is specified
const transportConfig = getTransportFromEnv();

if (process.env.MCP_TRANSPORT && process.env.MCP_TRANSPORT !== 'stdio') {
  // Launch unified transport mode
  import('./index-unified').catch(error => {
    console.error('[ERROR] Failed to start ALECS:', error);
    process.exit(1);
  });
} else {
  // Launch interactive launcher (default)
  import('./interactive-launcher').catch(error => {
    console.error('[ERROR] Failed to start ALECS:', error);
    process.exit(1);
  });
}