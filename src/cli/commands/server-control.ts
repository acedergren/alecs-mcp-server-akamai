#!/usr/bin/env node

/**
 * ALECS Interactive Server Control
 * 
 * This command provides an interactive interface for controlling the ALECS server
 * when not running in stdio mode (which is required for Claude Desktop).
 */

import * as readline from 'readline';
import { spawn } from 'child_process';
import * as path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let serverProcess: any = null;
let isServerRunning = false;
let isSilentMode = false;

function showMenu() {
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🌟 ALECS Server Control Panel v2.0                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Server Status: ${isServerRunning ? '🟢 Running' : '🔴 Stopped'}${isServerRunning && isSilentMode ? ' 🌙 Night Vision Mode' : ''}                           ║
║                                                                              ║
║  Commands:                                                                   ║
║    [1] Start Server (Interactive)                                            ║
║    [2] Start Server (🌙 Night Vision Mode)                                   ║
║    [3] Stop Server                                                           ║
║    [4] Restart Server                                                        ║
║    [5] Toggle Night Vision Mode                                              ║
║    [6] View Server Status                                                    ║
║    [Q] Quit Control Panel                                                    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  rl.question('Enter command: ', handleCommand);
}

function handleCommand(command: string) {
  switch (command.toLowerCase()) {
    case '1':
      startServer(false);
      break;
    case '2':
      startServer(true);
      break;
    case '3':
      stopServer();
      break;
    case '4':
      restartServer();
      break;
    case '5':
      toggleSilentMode();
      break;
    case '6':
      showStatus();
      break;
    case 'q':
    case 'quit':
    case 'exit':
      exitControlPanel();
      break;
    default:
      console.log('Invalid command. Please try again.');
      setTimeout(showMenu, 1500);
  }
}

function startServer(silent: boolean) {
  if (isServerRunning) {
    console.log('⚠️  Server is already running!');
    setTimeout(showMenu, 1500);
    return;
  }
  
  console.log(`🚀 Starting ALECS server${silent ? ' in 🌙 Night Vision Mode' : ''}...`);
  
  const distPath = path.join(__dirname, '../../dist/index.js');
  const args = [];
  
  if (silent) {
    args.push('--silent');
    isSilentMode = true;
  }
  
  // Use HTTP transport for interactive mode to avoid stdio conflicts
  process.env['MCP_TRANSPORT'] = 'streamable-http';
  process.env['HTTP_PORT'] = '8080';
  
  serverProcess = spawn('node', [distPath, ...args], {
    detached: false,
    stdio: silent ? 'ignore' : 'inherit',
    env: { ...process.env }
  });
  
  isServerRunning = true;
  
  serverProcess.on('exit', (code: number) => {
    console.log(`\n⚠️  Server exited with code ${code}`);
    isServerRunning = false;
    serverProcess = null;
  });
  
  setTimeout(showMenu, 2000);
}

function stopServer() {
  if (!isServerRunning || !serverProcess) {
    console.log('⚠️  Server is not running!');
    setTimeout(showMenu, 1500);
    return;
  }
  
  console.log('🛑 Stopping server...');
  serverProcess.kill('SIGTERM');
  isServerRunning = false;
  serverProcess = null;
  
  setTimeout(showMenu, 1500);
}

function restartServer() {
  if (isServerRunning) {
    stopServer();
    setTimeout(() => startServer(isSilentMode), 2000);
  } else {
    startServer(isSilentMode);
  }
}

function toggleSilentMode() {
  if (isServerRunning) {
    console.log('⚠️  Stop the server first to change modes.');
    setTimeout(showMenu, 1500);
    return;
  }
  
  isSilentMode = !isSilentMode;
  console.log(`✅ Silent mode ${isSilentMode ? 'enabled' : 'disabled'}`);
  setTimeout(showMenu, 1500);
}

function showStatus() {
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                          ALECS Server Status                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Status: ${isServerRunning ? '🟢 Running' : '🔴 Stopped'}                                                         ║
║  Mode: ${isSilentMode ? 'Silent' : 'Interactive'}                                                              ║
║  Transport: HTTP (Port 8080)                                                 ║
║  Process ID: ${serverProcess?.pid || 'N/A'}                                                        ║
║                                                                              ║
║  Note: This control panel uses HTTP transport.                              ║
║  For Claude Desktop integration, run directly with:                          ║
║    alecs                                                                     ║
║                                                                              ║
║  Press any key to return to menu...                                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  rl.question('', () => showMenu());
}

function exitControlPanel() {
  if (isServerRunning && serverProcess) {
    rl.question('Server is still running. Stop it before exiting? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        stopServer();
        setTimeout(() => {
          console.log('👋 Goodbye!');
          process.exit(0);
        }, 1000);
      } else {
        console.log('👋 Goodbye! (Server still running in background)');
        process.exit(0);
      }
    });
  } else {
    console.log('👋 Goodbye!');
    process.exit(0);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT...');
  exitControlPanel();
});

// Start the control panel
console.log('🎮 Starting ALECS Server Control Panel...');
showMenu();