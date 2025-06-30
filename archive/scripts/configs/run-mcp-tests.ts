#!/usr/bin/env node

/**
 * MCP Test Runner
 * Comprehensive test execution for ALECS MCP server capabilities
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  errors: string[];
}

class MCPTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async run(): Promise<void> {
    console.log('🚀 Starting ALECS MCP Server Test Suite\n');
    
    this.startTime = Date.now();

    try {
      // Build the project first
      await this.buildProject();

      // Run different test suites
      await this.runTestSuite('Unit Tests - Property Management', [
        '__tests__/unit/mcp-tools/property-management.test.ts'
      ]);

      await this.runTestSuite('Unit Tests - DNS Management', [
        '__tests__/unit/mcp-tools/dns-management.test.ts'
      ]);

      await this.runTestSuite('Integration Tests - MCP Capabilities', [
        '__tests__/integration/mcp-capabilities.test.ts'
      ]);

      await this.runTestSuite('E2E Tests - Basic MCP Integration', [
        '__tests__/e2e/basic-mcp-integration.test.ts'
      ]);

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  }

  private async buildProject(): Promise<void> {
    console.log('📦 Building project...\n');
    
    try {
      const { stdout, stderr } = await exec('npm run build');
      if (stderr && !stderr.includes('warning')) {
        throw new Error(`Build failed: ${stderr}`);
      }
      console.log('✅ Build completed successfully\n');
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  }

  private async runTestSuite(suiteName: string, testFiles: string[]): Promise<void> {
    console.log(`📋 Running ${suiteName}...\n`);

    const result: TestResult = {
      suite: suiteName,
      passed: 0,
      failed: 0,
      duration: 0,
      errors: [],
    };

    const suiteStart = Date.now();

    try {
      const jestArgs = [
        'jest',
        ...testFiles,
        '--verbose',
        '--no-coverage',
        '--testTimeout=30000',
      ];

      const { stdout, stderr } = await exec(`npx ${jestArgs.join(' ')}`);

      // Parse Jest output
      const output = stdout + stderr;
      const passMatch = output.match(/(\d+) passed/);
      const failMatch = output.match(/(\d+) failed/);

      if (passMatch) result.passed = parseInt(passMatch[1]);
      if (failMatch) result.failed = parseInt(failMatch[1]);

      // Extract errors if any
      if (result.failed > 0) {
        const errorMatches = output.match(/✕.*\n\s+(.+)/g);
        if (errorMatches) {
          result.errors = errorMatches.map(e => e.trim());
        }
      }

      console.log(`✅ ${suiteName} completed: ${result.passed} passed, ${result.failed} failed\n`);

    } catch (error: any) {
      result.failed = 1;
      result.errors = [error.message || 'Unknown error'];
      console.error(`❌ ${suiteName} failed\n`);
    }

    result.duration = Date.now() - suiteStart;
    this.results.push(result);
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY REPORT');
    console.log('='.repeat(60) + '\n');

    // Summary table
    console.log('Test Suites:');
    console.log('-'.repeat(60));
    
    this.results.forEach(result => {
      const status = result.failed === 0 ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(
        `${status} ${result.suite.padEnd(40)} ` +
        `Passed: ${result.passed.toString().padStart(3)} ` +
        `Failed: ${result.failed.toString().padStart(3)} ` +
        `(${duration}s)`
      );
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   └─ ${error}`);
        });
      }
    });

    console.log('-'.repeat(60));
    console.log(
      `Total: Passed: ${totalPassed} Failed: ${totalFailed} ` +
      `Duration: ${(totalDuration / 1000).toFixed(2)}s`
    );
    console.log('='.repeat(60) + '\n');

    // Generate detailed report file
    this.generateDetailedReport();

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
  }

  private generateDetailedReport(): void {
    const reportPath = path.join(__dirname, '..', 'test-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
        totalSuites: this.results.length,
      },
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new MCPTestRunner();
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { MCPTestRunner };