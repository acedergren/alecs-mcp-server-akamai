#!/usr/bin/env node

/**
 * ALECS CLI - Command line tool for managing ALECS MCP servers
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

const program = new Command();

// Claude Desktop config path
const CONFIG_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Claude',
  'claude_desktop_config.json'
);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
};

interface ClaudeConfig {
  mcpServers: Record<string, {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }>;
}

interface ServerDefinition {
  name: string;
  path: string;
  description: string;
  toolCount: number;
}

const SERVERS: Record<string, ServerDefinition> = {
  property: {
    name: 'alecs-property',
    path: 'dist/servers/property-server.js',
    description: 'Property management with basic certificate support',
    toolCount: 32,
  },
  dns: {
    name: 'alecs-dns',
    path: 'dist/servers/dns-server.js',
    description: 'DNS zones and records management',
    toolCount: 24,
  },
  certs: {
    name: 'alecs-certs',
    path: 'dist/servers/certs-server.js',
    description: 'Full certificate lifecycle management',
    toolCount: 22,
  },
  reporting: {
    name: 'alecs-reporting',
    path: 'dist/servers/reporting-server.js',
    description: 'Analytics and performance monitoring',
    toolCount: 25,
  },
  security: {
    name: 'alecs-security',
    path: 'dist/servers/security-server.js',
    description: 'WAF, network lists, bot management',
    toolCount: 95,
  },
  essentials: {
    name: 'alecs-essentials',
    path: 'dist/index-essential.js',
    description: 'Core features only',
    toolCount: 60,
  },
};

// Utility functions
function loadConfig(): ClaudeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const defaultConfig: ClaudeConfig = { mcpServers: {} };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(config: ClaudeConfig): void {
  // Create backup
  const backupPath = `${CONFIG_PATH}.backup.${Date.now()}`;
  if (fs.existsSync(CONFIG_PATH)) {
    fs.copyFileSync(CONFIG_PATH, backupPath);
  }
  
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getProjectRoot(): string {
  // Find project root by looking for package.json
  let dir = __dirname;
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error('Could not find project root');
}

// Commands
program
  .name('alecs')
  .description('CLI tool for managing ALECS MCP servers in Claude Desktop')
  .version('2.0.0');

// Install command
program
  .command('install [servers...]')
  .description('Install ALECS servers to Claude Desktop')
  .option('-m, --mode <mode>', 'Installation mode: all, modular, essentials', 'modular')
  .action((servers: string[], options) => {
    const config = loadConfig();
    const projectRoot = getProjectRoot();
    
    let serversToInstall: string[] = [];
    
    if (servers.length > 0) {
      serversToInstall = servers;
    } else {
      switch (options.mode) {
        case 'all':
          serversToInstall = ['property', 'dns', 'certs', 'reporting', 'security'];
          break;
        case 'essentials':
          serversToInstall = ['essentials'];
          break;
        case 'modular':
          // Interactive selection
          console.log('\n📦 Select modules to install:\n');
          serversToInstall = ['property', 'dns']; // Default selection
          log.info('Installing default modules: property, dns');
          log.info('To select specific modules, use: alecs install property dns certs');
          break;
      }
    }
    
    let installed = 0;
    for (const serverKey of serversToInstall) {
      const server = SERVERS[serverKey];
      if (!server) {
        log.error(`Unknown server: ${serverKey}`);
        continue;
      }
      
      const serverPath = path.join(projectRoot, server.path);
      if (!fs.existsSync(serverPath)) {
        log.error(`Server not found: ${serverPath}`);
        log.warning('Run "npm run build" first');
        continue;
      }
      
      config.mcpServers[server.name] = {
        command: 'node',
        args: [serverPath],
        env: {
          AKAMAI_EDGERC_PATH: path.join(os.homedir(), '.edgerc'),
        },
      };
      
      log.success(`Installed ${server.name} - ${server.description} (${server.toolCount} tools)`);
      installed++;
    }
    
    if (installed > 0) {
      saveConfig(config);
      log.success(`\nInstalled ${installed} server(s)`);
      log.warning('Please restart Claude Desktop to apply changes');
    }
  });

// Remove command
program
  .command('remove [servers...]')
  .alias('uninstall')
  .description('Remove ALECS servers from Claude Desktop')
  .option('-a, --all', 'Remove all ALECS servers')
  .action((servers: string[], options) => {
    const config = loadConfig();
    
    let serversToRemove: string[] = [];
    
    if (options.all) {
      serversToRemove = Object.keys(config.mcpServers)
        .filter(key => key.startsWith('alecs-'));
    } else if (servers.length > 0) {
      serversToRemove = servers.map(s => {
        const server = SERVERS[s];
        return server ? server.name : s;
      });
    } else {
      log.error('Please specify servers to remove or use --all');
      return;
    }
    
    let removed = 0;
    for (const serverName of serversToRemove) {
      if (config.mcpServers[serverName]) {
        delete config.mcpServers[serverName];
        log.success(`Removed ${serverName}`);
        removed++;
      } else {
        log.warning(`${serverName} not found in config`);
      }
    }
    
    if (removed > 0) {
      saveConfig(config);
      log.success(`\nRemoved ${removed} server(s)`);
      log.warning('Please restart Claude Desktop to apply changes');
    }
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List installed ALECS servers')
  .action(() => {
    const config = loadConfig();
    const alecsServers = Object.entries(config.mcpServers)
      .filter(([key]) => key.startsWith('alecs-'));
    
    if (alecsServers.length === 0) {
      log.info('No ALECS servers installed');
      log.info('Run "alecs install" to get started');
      return;
    }
    
    console.log('\n📋 Installed ALECS Servers:\n');
    for (const [name, serverConfig] of alecsServers) {
      const serverDef = Object.values(SERVERS).find(s => s.name === name);
      const desc = serverDef ? `- ${serverDef.description} (${serverDef.toolCount} tools)` : '';
      console.log(`  ${colors.green}●${colors.reset} ${name} ${desc}`);
    }
    console.log('');
  });

// Start command
program
  .command('start')
  .description('Start ALECS server interactively')
  .action(() => {
    const projectRoot = getProjectRoot();
    const launcherPath = path.join(projectRoot, 'dist', 'interactive-launcher.js');
    
    if (!fs.existsSync(launcherPath)) {
      log.error('Interactive launcher not found. Run "npm run build" first');
      return;
    }
    
    const child = spawn('node', [launcherPath], {
      stdio: 'inherit',
    });
    
    child.on('error', (err) => {
      log.error(`Failed to start: ${err.message}`);
    });
  });

// Status command
program
  .command('status')
  .description('Check ALECS server status')
  .action(() => {
    // Check if Claude Desktop is installed
    if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
      log.error('Claude Desktop not found');
      return;
    }
    
    // Check installed servers
    const config = loadConfig();
    const alecsServers = Object.keys(config.mcpServers)
      .filter(key => key.startsWith('alecs-'));
    
    console.log('\n🔍 ALECS Status Check:\n');
    console.log(`Claude Desktop: ${colors.green}✓ Installed${colors.reset}`);
    console.log(`Config path: ${CONFIG_PATH}`);
    console.log(`ALECS servers: ${alecsServers.length} installed`);
    
    // Check if .edgerc exists
    const edgercPath = path.join(os.homedir(), '.edgerc');
    if (fs.existsSync(edgercPath)) {
      console.log(`Akamai credentials: ${colors.green}✓ Found${colors.reset}`);
    } else {
      console.log(`Akamai credentials: ${colors.red}✗ Not found${colors.reset}`);
      log.warning('\nCreate ~/.edgerc with your Akamai credentials');
    }
    
    // Check if project is built
    const projectRoot = getProjectRoot();
    if (fs.existsSync(path.join(projectRoot, 'dist'))) {
      console.log(`Project build: ${colors.green}✓ Found${colors.reset}`);
    } else {
      console.log(`Project build: ${colors.red}✗ Not found${colors.reset}`);
      log.warning('\nRun "npm run build" to build the project');
    }
    
    console.log('');
  });

// Config command
program
  .command('config')
  .description('Show Claude Desktop configuration')
  .option('-p, --path', 'Show config file path only')
  .action((options) => {
    if (options.path) {
      console.log(CONFIG_PATH);
      return;
    }
    
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}