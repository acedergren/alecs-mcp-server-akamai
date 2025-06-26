#!/usr/bin/env node

/**
 * Interactive Launcher for ALECS MCP Server
 * Allows users to choose between essentials, modular, or full version
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const clearScreen = () => {
  process.stdout.write('\x1Bc');
};

interface ServerModule {
  name: string;
  description: string;
  toolCount: number;
  file: string;
}

const modules: ServerModule[] = [
  {
    name: 'alecs-property',
    description: 'Property management with basic certificate support',
    toolCount: 32,
    file: 'property-server.js',
  },
  {
    name: 'alecs-dns',
    description: 'DNS zones and records management',
    toolCount: 24,
    file: 'dns-server.js',
  },
  {
    name: 'alecs-certs',
    description: 'Full certificate lifecycle management',
    toolCount: 22,
    file: 'certs-server.js',
  },
  {
    name: 'alecs-reporting',
    description: 'Analytics and performance monitoring',
    toolCount: 25,
    file: 'reporting-server.js',
  },
  {
    name: 'alecs-security',
    description: 'WAF, network lists, bot management',
    toolCount: 95,
    file: 'security-server.js',
  },
];

async function main() {
  clearScreen();

  console.log('[DEPLOY] ALECS MCP Server Launcher');
  console.log('============================\n');

  console.log('Choose your server configuration:\n');
  console.log('1) [TARGET] Minimal - Core features only (7 tools)');
  console.log('2) [PACKAGE] Modular - Select specific modules');
  console.log('3) [GLOBAL] Full - All features (~198 tools)');
  console.log('4) [CONFIG] Custom - Launch individual module');
  console.log('5) [ERROR] Exit\n');

  const choice = await question('Enter your choice (1-5): ');

  switch (choice.trim()) {
    case '1':
      await launchMinimal();
      break;
    case '2':
      await launchModular();
      break;
    case '3':
      await launchFull();
      break;
    case '4':
      await launchCustom();
      break;
    case '5':
      console.log('\n[EMOJI] Goodbye!');
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('\n[ERROR] Invalid choice. Please try again.');
      await main();
  }
}

async function launchMinimal() {
  clearScreen();
  console.log('[TARGET] Launching Minimal Server...\n');
  console.log('This includes:');
  console.log('  • Property listing and details');
  console.log('  • Property creation');
  console.log('  • Property activation');
  console.log('  • Contract listing');
  console.log('  • DNS zone creation');
  console.log('  • DNS record management\n');

  const confirm = await question('Continue? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    await main();
    return;
  }

  launchServer('index.js', 'ALECS Minimal');
}

async function launchModular() {
  clearScreen();
  console.log('[PACKAGE] Modular Server Configuration\n');
  console.log('Select modules to launch:\n');

  const selectedModules: ServerModule[] = [];

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    console.log(`${i + 1}) ${module.name} (${module.toolCount} tools)`);
    console.log(`   ${module.description}\n`);
  }

  console.log('Enter module numbers separated by commas (e.g., 1,2,4)');
  console.log('Or press Enter to select all modules\n');

  const selection = await question('Your selection: ');

  if (selection.trim() === '') {
    selectedModules.push(...modules);
  } else {
    const indices = selection.split(',').map((s) => parseInt(s.trim()) - 1);
    for (const index of indices) {
      if (index >= 0 && index < modules.length) {
        selectedModules.push(modules[index]);
      }
    }
  }

  if (selectedModules.length === 0) {
    console.log('\n[ERROR] No modules selected.');
    await main();
    return;
  }

  clearScreen();
  console.log('[PACKAGE] Selected Modules:\n');
  let totalTools = 0;
  for (const module of selectedModules) {
    console.log(`  [EMOJI] ${module.name} (${module.toolCount} tools)`);
    totalTools += module.toolCount;
  }
  console.log(`\nTotal tools: ${totalTools}\n`);

  const confirm = await question('Launch these modules? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    await main();
    return;
  }

  // Launch each selected module in a separate process
  console.log('\n[DEPLOY] Launching modules...\n');

  // Prepare setup instructions
  const setupConfigs = selectedModules.map((module) => ({
    name: module.name,
    path: path.join(__dirname, 'servers', module.file),
    displayName: module.name,
  }));

  for (const module of selectedModules) {
    launchModuleServer(module);
  }

  console.log('\n[DONE] All selected modules launched!');
  console.log('\n[DOCS] Note: Each module runs as a separate MCP server.');
  console.log('You can use them independently in Claude Desktop.\n');

  // Show Claude Desktop setup instructions for all selected modules
  showClaudeDesktopInstructions(setupConfigs);

  rl.close();
}

async function launchFull() {
  clearScreen();
  console.log('[GLOBAL] Launching Full Server...\n');
  console.log('[WARNING]  Warning: This loads all 198 tools and may use significant memory.\n');

  const confirm = await question('Continue? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    await main();
    return;
  }

  launchServer('index.js', 'ALECS Full');
}

async function launchCustom() {
  clearScreen();
  console.log('[CONFIG] Custom Module Launch\n');
  console.log('Available modules:\n');

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    console.log(`${i + 1}) ${module.name} (${module.toolCount} tools)`);
    console.log(`   ${module.description}\n`);
  }

  const choice = await question('Select module number (1-5): ');
  const index = parseInt(choice.trim()) - 1;

  if (index >= 0 && index < modules.length) {
    const module = modules[index];
    console.log(`\n[DEPLOY] Launching ${module.name}...\n`);

    // Show setup instructions for the selected module
    showClaudeDesktopInstructions([
      {
        name: module.name,
        path: path.join(__dirname, 'servers', module.file),
        displayName: module.name,
      },
    ]);

    launchModuleServer(module);
    rl.close();
  } else {
    console.log('\n[ERROR] Invalid selection.');
    await main();
  }
}

function launchServer(serverFile: string, name: string) {
  const serverPath = path.join(__dirname, serverFile);

  console.log(`Starting ${name} server...`);
  console.log(`Path: ${serverPath}\n`);

  // Show Claude Desktop setup instructions
  showClaudeDesktopInstructions([
    {
      name: name.toLowerCase().replace(' ', '-'),
      path: serverPath,
      displayName: name,
    },
  ]);

  const child = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ALECS_MODE: name.toLowerCase().replace(' ', '-'),
    },
  });

  child.on('error', (_error) => {
    console.error(`[ERROR] Failed to start server: ${_error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    console.log(`\n${name} server exited with code ${code}`);
    process.exit(code || 0);
  });

  rl.close();
}

function launchModuleServer(module: ServerModule) {
  const serverPath = path.join(__dirname, 'servers', module.file);

  console.log(`Starting ${module.name}...`);

  const child = spawn('node', [serverPath], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ALECS_MODULE: module.name,
    },
  });

  child.unref();

  console.log(`[EMOJI] ${module.name} started (PID: ${child.pid})`);
}

interface SetupConfig {
  name: string;
  path: string;
  displayName: string;
}

function showClaudeDesktopInstructions(configs: SetupConfig[]) {
  const userHome = process.env.HOME || process.env.USERPROFILE || '~';

  console.log('\n' + '═'.repeat(70));
  console.log('[EMOJI] Claude Desktop Setup Instructions');
  console.log('═'.repeat(70) + '\n');

  console.log('To add these servers to Claude Desktop, use ONE of these methods:\n');
  console.log('[CONFIG] Method 1: Using Claude Code (Recommended)');
  console.log('─'.repeat(40));

  configs.forEach((config, index) => {
    console.log(`\n${index + 1}. For ${config.displayName}:`);
    console.log(`   claude mcp add ${config.name} -s user node ${config.path}`);
  });

  console.log('\n\n[EMOJI] Method 2: Manual Configuration');
  console.log('─'.repeat(40));
  console.log('\n1. Open your Claude Desktop configuration file:');
  console.log(`   ${userHome}/Library/Application Support/Claude/claude_desktop_config.json`);
  console.log('   (On Windows: %APPDATA%\\Claude\\claude_desktop_config.json)');

  console.log('\n2. Add these entries to the "mcpServers" section:\n');

  console.log('```json');
  console.log('{');
  console.log('  "mcpServers": {');

  configs.forEach((config, index) => {
    const comma = index < configs.length - 1 ? ',' : '';
    console.log(`    "${config.name}": {`);
    console.log('      "command": "node",');
    console.log(`      "args": ["${config.path}"]`);
    console.log(`    }${comma}`);
  });

  console.log('  }');
  console.log('}');
  console.log('```');

  console.log('\n3. Restart Claude Desktop to load the new server(s)');

  console.log('\n\n[DOCS] Usage Examples');
  console.log('─'.repeat(40));
  console.log('\nOnce added, you can use these servers in Claude by:');
  console.log('• Asking questions about your Akamai properties');
  console.log('• Managing DNS zones and records');
  console.log('• Working with certificates');
  console.log('• Viewing analytics and reports');
  console.log('• Configuring security policies');

  console.log('\nExample prompts:');
  console.log('• "List all my Akamai properties"');
  console.log('• "Show DNS records for example.com"');
  console.log('• "Check certificate status for my domains"');

  console.log('\n' + '═'.repeat(70) + '\n');
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n[EMOJI] Goodbye!');
  rl.close();
  process.exit(0);
});

// Start the interactive launcher
main().catch((_error) => {
  console.error('[Error]:', _error);
  process.exit(1);
});
