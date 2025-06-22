#!/usr/bin/env ts-node

/**
 * E2E Test Runner
 * Comprehensive test execution with reporting
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResults {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  timestamp: string;
  suites: TestSuite[];
}

interface TestSuite {
  name: string;
  tests: number;
  passed: number;
  failed: number;
  duration: number;
}

class E2ETestRunner {
  private results: TestResults = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    timestamp: new Date().toISOString(),
    suites: []
  };
  
  async run(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    E2E Test Suite Runner                         ║
║                                                                  ║
║  Testing:                                                        ║
║  • Domain Assistants (Property, DNS, Security, Performance)     ║
║  • Workflow Orchestration                                        ║
║  • Tool Chaining & Integration                                   ║
║  • MCP Protocol Compliance                                       ║
╚══════════════════════════════════════════════════════════════════╝
    `);
    
    const startTime = Date.now();
    
    try {
      // Ensure test results directory exists
      const resultsDir = path.join(__dirname, '../test-results/e2e');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      // Check environment
      await this.checkEnvironment();
      
      // Run different test suites
      const suites = [
        {
          name: 'MCP Server E2E Tests',
          pattern: 'mcp-server-e2e.test.ts'
        },
        {
          name: 'Domain Assistants E2E Tests',
          pattern: 'domain-assistants-e2e.test.ts'
        },
        {
          name: 'Workflow Orchestration E2E Tests',
          pattern: 'workflow-orchestration-e2e.test.ts'
        }
      ];
      
      for (const suite of suites) {
        await this.runTestSuite(suite);
      }
      
      // Calculate total duration
      this.results.duration = Date.now() - startTime;
      
      // Generate report
      await this.generateReport();
      
      // Display summary
      this.displaySummary();
      
      // Exit with appropriate code
      process.exit(this.results.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('❌ E2E Test Runner Error:', error);
      process.exit(1);
    }
  }
  
  private async checkEnvironment(): Promise<void> {
    console.log('\n🔍 Checking test environment...\n');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`✓ Node.js version: ${nodeVersion}`);
    
    // Check TypeScript
    try {
      const { stdout } = await this.exec('npx tsc --version');
      console.log(`✓ TypeScript: ${stdout.trim()}`);
    } catch (error) {
      console.warn('⚠️  TypeScript not found');
    }
    
    // Check required environment variables
    const required = [
      'AKAMAI_CLIENT_SECRET',
      'AKAMAI_HOST',
      'AKAMAI_ACCESS_TOKEN',
      'AKAMAI_CLIENT_TOKEN'
    ];
    
    const missing = required.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
      console.warn(`\n⚠️  Missing environment variables:`);
      missing.forEach(v => console.warn(`   - ${v}`));
      console.warn('\nSome tests may be skipped or fail.\n');
    } else {
      console.log('✓ All required environment variables present');
    }
    
    // Check if server can be built
    console.log('\n📦 Building server...');
    await this.exec('npm run build');
    console.log('✓ Server built successfully\n');
  }
  
  private async runTestSuite(suite: { name: string; pattern: string }): Promise<void> {
    console.log(`\n🧪 Running ${suite.name}...\n`);
    
    const startTime = Date.now();
    const suiteResult: TestSuite = {
      name: suite.name,
      tests: 0,
      passed: 0,
      failed: 0,
      duration: 0
    };
    
    try {
      const { stdout } = await this.exec(
        `npx jest --config __tests__/e2e/jest-e2e.config.js --testNamePattern="${suite.pattern}" --json`
      );
      
      const results = JSON.parse(stdout);
      
      // Parse results
      suiteResult.tests = results.numTotalTests;
      suiteResult.passed = results.numPassedTests;
      suiteResult.failed = results.numFailedTests;
      
      // Update totals
      this.results.totalTests += suiteResult.tests;
      this.results.passed += suiteResult.passed;
      this.results.failed += suiteResult.failed;
      this.results.skipped += results.numPendingTests || 0;
      
    } catch (error: any) {
      // Jest exits with non-zero code on test failures
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          suiteResult.tests = results.numTotalTests;
          suiteResult.passed = results.numPassedTests;
          suiteResult.failed = results.numFailedTests;
          
          this.results.totalTests += suiteResult.tests;
          this.results.passed += suiteResult.passed;
          this.results.failed += suiteResult.failed;
          this.results.skipped += results.numPendingTests || 0;
        } catch (parseError) {
          console.error('Failed to parse test results:', parseError);
          suiteResult.failed = 1;
          this.results.failed += 1;
        }
      } else {
        console.error(`Suite failed:`, error.message);
        suiteResult.failed = 1;
        this.results.failed += 1;
      }
    }
    
    suiteResult.duration = Date.now() - startTime;
    this.results.suites.push(suiteResult);
    
    // Display suite summary
    const status = suiteResult.failed === 0 ? '✅' : '❌';
    console.log(`\n${status} ${suite.name}: ${suiteResult.passed}/${suiteResult.tests} passed (${(suiteResult.duration / 1000).toFixed(2)}s)\n`);
  }
  
  private async generateReport(): Promise<void> {
    const reportPath = path.join(__dirname, '../test-results/e2e/e2e-test-report.json');
    
    const report = {
      ...this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        timestamp: this.results.timestamp
      },
      coverage: await this.getCoverageIfAvailable()
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Test report saved to: ${reportPath}`);
  }
  
  private async getCoverageIfAvailable(): Promise<any> {
    const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
    
    if (fs.existsSync(coveragePath)) {
      try {
        return JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      } catch (error) {
        return null;
      }
    }
    
    return null;
  }
  
  private displaySummary(): void {
    const { totalTests, passed, failed, skipped, duration, suites } = this.results;
    const successRate = totalTests > 0 ? (passed / totalTests * 100).toFixed(1) : '0';
    
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        TEST SUMMARY                              ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Tests:     ${String(totalTests).padEnd(45)}║
║  Passed:          ${String(passed).padEnd(45)}║
║  Failed:          ${String(failed).padEnd(45)}║
║  Skipped:         ${String(skipped).padEnd(45)}║
║  Success Rate:    ${successRate}%${' '.repeat(44 - successRate.length)}║
║  Duration:        ${(duration / 1000).toFixed(2)}s${' '.repeat(43 - (duration / 1000).toFixed(2).length)}║
╠══════════════════════════════════════════════════════════════════╣
║                      SUITE BREAKDOWN                             ║
╠══════════════════════════════════════════════════════════════════╣`);
    
    suites.forEach(suite => {
      const suiteStatus = suite.failed === 0 ? '✅' : '❌';
      const suiteLine = `║  ${suiteStatus} ${suite.name.padEnd(40)} ${suite.passed}/${suite.tests}${' '.repeat(8)}║`;
      console.log(suiteLine);
    });
    
    console.log(`╚══════════════════════════════════════════════════════════════════╝`);
    
    if (failed > 0) {
      console.log(`
⚠️  ${failed} test(s) failed. Check the detailed logs above for more information.
💡 Tip: Run with VERBOSE_TESTS=true for more detailed output.
      `);
    } else {
      console.log(`
🎉 All tests passed! Great job! 🎉
      `);
    }
  }
  
  private exec(command: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (process.env.VERBOSE_TESTS === 'true') {
          process.stdout.write(data);
        }
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (process.env.VERBOSE_TESTS === 'true') {
          process.stderr.write(data);
        }
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const error: any = new Error(`Command failed with code ${code}`);
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });
    });
  }
}

// Run the test runner
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { E2ETestRunner };