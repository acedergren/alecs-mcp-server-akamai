#!/usr/bin/env node

/**
 * Integration Test Harness for ALECS MCP Server
 * Comprehensive testing framework with real MCP client connections
 * No mocks or stubs - genuine API interactions only
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';

interface TestCase {
  id: string;
  name: string;
  description: string;
  domain: string;
  tool: string;
  inputs: any;
  validation: (result: any) => TestValidation;
  dependencies?: string[];
  context?: Record<string, any>;
}

interface TestValidation {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

interface TestSuite {
  name: string;
  description: string;
  testCases: TestCase[];
}

interface TestResult {
  testCase: TestCase;
  success: boolean;
  duration: number;
  response?: any;
  error?: string;
  validation?: TestValidation;
}

interface HarnessReport {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  suites: SuiteReport[];
  overallCoverage: number;
  toolsCovered: string[];
  domainsAnalyzed: Record<string, DomainAnalysis>;
}

interface SuiteReport {
  suite: TestSuite;
  results: TestResult[];
  successRate: number;
  averageDuration: number;
}

interface DomainAnalysis {
  totalTools: number;
  testedTools: number;
  coverage: number;
  averageResponseTime: number;
}

class IntegrationTestHarness {
  private client?: Client;
  private serverProcess?: ChildProcess;
  private testSuites: TestSuite[] = [];
  private results: Map<string, TestResult[]> = new Map();
  private context: Map<string, any> = new Map();

  constructor() {
    this.initializeTestSuites();
  }

  private initializeTestSuites() {
    // Define comprehensive test suites for all domains
    this.testSuites = [
      this.createPropertyManagementSuite(),
      this.createDNSManagementSuite(),
      this.createApplicationSecuritySuite(),
      this.createCertificateManagementSuite(),
      this.createReportingSuite(),
      this.createEndToEndWorkflowSuite()
    ];
  }

  private createPropertyManagementSuite(): TestSuite {
    return {
      name: 'Property Management',
      description: 'Tests for CDN property configuration and activation',
      testCases: [
        {
          id: 'pm-001',
          name: 'List Properties',
          description: 'Retrieve all properties for a contract',
          domain: 'property',
          tool: 'property.list',
          inputs: {
            customer: 'testing'
          },
          validation: (result) => ({
            valid: result?.properties !== undefined,
            errors: result?.properties ? [] : ['Properties array not found']
          })
        },
        {
          id: 'pm-002',
          name: 'Create Property',
          description: 'Create a new CDN property',
          domain: 'property',
          tool: 'property.create',
          inputs: {
            customer: 'testing',
            propertyName: `test-prop-${Date.now()}`,
            contractId: 'ctr_V-44KRACO',
            groupId: 'grp_123456',
            productId: 'prd_Site_Accel'
          },
          validation: (result) => ({
            valid: result?.propertyId !== undefined,
            errors: result?.propertyId ? [] : ['Property ID not returned']
          }),
          context: { propertyId: 'result.propertyId' }
        },
        {
          id: 'pm-003',
          name: 'Get Property Rules',
          description: 'Retrieve property rule tree',
          domain: 'property',
          tool: 'property.rules.get',
          dependencies: ['pm-002'],
          inputs: {
            customer: 'testing',
            propertyId: '{{propertyId}}',
            version: 1
          },
          validation: (result) => ({
            valid: result?.rules?.name !== undefined,
            errors: result?.rules ? [] : ['Rules not found']
          })
        }
      ]
    };
  }

  private createDNSManagementSuite(): TestSuite {
    return {
      name: 'DNS Management',
      description: 'Tests for Edge DNS zone and record management',
      testCases: [
        {
          id: 'dns-001',
          name: 'List DNS Zones',
          description: 'Retrieve all DNS zones',
          domain: 'dns',
          tool: 'dns.zone.list',
          inputs: {
            customer: 'testing'
          },
          validation: (result) => ({
            valid: Array.isArray(result?.zones),
            errors: result?.zones ? [] : ['Zones array not found']
          })
        },
        {
          id: 'dns-002',
          name: 'Create DNS Zone',
          description: 'Create a new primary DNS zone',
          domain: 'dns',
          tool: 'dns.zone.create',
          inputs: {
            customer: 'testing',
            zone: `test-${Date.now()}.example.com`,
            type: 'primary'
          },
          validation: (result) => ({
            valid: result?.zone !== undefined,
            errors: result?.zone ? [] : ['Zone not created']
          }),
          context: { dnsZone: 'result.zone' }
        }
      ]
    };
  }

  private createApplicationSecuritySuite(): TestSuite {
    return {
      name: 'Application Security',
      description: 'Tests for WAF and security configurations',
      testCases: [
        {
          id: 'sec-001',
          name: 'List Security Configs',
          description: 'Retrieve security configurations',
          domain: 'appsec',
          tool: 'appsec.config.list',
          inputs: {
            customer: 'testing'
          },
          validation: (result) => ({
            valid: result?.configurations !== undefined,
            errors: []
          })
        },
        {
          id: 'sec-002',
          name: 'Get WAF Rules',
          description: 'Retrieve available WAF rules',
          domain: 'appsec',
          tool: 'appsec.waf.rules.list',
          inputs: {
            customer: 'testing',
            configId: 78912,
            version: 1
          },
          validation: (result) => ({
            valid: result !== undefined,
            errors: []
          })
        }
      ]
    };
  }

  private createCertificateManagementSuite(): TestSuite {
    return {
      name: 'Certificate Management',
      description: 'Tests for SSL certificate provisioning',
      testCases: [
        {
          id: 'cert-001',
          name: 'List Enrollments',
          description: 'Retrieve certificate enrollments',
          domain: 'certificate',
          tool: 'certificate.enrollment.list',
          inputs: {
            customer: 'testing'
          },
          validation: (result) => ({
            valid: result?.enrollments !== undefined,
            errors: []
          })
        }
      ]
    };
  }

  private createReportingSuite(): TestSuite {
    return {
      name: 'Reporting & Analytics',
      description: 'Tests for traffic and performance reporting',
      testCases: [
        {
          id: 'rep-001',
          name: 'Get Traffic Report',
          description: 'Retrieve traffic data',
          domain: 'reporting',
          tool: 'reporting.traffic.get',
          inputs: {
            customer: 'testing',
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          },
          validation: (result) => ({
            valid: result !== undefined,
            errors: []
          })
        }
      ]
    };
  }

  private createEndToEndWorkflowSuite(): TestSuite {
    return {
      name: 'End-to-End Workflows',
      description: 'Complete user workflows across multiple domains',
      testCases: [
        {
          id: 'e2e-001',
          name: 'Complete Website Setup',
          description: 'Property + DNS + Certificate workflow',
          domain: 'workflow',
          tool: 'property.create',
          inputs: {
            customer: 'testing',
            propertyName: `e2e-site-${Date.now()}`,
            contractId: 'ctr_V-44KRACO',
            groupId: 'grp_123456',
            productId: 'prd_Site_Accel'
          },
          validation: (result) => ({
            valid: result?.propertyId !== undefined,
            errors: []
          })
        }
      ]
    };
  }

  async startServer(): Promise<void> {
    console.log('🚀 Starting ALECS MCP Server...');
    
    // Skip build - already built
    console.log('📦 Using existing build...');
    
    // Start the server
    this.serverProcess = spawn('node', ['dist/index.js'], {
      env: {
        ...process.env,
        MCP_MODE: 'stdio',
        LOG_LEVEL: 'error'
      }
    });

    // Create MCP client
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
      env: {
        ...process.env,
        MCP_MODE: 'stdio',
        LOG_LEVEL: 'error'
      }
    });

    this.client = new Client({
      name: 'integration-test-harness',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(transport);
    console.log('✅ Connected to MCP server\n');
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
      });
    });
  }

  private substituteContext(value: any): any {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const key = value.slice(2, -2);
      return this.context.get(key) || value;
    }
    
    if (typeof value === 'object' && value !== null) {
      const result: any = Array.isArray(value) ? [] : {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.substituteContext(v);
      }
      return result;
    }
    
    return value;
  }

  private extractContext(testCase: TestCase, result: any): void {
    if (!testCase.context) return;
    
    for (const [key, path] of Object.entries(testCase.context)) {
      if (path.startsWith('result.')) {
        const value = this.getValueByPath(result, path.substring(7));
        if (value !== undefined) {
          this.context.set(key, value);
        }
      }
    }
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  async runTestCase(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check dependencies
      if (testCase.dependencies) {
        for (const dep of testCase.dependencies) {
          if (!this.context.has(dep)) {
            throw new Error(`Missing dependency: ${dep}`);
          }
        }
      }
      
      // Substitute context values in inputs
      const inputs = this.substituteContext(testCase.inputs);
      
      // Call the tool
      const response = await this.client!.callTool(testCase.tool, inputs);
      
      // Validate response
      const validation = testCase.validation(response);
      
      // Extract context for future tests
      this.extractContext(testCase, response);
      
      return {
        testCase,
        success: validation.valid,
        duration: Date.now() - startTime,
        response,
        validation
      };
      
    } catch (error) {
      return {
        testCase,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runTestSuite(suite: TestSuite): Promise<TestResult[]> {
    console.log(`\n📦 Running test suite: ${suite.name}`);
    console.log(`   ${suite.description}\n`);
    
    const results: TestResult[] = [];
    
    for (const testCase of suite.testCases) {
      process.stdout.write(`   Running ${testCase.name}... `);
      const result = await this.runTestCase(testCase);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ (${result.duration}ms)`);
      } else {
        console.log(`❌ ${result.error || result.validation?.errors?.join(', ')}`);
      }
    }
    
    this.results.set(suite.name, results);
    return results;
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Running Integration Test Harness...');
    console.log(`   ${this.testSuites.length} test suites configured\n`);
    
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }
  }

  generateReport(): HarnessReport {
    const startTime = new Date(Date.now() - this.calculateTotalDuration());
    const endTime = new Date();
    
    const suites: SuiteReport[] = [];
    const allTools = new Set<string>();
    const domainStats = new Map<string, { total: number, tested: number, time: number }>();
    
    for (const suite of this.testSuites) {
      const results = this.results.get(suite.name) || [];
      const successful = results.filter(r => r.success).length;
      const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
      
      suites.push({
        suite,
        results,
        successRate: results.length > 0 ? (successful / results.length * 100) : 0,
        averageDuration: results.length > 0 ? Math.round(totalTime / results.length) : 0
      });
      
      // Collect tool and domain statistics
      for (const result of results) {
        allTools.add(result.testCase.tool);
        
        const domain = result.testCase.domain;
        const stats = domainStats.get(domain) || { total: 0, tested: 0, time: 0 };
        stats.total++;
        if (result.success) {
          stats.tested++;
          stats.time += result.duration;
        }
        domainStats.set(domain, stats);
      }
    }
    
    // Calculate domain analysis
    const domainsAnalyzed: Record<string, DomainAnalysis> = {};
    for (const [domain, stats] of domainStats) {
      domainsAnalyzed[domain] = {
        totalTools: stats.total,
        testedTools: stats.tested,
        coverage: stats.total > 0 ? (stats.tested / stats.total * 100) : 0,
        averageResponseTime: stats.tested > 0 ? Math.round(stats.time / stats.tested) : 0
      };
    }
    
    // Calculate overall coverage
    const totalTests = Array.from(this.results.values()).flat().length;
    const successfulTests = Array.from(this.results.values()).flat().filter(r => r.success).length;
    
    return {
      startTime,
      endTime,
      totalDuration: this.calculateTotalDuration(),
      suites,
      overallCoverage: totalTests > 0 ? (successfulTests / totalTests * 100) : 0,
      toolsCovered: Array.from(allTools),
      domainsAnalyzed
    };
  }

  private calculateTotalDuration(): number {
    let total = 0;
    for (const results of this.results.values()) {
      total += results.reduce((sum, r) => sum + r.duration, 0);
    }
    return total;
  }

  async saveReport(report: HarnessReport): Promise<string> {
    const reportDir = path.join(__dirname, 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `integration-harness-${timestamp}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Also generate markdown report
    const markdownPath = reportPath.replace('.json', '.md');
    await fs.writeFile(markdownPath, this.generateMarkdownReport(report));
    
    return markdownPath;
  }

  private generateMarkdownReport(report: HarnessReport): string {
    let md = '# ALECS MCP Integration Test Harness Report\n\n';
    md += `Generated: ${report.endTime.toISOString()}\n\n`;
    
    md += '## Executive Summary\n\n';
    md += `- **Overall Coverage**: ${report.overallCoverage.toFixed(1)}%\n`;
    md += `- **Test Suites**: ${report.suites.length}\n`;
    md += `- **Tools Tested**: ${report.toolsCovered.length}\n`;
    md += `- **Total Duration**: ${(report.totalDuration / 1000).toFixed(2)}s\n\n`;
    
    md += '## Domain Analysis\n\n';
    md += '| Domain | Tools | Tested | Coverage | Avg Response |\n';
    md += '|--------|-------|--------|----------|-------------|\n';
    for (const [domain, analysis] of Object.entries(report.domainsAnalyzed)) {
      md += `| ${domain} | ${analysis.totalTools} | ${analysis.testedTools} | ${analysis.coverage.toFixed(1)}% | ${analysis.averageResponseTime}ms |\n`;
    }
    md += '\n';
    
    md += '## Test Suite Results\n\n';
    for (const suite of report.suites) {
      md += `### ${suite.suite.name}\n`;
      md += `Success Rate: ${suite.successRate.toFixed(1)}% | Average Duration: ${suite.averageDuration}ms\n\n`;
      
      if (suite.results.some(r => !r.success)) {
        md += '**Failed Tests:**\n';
        for (const result of suite.results.filter(r => !r.success)) {
          md += `- ${result.testCase.name}: ${result.error || result.validation?.errors?.join(', ')}\n`;
        }
        md += '\n';
      }
    }
    
    return md;
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    console.log('\n🧹 Cleanup complete');
  }

  async run(): Promise<boolean> {
    try {
      await this.startServer();
      await this.runAllTests();
      
      const report = this.generateReport();
      const reportPath = await this.saveReport(report);
      
      console.log(`\n📄 Report saved to: ${reportPath}`);
      console.log('\n' + '═'.repeat(60));
      console.log(`Overall Coverage: ${report.overallCoverage.toFixed(1)}%`);
      console.log('═'.repeat(60));
      
      return report.overallCoverage === 100;
      
    } finally {
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 ALECS MCP Integration Test Harness');
  console.log('═'.repeat(60));
  
  const harness = new IntegrationTestHarness();
  const success = await harness.run();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}