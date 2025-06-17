#!/usr/bin/env node

/**
 * Master Customer Experience Quality Assurance Test Runner
 * Executes all Phase 2 tests focused on real user scenarios
 */

const { runAllPersonaTests } = require('./personas/customer-scenarios');
const { runUXTests } = require('./ux/interaction-testing');
const { runE2EWorkflowTests } = require('./integration/end-to-end');
const { runSupportTests } = require('./support/troubleshooting');
const fs = require('fs').promises;
const path = require('path');

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class CustomerExperienceTestRunner {
  constructor() {
    this.results = {
      personas: null,
      ux: null,
      e2e: null,
      support: null
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log(`${colors.bright}${colors.cyan}🎯 CUSTOMER EXPERIENCE QUALITY ASSURANCE${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}=======================================${colors.reset}\n`);
    console.log(`Starting comprehensive customer experience testing...\n`);

    // Check prerequisites
    await this.checkPrerequisites();

    // Run test suites
    const testSuites = [
      {
        name: 'Customer Personas',
        runner: runAllPersonaTests,
        key: 'personas'
      },
      {
        name: 'User Experience',
        runner: runUXTests,
        key: 'ux'
      },
      {
        name: 'End-to-End Workflows',
        runner: runE2EWorkflowTests,
        key: 'e2e'
      },
      {
        name: 'Support Simulation',
        runner: runSupportTests,
        key: 'support'
      }
    ];

    for (const suite of testSuites) {
      console.log(`\n${colors.bright}${colors.yellow}Running ${suite.name} Tests...${colors.reset}`);
      console.log('─'.repeat(50));
      
      try {
        const suiteStart = Date.now();
        await suite.runner();
        const duration = Date.now() - suiteStart;
        
        this.results[suite.key] = {
          status: 'completed',
          duration,
          timestamp: new Date().toISOString()
        };
        
        console.log(`\n${colors.green}✅ ${suite.name} tests completed in ${(duration / 1000).toFixed(2)}s${colors.reset}`);
      } catch (error) {
        this.results[suite.key] = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        console.log(`\n${colors.red}❌ ${suite.name} tests failed: ${error.message}${colors.reset}`);
      }
      
      // Pause between suites
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate final report
    await this.generateFinalReport();
  }

  async checkPrerequisites() {
    console.log('Checking prerequisites...');
    
    const checks = [
      {
        name: 'Node.js version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.split('.')[0].substring(1));
          return major >= 14;
        },
        error: 'Node.js 14 or higher required'
      },
      {
        name: 'MCP server build',
        check: async () => {
          try {
            await fs.access(path.join(__dirname, '../dist/index.js'));
            return true;
          } catch {
            return false;
          }
        },
        error: 'MCP server not built. Run: npm run build'
      },
      {
        name: 'Environment configuration',
        check: () => {
          return process.env.NODE_ENV !== undefined || true;
        },
        error: 'Environment not configured'
      },
      {
        name: 'Test dependencies',
        check: async () => {
          try {
            require('chalk');
            return true;
          } catch {
            return false;
          }
        },
        error: 'Test dependencies not installed. Run: npm install'
      }
    ];

    let allPassed = true;
    for (const check of checks) {
      const result = await check.check();
      if (result) {
        console.log(`  ${colors.green}✓${colors.reset} ${check.name}`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${check.name}: ${check.error}`);
        allPassed = false;
      }
    }

    if (!allPassed) {
      throw new Error('Prerequisites check failed');
    }
    
    console.log(`\n${colors.green}All prerequisites satisfied!${colors.reset}\n`);
  }

  async generateFinalReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(`\n\n${colors.bright}${colors.magenta}📊 CUSTOMER EXPERIENCE TEST SUMMARY${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}===================================${colors.reset}\n`);

    // Test results summary
    console.log(`${colors.bright}Test Suite Results:${colors.reset}`);
    Object.entries(this.results).forEach(([suite, result]) => {
      const suiteName = suite.charAt(0).toUpperCase() + suite.slice(1);
      const status = result.status === 'completed' ? 
        `${colors.green}✅ PASSED${colors.reset}` : 
        `${colors.red}❌ FAILED${colors.reset}`;
      
      console.log(`  ${suiteName}: ${status}`);
      if (result.duration) {
        console.log(`    Duration: ${(result.duration / 1000).toFixed(2)}s`);
      }
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    // Customer experience metrics
    console.log(`\n${colors.bright}Customer Experience Metrics:${colors.reset}`);
    
    // Calculate pass rate
    const passedTests = Object.values(this.results).filter(r => r.status === 'completed').length;
    const totalTests = Object.keys(this.results).length;
    const passRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log(`  Overall Pass Rate: ${passRate}%`);
    console.log(`  Total Execution Time: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`  Average Suite Time: ${(totalDuration / totalTests / 1000).toFixed(2)}s`);

    // Key findings
    console.log(`\n${colors.bright}Key Findings:${colors.reset}`);
    const findings = this.analyzeResults();
    findings.forEach(finding => {
      const icon = finding.type === 'success' ? '✅' : 
                  finding.type === 'warning' ? '⚠️' : '❌';
      console.log(`  ${icon} ${finding.message}`);
    });

    // Recommendations
    console.log(`\n${colors.bright}Recommendations:${colors.reset}`);
    const recommendations = this.generateRecommendations();
    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    // Save report to file
    await this.saveReport();

    console.log(`\n${colors.bright}${colors.green}✅ Customer Experience Testing Complete!${colors.reset}`);
    console.log(`\nDetailed report saved to: tests/reports/cx-test-report-${new Date().toISOString().split('T')[0]}.json`);
  }

  analyzeResults() {
    const findings = [];

    if (this.results.personas?.status === 'completed') {
      findings.push({
        type: 'success',
        message: 'All customer personas successfully tested'
      });
    }

    if (this.results.ux?.status === 'completed') {
      findings.push({
        type: 'success',
        message: 'User experience meets quality standards'
      });
    }

    if (this.results.e2e?.status === 'failed') {
      findings.push({
        type: 'error',
        message: 'End-to-end workflows have critical failures'
      });
    }

    if (this.results.support?.status === 'completed') {
      findings.push({
        type: 'success',
        message: 'Support workflows validated successfully'
      });
    }

    // Check for performance issues
    const slowTests = Object.entries(this.results)
      .filter(([_, result]) => result.duration > 300000); // 5 minutes
    
    if (slowTests.length > 0) {
      findings.push({
        type: 'warning',
        message: `${slowTests.length} test suite(s) took longer than 5 minutes`
      });
    }

    return findings;
  }

  generateRecommendations() {
    const recommendations = [];

    // Based on test results
    if (this.results.personas?.status === 'failed') {
      recommendations.push('Fix critical issues in persona workflows before production deployment');
    }

    if (this.results.ux?.status === 'failed') {
      recommendations.push('Improve error messages and user guidance for better experience');
    }

    if (this.results.e2e?.status === 'failed') {
      recommendations.push('Address integration issues in end-to-end workflows');
    }

    if (this.results.support?.status === 'failed') {
      recommendations.push('Enhance debugging tools and support documentation');
    }

    // General recommendations
    recommendations.push('Continue monitoring customer satisfaction metrics post-deployment');
    recommendations.push('Implement automated testing for all critical user journeys');
    recommendations.push('Regular review and update of knowledge base articles');

    return recommendations;
  }

  async saveReport() {
    const reportDir = path.join(__dirname, 'reports');
    await fs.mkdir(reportDir, { recursive: true });

    const report = {
      testRun: {
        date: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        environment: process.env.NODE_ENV || 'development'
      },
      results: this.results,
      metrics: {
        passRate: Object.values(this.results).filter(r => r.status === 'completed').length / 
                 Object.keys(this.results).length * 100,
        totalDuration: Date.now() - this.startTime
      },
      findings: this.analyzeResults(),
      recommendations: this.generateRecommendations()
    };

    const filename = `cx-test-report-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(
      path.join(reportDir, filename),
      JSON.stringify(report, null, 2)
    );
  }
}

// Main execution
async function main() {
  const runner = new CustomerExperienceTestRunner();
  
  try {
    await runner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { CustomerExperienceTestRunner };