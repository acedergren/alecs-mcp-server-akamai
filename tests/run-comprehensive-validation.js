#!/usr/bin/env node

/**
 * Comprehensive MCP Workflow Validator
 * 
 * Master test runner that orchestrates all validation phases
 * and generates a comprehensive test report.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

// Test configuration
const TEST_SUITES = [
  {
    name: 'MCP Health Diagnostics',
    script: 'tests/diagnostics/mcp-health-check.js',
    critical: true,
    timeout: 300000 // 5 minutes
  },
  {
    name: 'Customer Journey Simulation',
    script: 'tests/workflows/customer-journey.js',
    critical: true,
    timeout: 600000 // 10 minutes
  },
  {
    name: 'Edge Cases & Error Scenarios',
    script: 'tests/edge-cases/error-scenarios.js',
    critical: false,
    timeout: 300000 // 5 minutes
  },
  {
    name: 'Performance & Load Testing',
    script: 'tests/performance/load-testing.js',
    critical: false,
    timeout: 900000 // 15 minutes
  }
];

// Master report
const masterReport = {
  timestamp: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    cwd: process.cwd()
  },
  suites: [],
  summary: {
    totalSuites: TEST_SUITES.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    totalDuration: 0
  }
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Logging utilities
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

// Run a single test suite
async function runTestSuite(suite) {
  const startTime = performance.now();
  logSection(`Running: ${suite.name}`);
  
  return new Promise((resolve) => {
    const testProcess = spawn('node', [suite.script], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        MCP_TEST_MODE: 'true'
      }
    });
    
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      testProcess.kill('SIGTERM');
      log(`⏱️  Test suite timed out after ${suite.timeout / 1000}s`, 'yellow');
    }, suite.timeout);
    
    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      const duration = performance.now() - startTime;
      
      const result = {
        name: suite.name,
        script: suite.script,
        critical: suite.critical,
        duration,
        exitCode: code,
        status: timedOut ? 'timeout' : (code === 0 ? 'passed' : 'failed'),
        timestamp: new Date().toISOString()
      };
      
      masterReport.suites.push(result);
      
      if (result.status === 'passed') {
        log(`✅ ${suite.name} completed successfully in ${(duration / 1000).toFixed(2)}s`, 'green');
        masterReport.summary.passed++;
      } else if (result.status === 'timeout') {
        log(`⏱️  ${suite.name} timed out`, 'yellow');
        masterReport.summary.failed++;
      } else {
        log(`❌ ${suite.name} failed with exit code ${code}`, 'red');
        masterReport.summary.failed++;
      }
      
      resolve(result);
    });
    
    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      const duration = performance.now() - startTime;
      
      const result = {
        name: suite.name,
        script: suite.script,
        critical: suite.critical,
        duration,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      masterReport.suites.push(result);
      masterReport.summary.failed++;
      
      log(`❌ ${suite.name} failed to start: ${error.message}`, 'red');
      resolve(result);
    });
  });
}

// Collect individual test reports
async function collectTestReports() {
  const reports = {};
  
  const reportFiles = [
    { name: 'MCP Health', file: 'tests/diagnostics/mcp-health-report.json' },
    { name: 'Customer Journey', file: 'tests/workflows/customer-journey-report.json' },
    { name: 'Error Scenarios', file: 'tests/edge-cases/error-scenarios-report.json' },
    { name: 'Performance', file: 'tests/performance/performance-metrics.json' }
  ];
  
  for (const report of reportFiles) {
    try {
      const content = await fs.readFile(
        path.join(process.cwd(), report.file),
        'utf-8'
      );
      reports[report.name] = JSON.parse(content);
    } catch (error) {
      reports[report.name] = { error: 'Report not found or invalid' };
    }
  }
  
  return reports;
}

// Generate comprehensive HTML report
async function generateHTMLReport(detailedReports) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>MCP Comprehensive Validation Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1, h2, h3 {
      color: #333;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .metric {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border-left: 4px solid #007bff;
    }
    .metric.success {
      border-left-color: #28a745;
    }
    .metric.warning {
      border-left-color: #ffc107;
    }
    .metric.error {
      border-left-color: #dc3545;
    }
    .metric h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
    }
    .metric .value {
      font-size: 36px;
      font-weight: bold;
      color: #333;
    }
    .suite {
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .suite.passed {
      border-left: 4px solid #28a745;
    }
    .suite.failed {
      border-left: 4px solid #dc3545;
    }
    .suite.timeout {
      border-left: 4px solid #ffc107;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.passed {
      background: #d4edda;
      color: #155724;
    }
    .status-badge.failed {
      background: #f8d7da;
      color: #721c24;
    }
    .status-badge.timeout {
      background: #fff3cd;
      color: #856404;
    }
    .chart {
      margin: 20px 0;
      height: 300px;
      background: #f8f9fa;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 MCP Comprehensive Validation Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="summary">
      <div class="metric ${masterReport.summary.passed === masterReport.summary.totalSuites ? 'success' : 'error'}">
        <h3>Success Rate</h3>
        <div class="value">${Math.round((masterReport.summary.passed / masterReport.summary.totalSuites) * 100)}%</div>
      </div>
      <div class="metric">
        <h3>Total Suites</h3>
        <div class="value">${masterReport.summary.totalSuites}</div>
      </div>
      <div class="metric success">
        <h3>Passed</h3>
        <div class="value">${masterReport.summary.passed}</div>
      </div>
      <div class="metric error">
        <h3>Failed</h3>
        <div class="value">${masterReport.summary.failed}</div>
      </div>
      <div class="metric">
        <h3>Total Duration</h3>
        <div class="value">${Math.round(masterReport.summary.totalDuration / 1000 / 60)}m</div>
      </div>
    </div>
    
    <h2>Test Suite Results</h2>
    <table>
      <thead>
        <tr>
          <th>Suite</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Critical</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${masterReport.suites.map(suite => `
          <tr>
            <td><strong>${suite.name}</strong></td>
            <td><span class="status-badge ${suite.status}">${suite.status.toUpperCase()}</span></td>
            <td>${(suite.duration / 1000).toFixed(2)}s</td>
            <td>${suite.critical ? '⚠️ Yes' : 'No'}</td>
            <td>${suite.error || suite.exitCode || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    ${Object.entries(detailedReports).map(([name, report]) => `
      <div class="suite ${report.error ? 'failed' : 'passed'}">
        <h3>${name} - Detailed Results</h3>
        ${report.error ? 
          `<p>Error: ${report.error}</p>` :
          `<pre>${JSON.stringify(report.summary || report, null, 2).substring(0, 500)}...</pre>`
        }
      </div>
    `).join('')}
    
    <h2>Performance Insights</h2>
    <div class="chart">
      <p>Performance charts would be rendered here with actual data visualization library</p>
    </div>
    
    <h2>Recommendations</h2>
    <ul>
      ${masterReport.summary.failed > 0 ? '<li>⚠️ Critical test failures detected - investigate failed suites immediately</li>' : ''}
      ${detailedReports.Performance?.analysis?.concurrentOperations?.optimalConcurrency ? 
        `<li>Use ${detailedReports.Performance.analysis.concurrentOperations.optimalConcurrency} concurrent connections for optimal throughput</li>` : ''}
      ${detailedReports['Error Scenarios']?.summary?.categories ? 
        '<li>Review error handling for categories with low success rates</li>' : ''}
      <li>Run performance tests during different load conditions for comprehensive analysis</li>
      <li>Consider implementing automated regression testing for critical paths</li>
    </ul>
  </div>
</body>
</html>
  `;
  
  const reportPath = path.join(process.cwd(), 'tests', 'comprehensive-validation-report.html');
  await fs.writeFile(reportPath, html);
  
  return reportPath;
}

// Main test orchestrator
async function runComprehensiveValidation() {
  const startTime = performance.now();
  
  logSection('🚀 MCP Comprehensive Workflow Validator');
  log(`Starting validation at ${new Date().toLocaleString()}`, 'cyan');
  log(`Environment: Node ${process.version} on ${process.platform}\n`, 'blue');
  
  // Check prerequisites
  log('Checking prerequisites...', 'yellow');
  
  try {
    // Ensure test directories exist
    const dirs = [
      'tests/diagnostics',
      'tests/workflows', 
      'tests/edge-cases',
      'tests/performance'
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    }
    
    log('✅ Prerequisites check passed\n', 'green');
  } catch (error) {
    log(`❌ Prerequisites check failed: ${error.message}`, 'red');
    process.exit(1);
  }
  
  // Run test suites
  let criticalFailure = false;
  
  for (const suite of TEST_SUITES) {
    const result = await runTestSuite(suite);
    
    if (suite.critical && result.status !== 'passed') {
      criticalFailure = true;
      log(`\n⚠️  Critical test suite failed. Stopping execution.`, 'red');
      break;
    }
    
    // Small delay between suites
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  masterReport.summary.totalDuration = performance.now() - startTime;
  
  // Collect detailed reports
  logSection('Collecting Test Reports');
  const detailedReports = await collectTestReports();
  
  // Generate final report
  logSection('Generating Final Report');
  
  // Save master report
  const masterReportPath = path.join(process.cwd(), 'tests', 'master-validation-report.json');
  await fs.writeFile(masterReportPath, JSON.stringify(masterReport, null, 2));
  log(`📄 Master report saved to: ${masterReportPath}`, 'green');
  
  // Generate HTML report
  const htmlReportPath = await generateHTMLReport(detailedReports);
  log(`📊 HTML report saved to: ${htmlReportPath}`, 'green');
  
  // Print final summary
  logSection('VALIDATION SUMMARY');
  log(`Total Duration: ${(masterReport.summary.totalDuration / 1000 / 60).toFixed(2)} minutes`);
  log(`Suites Run: ${masterReport.suites.length}/${TEST_SUITES.length}`);
  log(`Passed: ${masterReport.summary.passed}`, 'green');
  log(`Failed: ${masterReport.summary.failed}`, masterReport.summary.failed > 0 ? 'red' : 'green');
  
  if (criticalFailure) {
    log('\n❌ VALIDATION FAILED - Critical test suite failures detected', 'red');
    process.exit(1);
  } else if (masterReport.summary.failed === 0) {
    log('\n✅ VALIDATION PASSED - All test suites completed successfully', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  VALIDATION COMPLETED WITH WARNINGS - Some non-critical tests failed', 'yellow');
    process.exit(0);
  }
}

// Handle interrupts gracefully
process.on('SIGINT', () => {
  log('\n\n⚠️  Test execution interrupted by user', 'yellow');
  process.exit(130);
});

// Run the comprehensive validation
runComprehensiveValidation().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});