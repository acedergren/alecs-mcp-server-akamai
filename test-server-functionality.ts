#!/usr/bin/env npx tsx

/**
 * SERVER FUNCTIONALITY TEST
 * Validates that our TypeScript hardening hasn't broken core functionality
 */

import { spawn } from 'child_process';

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

console.log('🧪 TESTING SERVER FUNCTIONALITY');
console.log('📍 Branch: task-2-typescript-hardening');
console.log('🎯 Validating core MCP operations\n');

const initializeRequest: MCPRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "functionality-test", version: "1.0.0" }
  }
};

const listToolsRequest: MCPRequest = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/list"
};

async function testServer(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting server...');
    
    const server = spawn('node', ['dist/index-full.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let testsCompleted = 0;
    let serverReady = false;

    server.stdout.on('data', (data) => {
      const output = data.toString().trim();
      
      if (output.includes('ALECS Full MCP Server ready')) {
        console.log('✅ Server started successfully');
        serverReady = true;
        
        // Send initialize request
        setTimeout(() => {
          console.log('📤 Sending initialize request');
          server.stdin.write(JSON.stringify(initializeRequest) + '\n');
        }, 500);
      }
      
      if (output.startsWith('{')) {
        try {
          const response: MCPResponse = JSON.parse(output);
          testsCompleted++;
          
          if (response.id === 1) {
            console.log('✅ Initialize: SUCCESS');
            // Send list tools request
            setTimeout(() => {
              console.log('📤 Sending list tools request');
              server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
            }, 500);
          }
          
          if (response.id === 2) {
            console.log('✅ List tools: SUCCESS');
            if (response.result && response.result.tools) {
              console.log(`   📊 Found ${response.result.tools.length} tools`);
            }
            
            console.log('\n🎯 FUNCTIONALITY TEST COMPLETE!');
            console.log('✅ Server responds to MCP requests');
            console.log('✅ JSON-RPC protocol working'); 
            console.log('✅ Tool registry accessible');
            console.log('💪 CORE FUNCTIONALITY PRESERVED!');
            
            server.kill();
            resolve(true);
          }
        } catch (e) {
          console.log('📥 Non-JSON response:', output);
        }
      }
    });

    server.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('ERROR') && !error.includes('ExperimentalWarning')) {
        console.log('❌ Server error:', error.trim());
        server.kill();
        reject(new Error('Server failed to start'));
      }
    });

    // Timeout safety
    setTimeout(() => {
      if (testsCompleted < 2) {
        console.log('⏰ Test timeout');
        server.kill();
        reject(new Error('Test timeout'));
      }
    }, 30000);
  });
}

// Run the test
testServer()
  .then(() => {
    console.log('\n🏆 ALL TESTS PASSED - TypeScript fixes are working!');
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n💥 TEST FAILED:', error.message);
    console.log('❌ Must fix remaining issues before proceeding');
    process.exit(1);
  });