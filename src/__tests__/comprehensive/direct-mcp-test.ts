#!/usr/bin/env node

/**
 * Direct MCP SDK Client Test
 * Strategy #1: Tests ALECS server using official MCP SDK client
 * No mocks or stubs - genuine MCP protocol communication
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

interface ToolTestResult {
  tool: string;
  success: boolean;
  error?: string;
  responseTime?: number;
  responseSize?: number;
  validation?: ValidationResult;
}

interface ValidationResult {
  schemaValid: boolean;
  hasExpectedFields: boolean;
  details?: string[];
}

interface DomainTestResult {
  domain: string;
  totalTools: number;
  successfulTools: number;
  failedTools: number;
  results: ToolTestResult[];
  averageResponseTime: number;
}

interface TestConfiguration {
  testEnvironment: 'testing' | 'default';
  testData: Map<string, any>;
  validationRules: Map<string, (response: any) => ValidationResult>;
}

class DirectMCPTester {
  private client?: Client;
  private transport?: StdioClientTransport;
  private allTools: string[] = [];
  private results: DomainTestResult[] = [];
  private config: TestConfiguration;

  constructor() {
    this.config = {
      testEnvironment: 'testing',
      testData: this.initializeTestData(),
      validationRules: this.initializeValidationRules()
    };
  }

  private initializeTestData(): Map<string, any> {
    const data = new Map();
    
    // Property test data
    data.set('property.contractId', 'ctr_V-44KRACO');
    data.set('property.groupId', 'grp_123456');
    data.set('property.productId', 'prd_Site_Accel');
    
    // DNS test data
    data.set('dns.testZone', `test-${Date.now()}.example.com`);
    
    // Security test data
    data.set('appsec.configId', 78912);
    
    return data;
  }

  private initializeValidationRules(): Map<string, (response: any) => ValidationResult> {
    const rules = new Map();
    
    // Property validation rules
    rules.set('property.list', (response: any) => ({
      schemaValid: Array.isArray(response?.properties),
      hasExpectedFields: response?.properties?.[0]?.propertyId !== undefined,
      details: ['Validated properties array structure']
    }));
    
    rules.set('property.create', (response: any) => ({
      schemaValid: typeof response?.propertyId === 'string',
      hasExpectedFields: response?.propertyName !== undefined,
      details: ['Validated property creation response']
    }));
    
    // DNS validation rules
    rules.set('dns.zone.list', (response: any) => ({
      schemaValid: Array.isArray(response?.zones),
      hasExpectedFields: true,
      details: ['Validated DNS zones structure']
    }));
    
    return rules;
  }

  async startServer(): Promise<void> {
    console.log('🚀 Starting ALECS MCP Server with genuine MCP SDK client...');
    
    // Skip build - already built
    console.log('📦 Using existing build...');
    
    // Create transport and client
    this.transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
      env: {
        ...process.env,
        MCP_MODE: 'stdio',
        LOG_LEVEL: 'error'
      }
    });

    this.client = new Client({
      name: 'direct-mcp-test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Connect to server
    await this.client.connect(this.transport);
    console.log('✅ Connected to MCP server via SDK\n');
  }

  async runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let output = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
        }
      });
    });
  }

  async discoverTools(): Promise<void> {
    console.log('🔍 Discovering available tools via MCP SDK...');
    
    if (!this.client) {
      throw new Error('MCP client not initialized');
    }
    
    // Use MCP SDK to list tools
    const toolsList = await this.client.listTools();
    
    if (toolsList && toolsList.tools) {
      this.allTools = toolsList.tools.map((t: any) => t.name);
      console.log(`✅ Discovered ${this.allTools.length} tools via MCP protocol\n`);
      
      // Group tools by domain
      const domains = this.groupToolsByDomain();
      console.log('📊 Tools by domain:');
      for (const [domain, tools] of Object.entries(domains)) {
        console.log(`  - ${domain}: ${tools.length} tools`);
      }
      console.log('');
      
      // Validate tool schemas
      console.log('🔍 Validating tool schemas...');
      let schemaIssues = 0;
      for (const tool of toolsList.tools) {
        if (!tool.inputSchema || !tool.inputSchema.properties) {
          console.log(`  ⚠️  ${tool.name}: Missing input schema`);
          schemaIssues++;
        }
      }
      if (schemaIssues === 0) {
        console.log('  ✅ All tools have valid schemas\n');
      } else {
        console.log(`  ⚠️  ${schemaIssues} tools have schema issues\n`);
      }
    } else {
      console.error('❌ Failed to discover tools');
    }
  }

  groupToolsByDomain(): Record<string, string[]> {
    const domains: Record<string, string[]> = {};
    
    for (const tool of this.allTools) {
      const [prefix] = tool.split('.');
      const domain = this.getDomainName(prefix);
      
      if (!domains[domain]) {
        domains[domain] = [];
      }
      domains[domain].push(tool);
    }
    
    return domains;
  }

  getDomainName(prefix: string): string {
    const domainMap: Record<string, string> = {
      'property': 'Property Manager',
      'dns': 'DNS Management',
      'appsec': 'Application Security',
      'certificate': 'Certificates',
      'reporting': 'Reporting',
      'utility': 'Utilities',
      'fastpurge': 'FastPurge',
      'network': 'Network Lists'
    };
    
    return domainMap[prefix] || 'Other';
  }

  async testTool(toolName: string): Promise<ToolTestResult> {
    const startTime = Date.now();
    
    try {
      if (!this.client) {
        throw new Error('MCP client not initialized');
      }
      
      // Generate test input based on tool name
      const testInput = this.generateTestInput(toolName);
      
      // Call tool using MCP SDK
      const response = await this.client.callTool(toolName, { arguments: testInput });
      const responseTime = Date.now() - startTime;
      
      // Calculate response size
      const responseSize = JSON.stringify(response).length;
      
      // Validate response if rule exists
      const validationRule = this.config.validationRules.get(toolName);
      const validation = validationRule ? validationRule(response) : {
        schemaValid: true,
        hasExpectedFields: true,
        details: ['No specific validation rule']
      };
      
      // Check for Akamai-specific success indicators
      const isSuccess = this.isSuccessfulResponse(response);
      
      return {
        tool: toolName,
        success: isSuccess && validation.schemaValid,
        responseTime,
        responseSize,
        validation,
        error: isSuccess ? undefined : this.extractErrorMessage(response)
      };
      
    } catch (error) {
      return {
        tool: toolName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
        validation: {
          schemaValid: false,
          hasExpectedFields: false,
          details: ['Exception during tool call']
        }
      };
    }
  }

  private isSuccessfulResponse(response: any): boolean {
    // Check for explicit error indicators
    if (response?.error || response?.status === 'error') {
      return false;
    }
    
    // Check for HTTP error codes
    if (response?.statusCode && response.statusCode >= 400) {
      return false;
    }
    
    // Check for Akamai API error patterns
    if (response?.type && response.type.includes('error')) {
      return false;
    }
    
    return true;
  }

  private extractErrorMessage(response: any): string {
    if (response?.error?.message) {
      return response.error.message;
    }
    if (response?.detail) {
      return response.detail;
    }
    if (response?.message) {
      return response.message;
    }
    if (response?.statusCode) {
      return `HTTP ${response.statusCode}`;
    }
    return 'Unknown error';
  }

  generateTestInput(toolName: string): any {
    const input: any = {};
    
    // Always use test environment
    input.customer = this.config.testEnvironment;
    
    // Property tools
    if (toolName.includes('property')) {
      input.contractId = this.config.testData.get('property.contractId');
      input.groupId = this.config.testData.get('property.groupId');
      
      if (toolName === 'property.create') {
        input.propertyName = `sdk-test-${Date.now()}`;
        input.productId = this.config.testData.get('property.productId');
      } else if (toolName.includes('propertyId')) {
        input.propertyId = 'prp_123456'; // Will be replaced with actual ID in real tests
      }
      
      if (toolName.includes('activate')) {
        input.network = 'STAGING';
      }
      
      if (toolName.includes('version')) {
        input.version = 1;
      }
    }
    
    // DNS tools
    if (toolName.includes('dns')) {
      if (toolName === 'dns.zone.create') {
        input.zone = this.config.testData.get('dns.testZone');
        input.type = 'primary';
      } else if (toolName.includes('zone')) {
        input.zone = 'example.com';
      }
      
      if (toolName.includes('record')) {
        input.recordName = 'test';
        input.recordType = 'A';
        input.rdata = ['192.0.2.1'];
      }
    }
    
    // Security tools
    if (toolName.includes('appsec') || toolName.includes('security')) {
      input.configId = this.config.testData.get('appsec.configId');
      input.version = 1;
      
      if (toolName.includes('policy')) {
        input.policyId = 'default';
      }
      
      if (toolName.includes('rate')) {
        input.threshold = 100;
        input.policyName = `rate-test-${Date.now()}`;
      }
    }
    
    // Certificate tools
    if (toolName.includes('certificate')) {
      if (toolName.includes('create')) {
        input.cn = `test-${Date.now()}.example.com`;
        input.sans = [`www.test-${Date.now()}.example.com`];
      } else if (toolName.includes('enrollmentId')) {
        input.enrollmentId = 12345;
      }
    }
    
    // Reporting tools
    if (toolName.includes('reporting')) {
      input.startDate = '2024-01-01';
      input.endDate = '2024-01-31';
      
      if (toolName.includes('metrics')) {
        input.metrics = ['latency', 'availability', 'offload'];
      }
    }
    
    // Billing tools
    if (toolName.includes('billing')) {
      input.billingPeriod = '2024-01';
    }
    
    return input;
  }

  async testAllTools(): Promise<void> {
    console.log('🧪 Testing all tools...\n');
    
    const domains = this.groupToolsByDomain();
    
    for (const [domain, tools] of Object.entries(domains)) {
      console.log(`\n📦 Testing ${domain} (${tools.length} tools)...`);
      
      const results: ToolTestResult[] = [];
      let successCount = 0;
      let failCount = 0;
      
      for (const tool of tools) {
        process.stdout.write(`  Testing ${tool}... `);
        const result = await this.testTool(tool);
        results.push(result);
        
        if (result.success) {
          successCount++;
          console.log(`✅ (${result.responseTime}ms)`);
        } else {
          failCount++;
          console.log(`❌ ${result.error}`);
        }
      }
      
      const avgResponseTime = this.calculateDomainAverageResponseTime(results);
      
      this.results.push({
        domain,
        totalTools: tools.length,
        successfulTools: successCount,
        failedTools: failCount,
        results,
        averageResponseTime: avgResponseTime
      });
      
      console.log(`  Summary: ${successCount}/${tools.length} passed (${(successCount/tools.length*100).toFixed(1)}%) | Avg response: ${avgResponseTime}ms`);
    }
  }

  private calculateDomainAverageResponseTime(results: ToolTestResult[]): number {
    const successfulResults = results.filter(r => r.success && r.responseTime);
    if (successfulResults.length === 0) return 0;
    
    const totalTime = successfulResults.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    return Math.round(totalTime / successfulResults.length);
  }

  async generateReport(): Promise<string> {
    let report = '# ALECS MCP Server - Direct Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Overall summary
    const totalTools = this.allTools.length;
    const totalSuccess = this.results.reduce((sum, r) => sum + r.successfulTools, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedTools, 0);
    const overallCoverage = totalTools > 0 ? (totalSuccess / totalTools * 100) : 0;
    
    report += '## Overall Summary\n\n';
    report += `- Total Tools: ${totalTools}\n`;
    report += `- Successful: ${totalSuccess} (${overallCoverage.toFixed(1)}%)\n`;
    report += `- Failed: ${totalFailed}\n`;
    report += `- Average Response Time: ${this.calculateAverageResponseTime()}ms\n\n`;
    
    // Domain results
    report += '## Domain Results\n\n';
    for (const result of this.results) {
      const coverage = (result.successfulTools / result.totalTools * 100).toFixed(1);
      report += `### ${result.domain}\n`;
      report += `- Tools: ${result.totalTools}\n`;
      report += `- Passed: ${result.successfulTools} (${coverage}%)\n`;
      report += `- Failed: ${result.failedTools}\n\n`;
      
      if (result.failedTools > 0) {
        report += '**Failed Tools:**\n';
        for (const test of result.results) {
          if (!test.success) {
            report += `- ${test.tool}: ${test.error}\n`;
          }
        }
        report += '\n';
      }
    }
    
    return report;
  }

  calculateAverageResponseTime(): number {
    let totalTime = 0;
    let count = 0;
    
    for (const domain of this.results) {
      for (const result of domain.results) {
        if (result.success && result.responseTime) {
          totalTime += result.responseTime;
          count++;
        }
      }
    }
    
    return count > 0 ? Math.round(totalTime / count) : 0;
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    // Close MCP client connection
    if (this.client) {
      try {
        await this.client.close();
        console.log('  ✅ MCP client closed');
      } catch (error) {
        console.log('  ⚠️  Error closing MCP client:', error);
      }
    }
    
    // Close transport if needed
    if (this.transport && typeof this.transport.close === 'function') {
      try {
        await this.transport.close();
        console.log('  ✅ Transport closed');
      } catch (error) {
        console.log('  ⚠️  Error closing transport:', error);
      }
    }
    
    console.log('  ✅ Cleanup complete');
  }

  async run(): Promise<boolean> {
    try {
      await this.startServer();
      await this.discoverTools();
      
      if (this.allTools.length === 0) {
        console.error('❌ No tools discovered');
        return false;
      }
      
      await this.testAllTools();
      
      const report = await this.generateReport();
      
      // Save report
      const reportPath = path.join(__dirname, 'reports', `direct-test-${Date.now()}.md`);
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, report);
      
      console.log(`\n📄 Report saved to: ${reportPath}`);
      
      // Print summary
      const totalTools = this.allTools.length;
      const totalSuccess = this.results.reduce((sum, r) => sum + r.successfulTools, 0);
      const coverage = (totalSuccess / totalTools * 100).toFixed(1);
      
      console.log('\n' + '═'.repeat(60));
      console.log(coverage === '100.0' ? '✅ TEST COMPLETE: 100% SUCCESS!' : `⚠️  TEST COMPLETE: ${coverage}% SUCCESS`);
      console.log('═'.repeat(60));
      
      return coverage === '100.0';
      
    } finally {
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 ALECS MCP Server - Direct Testing');
  console.log('═'.repeat(60));
  console.log('\nTesting actual MCP server with all tools...\n');
  
  const tester = new DirectMCPTester();
  const success = await tester.run();
  
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}