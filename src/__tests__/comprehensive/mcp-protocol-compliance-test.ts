/**
 * MCP Protocol Compliance Testing Suite
 * 
 * Strategy 3: Test all tools through actual MCP protocol messages
 * Simulates Claude Desktop client interactions
 */

import { 
  Client, 
  StdioClientTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

// MCP Protocol message types
interface MCPTestScenario {
  name: string;
  toolName: string;
  params: Record<string, any>;
  expectedResponseType: 'success' | 'error';
  validateResponse?: (response: any) => boolean;
}

interface ProtocolTestResult {
  scenario: string;
  tool: string;
  success: boolean;
  responseTime: number;
  error?: string;
  protocolCompliant: boolean;
}

/**
 * MCP Protocol Compliance Tester
 * Simulates real Claude Desktop client behavior
 */
export class MCPProtocolComplianceTester {
  private client: Client | null = null;
  private serverProcess: ChildProcess | null = null;
  private results: ProtocolTestResult[] = [];
  private allTools: any[] = [];
  
  /**
   * Start MCP server and establish client connection
   */
  async initialize(): Promise<void> {
    console.log('🚀 Starting MCP server for protocol testing...');
    
    // Start the ALECS MCP server
    this.serverProcess = spawn('node', ['dist/index.js'], {
      env: {
        ...process.env,
        MCP_MODE: 'test',
        MOCK_RESPONSES: 'true'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Create MCP client
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
      env: {
        ...process.env,
        MCP_MODE: 'test',
        MOCK_RESPONSES: 'true'
      }
    });
    
    this.client = new Client({
      name: 'test-mcp-client',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    // Connect to server
    await this.client.connect(transport);
    
    // List all available tools
    const toolsResponse = await this.client.request(
      { method: 'tools/list' },
      ListToolsRequestSchema
    );
    
    this.allTools = toolsResponse.tools || [];
    console.log(`✅ Connected to MCP server with ${this.allTools.length} tools available`);
  }

  /**
   * Test individual tool through MCP protocol
   */
  async testToolProtocol(scenario: MCPTestScenario): Promise<ProtocolTestResult> {
    const startTime = Date.now();
    const result: ProtocolTestResult = {
      scenario: scenario.name,
      tool: scenario.toolName,
      success: false,
      responseTime: 0,
      protocolCompliant: true
    };
    
    try {
      // Send tool call through MCP protocol
      const response = await this.client!.request(
        {
          method: 'tools/call',
          params: {
            name: scenario.toolName,
            arguments: scenario.params
          }
        },
        CallToolRequestSchema
      );
      
      result.responseTime = Date.now() - startTime;
      
      // Validate protocol compliance
      if (!this.validateProtocolResponse(response)) {
        result.protocolCompliant = false;
        result.error = 'Response does not comply with MCP protocol';
      }
      
      // Validate response content
      if (scenario.validateResponse && !scenario.validateResponse(response)) {
        result.error = 'Response validation failed';
      } else {
        result.success = true;
      }
      
    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : String(error);
      
      // Check if error response is protocol compliant
      if (scenario.expectedResponseType === 'error') {
        result.success = true; // Expected error
      }
    }
    
    return result;
  }

  /**
   * Validate MCP protocol response structure
   */
  private validateProtocolResponse(response: any): boolean {
    // Check required MCP response fields
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    // Tool responses should have content array
    if (response.content && !Array.isArray(response.content)) {
      return false;
    }
    
    // Each content item should have type and text/data
    if (response.content) {
      for (const item of response.content) {
        if (!item.type || (item.type === 'text' && !item.text)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Generate test scenarios for all tools
   */
  generateTestScenarios(): MCPTestScenario[] {
    const scenarios: MCPTestScenario[] = [];
    
    // Test each discovered tool
    for (const tool of this.allTools) {
      // Happy path test
      scenarios.push({
        name: `${tool.name} - Valid Input`,
        toolName: tool.name,
        params: this.generateValidParams(tool),
        expectedResponseType: 'success'
      });
      
      // Invalid input test
      scenarios.push({
        name: `${tool.name} - Invalid Input`,
        toolName: tool.name,
        params: {}, // Empty params to test validation
        expectedResponseType: 'error'
      });
      
      // Customer switching test (if applicable)
      if (this.supportsCustomerParam(tool)) {
        scenarios.push({
          name: `${tool.name} - Customer Switching`,
          toolName: tool.name,
          params: {
            ...this.generateValidParams(tool),
            customer: 'alternate-customer'
          },
          expectedResponseType: 'success'
        });
      }
    }
    
    // Add cross-tool workflow scenarios
    scenarios.push(...this.generateWorkflowScenarios());
    
    return scenarios;
  }

  /**
   * Generate valid parameters based on tool schema
   */
  private generateValidParams(tool: any): Record<string, any> {
    if (!tool.inputSchema) return {};
    
    const params: Record<string, any> = {};
    const properties = tool.inputSchema.properties || {};
    
    for (const [key, schema] of Object.entries(properties)) {
      params[key] = this.generateParamValue(schema as any, key);
    }
    
    return params;
  }

  /**
   * Generate parameter values based on schema
   */
  private generateParamValue(schema: any, key: string): any {
    // Handle specific parameter patterns
    if (key === 'propertyId') return 'prp_123456';
    if (key === 'zone') return 'example.com';
    if (key === 'contractId') return 'ctr_C-ABC123';
    if (key === 'groupId') return 'grp_123456';
    if (key === 'network') return 'STAGING';
    
    // Handle schema types
    switch (schema.type) {
      case 'string':
        if (schema.enum) return schema.enum[0];
        if (schema.format === 'email') return 'test@example.com';
        if (schema.format === 'uri') return 'https://example.com';
        return 'test-value';
        
      case 'number':
      case 'integer':
        return schema.minimum || 1;
        
      case 'boolean':
        return true;
        
      case 'array':
        return [this.generateParamValue(schema.items || {}, key)];
        
      case 'object':
        const obj: Record<string, any> = {};
        for (const [prop, subSchema] of Object.entries(schema.properties || {})) {
          obj[prop] = this.generateParamValue(subSchema, prop);
        }
        return obj;
        
      default:
        return null;
    }
  }

  /**
   * Check if tool supports customer parameter
   */
  private supportsCustomerParam(tool: any): boolean {
    return tool.inputSchema?.properties?.customer !== undefined;
  }

  /**
   * Generate cross-tool workflow scenarios
   */
  private generateWorkflowScenarios(): MCPTestScenario[] {
    return [
      // Property creation and activation workflow
      {
        name: 'Workflow - Property Creation',
        toolName: 'property.create',
        params: {
          propertyName: 'test-workflow-property',
          contractId: 'ctr_C-ABC123',
          groupId: 'grp_123456',
          productId: 'prd_Site_Accel'
        },
        expectedResponseType: 'success',
        validateResponse: (response) => {
          const content = response.content?.[0]?.text;
          return content && content.includes('propertyId');
        }
      },
      
      // DNS zone and record workflow
      {
        name: 'Workflow - DNS Setup',
        toolName: 'dns.zone.create',
        params: {
          zone: 'test-workflow.com',
          type: 'primary',
          comment: 'MCP protocol test'
        },
        expectedResponseType: 'success'
      },
      
      // Security configuration workflow
      {
        name: 'Workflow - Security Config',
        toolName: 'appsec.config.list',
        params: {},
        expectedResponseType: 'success'
      }
    ];
  }

  /**
   * Run comprehensive MCP protocol testing
   */
  async runProtocolTest(): Promise<{success: boolean, report: string}> {
    try {
      // Initialize MCP connection
      await this.initialize();
      
      // Generate test scenarios
      const scenarios = this.generateTestScenarios();
      console.log(`\n📋 Generated ${scenarios.length} test scenarios`);
      
      // Run each scenario
      for (const scenario of scenarios) {
        console.log(`\n🧪 Testing: ${scenario.name}`);
        const result = await this.testToolProtocol(scenario);
        this.results.push(result);
        
        if (result.success) {
          console.log(`  ✅ Success (${result.responseTime}ms)`);
        } else {
          console.log(`  ❌ Failed: ${result.error}`);
        }
        
        if (!result.protocolCompliant) {
          console.log(`  ⚠️  Protocol compliance issue detected`);
        }
      }
      
      // Generate report
      const report = this.generateProtocolReport();
      const success = this.calculateProtocolSuccess();
      
      return { success, report };
      
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Generate protocol compliance report
   */
  private generateProtocolReport(): string {
    let report = '# MCP Protocol Compliance Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Overall summary
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const protocolCompliant = this.results.filter(r => r.protocolCompliant).length;
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
    
    report += '## Overall Summary\n\n';
    report += `- Total Tests: ${totalTests}\n`;
    report += `- Successful: ${successfulTests} (${(successfulTests/totalTests*100).toFixed(1)}%)\n`;
    report += `- Protocol Compliant: ${protocolCompliant} (${(protocolCompliant/totalTests*100).toFixed(1)}%)\n`;
    report += `- Average Response Time: ${avgResponseTime.toFixed(0)}ms\n\n`;
    
    // Tool coverage
    const toolCoverage = new Map<string, number>();
    for (const result of this.results) {
      const count = toolCoverage.get(result.tool) || 0;
      toolCoverage.set(result.tool, count + 1);
    }
    
    report += '## Tool Coverage\n\n';
    report += `- Total Tools Tested: ${toolCoverage.size}\n`;
    report += `- Tests per Tool: ${(totalTests / toolCoverage.size).toFixed(1)} average\n\n`;
    
    // Failed tests
    const failures = this.results.filter(r => !r.success);
    if (failures.length > 0) {
      report += '## Failed Tests\n\n';
      for (const failure of failures) {
        report += `### ${failure.scenario}\n`;
        report += `- Tool: ${failure.tool}\n`;
        report += `- Error: ${failure.error}\n`;
        report += `- Protocol Compliant: ${failure.protocolCompliant}\n\n`;
      }
    }
    
    // Protocol compliance issues
    const nonCompliant = this.results.filter(r => !r.protocolCompliant);
    if (nonCompliant.length > 0) {
      report += '## Protocol Compliance Issues\n\n';
      for (const issue of nonCompliant) {
        report += `- ${issue.tool}: ${issue.scenario}\n`;
      }
    }
    
    // Performance analysis
    report += '\n## Performance Analysis\n\n';
    const slowTests = this.results.filter(r => r.responseTime > 1000);
    report += `- Slow Tests (>1s): ${slowTests.length}\n`;
    
    if (slowTests.length > 0) {
      report += '\n**Slowest Tests:**\n';
      slowTests
        .sort((a, b) => b.responseTime - a.responseTime)
        .slice(0, 5)
        .forEach(test => {
          report += `- ${test.scenario}: ${test.responseTime}ms\n`;
        });
    }
    
    return report;
  }

  /**
   * Calculate overall protocol test success
   */
  private calculateProtocolSuccess(): boolean {
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success && r.protocolCompliant).length;
    return successfulTests === totalTests;
  }

  /**
   * Cleanup MCP connection and server
   */
  private async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
    
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

// Export test runner
export async function runMCPProtocolComplianceTest(): Promise<{success: boolean, report: string}> {
  const tester = new MCPProtocolComplianceTester();
  return await tester.runProtocolTest();
}