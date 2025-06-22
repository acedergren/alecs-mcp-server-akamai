#!/usr/bin/env tsx
/**
 * Terminal Demo - ALECS Domain Assistants
 * Real-time demonstration of domain assistants
 */

import { spawn } from 'child_process';
import * as readline from 'readline';

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

// Helper to colorize text
const color = (text: string, ...codes: string[]) => 
  codes.join('') + text + colors.reset;

// Print with color
const print = (text: string, ...codes: string[]) => 
  console.log(color(text, ...codes));

// Create readline interface for server communication
function createClient(serverProcess: any) {
  let requestId = 0;
  const pendingRequests = new Map();
  
  // Parse server output
  const rl = readline.createInterface({
    input: serverProcess.stdout,
    crlfDelay: Infinity
  });
  
  rl.on('line', (line: string) => {
    try {
      const message = JSON.parse(line);
      if (message.id !== undefined && pendingRequests.has(message.id)) {
        const { resolve } = pendingRequests.get(message.id);
        pendingRequests.delete(message.id);
        resolve(message);
      }
    } catch (e) {
      // Not JSON, could be server logs
      if (line.includes('[INFO]') || line.includes('Assistant')) {
        console.log(color('  [Server] ', colors.gray) + line);
      }
    }
  });
  
  // Send JSON-RPC request
  const sendRequest = async (method: string, params: any = {}) => {
    const id = requestId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      serverProcess.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  };
  
  return {
    initialize: () => sendRequest('initialize', {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'terminal-demo',
        version: '1.0.0'
      }
    }),
    listTools: () => sendRequest('tools/list'),
    callTool: (name: string, args: any) => sendRequest('tools/call', {
      name,
      arguments: args
    })
  };
}

// Main demo
async function runDemo() {
  console.clear();
  print('═'.repeat(70), colors.cyan);
  print('  ALECS MCP Server - Domain Assistants Demo', colors.cyan, colors.bright);
  print('  Real-time Terminal Demonstration', colors.yellow);
  print('═'.repeat(70), colors.cyan);
  console.log();
  
  // Start the server
  print('🚀 Starting MCP Server...', colors.green);
  console.log();
  
  const serverProcess = spawn('npm', ['run', 'dev:full'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });
  
  // Handle server errors
  serverProcess.stderr.on('data', (data) => {
    console.error(color('[Error] ', colors.red) + data.toString());
  });
  
  // Wait for server to be ready
  await new Promise<void>((resolve) => {
    let output = '';
    const checkReady = (data: Buffer) => {
      output += data.toString();
      if (output.includes('Server started') || 
          output.includes('MCP server running') ||
          output.includes('initialized')) {
        serverProcess.stdout?.off('data', checkReady);
        resolve();
      }
    };
    serverProcess.stdout?.on('data', checkReady);
    
    // Timeout fallback
    setTimeout(() => resolve(), 15000);
  });
  
  print('✅ Server started!', colors.green);
  console.log();
  
  // Create client
  const client = createClient(serverProcess);
  
  try {
    // Initialize connection
    print('📡 Initializing MCP connection...', colors.yellow);
    await client.initialize();
    print('✅ Connected to MCP server', colors.green);
    console.log();
    
    // List tools
    print('🔍 Discovering available tools...', colors.blue);
    const toolsResponse: any = await client.listTools();
    const tools = toolsResponse.result.tools;
    
    print(`Found ${tools.length} tools total`, colors.green);
    
    // Find domain assistants
    const assistants = tools.filter((t: any) => 
      ['infrastructure', 'dns', 'security', 'performance'].includes(t.name)
    );
    
    print(`\n🤖 Domain Assistants (${assistants.length}):`, colors.cyan, colors.bright);
    assistants.forEach((a: any) => {
      console.log(`   • ${color(a.name, colors.yellow)}: ${a.description}`);
    });
    console.log();
    
    // Demo 1: Infrastructure Assistant
    print('─'.repeat(70), colors.gray);
    print('\n📦 DEMO 1: Infrastructure Assistant', colors.yellow, colors.bright);
    print('User: "I need to launch an e-commerce site"', colors.green);
    console.log();
    
    print('🤔 Calling Infrastructure Assistant...', colors.blue);
    const infraResponse: any = await client.callTool('infrastructure', {
      intent: 'I need to launch an e-commerce site that can handle Black Friday traffic',
      context: {
        business_info: 'Fashion retailer, expecting 500K visitors'
      }
    });
    
    print('\n🤖 Assistant Response:', colors.cyan);
    if (infraResponse.result?.content?.[0]?.text) {
      console.log(infraResponse.result.content[0].text
        .split('\n')
        .map((line: string) => '   ' + line)
        .join('\n'));
    }
    
    // Demo 2: Security Assistant
    print('\n─'.repeat(70), colors.gray);
    print('\n🔒 DEMO 2: Security Assistant', colors.yellow, colors.bright);
    print('User: "We need PCI compliance for payments"', colors.green);
    console.log();
    
    print('🤔 Calling Security Assistant...', colors.blue);
    const secResponse: any = await client.callTool('security', {
      intent: 'We need to meet PCI compliance for our payment processing',
      context: {
        current_setup: 'Basic SSL only'
      }
    });
    
    print('\n🤖 Assistant Response:', colors.cyan);
    if (secResponse.result?.content?.[0]?.text) {
      console.log(secResponse.result.content[0].text
        .split('\n')
        .slice(0, 15) // Show first part
        .map((line: string) => '   ' + line)
        .join('\n'));
      print('   ... (truncated for demo)', colors.gray);
    }
    
    // Demo 3: Performance Assistant  
    print('\n─'.repeat(70), colors.gray);
    print('\n⚡ DEMO 3: Performance Assistant', colors.yellow, colors.bright);
    print('User: "Our mobile site is too slow"', colors.green);
    console.log();
    
    print('🤔 Calling Performance Assistant...', colors.blue);
    const perfResponse: any = await client.callTool('performance', {
      intent: 'Our mobile site loads in 8 seconds, customers are leaving',
      context: {
        current_metrics: '8 second load time on 3G'
      }
    });
    
    print('\n🤖 Assistant Response:', colors.cyan);
    if (perfResponse.result?.content?.[0]?.text) {
      console.log(perfResponse.result.content[0].text
        .split('\n')
        .slice(0, 15)
        .map((line: string) => '   ' + line)
        .join('\n'));
      print('   ... (truncated for demo)', colors.gray);
    }
    
    // Summary
    print('\n═'.repeat(70), colors.cyan);
    print('✅ Demo Complete!', colors.green, colors.bright);
    print('\nKey Observations:', colors.yellow);
    console.log('   • Assistants understand business language');
    console.log('   • Responses focus on business outcomes, not technical details');
    console.log('   • Each assistant provides actionable recommendations');
    console.log('   • Workflow orchestration connects multiple domains');
    print('\n🚀 The future of infrastructure management is here!', colors.cyan);
    print('═'.repeat(70), colors.cyan);
    
  } catch (error) {
    print('\n❌ Error during demo:', colors.red);
    console.error(error);
  } finally {
    // Clean up
    console.log();
    print('👋 Shutting down server...', colors.gray);
    serverProcess.kill();
    
    // Give it time to clean up
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(color('\n❌ Unhandled error:', colors.red), error);
  process.exit(1);
});

// Run demo
runDemo().catch(error => {
  console.error(color('❌ Demo failed:', colors.red), error);
  process.exit(1);
});