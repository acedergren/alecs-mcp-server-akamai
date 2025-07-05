#!/usr/bin/env node

/**
 * ALECS CLI Wrapper - Simple command router for NPM package users
 * 
 * CODE KAI: Provides intuitive CLI interface for different server variants
 * 
 * Usage:
 *   alecs                    # Run main server
 *   alecs start:property     # Run property server only  
 *   alecs start:dns          # Run DNS server only
 *   alecs --help             # Show help
 */

import { spawn } from 'child_process';
import { join } from 'path';

const args = process.argv.slice(2);

// Map of start: commands to npm scripts
const startCommands: Record<string, string> = {
  'start:property': 'start:property',
  'start:dns': 'start:dns', 
  'start:certs': 'start:certs',
  'start:reporting': 'start:reporting',
  'start:security': 'start:security',
  'start:appsec': 'start:appsec',
  'start:fastpurge': 'start:fastpurge',
  'start:network-lists': 'start:network-lists',
};

// Handle --help
if (args.includes('--help') || args.includes('-h')) {
  // Using process.stdout for proper CLI output
  process.stdout.write(`
ALECS - A Launchgrid for Edge & Cloud Services

Usage:
  alecs                        Run main server (all 198+ tools)
  alecs start:property         Property management server only
  alecs start:dns              DNS management server only  
  alecs start:certs            Certificate management server only
  alecs start:reporting        Reporting server only
  alecs start:security         Security server (network lists) only
  alecs start:appsec           Application security server only
  alecs start:fastpurge        Fast purge server only
  alecs start:network-lists    Network lists server only

Options:
  -h, --help                   Show this help message
  -v, --version                Show version number

Environment Variables:
  MCP_TRANSPORT               Transport type (stdio, websocket, sse)
  EDGERC_PATH                 Path to .edgerc file
  AKAMAI_CUSTOMER             Default customer section

Examples:
  # Run main server for Claude Desktop
  alecs
  
  # Run only DNS management  
  alecs start:dns
  
  # Run with WebSocket transport
  MCP_TRANSPORT=websocket alecs

Documentation: https://github.com/acedergren/alecs-mcp-server-akamai
`);
  process.exit(0);
}

// Handle --version
if (args.includes('--version') || args.includes('-v')) {
  const packageJson = require('../package.json');
  process.stdout.write(packageJson.version + '\n');
  process.exit(0);
}

// Handle start: commands
const command = args[0];
if (command && startCommands[command]) {
  // Set npm_lifecycle_event to trigger module loading in index.js
  process.env['npm_lifecycle_event'] = startCommands[command];
}

// SECURITY: Sanitize args to prevent command injection
// Only allow whitelisted args that are safe to pass through
const allowedArgs = args.filter(arg => {
  // Allow start: commands that are in our whitelist
  if (startCommands[arg]) {return true;}
  
  // Allow common flags
  if (arg === '--help' || arg === '-h') {return true;}
  if (arg === '--version' || arg === '-v') {return true;}
  if (arg === '--debug') {return true;}
  if (arg === '--verbose') {return true;}
  
  // Block any suspicious patterns
  if (arg.includes(';') || arg.includes('&') || arg.includes('|')) {return false;}
  if (arg.includes('$') || arg.includes('`') || arg.includes('!')) {return false;}
  if (arg.includes('<') || arg.includes('>')) {return false;}
  
  // Allow environment variable assignments (KEY=value format)
  if (/^[A-Z_][A-Z0-9_]*=.+$/i.test(arg)) {return true;}
  
  return false;
});

// Run the main index.js with sanitized args
const indexPath = join(__dirname, 'index.js');
const child = spawn(process.execPath, [indexPath, ...allowedArgs], {
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('error', (error) => {
  process.stderr.write(`Failed to start server: ${error.message}\n`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});