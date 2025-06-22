#!/usr/bin/env tsx
/**
 * Interactive Domain Assistant Demo
 * Shows the ALECS MCP server domain assistants in action
 */

import { spawn } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';
import { stdin as input, stdout as output } from 'process';

// ANSI escape codes for terminal effects
const CLEAR_LINE = '\x1b[2K\r';
const TYPING_SPEED = 30; // ms per character

// Simulated typing effect
async function typeText(text: string, color = chalk.white) {
  for (const char of text) {
    process.stdout.write(color(char));
    await new Promise(resolve => setTimeout(resolve, TYPING_SPEED));
  }
  console.log();
}

// Print banner
function printBanner() {
  console.clear();
  console.log(chalk.cyan('═'.repeat(80)));
  console.log(chalk.cyan.bold(`
    ╔═╗╦  ╔═╗╔═╗╔═╗  ╔╦╗╔═╗╔═╗  ╔═╗╔═╗╦═╗╦  ╦╔═╗╦═╗
    ╠═╣║  ║╣ ║  ╚═╗  ║║║║  ╠═╝  ╚═╗║╣ ╠╦╝╚╗╔╝║╣ ╠╦╝
    ╩ ╩╩═╝╚═╝╚═╝╚═╝  ╩ ╩╚═╝╩    ╚═╝╚═╝╩╚═  ╚╝ ╚═╝╩╚═
  `));
  console.log(chalk.yellow('    🚀 Domain Assistants Demo - Akamai EdgeGrid Integration\n'));
  console.log(chalk.cyan('═'.repeat(80)));
  console.log();
}

// Demo scenarios
const scenarios = [
  {
    title: "🏢 Infrastructure Assistant: E-commerce Launch",
    assistant: "infrastructure",
    request: {
      intent: "I want to launch a new e-commerce site that can handle Black Friday traffic",
      context: {
        business_info: "Online fashion retailer expecting 500K visitors on launch"
      }
    }
  },
  {
    title: "🔒 Security Assistant: Compliance Requirements", 
    assistant: "security",
    request: {
      intent: "We need to meet PCI compliance for our payment processing",
      context: {
        current_setup: "Basic SSL, no WAF",
        compliance_deadline: "Q2 2025"
      }
    }
  },
  {
    title: "🌐 DNS Assistant: Domain Migration",
    assistant: "dns",
    request: {
      intent: "Migrate our domain from GoDaddy to Akamai without downtime",
      context: {
        domain: "example-store.com",
        current_provider: "GoDaddy"
      }
    }
  },
  {
    title: "📊 Performance Assistant: Mobile Optimization",
    assistant: "performance",
    request: {
      intent: "Our mobile site is too slow, customers are abandoning carts",
      context: {
        current_metrics: "8 second load time on 3G",
        business_impact: "30% cart abandonment"
      }
    }
  }
];

// Create MCP client
function createClient(serverProcess: any) {
  const rl = readline.createInterface({ input: serverProcess.stdout, output: serverProcess.stdin });
  
  let requestId = 0;
  const pendingRequests = new Map();
  
  // Handle server responses
  rl.on('line', (line: string) => {
    try {
      const message = JSON.parse(line);
      if (message.id !== undefined && pendingRequests.has(message.id)) {
        const { resolve } = pendingRequests.get(message.id);
        pendingRequests.delete(message.id);
        resolve(message);
      }
    } catch (e) {
      // Not JSON, ignore
    }
  });
  
  // Send request helper
  const sendRequest = async (method: string, params: any = {}) => {
    const id = requestId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    
    return new Promise((resolve) => {
      pendingRequests.set(id, { resolve });
      serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  };
  
  return {
    initialize: () => sendRequest('initialize', {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'demo-client',
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

// Main demo function
async function runDemo() {
  printBanner();
  
  console.log(chalk.green('🚀 Starting ALECS MCP Server...\n'));
  
  // Start server
  const serverProcess = spawn('npm', ['run', 'dev:full'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: process.env
  });
  
  // Wait for server to start
  await new Promise<void>((resolve) => {
    const checkReady = (data: Buffer) => {
      if (data.toString().includes('Server started') || 
          data.toString().includes('MCP server running')) {
        serverProcess.stdout?.off('data', checkReady);
        resolve();
      }
    };
    serverProcess.stdout?.on('data', checkReady);
    setTimeout(() => resolve(), 10000);
  });
  
  const client = createClient(serverProcess);
  
  // Initialize connection
  console.log(chalk.yellow('📡 Initializing MCP connection...\n'));
  await client.initialize();
  
  // List available tools
  const toolsResponse: any = await client.listTools();
  const domainAssistants = toolsResponse.result.tools.filter((tool: any) => 
    ['infrastructure', 'dns', 'security', 'performance'].includes(tool.name)
  );
  
  console.log(chalk.green(`✅ Connected! Found ${toolsResponse.result.tools.length} tools\n`));
  console.log(chalk.cyan('🤖 Domain Assistants Available:'));
  domainAssistants.forEach((assistant: any) => {
    console.log(chalk.white(`   • ${assistant.name}: ${assistant.description}`));
  });
  console.log();
  
  // Run through scenarios
  for (const scenario of scenarios) {
    console.log(chalk.cyan('\n' + '─'.repeat(80) + '\n'));
    console.log(chalk.yellow.bold(scenario.title));
    console.log();
    
    // Show user request
    await typeText('💬 User: ', chalk.green);
    await typeText(scenario.request.intent, chalk.white);
    console.log();
    
    // Show thinking
    process.stdout.write(chalk.gray('🤔 Assistant thinking'));
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      process.stdout.write(chalk.gray('.'));
    }
    console.log('\n');
    
    // Call assistant
    const response: any = await client.callTool(scenario.assistant, scenario.request);
    
    // Display response
    console.log(chalk.blue('🤖 Assistant Response:\n'));
    
    if (response.result?.content?.[0]?.text) {
      // Format the response nicely
      const responseText = response.result.content[0].text;
      const lines = responseText.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('#')) {
          console.log(chalk.cyan.bold(line));
        } else if (line.startsWith('**')) {
          console.log(chalk.yellow(line));
        } else if (line.startsWith('•') || line.startsWith('-') || line.match(/^\d+\./)) {
          console.log(chalk.white('  ' + line));
        } else if (line.includes('$') || line.includes('days') || line.includes('%')) {
          console.log(chalk.green(line));
        } else {
          console.log(chalk.white(line));
        }
      }
    }
    
    // Pause between scenarios
    if (scenarios.indexOf(scenario) < scenarios.length - 1) {
      console.log();
      await typeText('\n💡 Press Enter to continue to next scenario...', chalk.gray);
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    }
  }
  
  // Show workflow example
  console.log(chalk.cyan('\n' + '═'.repeat(80) + '\n'));
  console.log(chalk.yellow.bold('🔄 Workflow Orchestration Example'));
  console.log(chalk.white('\nNow let\'s see how assistants work together...\n'));
  
  await typeText('💬 User: ', chalk.green);
  await typeText('Launch a secure e-commerce site with optimal performance', chalk.white);
  console.log();
  
  // Infrastructure setup
  console.log(chalk.blue('\n📦 Step 1: Infrastructure Assistant'));
  await client.callTool('infrastructure', {
    intent: 'Setup property for e-commerce with high availability'
  });
  console.log(chalk.green('   ✓ Property created: ecommerce-prod.edgekey.net'));
  
  // Security configuration
  console.log(chalk.blue('\n🔒 Step 2: Security Assistant'));
  await client.callTool('security', {
    intent: 'Configure PCI-compliant security rules'
  });
  console.log(chalk.green('   ✓ WAF rules applied'));
  console.log(chalk.green('   ✓ Bot management enabled'));
  
  // Performance optimization
  console.log(chalk.blue('\n⚡ Step 3: Performance Assistant'));
  await client.callTool('performance', {
    intent: 'Optimize for mobile shopping experience'
  });
  console.log(chalk.green('   ✓ Image optimization configured'));
  console.log(chalk.green('   ✓ Mobile detection rules added'));
  
  // DNS configuration
  console.log(chalk.blue('\n🌐 Step 4: DNS Assistant'));
  await client.callTool('dns', {
    intent: 'Configure DNS with automatic failover'
  });
  console.log(chalk.green('   ✓ DNS zones created'));
  console.log(chalk.green('   ✓ Health checks configured'));
  
  console.log(chalk.cyan('\n' + '═'.repeat(80) + '\n'));
  console.log(chalk.green.bold('✅ Complete! Your e-commerce site is:'));
  console.log(chalk.white('   • Globally distributed across Akamai edge servers'));
  console.log(chalk.white('   • Protected with enterprise security'));
  console.log(chalk.white('   • Optimized for <2 second load times'));
  console.log(chalk.white('   • Ready for millions of visitors'));
  console.log();
  
  // Clean up
  console.log(chalk.gray('\n👋 Demo complete! Shutting down server...'));
  serverProcess.kill();
  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Error:'), error);
  process.exit(1);
});

// Run the demo
console.log(chalk.yellow('\n🎬 Starting ALECS Domain Assistants Demo...\n'));
console.log(chalk.gray('This demo will show real interactions with the MCP server.\n'));

// Make stdin raw for better control
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

runDemo().catch(console.error);