#!/usr/bin/env node

// Test script to verify ALECS MCP Server connection

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing ALECS MCP Server Connection...\n');

// Check prerequisites
function checkPrerequisites() {
  console.log('📋 Checking prerequisites:');
  
  // Check Node version
  const nodeVersion = process.version;
  console.log(`✓ Node.js version: ${nodeVersion}`);
  
  // Check if dist/index.js exists
  const distPath = path.join(__dirname, 'dist', 'index.js');
  if (fs.existsSync(distPath)) {
    console.log('✓ Production build found');
  } else {
    console.log('❌ Production build not found. Run: make build');
  }
  
  // Check if .edgerc exists
  const edgercPath = path.join(process.env.HOME, '.edgerc');
  if (fs.existsSync(edgercPath)) {
    console.log('✓ .edgerc file found');
  } else {
    console.log('❌ .edgerc file not found at ~/.edgerc');
  }
  
  console.log('');
}

// Test server startup
function testServer() {
  console.log('🚀 Starting ALECS server...\n');
  
  const server = spawn('node', [path.join(__dirname, 'dist', 'index.js')], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Send a test request
  const testRequest = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 1
  }) + '\n';
  
  server.stdin.write(testRequest);
  
  let response = '';
  server.stdout.on('data', (data) => {
    response += data.toString();
    try {
      const parsed = JSON.parse(response);
      if (parsed.result && parsed.result.tools) {
        console.log('✅ Server is working!\n');
        console.log(`📦 Available tools: ${parsed.result.tools.length}`);
        console.log('\nSample tools:');
        parsed.result.tools.slice(0, 5).forEach(tool => {
          console.log(`  - ${tool.name}: ${tool.description.split('\n')[0]}`);
        });
        
        server.kill();
        process.exit(0);
      }
    } catch (e) {
      // Response not complete yet
    }
  });
  
  server.stderr.on('data', (data) => {
    console.error('❌ Error:', data.toString());
    server.kill();
    process.exit(1);
  });
  
  // Timeout after 5 seconds
  setTimeout(() => {
    console.log('❌ Server did not respond within 5 seconds');
    server.kill();
    process.exit(1);
  }, 5000);
}

// Main
checkPrerequisites();
testServer();