#!/usr/bin/env node

/**
 * Simple MCP Test Client
 * 
 * A minimal test client that mimics Claude Desktop's MCP client behavior
 * for testing ALECS MCP Server functionality.
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult
} from '@modelcontextprotocol/sdk/types.js';

interface TestResult {
  tool: string;
  success: boolean;
  duration: number;
  error?: string;
  result?: any;
}

export class MCPTestClient {
  private client?: Client;
  private transport?: StdioClientTransport;
  private serverProcess?: any;

  constructor(private serverPath: string) {}

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    console.log(`[TEST] Connecting to MCP server at ${this.serverPath}...`);
    
    // Spawn the server process
    this.serverProcess = spawn('node', [this.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'error' // Reduce noise during testing
      }
    });

    // Create transport
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [this.serverPath],
      env: process.env
    });

    // Create client
    this.client = new Client({
      name: 'mcp-test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Connect
    await this.client.connect(this.transport);
    console.log('[TEST] Connected successfully');
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    console.log('[TEST] Disconnecting...');
    
    if (this.client) {
      await this.client.close();
    }
    
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    
    console.log('[TEST] Disconnected');
  }

  /**
   * List available tools
   */
  async listTools(): Promise<Tool[]> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    console.log('[TEST] Listing tools...');
    const response = await this.client.request(ListToolsRequestSchema, {
      method: 'tools/list'
    });

    console.log(`[TEST] Found ${response.tools.length} tools`);
    return response.tools;
  }

  /**
   * Call a tool with parameters
   */
  async callTool(name: string, args: any): Promise<CallToolResult> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    console.log(`[TEST] Calling tool: ${name}`);
    const startTime = Date.now();

    try {
      const response = await this.client.request(CallToolRequestSchema, {
        method: 'tools/call',
        params: {
          name,
          arguments: args
        }
      });

      const duration = Date.now() - startTime;
      console.log(`[TEST] Tool ${name} completed in ${duration}ms`);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[TEST] Tool ${name} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Run a test scenario
   */
  async runTest(toolName: string, args: any, description?: string): Promise<TestResult> {
    console.log(`\n[TEST SCENARIO] ${description || toolName}`);
    console.log('[PARAMS]', JSON.stringify(args, null, 2));
    
    const startTime = Date.now();
    
    try {
      const result = await this.callTool(toolName, args);
      const duration = Date.now() - startTime;
      
      console.log('[RESULT] Success');
      if (result.content?.[0]?.type === 'text') {
        console.log('[OUTPUT]', result.content[0].text.substring(0, 200) + '...');
      }
      
      return {
        tool: toolName,
        success: true,
        duration,
        result
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[RESULT] Failed:', error.message);
      
      return {
        tool: toolName,
        success: false,
        duration,
        error: error.message
      };
    }
  }

  /**
   * Run a suite of tests
   */
  async runTestSuite(): Promise<void> {
    console.log('\n========== MCP TEST SUITE ==========\n');
    
    const results: TestResult[] = [];
    
    try {
      // Connect to server
      await this.connect();
      
      // Test 1: List tools
      console.log('\n[TEST 1] Tool Discovery');
      const tools = await this.listTools();
      console.log(`[PASS] Discovered ${tools.length} tools`);
      
      // Test 2: List properties
      results.push(await this.runTest(
        'list-properties',
        { customer: 'default' },
        'List Properties (Default Customer)'
      ));
      
      // Test 3: List contracts
      results.push(await this.runTest(
        'list-contracts',
        { customer: 'default' },
        'List Contracts'
      ));
      
      // Test 4: Invalid tool
      results.push(await this.runTest(
        'invalid-tool',
        {},
        'Invalid Tool (Should Fail)'
      ));
      
      // Test 5: Missing required parameter
      results.push(await this.runTest(
        'get-property',
        {},
        'Get Property (Missing propertyId - Should Fail)'
      ));
      
    } finally {
      await this.disconnect();
    }
    
    // Print summary
    console.log('\n========== TEST SUMMARY ==========\n');
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`\nDetailed Results:`);
    
    results.forEach((result, i) => {
      const status = result.success ? '[PASS]' : '[FAIL]';
      console.log(`${i + 1}. ${status} ${result.tool} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

// Run tests if called directly
if (require.main === module) {
  const serverPath = process.argv[2] || './dist/index.js';
  const client = new MCPTestClient(serverPath);
  
  client.runTestSuite()
    .then(() => {
      console.log('\n[TEST] Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n[TEST] Test suite failed:', error);
      process.exit(1);
    });
}

export default MCPTestClient;