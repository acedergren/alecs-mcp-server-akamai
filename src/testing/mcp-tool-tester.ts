/**
 * CODE KAI: MCP Tool Tester
 * World-class testing utility for MCP tools
 * No shortcuts - comprehensive testing with full validation
 */

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TEST_DEFAULTS, ToolError, BaseToolArgs } from '../types/tool-infrastructure';

/**
 * Test result with comprehensive information
 */
export interface MCPTestResult {
  success: boolean;
  toolName: string;
  args: any;
  response?: any;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  metadata: {
    requestId: string;
    serverPath: string;
    customer?: string;
  };
}

/**
 * Test configuration options
 */
export interface MCPTestConfig {
  serverPath: string;
  timeout?: number;
  customer?: string;
  verbose?: boolean;
  captureStderr?: boolean;
}

/**
 * MCP Tool Tester for comprehensive testing
 */
export class MCPToolTester {
  private config: Required<MCPTestConfig>;
  
  constructor(config: MCPTestConfig) {
    this.config = {
      timeout: 30000,
      customer: TEST_DEFAULTS.customer,
      verbose: false,
      captureStderr: true,
      ...config
    };
  }
  
  /**
   * Test a single tool with full validation
   */
  async testTool(
    toolName: string,
    args: BaseToolArgs & Record<string, any>
  ): Promise<MCPTestResult> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    // Add default customer if not provided
    const enhancedArgs = {
      ...args,
      customer: args.customer || this.config.customer
    };
    
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: enhancedArgs
      },
      id: requestId
    };
    
    if (this.config.verbose) {
      console.log(`[MCPToolTester] Testing ${toolName} with args:`, enhancedArgs);
    }
    
    try {
      const response = await this.executeRequest(request);
      const endTime = Date.now();
      
      // Parse and validate response
      const result = this.parseResponse(response);
      
      return {
        success: !result.error,
        toolName,
        args: enhancedArgs,
        response: result.result,
        error: result.error,
        timing: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime
        },
        metadata: {
          requestId,
          serverPath: this.config.serverPath,
          customer: enhancedArgs.customer
        }
      };
    } catch (error: any) {
      const endTime = Date.now();
      
      return {
        success: false,
        toolName,
        args: enhancedArgs,
        error: {
          message: error.message,
          code: 'EXECUTION_ERROR',
          details: error
        },
        timing: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime
        },
        metadata: {
          requestId,
          serverPath: this.config.serverPath,
          customer: enhancedArgs.customer
        }
      };
    }
  }
  
  /**
   * Test multiple tools in sequence
   */
  async testTools(
    tests: Array<{ toolName: string; args: BaseToolArgs & Record<string, any> }>
  ): Promise<MCPTestResult[]> {
    const results: MCPTestResult[] = [];
    
    for (const test of tests) {
      if (this.config.verbose) {
        console.log(`\\n[MCPToolTester] Running test ${tests.indexOf(test) + 1}/${tests.length}: ${test.toolName}`);
      }
      
      const result = await this.testTool(test.toolName, test.args);
      results.push(result);
      
      if (this.config.verbose && !result.success) {
        console.error(`[MCPToolTester] Test failed:`, result.error);
      }
    }
    
    return results;
  }
  
  /**
   * Execute MCP request
   */
  private async executeRequest(request: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const tmpFile = join(tmpdir(), `mcp-test-${Date.now()}.json`);
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      
      // Write request to temp file
      writeFileSync(tmpFile, JSON.stringify(request));
      
      // Spawn process
      const proc = spawn('node', [this.config.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Set timeout
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
      }, this.config.timeout);
      
      // Capture output
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      if (this.config.captureStderr) {
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
          if (this.config.verbose) {
            console.error('[MCPToolTester stderr]', data.toString());
          }
        });
      }
      
      // Handle completion
      proc.on('close', (code) => {
        clearTimeout(timer);
        
        // Clean up temp file
        try {
          unlinkSync(tmpFile);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        if (timedOut) {
          reject(new Error(`Request timed out after ${this.config.timeout}ms`));
          return;
        }
        
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}\\nstderr: ${stderr}`));
          return;
        }
        
        resolve(stdout);
      });
      
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      
      // Send request
      proc.stdin.write(JSON.stringify(request));
      proc.stdin.end();
    });
  }
  
  /**
   * Parse MCP response
   */
  private parseResponse(output: string): any {
    // Extract JSON from output (skip any log lines)
    const lines = output.split('\\n');
    let jsonLine = '';
    
    for (const line of lines) {
      if (line.trim().startsWith('{') && line.includes('jsonrpc')) {
        jsonLine = line;
        break;
      }
    }
    
    if (!jsonLine) {
      throw new Error('No valid JSON response found in output');
    }
    
    try {
      return JSON.parse(jsonLine);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${jsonLine}`);
    }
  }
  
  /**
   * Generate test report
   */
  generateReport(results: MCPTestResult[]): string {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = results.reduce((sum, r) => sum + r.timing.duration, 0) / total;
    
    let report = `# MCP Tool Test Report\\n\\n`;
    report += `## Summary\\n`;
    report += `- Total Tests: ${total}\\n`;
    report += `- Successful: ${successful} (${((successful / total) * 100).toFixed(1)}%)\\n`;
    report += `- Failed: ${failed}\\n`;
    report += `- Average Duration: ${avgDuration.toFixed(0)}ms\\n\\n`;
    
    report += `## Test Results\\n\\n`;
    
    for (const result of results) {
      const status = result.success ? '[OK] PASS' : '[ERROR] FAIL';
      report += `### ${status} ${result.toolName}\\n`;
      report += `- Duration: ${result.timing.duration}ms\\n`;
      report += `- Customer: ${result.metadata.customer}\\n`;
      
      if (result.args) {
        report += `- Args: ${JSON.stringify(result.args, null, 2)}\\n`;
      }
      
      if (result.error) {
        report += `- Error: ${result.error.message}\\n`;
        if (result.error.details) {
          report += `- Details: ${JSON.stringify(result.error.details, null, 2)}\\n`;
        }
      }
      
      report += `\\n`;
    }
    
    return report;
  }
  
  /**
   * Create test suite from examples
   */
  static createTestSuite(
    examples: Array<{
      toolName: string;
      description: string;
      args: BaseToolArgs & Record<string, any>;
      expectedSuccess?: boolean;
    }>
  ): Array<{ toolName: string; args: BaseToolArgs & Record<string, any> }> {
    return examples.map(ex => ({
      toolName: ex.toolName,
      args: ex.args
    }));
  }
}

/**
 * Create standard test scenarios
 */
export function createStandardTests(propertyId?: string): Array<{
  toolName: string;
  description: string;
  args: BaseToolArgs & Record<string, any>;
}> {
  const testPropertyId = propertyId || 'prp_1229270'; // mcp-solutionsedge-io-test
  
  return [
    {
      toolName: 'list_properties',
      description: 'List all properties',
      args: {
        limit: 5
      }
    },
    {
      toolName: 'get_property',
      description: 'Get specific property details',
      args: {
        propertyId: testPropertyId
      }
    },
    {
      toolName: 'search_properties',
      description: 'Search for properties',
      args: {
        propertyName: 'solutionsedge'
      }
    },
    {
      toolName: 'validate_property_activation',
      description: 'Validate property for activation',
      args: {
        propertyId: testPropertyId,
        network: 'STAGING'
      }
    },
    {
      toolName: 'get_latest_property_version',
      description: 'Get latest property version',
      args: {
        propertyId: testPropertyId,
        activatedOn: 'LATEST'
      }
    }
  ];
}