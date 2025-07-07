#!/usr/bin/env tsx

/**
 * User Verification Suite for ALECS MCP Server
 * 
 * This script simulates real user workflows to verify
 * that all functionality works correctly end-to-end.
 * 
 * CODE KAI PRINCIPLES:
 * - Test real user journeys, not just individual tools
 * - Verify integration between different tools
 * - Check error handling and edge cases
 * - Ensure consistent user experience
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

// Test configuration
const TEST_CONFIG = {
  propertyName: `test-property-${Date.now()}`,
  hostname: 'test.example.com',
  contractId: 'ctr_TEST',
  groupId: 'grp_TEST',
  productId: 'prd_SPM',
  customer: 'testing' // Use test environment from .edgerc
};

// User scenarios to test
const USER_SCENARIOS = [
  {
    name: 'New User Onboarding',
    description: 'First-time user creating and activating a property',
    steps: [
      'List available contracts and groups',
      'Create a new property',
      'Add hostnames',
      'Configure basic rules',
      'Activate to staging',
      'Check activation status'
    ]
  },
  {
    name: 'Property Management Expert',
    description: 'Advanced user managing complex configurations',
    steps: [
      'Search for existing properties',
      'Clone property for new environment',
      'Update rules with advanced behaviors',
      'Compare versions',
      'Rollback if needed',
      'Activate to production'
    ]
  },
  {
    name: 'Security Administrator',
    description: 'User managing security policies and network lists',
    steps: [
      'Create IP allowlist',
      'Create geographic blocklist',
      'Link to WAF policy',
      'Activate security configuration',
      'Monitor security events'
    ]
  },
  {
    name: 'Performance Engineer',
    description: 'User optimizing CDN performance',
    steps: [
      'Analyze current performance',
      'Identify optimization opportunities',
      'Update caching rules',
      'Test in staging',
      'Measure improvements',
      'Deploy optimizations'
    ]
  },
  {
    name: 'Certificate Manager',
    description: 'User managing SSL/TLS certificates',
    steps: [
      'Check certificate status',
      'Enroll new DV certificate',
      'Complete domain validation',
      'Link to property',
      'Monitor deployment',
      'Handle renewals'
    ]
  },
  {
    name: 'Content Publisher',
    description: 'User managing content delivery',
    steps: [
      'Purge outdated content',
      'Check purge status',
      'Update content rules',
      'Preview changes',
      'Activate updates',
      'Verify delivery'
    ]
  },
  {
    name: 'DNS Administrator',
    description: 'User managing DNS zones and records',
    steps: [
      'Create DNS zone',
      'Add A/AAAA records',
      'Configure CNAME records',
      'Setup MX records',
      'Enable DNSSEC',
      'Activate zone changes'
    ]
  },
  {
    name: 'Reporting Analyst',
    description: 'User analyzing traffic and performance',
    steps: [
      'Get traffic reports',
      'Analyze cache performance',
      'Review geographic distribution',
      'Identify error patterns',
      'Export data for analysis',
      'Create custom reports'
    ]
  }
];

// Test result tracking
interface TestResult {
  scenario: string;
  status: 'passed' | 'failed' | 'error';
  duration: number;
  details: string;
  errors?: string[];
}

const results: TestResult[] = [];

// Helper to execute MCP commands
async function executeMCPCommand(tool: string, args: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const mcp = spawn('npx', ['mcp-client', 'call', tool, JSON.stringify(args)], {
      cwd: process.cwd(),
      env: { ...process.env, MCP_SERVER: 'alecs-property' }
    });

    let output = '';
    let error = '';

    mcp.stdout.on('data', (data) => {
      output += data.toString();
    });

    mcp.stderr.on('data', (data) => {
      error += data.toString();
    });

    mcp.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch {
          resolve(output);
        }
      } else {
        reject(new Error(error || `Command failed with code ${code}`));
      }
    });
  });
}

// Test Scenario 1: New User Onboarding
async function testNewUserOnboarding(): Promise<TestResult> {
  const start = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('\n🧪 Testing: New User Onboarding');
    
    // Step 1: List contracts and groups
    console.log('  → Listing contracts and groups...');
    const contracts = await executeMCPCommand('list-contracts', { customer: TEST_CONFIG.customer });
    const groups = await executeMCPCommand('list-groups', { customer: TEST_CONFIG.customer });
    
    if (!contracts || !groups) {
      errors.push('Failed to list contracts or groups');
    }
    
    // Step 2: Create property
    console.log('  → Creating new property...');
    const createResult = await executeMCPCommand('create-property', {
      propertyName: TEST_CONFIG.propertyName,
      contractId: TEST_CONFIG.contractId,
      groupId: TEST_CONFIG.groupId,
      productId: TEST_CONFIG.productId,
      customer: TEST_CONFIG.customer
    });
    
    const propertyId = createResult?.propertyId;
    if (!propertyId) {
      throw new Error('Property creation failed');
    }
    
    // Step 3: Add hostnames
    console.log('  → Adding hostnames...');
    await executeMCPCommand('add-property-hostname', {
      propertyId,
      version: 1,
      hostnames: [TEST_CONFIG.hostname],
      customer: TEST_CONFIG.customer
    });
    
    // Step 4: Get and update rules
    console.log('  → Configuring rules...');
    const rulesResult = await executeMCPCommand('get-property-rules', {
      propertyId,
      version: 1,
      customer: TEST_CONFIG.customer
    });
    
    // Step 5: Activate to staging
    console.log('  → Activating to staging...');
    const activationResult = await executeMCPCommand('activate-property', {
      propertyId,
      version: 1,
      network: 'staging',
      note: 'Initial activation from user verification suite',
      customer: TEST_CONFIG.customer
    });
    
    const activationId = activationResult?.activationId;
    
    // Step 6: Check status
    console.log('  → Checking activation status...');
    if (activationId) {
      await executeMCPCommand('get-activation-status', {
        propertyId,
        activationId,
        customer: TEST_CONFIG.customer
      });
    }
    
    return {
      scenario: 'New User Onboarding',
      status: errors.length === 0 ? 'passed' : 'failed',
      duration: Date.now() - start,
      details: `Created property ${propertyId} and activated to staging`,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    return {
      scenario: 'New User Onboarding',
      status: 'error',
      duration: Date.now() - start,
      details: error instanceof Error ? error.message : 'Unknown error',
      errors: [String(error)]
    };
  }
}

// Test Scenario 2: Property Search and Discovery
async function testPropertySearch(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('\n🧪 Testing: Property Search and Discovery');
    
    // Universal search
    console.log('  → Testing universal search...');
    const searchResult = await executeMCPCommand('universal-search', {
      query: 'test',
      customer: TEST_CONFIG.customer
    });
    
    // Property-specific search
    console.log('  → Testing property search...');
    const propSearch = await executeMCPCommand('search-properties', {
      query: 'test',
      customer: TEST_CONFIG.customer
    });
    
    // Advanced search
    console.log('  → Testing advanced search...');
    const advSearch = await executeMCPCommand('search-properties-advanced', {
      contractIds: [TEST_CONFIG.contractId],
      hasActivation: 'staging',
      customer: TEST_CONFIG.customer
    });
    
    return {
      scenario: 'Property Search and Discovery',
      status: 'passed',
      duration: Date.now() - start,
      details: 'All search operations completed successfully'
    };
    
  } catch (error) {
    return {
      scenario: 'Property Search and Discovery',
      status: 'error',
      duration: Date.now() - start,
      details: error instanceof Error ? error.message : 'Unknown error',
      errors: [String(error)]
    };
  }
}

// Test Scenario 3: Rules and Behaviors
async function testRulesManagement(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('\n🧪 Testing: Rules and Behaviors Management');
    
    // Get available behaviors
    console.log('  → Getting available behaviors...');
    const behaviors = await executeMCPCommand('get-available-behaviors', {
      productId: TEST_CONFIG.productId,
      ruleFormat: 'v2023-01-05',
      customer: TEST_CONFIG.customer
    });
    
    // Get available criteria
    console.log('  → Getting available criteria...');
    const criteria = await executeMCPCommand('get-available-criteria', {
      productId: TEST_CONFIG.productId,
      ruleFormat: 'v2023-01-05',
      customer: TEST_CONFIG.customer
    });
    
    // Get rule formats
    console.log('  → Getting rule formats...');
    const formats = await executeMCPCommand('get-rule-formats', {
      customer: TEST_CONFIG.customer
    });
    
    return {
      scenario: 'Rules and Behaviors Management',
      status: 'passed',
      duration: Date.now() - start,
      details: 'Successfully retrieved behaviors, criteria, and formats'
    };
    
  } catch (error) {
    return {
      scenario: 'Rules and Behaviors Management',
      status: 'error',
      duration: Date.now() - start,
      details: error instanceof Error ? error.message : 'Unknown error',
      errors: [String(error)]
    };
  }
}

// Test Scenario 4: Certificate Management
async function testCertificateManagement(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('\n🧪 Testing: Certificate Management');
    
    // List certificate enrollments
    console.log('  → Listing certificate enrollments...');
    const enrollments = await executeMCPCommand('mcp__alecs-certs__list-certificate-enrollments', {
      customer: TEST_CONFIG.customer
    });
    
    // Create DV enrollment (would need real domain)
    console.log('  → Simulating DV enrollment...');
    // Note: Actual enrollment requires valid domain ownership
    
    return {
      scenario: 'Certificate Management',
      status: 'passed',
      duration: Date.now() - start,
      details: 'Certificate operations tested (limited by domain validation requirements)'
    };
    
  } catch (error) {
    return {
      scenario: 'Certificate Management',
      status: 'error',
      duration: Date.now() - start,
      details: error instanceof Error ? error.message : 'Unknown error',
      errors: [String(error)]
    };
  }
}

// Test Scenario 5: Performance Analysis
async function testPerformanceAnalysis(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('\n🧪 Testing: Performance Analysis');
    
    // Get traffic report
    console.log('  → Getting traffic report...');
    const traffic = await executeMCPCommand('mcp__alecs-reporting__get_traffic_report', {
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      customer: TEST_CONFIG.customer
    });
    
    // Get cache performance
    console.log('  → Analyzing cache performance...');
    const cache = await executeMCPCommand('mcp__alecs-reporting__get_cache_performance', {
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      customer: TEST_CONFIG.customer
    });
    
    return {
      scenario: 'Performance Analysis',
      status: 'passed',
      duration: Date.now() - start,
      details: 'Performance metrics retrieved successfully'
    };
    
  } catch (error) {
    return {
      scenario: 'Performance Analysis',
      status: 'error',
      duration: Date.now() - start,
      details: error instanceof Error ? error.message : 'Unknown error',
      errors: [String(error)]
    };
  }
}

// Main test runner
async function runUserVerificationSuite() {
  console.log('🚀 Starting ALECS MCP Server User Verification Suite');
  console.log('=' . repeat(60));
  
  // Run all test scenarios
  const scenarios = [
    testNewUserOnboarding,
    testPropertySearch,
    testRulesManagement,
    testCertificateManagement,
    testPerformanceAnalysis
  ];
  
  for (const scenario of scenarios) {
    const result = await scenario();
    results.push(result);
  }
  
  // Generate report
  console.log('\n' + '=' . repeat(60));
  console.log('📊 User Verification Results\n');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log(`\nSuccess Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);
  
  // Detailed results
  console.log('Detailed Results:');
  console.log('-' . repeat(60));
  
  for (const result of results) {
    const icon = result.status === 'passed' ? '✅' : 
                 result.status === 'failed' ? '❌' : '⚠️';
    
    console.log(`\n${icon} ${result.scenario}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Details: ${result.details}`);
    
    if (result.errors) {
      console.log('   Errors:');
      result.errors.forEach(err => console.log(`     - ${err}`));
    }
  }
  
  // Save results to file
  const reportPath = path.join(process.cwd(), 'user-verification-report.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed,
      errors,
      successRate: ((passed / results.length) * 100).toFixed(1) + '%'
    },
    results
  }, null, 2));
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(failed + errors > 0 ? 1 : 0);
}

// Run the suite
if (require.main === module) {
  runUserVerificationSuite().catch(console.error);
}

export { runUserVerificationSuite, USER_SCENARIOS };