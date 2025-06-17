/**
 * Example usage of the Bug Analysis Engine
 * Demonstrates how to use the automated bug detection and analysis system
 */

const { BugAnalysisEngine } = require('./index');
const fs = require('fs').promises;
const path = require('path');

// Sample test results data structure
const sampleTestResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 150,
    passed: 142,
    failed: 8,
    duration: 45000
  },
  failures: [
    {
      testName: 'Authentication API - Token Refresh',
      message: 'Authentication failed: Token expired and refresh failed',
      error: 'AuthenticationError: 401 Unauthorized - Token refresh mechanism not working',
      file: 'src/auth/token-manager.js',
      line: 145,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      stack: `Error: Authentication failed
        at TokenManager.refresh (src/auth/token-manager.js:145:15)
        at AuthService.authenticate (src/auth/auth-service.js:78:25)
        at async testTokenRefresh (tests/auth.test.js:234:5)`
    },
    {
      testName: 'Property Activation - Large Config',
      message: 'Timeout: Property activation exceeded 30s limit',
      error: 'TimeoutError: Operation timed out after 30000ms',
      file: 'src/property/activation.js',
      line: 89,
      timestamp: new Date(Date.now() - 1800000).toISOString()
    },
    {
      testName: 'DNS Zone Update - Concurrent Modifications',
      message: 'Race condition detected during concurrent zone updates',
      error: 'ConcurrencyError: Deadlock detected in mutex acquisition',
      file: 'src/dns/zone-manager.js',
      line: 234,
      timestamp: new Date(Date.now() - 900000).toISOString()
    },
    {
      testName: 'Memory Usage - Long Running Process',
      message: 'Memory leak detected: Heap usage exceeded 500MB',
      error: 'ResourceError: JavaScript heap out of memory',
      file: 'src/utils/cache-manager.js',
      line: 156,
      timestamp: new Date(Date.now() - 600000).toISOString()
    },
    {
      testName: 'API Rate Limiting',
      message: 'Too many requests: Rate limit exceeded',
      error: 'RateLimitError: 429 Too Many Requests',
      file: 'src/api/client.js',
      line: 45,
      timestamp: new Date(Date.now() - 300000).toISOString()
    }
  ],
  performance: [
    {
      name: 'property.list',
      duration: 2500,
      timestamp: new Date().toISOString(),
      trend: { degradation: 0.5 }
    },
    {
      name: 'dns.record.create',
      duration: 1200,
      timestamp: new Date().toISOString()
    },
    {
      name: 'property.activate',
      duration: 35000,
      timestamp: new Date().toISOString(),
      trend: { degradation: 0.3 }
    }
  ],
  logs: [
    {
      level: 'error',
      message: 'Database connection pool exhausted',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      component: 'database'
    },
    {
      level: 'error',
      message: 'Authentication service unavailable',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      component: 'auth'
    },
    {
      level: 'warn',
      message: 'High memory usage detected: 85%',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      component: 'system'
    }
  ],
  resources: {
    memory: [
      { heapUsed: 100 * 1024 * 1024, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { heapUsed: 150 * 1024 * 1024, timestamp: new Date(Date.now() - 2400000).toISOString() },
      { heapUsed: 250 * 1024 * 1024, timestamp: new Date(Date.now() - 1200000).toISOString() },
      { heapUsed: 400 * 1024 * 1024, timestamp: new Date(Date.now() - 600000).toISOString() },
      { heapUsed: 500 * 1024 * 1024, timestamp: new Date().toISOString() }
    ],
    connections: [
      { active: 50, timestamp: new Date(Date.now() - 1200000).toISOString() },
      { active: 75, timestamp: new Date(Date.now() - 600000).toISOString() },
      { active: 95, timestamp: new Date().toISOString() }
    ],
    connectionLimit: 100
  }
};

// Sample context data
const sampleContext = {
  customers: [
    { id: 'cust1', tier: 'tier1', features: ['property-manager', 'dns'], region: 'us-east' },
    { id: 'cust2', tier: 'tier1', features: ['property-manager'], region: 'eu-west' },
    { id: 'cust3', tier: 'tier2', features: ['dns'], region: 'us-east' },
    { id: 'cust4', tier: 'tier2', features: ['property-manager', 'dns'], region: 'asia' },
    { id: 'cust5', tier: 'tier3', features: ['property-manager'], region: 'us-west' }
  ],
  avgTransactionValue: 250,
  avgTicketCost: 75,
  recentEvents: [
    {
      type: 'deployment',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      description: 'Deployed version 2.5.0 with auth improvements'
    },
    {
      type: 'config_change',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      description: 'Updated rate limiting configuration'
    }
  ],
  deployments: [
    {
      id: 'deploy-123',
      version: '2.5.0',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      changes: ['Auth system refactor', 'Performance optimizations'],
      components: ['auth', 'api']
    }
  ],
  milestones: [
    {
      name: 'Q4 Release',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  regulations: ['GDPR', 'SOC2'],
  componentGraph: {
    'auth': ['database', 'cache'],
    'property-manager': ['api', 'database', 'cache'],
    'dns': ['api', 'database'],
    'api': ['rate-limiter', 'logger']
  }
};

async function runAnalysis() {
  console.log('=== Bug Analysis Engine Demo ===\n');
  
  // Initialize the engine with configuration
  const engine = new BugAnalysisEngine({
    detector: {
      performanceThreshold: 1000,
      errorRateThreshold: 0.05,
      memoryLeakThreshold: 50 * 1024 * 1024
    },
    classifier: {
      customCriteria: {
        critical: {
          match: (bug) => bug.affectedCustomers > 2 && bug.tier1Customers > 0,
          reason: 'Multiple tier 1 customers affected'
        }
      },
      weights: {
        userImpact: 0.4,
        businessImpact: 0.3,
        frequency: 0.2,
        effort: 0.1
      }
    },
    analyzer: {
      correlationThreshold: 0.6,
      timeWindowMs: 300000,
      minSampleSize: 3
    },
    calculator: {
      customerWeights: {
        tier1: 10,
        tier2: 5,
        tier3: 2,
        trial: 1
      },
      revenueThresholds: {
        critical: 100000,
        high: 10000,
        medium: 1000
      }
    }
  });
  
  try {
    // Save sample test results to file
    const testResultsPath = path.join(__dirname, 'sample-test-results.json');
    await fs.writeFile(testResultsPath, JSON.stringify(sampleTestResults, null, 2));
    
    // Run the analysis
    console.log('Analyzing test results...\n');
    const report = await engine.analyzeTestResults(testResultsPath, sampleContext);
    
    // Display summary
    console.log('=== Analysis Summary ===');
    console.log(`Total bugs detected: ${report.summary.keyMetrics.totalBugs}`);
    console.log(`Critical bugs: ${report.summary.keyMetrics.criticalBugs}`);
    console.log(`Total financial impact: $${report.summary.keyMetrics.totalFinancialImpact.toFixed(0)}`);
    console.log(`Customers affected: ${report.summary.keyMetrics.totalCustomersAffected}`);
    console.log(`Total effort required: ${report.summary.keyMetrics.totalEffortRequired} hours\n`);
    
    // Display critical findings
    if (report.summary.criticalFindings.length > 0) {
      console.log('=== Critical Findings ===');
      for (const finding of report.summary.criticalFindings) {
        console.log(`- ${finding.id}: ${finding.description}`);
        if (finding.impact) {
          console.log(`  Impact: ${finding.impact}`);
        }
      }
      console.log();
    }
    
    // Display immediate actions
    if (report.actionPlan.immediate.length > 0) {
      console.log('=== Immediate Actions Required ===');
      for (const action of report.actionPlan.immediate) {
        console.log(`- ${action.bugId}: ${action.description}`);
        console.log(`  Effort: ${action.effort}h | Assign to: ${action.assignTo}`);
        console.log(`  Deadline: ${action.deadline}`);
      }
      console.log();
    }
    
    // Display predictions
    if (report.predictions.length > 0) {
      console.log('=== Predictions ===');
      for (const prediction of report.predictions) {
        console.log(`- ${prediction.type}: ${prediction.prediction}`);
        console.log(`  Confidence: ${(prediction.confidence * 100).toFixed(0)}%`);
        console.log(`  Timeframe: ${prediction.timeframe}`);
        console.log(`  Recommendation: ${prediction.recommendation}`);
      }
      console.log();
    }
    
    // Export reports in different formats
    console.log('=== Exporting Reports ===');
    await engine.exportResults('json', path.join(__dirname, 'bug-report'));
    await engine.exportResults('html', path.join(__dirname, 'bug-report'));
    await engine.exportResults('markdown', path.join(__dirname, 'bug-report'));
    console.log('Reports exported successfully!\n');
    
    // Display specific bug details
    console.log('=== Sample Bug Details ===');
    const firstBug = engine.results.detected[0];
    const firstClassification = engine.results.classified[0];
    const firstAnalysis = engine.results.analyzed[0];
    const firstImpact = engine.results.impacts[0];
    
    console.log(`Bug ID: ${firstBug.id}`);
    console.log(`Type: ${firstBug.type}`);
    console.log(`Category: ${firstBug.category}`);
    console.log(`Severity: ${firstClassification.severity}`);
    console.log(`Priority: ${firstClassification.priority}`);
    console.log(`SLA: ${firstClassification.sla}`);
    
    if (firstAnalysis.rootCauses.length > 0) {
      console.log('\nRoot Causes:');
      for (const cause of firstAnalysis.rootCauses) {
        console.log(`- ${cause.description} (confidence: ${(cause.confidence * 100).toFixed(0)}%)`);
      }
    }
    
    console.log(`\nTotal Impact Score: ${firstImpact.totalScore.toFixed(1)}`);
    console.log(`Customer Impact: ${firstImpact.customer.score.toFixed(1)}`);
    console.log(`Business Impact: ${firstImpact.business.score.toFixed(1)}`);
    console.log(`Technical Impact: ${firstImpact.technical.score.toFixed(1)}`);
    
    // Clean up
    await fs.unlink(testResultsPath);
    
  } catch (error) {
    console.error('Error running analysis:', error);
  }
}

// Advanced usage examples
async function advancedExamples() {
  console.log('\n=== Advanced Usage Examples ===\n');
  
  const engine = new BugAnalysisEngine();
  
  // Example 1: Custom bug detection
  console.log('1. Adding custom bug patterns:');
  engine.detector.patterns.customPattern = {
    patterns: [/custom error pattern/i],
    severity: 'high',
    category: 'custom'
  };
  
  // Example 2: Custom classification criteria
  console.log('2. Adding custom classification criteria:');
  engine.classifier.config.customCriteria.businessCritical = {
    match: (bug) => bug.affectedFeatures?.includes('payment-processing'),
    reason: 'Payment processing is business critical'
  };
  
  // Example 3: Historical data analysis
  console.log('3. Learning from historical data:');
  engine.analyzer.knownPatterns.paymentFailure = {
    pattern: ['payment_timeout', 'gateway_error', 'transaction_failed'],
    rootCause: 'Payment gateway connectivity issue',
    category: 'integration',
    solutions: ['Implement payment gateway health checks', 'Add retry logic']
  };
  
  // Example 4: Custom impact calculation
  console.log('4. Custom impact calculation:');
  const customBug = {
    id: 'CUSTOM-001',
    type: 'payment_failure',
    affectedFeatures: ['payment-processing'],
    transactionFailureRate: 0.05,
    affectedTransactions: 1000
  };
  
  const customContext = {
    avgTransactionValue: 500,
    customSLAs: {
      'tier1-customer': {
        penalty: (bug) => bug.type === 'payment_failure' ? 10000 : 0
      }
    }
  };
  
  const customImpact = engine.calculator.calculateImpact(customBug, customContext);
  console.log(`Custom bug financial impact: $${customImpact.business.financial.total}`);
}

// Run the demo
async function main() {
  await runAnalysis();
  await advancedExamples();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAnalysis, advancedExamples };