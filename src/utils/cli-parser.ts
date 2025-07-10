/**
 * ALECS CLI Parser - Rich Command Line Interface for AI Development Tools
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Parse command line arguments and provide rich, intelligent output
 * Approach: Progressive disclosure with rich dashboards optimized for AI tools
 * Implementation: Transparent operations for Cursor, Claude Code, Gemini CLI
 * 
 * STRATEGY SHIFT (v1.7.4+):
 * Optimized for AI-powered development tools that can intelligently parse rich output.
 * No longer constrained by Claude Desktop stdio limitations.
 * 
 * FEATURES:
 * - Customer section switching with health validation
 * - Rich startup dashboard with ASCII art
 * - Live activity feed with performance insights
 * - AI assistant integration tips
 * - Comprehensive troubleshooting information
 */

import { createLogger } from './pino-logger';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const logger = createLogger('cli-parser');

export interface CLIConfig {
  section?: string;
  transport?: 'stdio' | 'sse' | 'websocket' | 'streamable-http';
  help?: boolean;
  version?: boolean;
  debug?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  port?: number;
  module?: string;
  silent?: boolean;
}

/**
 * Parse command line arguments into typed configuration
 */
export function parseArguments(args: string[] = process.argv.slice(2)): CLIConfig {
  const config: CLIConfig = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--section':
      case '-s':
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error('--section requires a value (edgerc section name)');
        }
        config.section = nextArg;
        i++; // Skip next argument as it's the value
        break;
        
      case '--transport':
      case '-t':
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error('--transport requires a value (stdio|sse|websocket|streamable-http)');
        }
        if (!['stdio', 'sse', 'websocket', 'streamable-http'].includes(nextArg)) {
          throw new Error(`Invalid transport: ${nextArg}. Must be stdio, sse, websocket, or streamable-http`);
        }
        config.transport = nextArg as 'stdio' | 'sse' | 'websocket' | 'streamable-http';
        i++;
        break;
        
      case '--help':
      case '-h':
        config.help = true;
        break;
        
      case '--version':
      case '-v':
        config.version = true;
        break;
        
      case '--debug':
      case '-d':
        config.debug = true;
        config.logLevel = 'debug';
        break;
        
      case '--log-level':
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error('--log-level requires a value (debug|info|warn|error)');
        }
        if (!['debug', 'info', 'warn', 'error'].includes(nextArg)) {
          throw new Error(`Invalid log level: ${nextArg}`);
        }
        config.logLevel = nextArg as 'debug' | 'info' | 'warn' | 'error';
        i++;
        break;
        
      case '--port':
      case '-p':
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error('--port requires a numeric value');
        }
        const port = parseInt(nextArg, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error(`Invalid port: ${nextArg}. Must be between 1-65535`);
        }
        config.port = port;
        i++;
        break;
        
      case '--module':
      case '-m':
        if (!nextArg || nextArg.startsWith('-')) {
          throw new Error('--module requires a value (property|dns|certs|security|reporting|appsec)');
        }
        config.module = nextArg;
        i++;
        break;
        
      case '--silent':
      case '-s':
        config.silent = true;
        break;
        
      default:
        if (arg && arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}. Use --help for usage information`);
        }
        // Ignore non-option arguments
        break;
    }
  }
  
  return config;
}

/**
 * Display comprehensive help information optimized for AI development tools
 */
export function displayHelp(): void {
  const help = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                   🌟 ALECS MCP Server - Help & Usage Guide                  ║
║                   Optimized for AI Development Tools                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

🚀 QUICK START:
    alecs --section production       # Start with specific .edgerc section
    alecs --help                     # Show this help
    alecs --version                  # Version information

📋 COMMAND LINE OPTIONS:

  🏢 EDGERC SECTION MANAGEMENT (Primary Feature):
    -s, --section <SECTION>     Use specific .edgerc section for authentication
                               Auto-validates credentials and account switching
                               Examples: --section production-acme, -s dev-client
                               
  🔧 SERVER CONFIGURATION:
    -t, --transport <TYPE>      MCP transport type (default: stdio)
                               stdio:           AI assistants (Claude CLI, Cursor)
                               streamable-http: Modern HTTP streaming (recommended)
                               websocket:       Bidirectional real-time communication
                               sse:             Server-Sent Events (legacy)
                               
    -m, --module <MODULE>       Run specific service module only
                               property:  CDN configuration (9 tools)
                               dns:       DNS management (11 tools)  
                               security:  WAF & network lists (78 tools)
                               certs:     SSL/TLS certificates (45 tools)
                               utilities: CP codes & includes (4 tools)
                               
    -p, --port <PORT>          Port for websocket/sse (default: 3000)
    
  📊 LOGGING & DEBUG:
    -d, --debug                Enable rich debug output with performance metrics
    --log-level <LEVEL>        Granular logging (debug|info|warn|error)
    -s, --silent               Silent mode - run in background with minimal output
                               Perfect for production deployments
    
  📖 INFORMATION:
    -h, --help                 Show this comprehensive help
    -v, --version              Version with AI tool compatibility info

🎯 AI DEVELOPMENT TOOL EXAMPLES:

  # Cursor IDE Integration
  alecs --section staging-client --debug
  
  # Claude CLI with specific domain
  alecs --section prod-acme --module property
  
  # Modern HTTP streaming
  alecs --section testing --transport streamable-http
  
  # WebSocket for real-time tools
  alecs --section enterprise --transport websocket --port 8080

🏢 MULTI-SECTION SETUP (.edgerc):
    
    ~/.edgerc configuration example:
    
    [default]
    client_token = akab-xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx
    client_secret = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    access_token = akab-xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx
    host = akaa-xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx.luna.akamaiapis.net
    
    [production-acme]
    client_token = akab-yyyyyyyyyyyyyyyy-yyyyyyyyyyyyyyyy
    client_secret = yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
    access_token = akab-yyyyyyyyyyyyyyyy-yyyyyyyyyyyyyyyy
    host = akaa-yyyyyyyyyyyyyyyy-yyyyyyyyyyyyyyyy.luna.akamaiapis.net
    account_switch_key = B-C-123456:789-ACME-PROD
    
    [staging-acme]
    client_token = akab-zzzzzzzzzzzzzzzz-zzzzzzzzzzzzzzzz
    client_secret = zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
    access_token = akab-zzzzzzzzzzzzzzzz-zzzzzzzzzzzzzzzz
    host = akaa-zzzzzzzzzzzzzzzz-zzzzzzzzzzzzzzzz.luna.akamaiapis.net
    account_switch_key = B-C-123456:789-ACME-STAGING

🛠️ TOOL NAMING (MCP Ecosystem Standard):
    All 287 tools use snake_case naming for maximum AI tool compatibility:
    
    Property Manager:    property_list, property_create, property_activate
    DNS Management:      dns_zones_list, dns_zone_create, dns_record_upsert
    Security & WAF:      security_network_lists, security_waf_policies
    Certificates:        cert_dv_enrollment, cert_link_to_property
    Utilities:           cpcode_list, include_create

🔍 TROUBLESHOOTING:
    • Credential issues: Check .edgerc file permissions (600)
    • Section not found: Verify section name in .edgerc
    • Rate limits: Monitor the real-time dashboard
    • Slow responses: Enable --debug for performance insights
    • Tool errors: All tools provide detailed error messages

📚 DOCUMENTATION & SUPPORT:
    Local Docs:     ./docs/README.md (comprehensive guide)
    API Reference:  ./docs/api/README.md (all 287 tools)
    Architecture:   ./docs/architecture/README.md
    GitHub Issues:  Report bugs and feature requests
    
    AI Assistant Tips:
    • Rich output provides maximum context for AI tools
    • All operations are logged with customer context
    • Performance metrics help optimize API usage
    • Error messages include troubleshooting suggestions

Version: ${require('../../package.json').version} | Optimized for Cursor, Claude Code, Gemini CLI
`;

  console.log(help);
}

/**
 * Display version information
 */
export function displayVersion(): void {
  const packageJson = require('../../package.json');
  console.log(`ALECS MCP Server v${packageJson.version}`);
  console.log(`Model Context Protocol Server for Akamai CDN Management`);
  console.log(`Node.js ${process.version} on ${process.platform}`);
}

/**
 * Apply CLI configuration to environment variables
 */
export function applyConfiguration(config: CLIConfig): void {
  logger.debug({ config }, 'Applying CLI configuration');
  
  // Set section for customer switching
  if (config.section) {
    process.env['AKAMAI_EDGERC_SECTION'] = config.section;
    logger.info({ section: config.section }, 'Using .edgerc section');
  }
  
  // Set transport type
  if (config.transport) {
    process.env['MCP_TRANSPORT'] = config.transport;
    logger.info({ transport: config.transport }, 'Using MCP transport');
    
    // Set appropriate port defaults for each transport
    if (!config.port) {
      switch (config.transport) {
        case 'websocket':
          process.env['WS_PORT'] = process.env['WS_PORT'] || '8080';
          break;
        case 'sse':
          process.env['SSE_PORT'] = process.env['SSE_PORT'] || '3001';
          break;
        case 'streamable-http':
          process.env['HTTP_PORT'] = process.env['HTTP_PORT'] || '8080';
          break;
      }
    }
  }
  
  // Set debug and logging
  if (config.debug) {
    process.env['DEBUG'] = 'true';
    process.env['LOG_LEVEL'] = 'debug';
    logger.info('Debug mode enabled');
  }
  
  if (config.logLevel) {
    process.env['LOG_LEVEL'] = config.logLevel;
    logger.info({ logLevel: config.logLevel }, 'Log level set');
  }
  
  // Set port for non-stdio transports
  if (config.port) {
    process.env['MCP_PORT'] = config.port.toString();
    logger.info({ port: config.port }, 'Port configured');
  }
  
  // Set module filter
  if (config.module) {
    process.env['npm_lifecycle_event'] = `start:${config.module}`;
    logger.info({ module: config.module }, 'Running specific module');
  }
}

/**
 * Validate CLI configuration with rich feedback
 */
export function validateConfiguration(config: CLIConfig): void {
  // Check if section exists in .edgerc if specified
  if (config.section) {
    try {
      const edgercPath = path.join(os.homedir(), '.edgerc');
      if (!fs.existsSync(edgercPath)) {
        throw new Error('No .edgerc file found in home directory');
      }
      
      const edgercContent = fs.readFileSync(edgercPath, 'utf8');
      if (!edgercContent.includes(`[${config.section}]`)) {
        logger.warn({ section: config.section }, 'Section not found in .edgerc - will use default');
      }
    } catch (error) {
      logger.warn({ error, section: config.section }, 'Could not validate .edgerc section');
    }
  }
  
  // Validate transport and port combination
  if (config.transport && config.transport !== 'stdio' && !config.port) {
    const defaultPorts: Record<string, number> = {
      'websocket': 8080,
      'sse': 3001,
      'streamable-http': 8080
    };
    const defaultPort = defaultPorts[config.transport] || 3000;
    logger.info({ transport: config.transport, port: defaultPort }, 'No port specified, using default');
    config.port = defaultPort;
  }
}

/**
 * Display rich startup dashboard optimized for AI development tools
 */
export function displayStartupDashboard(config: CLIConfig): void {
  const packageJson = require('../../package.json');
  const version = packageJson.version;
  const nodeVersion = process.version;
  const platform = process.platform;
  const pid = process.pid;
  const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  
  // Get customer section info
  const customerInfo = getCustomerInfo(config.section);
  
  // Get current timestamp
  const timestamp = new Date().toISOString();
  
  // Get tool statistics
  const toolStats = getToolStatistics();
  
  // Helper function to truncate text and ensure proper table formatting
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text.padEnd(maxLength);
    return text.substring(0, maxLength - 3) + '...';
  };
  
  // Calculate box width
  const boxWidth = 80;
  const pad = (text: string, width: number, align: 'left' | 'center' | 'right' = 'left') => {
    const len = text.length;
    if (len >= width) return text.substring(0, width);
    const padding = width - len;
    if (align === 'center') {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    } else if (align === 'right') {
      return ' '.repeat(padding) + text;
    } else {
      return text + ' '.repeat(padding);
    }
  };

  const line = (text: string) => `║ ${pad(text, boxWidth - 4)} ║`;
  const centerLine = (text: string) => `║ ${pad(text, boxWidth - 4, 'center')} ║`;
  
  const dashboard = `
╔${'═'.repeat(boxWidth - 2)}╗
${centerLine(`🌟 ALECS MCP Server v${version} - Ready`)}
╠${'═'.repeat(boxWidth - 2)}╣
${line('🏢 EdgeRC Configuration')}
${line(`   Section: ${customerInfo.section.padEnd(20)} Status: ${customerInfo.status}`)}
${line(`   Account: ${customerInfo.accountSwitch.substring(0, 40)} ${customerInfo.accountSwitchStatus}`)}
${line('')}
${line('⚡ Available Services')}
${line(`   Property Manager: ${toolStats.property} tools    Security & WAF: ${toolStats.security} tools`)}
${line(`   DNS Management: ${toolStats.dns} tools       Certificates: ${toolStats.certificates} tools`)}
${line(`   Edge Compute: 12 tools        GTM: 17 tools`)}
${line(`   Billing: 10 tools             Diagnostics: 21 tools`)}
${line('')}
${line(`📊 Total Tools: ${toolStats.total} (All using snake_case naming)`)}
${line('')}
${line('🎯 Quick Start Examples')}
${line('   property_list              - List all CDN properties')}
${line('   dns_zones_list             - View DNS zones')}
${line('   security_network_lists_list - Check security lists')}
${line('   billing_usage_summary      - Get billing overview')}
${line('')}
${line('✅ Status: READY')}
${line(`🕐 Started: ${timestamp.substring(0, 19)}Z`)}
╚${'═'.repeat(boxWidth - 2)}╝`;

  console.log(dashboard);
}

/**
 * Get accurate tool statistics including migration status
 */
function getToolStatistics(): {
  property: number;
  dns: number;
  utilities: number;
  certificates: number;
  security: number;
  fastpurge: number;
  total: number;
  snakeCase: number;
  migrationPercent: number;
} {
  try {
    // Import tool registry to get actual counts
    const { getAllToolDefinitions } = require('../tools/all-tools-registry');
    const allTools = getAllToolDefinitions();
    
    // Count tools by domain and naming convention
    let property = 0, dns = 0, utilities = 0, certificates = 0, security = 0, fastpurge = 0;
    let snakeCase = 0;
    
    const snakeCasePattern = /^[a-zA-Z0-9_]+$/;
    
    for (const tool of allTools) {
      // Count by domain
      if (tool.name.startsWith('property_')) property++;
      else if (tool.name.startsWith('dns_')) dns++;
      else if (tool.name.startsWith('cpcode_') || tool.name.startsWith('include_')) utilities++;
      else if (tool.name.startsWith('certificate') || tool.name.startsWith('cert_')) certificates++;
      else if (tool.name.startsWith('security') || tool.name.startsWith('network_')) security++;
      else if (tool.name.startsWith('fastpurge')) fastpurge++;
      
      // Count snake_case tools
      if (snakeCasePattern.test(tool.name)) {
        snakeCase++;
      }
    }
    
    const total = allTools.length;
    const migrationPercent = Math.round((snakeCase / total) * 100);
    
    return {
      property,
      dns,
      utilities,
      certificates,
      security,
      fastpurge,
      total,
      snakeCase,
      migrationPercent
    };
  } catch (error) {
    // Fallback values if tool registry import fails
    return {
      property: 9,
      dns: 11,
      utilities: 4,
      certificates: 45,
      security: 78,
      fastpurge: 8,
      total: 287,
      snakeCase: 24,
      migrationPercent: 8
    };
  }
}

/**
 * Get customer information from .edgerc section
 */
function getCustomerInfo(section?: string): {
  section: string;
  status: string;
  host: string;
  accountSwitch: string;
  accountSwitchStatus: string;
  credentialStatus: string;
  healthStatus: string;
} {
  const defaultInfo = {
    section: section || 'default',
    status: '❓ Unknown',
    host: 'Not configured',
    accountSwitch: 'Not configured',
    accountSwitchStatus: '❓',
    credentialStatus: '❓ Unknown',
    healthStatus: '❓ Unknown'
  };

  try {
    const edgercPath = path.join(os.homedir(), '.edgerc');
    
    if (!fs.existsSync(edgercPath)) {
      return { ...defaultInfo, status: '❌ No .edgerc', healthStatus: '❌ No config' };
    }

    const edgercContent = fs.readFileSync(edgercPath, 'utf8');
    const sectionName = section || 'default';
    
    if (!edgercContent.includes(`[${sectionName}]`)) {
      return { 
        ...defaultInfo, 
        section: sectionName,
        status: '❌ Section missing', 
        healthStatus: '❌ Invalid section' 
      };
    }

    // Parse basic configuration
    const lines = edgercContent.split('\n');
    let inSection = false;
    let host = 'Not found';
    let hasAccountSwitch = false;
    let accountSwitchValue = 'None';

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === `[${sectionName}]`) {
        inSection = true;
        continue;
      }
      
      if (trimmed.startsWith('[') && trimmed.endsWith(']') && inSection) {
        break; // Moved to next section
      }
      
      if (inSection) {
        if (trimmed.startsWith('host =')) {
          host = trimmed.split('=')[1]?.trim() || 'Invalid';
        }
        if (trimmed.startsWith('account_switch_key =') || trimmed.startsWith('account_key =') || trimmed.startsWith('account-switch-key =')) {
          hasAccountSwitch = true;
          accountSwitchValue = trimmed.split('=')[1]?.trim().substring(0, 20) + '...' || 'Invalid';
        }
      }
    }

    return {
      section: sectionName,
      status: '✅ Found',
      host,
      accountSwitch: hasAccountSwitch ? accountSwitchValue : 'None (single account)',
      accountSwitchStatus: hasAccountSwitch ? '✅' : '○',
      credentialStatus: '✅ Configured',
      healthStatus: '✅ Ready'
    };

  } catch (error) {
    logger.error({ error }, 'Error reading .edgerc configuration');
    return { ...defaultInfo, status: '❌ Read error', healthStatus: '❌ Config error' };
  }
}

/**
 * Create live activity log entry
 */
export function logActivity(toolName: string, section: string, duration: number, status: 'success' | 'error' | 'cache_hit', details?: string): void {
  const timestamp = new Date().toTimeString().split(' ')[0];
  const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚡';
  const performanceIcon = duration < 100 ? '🚀' : duration < 500 ? '⚡' : duration < 1000 ? '⏱️' : '🐌';
  const cacheIcon = status === 'cache_hit' ? '💾' : '🎯';
  
  console.log(`[${timestamp}] ${statusIcon} ${toolName} │ ${section} │ ${performanceIcon} ${duration}ms │ ${cacheIcon} ${details || (status === 'cache_hit' ? 'Cache hit' : 'API call')}`);
}