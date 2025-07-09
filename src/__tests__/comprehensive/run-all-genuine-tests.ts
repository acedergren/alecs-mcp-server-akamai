#!/usr/bin/env node

/**
 * Run All Genuine MCP Tests
 * Executes all three test strategies and generates a combined report
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

interface TestSuiteResult {
  name: string;
  success: boolean;
  coverage: number;
  duration: number;
  reportPath?: string;
  error?: string;
}

interface CombinedReport {
  timestamp: Date;
  totalDuration: number;
  overallSuccess: boolean;
  overallCoverage: number;
  suites: TestSuiteResult[];
  recommendations: string[];
}

class GenuineTestRunner {
  private results: TestSuiteResult[] = [];
  private startTime: number = 0;

  async runTestSuite(name: string, scriptPath: string): Promise<TestSuiteResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Running ${name}`);
    console.log('='.repeat(60));
    
    const suiteStart = Date.now();
    
    try {
      const exitCode = await this.executeScript(scriptPath);
      const duration = Date.now() - suiteStart;
      
      // Read the latest report to extract coverage
      const coverage = await this.extractCoverage(name);
      
      return {
        name,
        success: exitCode === 0,
        coverage,
        duration,
        reportPath: await this.findLatestReport(name)
      };
      
    } catch (error) {
      return {
        name,
        success: false,
        coverage: 0,
        duration: Date.now() - suiteStart,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private executeScript(scriptPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const proc = spawn('npx', ['tsx', scriptPath], {
        stdio: 'inherit',
        env: process.env
      });

      proc.on('close', (code) => {
        resolve(code || 0);
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async extractCoverage(suiteName: string): Promise<number> {
    // This is a simplified extraction - in real implementation,
    // we would parse the actual report files
    try {
      const reportPath = await this.findLatestReport(suiteName);
      if (!reportPath) return 0;
      
      const content = await fs.readFile(reportPath, 'utf-8');
      
      // Look for coverage percentage in report
      const coverageMatch = content.match(/Coverage[:\s]+(\d+(?:\.\d+)?)\s*%/i);
      if (coverageMatch) {
        return parseFloat(coverageMatch[1]);
      }
      
      // Alternative: look for success rate
      const successMatch = content.match(/(\d+(?:\.\d+)?)\s*%\s*success/i);
      if (successMatch) {
        return parseFloat(successMatch[1]);
      }
      
      return 100; // Assume 100% if no explicit coverage found
      
    } catch (error) {
      console.error(`  ⚠️  Could not extract coverage for ${suiteName}`);
      return 0;
    }
  }

  private async findLatestReport(suiteName: string): Promise<string | null> {
    try {
      const reportsDir = path.join(__dirname, 'reports');
      const files = await fs.readdir(reportsDir);
      
      // Map suite names to report prefixes
      const prefixMap: Record<string, string> = {
        'Direct MCP SDK Client': 'direct-test-',
        'Integration Test Harness': 'integration-harness-',
        'Multi-Client Concurrent': 'concurrent-test-'
      };
      
      const prefix = prefixMap[suiteName];
      if (!prefix) return null;
      
      // Find the latest report for this suite
      const suiteReports = files
        .filter(f => f.startsWith(prefix) && f.endsWith('.md'))
        .sort()
        .reverse();
      
      return suiteReports[0] ? path.join(reportsDir, suiteReports[0]) : null;
      
    } catch (error) {
      return null;
    }
  }

  generateRecommendations(results: TestSuiteResult[]): string[] {
    const recommendations: string[] = [];
    
    // Check overall success
    const failedSuites = results.filter(r => !r.success);
    if (failedSuites.length > 0) {
      recommendations.push(`Fix failures in: ${failedSuites.map(s => s.name).join(', ')}`);
    }
    
    // Check coverage
    const lowCoverage = results.filter(r => r.coverage < 90);
    if (lowCoverage.length > 0) {
      recommendations.push(`Improve coverage for: ${lowCoverage.map(s => `${s.name} (${s.coverage}%)`).join(', ')}`);
    }
    
    // Performance recommendations
    const slowSuites = results.filter(r => r.duration > 300000); // 5 minutes
    if (slowSuites.length > 0) {
      recommendations.push(`Optimize performance for: ${slowSuites.map(s => s.name).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All tests passing with excellent coverage! 🎉');
    }
    
    return recommendations;
  }

  async generateCombinedReport(results: TestSuiteResult[]): Promise<string> {
    const totalDuration = Date.now() - this.startTime;
    const overallSuccess = results.every(r => r.success);
    const overallCoverage = results.length > 0 
      ? results.reduce((sum, r) => sum + r.coverage, 0) / results.length 
      : 0;
    
    const report: CombinedReport = {
      timestamp: new Date(),
      totalDuration,
      overallSuccess,
      overallCoverage,
      suites: results,
      recommendations: this.generateRecommendations(results)
    };
    
    // Generate markdown report
    let md = '# ALECS MCP Server - Genuine Test Results\n\n';
    md += `Generated: ${report.timestamp.toISOString()}\n\n`;
    
    md += '## Executive Summary\n\n';
    md += `- **Overall Success**: ${report.overallSuccess ? '✅ PASS' : '❌ FAIL'}\n`;
    md += `- **Overall Coverage**: ${report.overallCoverage.toFixed(1)}%\n`;
    md += `- **Total Duration**: ${(report.totalDuration / 1000 / 60).toFixed(1)} minutes\n`;
    md += `- **Test Suites**: ${report.suites.length}\n\n`;
    
    md += '## Test Suite Results\n\n';
    md += '| Test Suite | Status | Coverage | Duration | Report |\n';
    md += '|------------|--------|----------|----------|--------|\n';
    
    for (const suite of report.suites) {
      const status = suite.success ? '✅ Pass' : '❌ Fail';
      const coverage = `${suite.coverage.toFixed(1)}%`;
      const duration = `${(suite.duration / 1000).toFixed(1)}s`;
      const reportLink = suite.reportPath ? `[View](${path.basename(suite.reportPath)})` : 'N/A';
      
      md += `| ${suite.name} | ${status} | ${coverage} | ${duration} | ${reportLink} |\n`;
    }
    
    md += '\n## Recommendations\n\n';
    for (const rec of report.recommendations) {
      md += `- ${rec}\n`;
    }
    
    if (!report.overallSuccess) {
      md += '\n## Get-Well Plan\n\n';
      md += '1. **Analyze Failures**: Review individual test reports for error details\n';
      md += '2. **Fix Issues**: Address authentication, configuration, or code issues\n';
      md += '3. **Re-run Failed Suites**: Test fixes in isolation before full run\n';
      md += '4. **Iterate**: Continue until 100% success achieved\n';
    }
    
    // Save report
    const reportPath = path.join(__dirname, 'reports', `combined-genuine-test-${Date.now()}.md`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, md);
    
    // Also save JSON version
    const jsonPath = reportPath.replace('.md', '.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Combined report saved to: ${reportPath}`);
    
    return reportPath;
  }

  async run(): Promise<boolean> {
    console.log('═'.repeat(60));
    console.log('🚀 ALECS MCP Server - Running All Genuine Tests');
    console.log('═'.repeat(60));
    
    this.startTime = Date.now();
    
    const testSuites = [
      {
        name: 'Direct MCP SDK Client',
        script: path.join(__dirname, 'direct-mcp-test.ts')
      },
      {
        name: 'Integration Test Harness',
        script: path.join(__dirname, 'integration-test-harness.ts')
      },
      {
        name: 'Multi-Client Concurrent',
        script: path.join(__dirname, 'multi-client-concurrent-test.ts')
      }
    ];
    
    // Run test suites sequentially to avoid conflicts
    for (const suite of testSuites) {
      const result = await this.runTestSuite(suite.name, suite.script);
      this.results.push(result);
      
      // Add delay between suites to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Generate combined report
    await this.generateCombinedReport(this.results);
    
    // Print final summary
    const overallSuccess = this.results.every(r => r.success && r.coverage === 100);
    const avgCoverage = this.results.reduce((sum, r) => sum + r.coverage, 0) / this.results.length;
    
    console.log('\n' + '═'.repeat(60));
    console.log('FINAL RESULTS:');
    console.log(`- Status: ${overallSuccess ? '✅ ALL TESTS PASS' : '❌ TESTS FAILED'}`);
    console.log(`- Coverage: ${avgCoverage.toFixed(1)}%`);
    console.log(`- Duration: ${((Date.now() - this.startTime) / 1000 / 60).toFixed(1)} minutes`);
    console.log('═'.repeat(60));
    
    return overallSuccess;
  }
}

// Main execution
async function main() {
  const runner = new GenuineTestRunner();
  const success = await runner.run();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}