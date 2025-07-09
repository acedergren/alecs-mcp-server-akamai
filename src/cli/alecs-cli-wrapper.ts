#!/usr/bin/env node

/**
 * ALECS CLI Wrapper
 * 
 * Entry point for the alecs command line tool
 */

// Check if this is a generate command
const args = process.argv.slice(2);
if (args.length > 0 && args[0] === 'generate') {
  // Import and run the generate CLI
  import('./index').then(() => {
    // CLI will handle the command
  }).catch(error => {
    console.error('Failed to load generate CLI:', error);
    process.exit(1);
  });
} else {
  // For non-generate commands, show help
  console.log(`
ALECS Code Generation CLI

Usage:
  alecs generate domain <name>        Generate a new domain
  alecs generate tool <domain> <name> Generate a new tool
  alecs generate list                 List available templates
  alecs generate --help               Show help

Examples:
  alecs generate domain billing
  alecs generate tool billing cost_analysis
  alecs generate list

Options:
  --description <desc>   Custom description
  --api <name>          API base name
  --method <method>     HTTP method (GET, POST, PUT, DELETE)
  --endpoint <path>     API endpoint path
  --dry-run             Preview without creating files
`);
}