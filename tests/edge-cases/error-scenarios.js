#!/usr/bin/env node

/**
 * Edge Case and Error Scenario Testing
 * 
 * Comprehensive testing of error conditions, edge cases, and
 * failure scenarios to ensure robust error handling.
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Test configuration
const TEST_CONFIG = {
  serverPath: path.join(process.cwd(), 'dist', 'index.js'),
  logFile: path.join(process.cwd(), 'tests', 'edge-cases', 'error-scenarios.log'),
  testCustomer: 'testing',
  timeout: 30000
};

// Test results collection
const testResults = {
  timestamp: new Date().toISOString(),
  scenarios: []
};

// Logging utility
async function log(message, level = 'INFO', indent = 0) {
  const timestamp = new Date().toISOString();
  const prefix = '  '.repeat(indent);
  const logEntry = `[${timestamp}] [${level}] ${prefix}${message}\n`;
  
  console.log(logEntry.trim());
  await fs.appendFile(TEST_CONFIG.logFile, logEntry).catch(() => {});
}

// Test recorder
function recordScenario(category, name, status, duration, details = {}) {
  testResults.scenarios.push({
    category,
    name,
    status,
    duration,
    timestamp: new Date().toISOString(),
    details
  });
}

/**
 * Category 1: Invalid Customer Credentials
 */
async function testInvalidCredentials() {
  const category = 'Invalid Credentials';
  await log(`\n🔐 Testing ${category}...`, 'INFO');
  
  const scenarios = [
    {
      name: 'Non-existent customer',
      params: {
        customer: 'non-existent-customer-xyz'
      }
    },
    {
      name: 'Empty customer',
      params: {
        customer: ''
      }
    },
    {
      name: 'Null customer',
      params: {
        customer: null
      }
    },
    {
      name: 'Special characters in customer',
      params: {
        customer: 'test!@#$%'
      }
    },
    {
      name: 'Very long customer name',
      params: {
        customer: 'x'.repeat(1000)
      }
    }
  ];
  
  for (const scenario of scenarios) {
    const startTime = performance.now();
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: 'error-test-client',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      // Try to list properties with invalid customer
      await client.callTool('list_properties', scenario.params);
      
      // If we get here, the test failed (should have thrown error)
      const duration = performance.now() - startTime;
      recordScenario(category, scenario.name, 'FAILED', duration, {
        error: 'No error thrown for invalid customer'
      });
      
      await log(`  ❌ ${scenario.name}: Should have thrown error`, 'ERROR', 1);
      
      await client.close();
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorHandled = error.message.includes('customer') || 
                          error.message.includes('Invalid') ||
                          error.message.includes('not found');
      
      recordScenario(category, scenario.name, errorHandled ? 'PASSED' : 'FAILED', duration, {
        error: error.message,
        properlyHandled: errorHandled
      });
      
      if (errorHandled) {
        await log(`  ✅ ${scenario.name}: Properly rejected - ${error.message}`, 'SUCCESS', 1);
      } else {
        await log(`  ⚠️  ${scenario.name}: Error but unclear message - ${error.message}`, 'WARN', 1);
      }
    }
  }
}

/**
 * Category 2: Malformed API Responses
 */
async function testMalformedResponses() {
  const category = 'Malformed Responses';
  await log(`\n🔨 Testing ${category}...`, 'INFO');
  
  // This tests how the system handles unexpected API responses
  // We'll test with various invalid inputs that might cause malformed responses
  
  const scenarios = [
    {
      name: 'Invalid property ID format',
      tool: 'get_property',
      params: {
        propertyId: 'not-a-valid-id',
        customer: TEST_CONFIG.testCustomer
      }
    },
    {
      name: 'SQL injection attempt',
      tool: 'get_property',
      params: {
        propertyId: "prp_12345'; DROP TABLE properties; --",
        customer: TEST_CONFIG.testCustomer
      }
    },
    {
      name: 'XSS attempt in property name',
      tool: 'create_property',
      params: {
        propertyName: '<script>alert("XSS")</script>',
        productId: 'prd_test',
        contractId: 'ctr_test',
        groupId: 'grp_test',
        customer: TEST_CONFIG.testCustomer
      }
    },
    {
      name: 'Unicode characters in zone name',
      tool: 'create_zone',
      params: {
        zone: '测试域名.com',
        type: 'PRIMARY',
        customer: TEST_CONFIG.testCustomer
      }
    },
    {
      name: 'Invalid JSON in rule tree',
      tool: 'update_property_rules',
      params: {
        propertyId: 'prp_12345',
        rules: '{"invalid": "json"',  // Malformed JSON
        contractId: 'ctr_test',
        groupId: 'grp_test',
        customer: TEST_CONFIG.testCustomer
      }
    }
  ];
  
  for (const scenario of scenarios) {
    const startTime = performance.now();
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: 'malformed-test-client',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      await client.callTool(scenario.tool, scenario.params);
      
      const duration = performance.now() - startTime;
      
      // Some scenarios might actually succeed with sanitized input
      recordScenario(category, scenario.name, 'HANDLED', duration, {
        result: 'Input sanitized or processed'
      });
      
      await log(`  ⚠️  ${scenario.name}: Processed without error`, 'WARN', 1);
      
      await client.close();
    } catch (error) {
      const duration = performance.now() - startTime;
      
      recordScenario(category, scenario.name, 'PASSED', duration, {
        error: error.message,
        errorType: error.code || 'Unknown'
      });
      
      await log(`  ✅ ${scenario.name}: Properly rejected - ${error.message}`, 'SUCCESS', 1);
    }
  }
}

/**
 * Category 3: Network Timeouts and Retries
 */
async function testNetworkResilience() {
  const category = 'Network Resilience';
  await log(`\n🌐 Testing ${category}...`, 'INFO');
  
  const scenarios = [
    {
      name: 'Slow response simulation',
      test: async (client) => {
        // Test with a large request that might take time
        const properties = [];
        for (let i = 0; i < 100; i++) {
          properties.push({
            propertyId: `prp_${i}`,
            note: 'Bulk test'
          });
        }
        
        await client.callTool('batch_create_versions', {
          properties,
          customer: TEST_CONFIG.testCustomer
        });
      }
    },
    {
      name: 'Rapid sequential requests',
      test: async (client) => {
        // Fire multiple requests rapidly
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(
            client.callTool('list_properties', {
              customer: TEST_CONFIG.testCustomer
            })
          );
        }
        await Promise.all(promises);
      }
    },
    {
      name: 'Large payload handling',
      test: async (client) => {
        // Create a large rule tree
        const largeRules = {
          rules: {
            name: 'default',
            children: []
          }
        };
        
        // Add many rules
        for (let i = 0; i < 100; i++) {
          largeRules.rules.children.push({
            name: `Rule ${i}`,
            criteria: [{
              name: 'path',
              options: {
                matchOperator: 'MATCHES_ONE_OF',
                values: [`/path${i}/*`]
              }
            }],
            behaviors: [{
              name: 'caching',
              options: {
                behavior: 'MAX_AGE',
                ttl: '1d'
              }
            }]
          });
        }
        
        await client.callTool('validate_rule_tree', {
          propertyId: 'prp_12345',
          rules: largeRules,
          customer: TEST_CONFIG.testCustomer
        });
      }
    }
  ];
  
  for (const scenario of scenarios) {
    const startTime = performance.now();
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: 'network-test-client',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      await scenario.test(client);
      
      const duration = performance.now() - startTime;
      
      recordScenario(category, scenario.name, 'PASSED', duration, {
        completed: true,
        responseTime: duration
      });
      
      await log(`  ✅ ${scenario.name}: Completed in ${duration.toFixed(2)}ms`, 'SUCCESS', 1);
      
      await client.close();
    } catch (error) {
      const duration = performance.now() - startTime;
      const isTimeout = error.message.includes('timeout') || duration > TEST_CONFIG.timeout;
      
      recordScenario(category, scenario.name, isTimeout ? 'TIMEOUT' : 'FAILED', duration, {
        error: error.message,
        duration
      });
      
      await log(`  ${isTimeout ? '⏱️' : '❌'} ${scenario.name}: ${error.message}`, 'ERROR', 1);
    }
  }
}

/**
 * Category 4: Rate Limiting Scenarios
 */
async function testRateLimiting() {
  const category = 'Rate Limiting';
  await log(`\n⏱️ Testing ${category}...`, 'INFO');
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath]
    });

    const client = new McpClient({
      name: 'rate-limit-test-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    
    // Scenario 1: Burst requests
    await log('  Testing burst requests...', 'INFO', 1);
    const burstStart = performance.now();
    const burstPromises = [];
    
    for (let i = 0; i < 50; i++) {
      burstPromises.push(
        client.callTool('list_contracts', {
          customer: TEST_CONFIG.testCustomer
        }).catch(err => ({ error: err.message, index: i }))
      );
    }
    
    const burstResults = await Promise.all(burstPromises);
    const burstDuration = performance.now() - burstStart;
    
    const rateLimitErrors = burstResults.filter(r => 
      r.error && (r.error.includes('rate') || r.error.includes('429'))
    ).length;
    
    recordScenario(category, 'Burst requests', 'COMPLETED', burstDuration, {
      totalRequests: 50,
      rateLimitErrors,
      avgTime: burstDuration / 50
    });
    
    await log(`    Sent 50 requests in ${burstDuration.toFixed(2)}ms`, 'INFO', 2);
    await log(`    Rate limit errors: ${rateLimitErrors}`, rateLimitErrors > 0 ? 'WARN' : 'INFO', 2);
    
    // Scenario 2: Sustained load
    await log('  Testing sustained load...', 'INFO', 1);
    const sustainedStart = performance.now();
    let sustainedErrors = 0;
    
    for (let i = 0; i < 20; i++) {
      try {
        await client.callTool('list_properties', {
          customer: TEST_CONFIG.testCustomer
        });
        await new Promise(resolve => setTimeout(resolve, 100)); // 10 req/sec
      } catch (error) {
        if (error.message.includes('rate') || error.message.includes('429')) {
          sustainedErrors++;
        }
      }
    }
    
    const sustainedDuration = performance.now() - sustainedStart;
    
    recordScenario(category, 'Sustained load', 'COMPLETED', sustainedDuration, {
      totalRequests: 20,
      rateLimitErrors: sustainedErrors,
      requestRate: '10/sec'
    });
    
    await log(`    Sustained load test completed`, 'INFO', 2);
    await log(`    Rate limit errors: ${sustainedErrors}`, sustainedErrors > 0 ? 'WARN' : 'INFO', 2);
    
    await client.close();
  } catch (error) {
    recordScenario(category, 'Rate limiting test', 'FAILED', 0, {
      error: error.message
    });
    
    await log(`  ❌ Rate limiting test failed: ${error.message}`, 'ERROR', 1);
  }
}

/**
 * Category 5: Partial API Failures
 */
async function testPartialFailures() {
  const category = 'Partial Failures';
  await log(`\n⚡ Testing ${category}...`, 'INFO');
  
  const scenarios = [
    {
      name: 'Bulk operation with some invalid items',
      test: async (client) => {
        // Create multiple zones where some will fail
        const zones = [
          { zone: `valid-${Date.now()}.com`, type: 'PRIMARY' },
          { zone: 'invalid..zone..com', type: 'PRIMARY' }, // Invalid format
          { zone: `valid2-${Date.now()}.com`, type: 'PRIMARY' },
          { zone: '', type: 'PRIMARY' }, // Empty zone
          { zone: `valid3-${Date.now()}.com`, type: 'PRIMARY' }
        ];
        
        const results = [];
        for (const zoneConfig of zones) {
          try {
            const result = await client.callTool('create_zone', {
              ...zoneConfig,
              customer: TEST_CONFIG.testCustomer
            });
            results.push({ zone: zoneConfig.zone, success: true });
          } catch (error) {
            results.push({ zone: zoneConfig.zone, success: false, error: error.message });
          }
        }
        
        return {
          total: zones.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        };
      }
    },
    {
      name: 'Property activation with validation errors',
      test: async (client) => {
        // Try to activate a property that might have issues
        try {
          const result = await client.callTool('validate_property_activation', {
            propertyId: 'prp_12345',
            network: 'PRODUCTION',
            customer: TEST_CONFIG.testCustomer
          });
          
          return {
            validated: true,
            hasErrors: result.errors?.length > 0,
            hasWarnings: result.warnings?.length > 0
          };
        } catch (error) {
          return {
            validated: false,
            error: error.message
          };
        }
      }
    },
    {
      name: 'DNS record import with invalid entries',
      test: async (client) => {
        const zoneFile = `
$ORIGIN example.com.
$TTL 3600
@   IN  A   192.0.2.1
www IN  A   192.0.2.2
invalid IN  A   999.999.999.999  ; Invalid IP
test IN  CNAME  www.example.com.
bad  IN  TXT  ; Missing value
mail IN  A   192.0.2.3
`;
        
        try {
          const result = await client.callTool('parse_zone_file', {
            zoneFileContent: zoneFile,
            zone: 'example.com',
            customer: TEST_CONFIG.testCustomer
          });
          
          return {
            parsed: true,
            totalRecords: result.recordCount,
            warnings: result.warnings || []
          };
        } catch (error) {
          return {
            parsed: false,
            error: error.message
          };
        }
      }
    }
  ];
  
  for (const scenario of scenarios) {
    const startTime = performance.now();
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: 'partial-failure-test-client',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      const result = await scenario.test(client);
      const duration = performance.now() - startTime;
      
      recordScenario(category, scenario.name, 'COMPLETED', duration, result);
      
      await log(`  ✅ ${scenario.name}: Handled partial failures`, 'SUCCESS', 1);
      if (result.failed) {
        await log(`    Succeeded: ${result.succeeded}, Failed: ${result.failed}`, 'INFO', 2);
      }
      
      await client.close();
    } catch (error) {
      const duration = performance.now() - startTime;
      
      recordScenario(category, scenario.name, 'FAILED', duration, {
        error: error.message
      });
      
      await log(`  ❌ ${scenario.name}: ${error.message}`, 'ERROR', 1);
    }
  }
}

/**
 * Category 6: Concurrent Operation Conflicts
 */
async function testConcurrentOperations() {
  const category = 'Concurrent Operations';
  await log(`\n🔄 Testing ${category}...`, 'INFO');
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath]
    });

    const client = new McpClient({
      name: 'concurrent-test-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    
    // Scenario 1: Concurrent property modifications
    await log('  Testing concurrent property modifications...', 'INFO', 1);
    const propertyId = 'prp_12345';
    
    // Try to create multiple versions simultaneously
    const versionPromises = [];
    for (let i = 0; i < 5; i++) {
      versionPromises.push(
        client.callTool('create_property_version', {
          propertyId,
          note: `Concurrent test ${i}`,
          customer: TEST_CONFIG.testCustomer
        }).catch(err => ({ error: err.message, index: i }))
      );
    }
    
    const versionResults = await Promise.all(versionPromises);
    const versionConflicts = versionResults.filter(r => r.error).length;
    
    recordScenario(category, 'Concurrent version creation', 'COMPLETED', 0, {
      attempts: 5,
      conflicts: versionConflicts,
      results: versionResults
    });
    
    await log(`    Version creation conflicts: ${versionConflicts}/5`, 'INFO', 2);
    
    // Scenario 2: Concurrent DNS updates
    await log('  Testing concurrent DNS updates...', 'INFO', 1);
    const testZone = 'concurrent-test.com';
    
    // Try to update the same record simultaneously
    const dnsPromises = [];
    for (let i = 0; i < 3; i++) {
      dnsPromises.push(
        client.callTool('upsert_record', {
          zone: testZone,
          name: `test.${testZone}`,
          type: 'A',
          ttl: 300,
          rdata: [`192.0.2.${i + 1}`],
          customer: TEST_CONFIG.testCustomer
        }).catch(err => ({ error: err.message, index: i }))
      );
    }
    
    const dnsResults = await Promise.all(dnsPromises);
    const dnsConflicts = dnsResults.filter(r => r.error).length;
    
    recordScenario(category, 'Concurrent DNS updates', 'COMPLETED', 0, {
      attempts: 3,
      conflicts: dnsConflicts
    });
    
    await log(`    DNS update conflicts: ${dnsConflicts}/3`, 'INFO', 2);
    
    await client.close();
  } catch (error) {
    recordScenario(category, 'Concurrent operations test', 'FAILED', 0, {
      error: error.message
    });
    
    await log(`  ❌ Concurrent operations test failed: ${error.message}`, 'ERROR', 1);
  }
}

/**
 * Category 7: Resource Cleanup Failures
 */
async function testResourceCleanup() {
  const category = 'Resource Cleanup';
  await log(`\n🧹 Testing ${category}...`, 'INFO');
  
  const scenarios = [
    {
      name: 'Cleanup after failed property creation',
      test: async (client) => {
        // Create a property that might fail
        try {
          await client.callTool('create_property', {
            propertyName: '', // Invalid empty name
            productId: 'prd_test',
            contractId: 'ctr_test',
            groupId: 'grp_test',
            customer: TEST_CONFIG.testCustomer
          });
        } catch (error) {
          // Check if any partial resources were created
          const properties = await client.callTool('list_properties', {
            customer: TEST_CONFIG.testCustomer
          });
          
          return {
            cleanupNeeded: false,
            error: error.message,
            existingProperties: properties.length
          };
        }
      }
    },
    {
      name: 'Orphaned edge hostname detection',
      test: async (client) => {
        // List edge hostnames without associated properties
        try {
          const edgeHostnames = await client.callTool('list_edge_hostnames', {
            contractId: 'ctr_test',
            groupId: 'grp_test',
            customer: TEST_CONFIG.testCustomer
          });
          
          const orphaned = edgeHostnames.filter(eh => !eh.associatedProperties?.length);
          
          return {
            totalEdgeHostnames: edgeHostnames.length,
            orphaned: orphaned.length,
            cleanupCandidates: orphaned.map(eh => eh.edgeHostnameId)
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      }
    },
    {
      name: 'Stale DNS changelist cleanup',
      test: async (client) => {
        // Check for pending DNS changes that are old
        const testZone = 'cleanup-test.com';
        
        try {
          // Create a change but don't activate
          await client.callTool('upsert_record', {
            zone: testZone,
            name: `temp.${testZone}`,
            type: 'A',
            ttl: 300,
            rdata: ['192.0.2.100'],
            customer: TEST_CONFIG.testCustomer
          });
          
          // Check zone status
          const zoneInfo = await client.callTool('get_zone', {
            zone: testZone,
            customer: TEST_CONFIG.testCustomer
          });
          
          return {
            hasPendingChanges: zoneInfo.pendingChanges > 0,
            changeCount: zoneInfo.pendingChanges,
            lastModified: zoneInfo.lastModifiedDate
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      }
    }
  ];
  
  for (const scenario of scenarios) {
    const startTime = performance.now();
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: 'cleanup-test-client',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      const result = await scenario.test(client);
      const duration = performance.now() - startTime;
      
      recordScenario(category, scenario.name, 'COMPLETED', duration, result);
      
      await log(`  ✅ ${scenario.name}: Cleanup check completed`, 'SUCCESS', 1);
      if (result.orphaned) {
        await log(`    Found ${result.orphaned} orphaned resources`, 'WARN', 2);
      }
      
      await client.close();
    } catch (error) {
      const duration = performance.now() - startTime;
      
      recordScenario(category, scenario.name, 'FAILED', duration, {
        error: error.message
      });
      
      await log(`  ❌ ${scenario.name}: ${error.message}`, 'ERROR', 1);
    }
  }
}

/**
 * Generate test report
 */
async function generateReport() {
  await log('\n📊 Generating error scenario report...', 'INFO');
  
  // Group scenarios by category
  const categorizedResults = {};
  testResults.scenarios.forEach(scenario => {
    if (!categorizedResults[scenario.category]) {
      categorizedResults[scenario.category] = {
        total: 0,
        passed: 0,
        failed: 0,
        scenarios: []
      };
    }
    
    const cat = categorizedResults[scenario.category];
    cat.total++;
    cat.scenarios.push(scenario);
    
    if (scenario.status === 'PASSED' || scenario.status === 'COMPLETED') {
      cat.passed++;
    } else {
      cat.failed++;
    }
  });
  
  const report = {
    summary: {
      totalScenarios: testResults.scenarios.length,
      passed: testResults.scenarios.filter(s => 
        s.status === 'PASSED' || s.status === 'COMPLETED'
      ).length,
      failed: testResults.scenarios.filter(s => 
        s.status === 'FAILED'
      ).length,
      categories: Object.keys(categorizedResults).length
    },
    categorizedResults,
    ...testResults
  };
  
  // Save report
  const reportPath = path.join(process.cwd(), 'tests', 'edge-cases', 'error-scenarios-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('ERROR SCENARIO TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Scenarios: ${report.summary.totalScenarios}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Categories Tested: ${report.summary.categories}`);
  console.log('='.repeat(60));
  
  console.log('\nCategory Breakdown:');
  Object.entries(categorizedResults).forEach(([category, data]) => {
    const successRate = ((data.passed / data.total) * 100).toFixed(1);
    console.log(`  ${category}: ${data.passed}/${data.total} passed (${successRate}%)`);
  });
  
  // List critical failures
  const criticalFailures = testResults.scenarios.filter(s => 
    s.status === 'FAILED' && 
    (s.category === 'Invalid Credentials' || s.category === 'Resource Cleanup')
  );
  
  if (criticalFailures.length > 0) {
    console.log('\n⚠️  Critical Failures:');
    criticalFailures.forEach(failure => {
      console.log(`  - ${failure.category} / ${failure.name}: ${failure.details.error}`);
    });
  }
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
  console.log(`Log file: ${TEST_CONFIG.logFile}`);
  
  return report.summary.failed === 0;
}

/**
 * Main test runner
 */
async function runErrorScenarios() {
  console.log('🚨 Starting Edge Case and Error Scenario Testing...\n');
  
  try {
    // Clear log file
    await fs.writeFile(TEST_CONFIG.logFile, '');
    
    // Run all test categories
    await testInvalidCredentials();
    await testMalformedResponses();
    await testNetworkResilience();
    await testRateLimiting();
    await testPartialFailures();
    await testConcurrentOperations();
    await testResourceCleanup();
    
    // Generate report
    const success = await generateReport();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    await log(`Fatal error: ${error.message}`, 'ERROR');
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run tests
runErrorScenarios();