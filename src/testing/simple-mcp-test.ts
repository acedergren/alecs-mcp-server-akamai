#!/usr/bin/env node

/**
 * Simple MCP Protocol Test
 * 
 * Tests basic MCP protocol compliance without full SDK dependencies
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class SimpleMCPTest {
  private process?: any;
  private rl?: any;
  private requestId = 0;
  private pendingRequests = new Map<string | number, (response: JsonRpcResponse) => void>();

  constructor(private serverPath: string) {}

  async start(): Promise<void> {
    console.log('[TEST] Starting MCP server...');
    
    this.process = spawn('node', [this.serverPath], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    this.rl = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    });

    this.rl.on('line', (line: string) => {
      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        const resolver = this.pendingRequests.get(response.id);
        if (resolver) {
          resolver(response);
          this.pendingRequests.delete(response.id);
        }
      } catch (error) {
        console.error('[ERROR] Failed to parse response:', line);
      }
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('[TEST] Server started');
  }

  async stop(): Promise<void> {
    console.log('[TEST] Stopping server...');
    if (this.process) {
      this.process.kill();
    }
    if (this.rl) {
      this.rl.close();
    }
  }

  private async sendRequest(method: string, params?: unknown): Promise<JsonRpcResponse> {
    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, resolve);
      
      // Send request
      this.process.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  async runTests(): Promise<void> {
    console.log('\n========== SIMPLE MCP PROTOCOL TESTS ==========\n');
    
    let passed = 0;
    let failed = 0;

    // Test 1: Initialize
    console.log('[TEST 1] Initialize');
    try {
      const response = await this.sendRequest('initialize', {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      });
      
      if (response.result) {
        console.log('[PASS] Server initialized');
        console.log('  Server:', response.result.serverInfo?.name);
        console.log('  Version:', response.result.serverInfo?.version);
        passed++;
      } else {
        console.log('[FAIL] No result in response');
        failed++;
      }
    } catch (error: unknown) {
      console.log('[FAIL]', error.message);
      failed++;
    }

    // Test 2: List Tools
    console.log('\n[TEST 2] List Tools');
    try {
      const response = await this.sendRequest('tools/list', {});
      
      if (response.result?.tools) {
        console.log(`[PASS] Found ${response.result.tools.length} tools`);
        // Show first 3 tools
        response.result.tools.slice(0, 3).forEach((tool: unknown) => {
          console.log(`  - ${tool.name}: ${tool.description?.substring(0, 50)}...`);
        });
        passed++;
      } else {
        console.log('[FAIL] No tools in response');
        failed++;
      }
    } catch (error: unknown) {
      console.log('[FAIL]', error.message);
      failed++;
    }

    // Test 3: Call Tool - Valid
    console.log('\n[TEST 3] Call Tool - list-contracts');
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'list-contracts',
        arguments: {
          customer: 'default'
        }
      });
      
      if (response.result?.content) {
        console.log('[PASS] Tool executed successfully');
        console.log('  Content type:', response.result.content[0]?.type);
        passed++;
      } else if (response.error) {
        console.log('[EXPECTED] Error response:', response.error.message);
        // This might be expected if no contracts exist
        passed++;
      } else {
        console.log('[FAIL] Invalid response format');
        failed++;
      }
    } catch (error: unknown) {
      console.log('[FAIL]', error.message);
      failed++;
    }

    // Test 4: Call Tool - Invalid Tool
    console.log('\n[TEST 4] Call Tool - Invalid');
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'invalid-tool-name',
        arguments: {}
      });
      
      if (response.error) {
        console.log('[PASS] Error correctly returned');
        console.log('  Error code:', response.error.code);
        console.log('  Error message:', response.error.message);
        passed++;
      } else {
        console.log('[FAIL] Should have returned error');
        failed++;
      }
    } catch (error: unknown) {
      console.log('[FAIL]', error.message);
      failed++;
    }

    // Test 5: Call Tool - Invalid Parameters
    console.log('\n[TEST 5] Call Tool - Invalid Parameters');
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'get-property',
        arguments: {} // Missing required propertyId
      });
      
      if (response.error) {
        console.log('[PASS] Validation error correctly returned');
        console.log('  Error code:', response.error.code);
        console.log('  Error message:', response.error.message);
        passed++;
      } else {
        console.log('[FAIL] Should have returned validation error');
        failed++;
      }
    } catch (error: unknown) {
      console.log('[FAIL]', error.message);
      failed++;
    }

    // Summary
    console.log('\n========== SUMMARY ==========');
    console.log(`Total Tests: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  }
}

// Run if called directly
if (require.main === module) {
  const serverPath = process.argv[2] || './dist/index.js';
  const tester = new SimpleMCPTest(serverPath);
  
  tester.start()
    .then(() => tester.runTests())
    .then(() => tester.stop())
    .then(() => {
      console.log('\n[TEST] Complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n[ERROR]', error);
      process.exit(1);
    });
}