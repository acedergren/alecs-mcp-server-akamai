#!/usr/bin/env node

/**
 * Performance and Load Testing
 * 
 * Comprehensive performance testing including concurrent operations,
 * large-scale imports, bulk provisioning, and resource usage monitoring.
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Worker } from 'worker_threads';

// Test configuration
const TEST_CONFIG = {
  serverPath: path.join(process.cwd(), 'dist', 'index.js'),
  logFile: path.join(process.cwd(), 'tests', 'performance', 'load-testing.log'),
  metricsFile: path.join(process.cwd(), 'tests', 'performance', 'performance-metrics.json'),
  testCustomer: 'testing',
  // Load test parameters
  concurrency: {
    low: 5,
    medium: 10,
    high: 20,
    stress: 50
  },
  dnsBulkSizes: {
    small: 100,
    medium: 500,
    large: 1000,
    xlarge: 5000
  }
};

// Performance metrics collection
const performanceMetrics = {
  timestamp: new Date().toISOString(),
  system: {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    nodeVersion: process.version
  },
  tests: []
};

// Logging utility
async function log(message, level = 'INFO', indent = 0) {
  const timestamp = new Date().toISOString();
  const prefix = '  '.repeat(indent);
  const logEntry = `[${timestamp}] [${level}] ${prefix}${message}\n`;
  
  console.log(logEntry.trim());
  await fs.appendFile(TEST_CONFIG.logFile, logEntry).catch(() => {});
}

// Metrics recorder
function recordMetrics(testName, metrics) {
  performanceMetrics.tests.push({
    name: testName,
    timestamp: new Date().toISOString(),
    ...metrics
  });
}

// Memory usage tracker
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024) // MB
  };
}

// Response time statistics
function calculateStats(times) {
  if (!times.length) return {};
  
  const sorted = times.sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

/**
 * Test 1: Concurrent Customer Operations
 */
async function testConcurrentOperations() {
  await log('\n🔄 Test 1: Concurrent Customer Operations', 'INFO');
  
  const concurrencyLevels = ['low', 'medium', 'high'];
  const results = {};
  
  for (const level of concurrencyLevels) {
    const concurrency = TEST_CONFIG.concurrency[level];
    await log(`Testing with ${concurrency} concurrent operations...`, 'INFO', 1);
    
    const startTime = performance.now();
    const startMemory = getMemoryUsage();
    const responseTimes = [];
    const errors = [];
    
    // Create multiple clients
    const clients = [];
    for (let i = 0; i < concurrency; i++) {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: `load-test-client-${i}`,
        version: '1.0.0'
      });

      await client.connect(transport);
      clients.push({ client, transport });
    }
    
    // Execute concurrent operations
    const operations = [
      'list_properties',
      'list_zones',
      'list_contracts',
      'list_certificate_enrollments'
    ];
    
    const promises = [];
    
    for (let i = 0; i < concurrency * 5; i++) {
      const clientIndex = i % clients.length;
      const operation = operations[i % operations.length];
      
      const promise = (async () => {
        const opStart = performance.now();
        try {
          await clients[clientIndex].client.callTool(operation, {
            customer: TEST_CONFIG.testCustomer
          });
          responseTimes.push(performance.now() - opStart);
        } catch (error) {
          errors.push({
            operation,
            error: error.message,
            time: performance.now() - opStart
          });
        }
      })();
      
      promises.push(promise);
    }
    
    await Promise.all(promises);
    
    // Cleanup clients
    await Promise.all(clients.map(c => c.client.close()));
    
    const duration = performance.now() - startTime;
    const endMemory = getMemoryUsage();
    const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
    
    results[level] = {
      concurrency,
      totalOperations: concurrency * 5,
      duration,
      throughput: (concurrency * 5) / (duration / 1000), // ops/sec
      responseTimes: calculateStats(responseTimes),
      errors: errors.length,
      errorRate: (errors.length / (concurrency * 5)) * 100,
      memoryUsage: {
        start: startMemory,
        end: endMemory,
        increase: memoryIncrease
      }
    };
    
    await log(`Completed: ${results[level].throughput.toFixed(2)} ops/sec`, 'SUCCESS', 2);
    await log(`Response times - Avg: ${results[level].responseTimes.avg.toFixed(2)}ms, P95: ${results[level].responseTimes.p95.toFixed(2)}ms`, 'INFO', 2);
    await log(`Errors: ${errors.length} (${results[level].errorRate.toFixed(2)}%)`, errors.length > 0 ? 'WARN' : 'INFO', 2);
    await log(`Memory increase: ${memoryIncrease}MB`, 'INFO', 2);
  }
  
  recordMetrics('Concurrent Operations', results);
}

/**
 * Test 2: Large-scale DNS Import
 */
async function testLargeDNSImport() {
  await log('\n🌐 Test 2: Large-scale DNS Import', 'INFO');
  
  const sizes = ['small', 'medium', 'large'];
  const results = {};
  
  for (const size of sizes) {
    const recordCount = TEST_CONFIG.dnsBulkSizes[size];
    await log(`Testing DNS import with ${recordCount} records...`, 'INFO', 1);
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: 'dns-import-client',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      // Generate zone file content
      const zone = `bulk-test-${Date.now()}.com`;
      let zoneFileContent = `
$ORIGIN ${zone}.
$TTL 3600
@   IN  SOA ns1.${zone}. hostmaster.${zone}. (
    2024010101  ; Serial
    3600        ; Refresh
    1800        ; Retry
    604800      ; Expire
    86400       ; Minimum TTL
)
    IN  NS  ns1.${zone}.
    IN  NS  ns2.${zone}.
`;
      
      // Add records
      for (let i = 0; i < recordCount; i++) {
        const recordType = i % 4; // Vary record types
        switch (recordType) {
          case 0:
            zoneFileContent += `host${i} IN A 192.0.2.${(i % 254) + 1}\n`;
            break;
          case 1:
            zoneFileContent += `alias${i} IN CNAME host${Math.floor(i / 2)}.${zone}.\n`;
            break;
          case 2:
            zoneFileContent += `txt${i} IN TXT "Text record ${i}"\n`;
            break;
          case 3:
            zoneFileContent += `mx${i} IN MX ${(i % 10) + 1} mail${i}.${zone}.\n`;
            break;
        }
      }
      
      const startTime = performance.now();
      const startMemory = getMemoryUsage();
      
      // Create zone
      await client.callTool('create_zone', {
        zone,
        type: 'PRIMARY',
        customer: TEST_CONFIG.testCustomer
      });
      
      // Parse zone file
      const parseStart = performance.now();
      const parseResult = await client.callTool('parse_zone_file', {
        zoneFileContent,
        zone,
        customer: TEST_CONFIG.testCustomer
      });
      const parseTime = performance.now() - parseStart;
      
      // Import records
      const importStart = performance.now();
      const importResult = await client.callTool('bulk_import_records', {
        zone,
        batchId: parseResult.batchId,
        customer: TEST_CONFIG.testCustomer
      });
      const importTime = performance.now() - importStart;
      
      const totalTime = performance.now() - startTime;
      const endMemory = getMemoryUsage();
      
      results[size] = {
        recordCount,
        parseTime,
        importTime,
        totalTime,
        recordsPerSecond: recordCount / (totalTime / 1000),
        memoryUsage: {
          start: startMemory,
          end: endMemory,
          increase: endMemory.heapUsed - startMemory.heapUsed
        },
        success: true
      };
      
      await log(`Completed in ${totalTime.toFixed(2)}ms`, 'SUCCESS', 2);
      await log(`Parse time: ${parseTime.toFixed(2)}ms, Import time: ${importTime.toFixed(2)}ms`, 'INFO', 2);
      await log(`Rate: ${results[size].recordsPerSecond.toFixed(2)} records/sec`, 'INFO', 2);
      
      await client.close();
    } catch (error) {
      results[size] = {
        recordCount,
        success: false,
        error: error.message
      };
      
      await log(`Failed: ${error.message}`, 'ERROR', 2);
    }
  }
  
  recordMetrics('DNS Bulk Import', results);
}

/**
 * Test 3: Bulk Certificate Provisioning
 */
async function testBulkCertificateProvisioning() {
  await log('\n🔐 Test 3: Bulk Certificate Provisioning', 'INFO');
  
  const batchSizes = [5, 10, 20];
  const results = {};
  
  for (const batchSize of batchSizes) {
    await log(`Testing certificate provisioning with batch size ${batchSize}...`, 'INFO', 1);
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: 'cert-bulk-client',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      const startTime = performance.now();
      const startMemory = getMemoryUsage();
      const provisioningTimes = [];
      const errors = [];
      
      // Create certificates in parallel batches
      for (let batch = 0; batch < 2; batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const domain = `cert-test-${batch}-${i}-${Date.now()}.com`;
          
          const promise = (async () => {
            const provStart = performance.now();
            try {
              await client.callTool('create_dv_enrollment', {
                commonName: domain,
                sans: [`www.${domain}`],
                adminContact: {
                  firstName: 'Test',
                  lastName: 'Admin',
                  email: 'admin@example.com',
                  phone: '+1-555-0100'
                },
                techContact: {
                  firstName: 'Test',
                  lastName: 'Tech',
                  email: 'tech@example.com',
                  phone: '+1-555-0101'
                },
                contractId: 'ctr_TEST',
                customer: TEST_CONFIG.testCustomer
              });
              provisioningTimes.push(performance.now() - provStart);
            } catch (error) {
              errors.push({
                domain,
                error: error.message,
                time: performance.now() - provStart
              });
            }
          })();
          
          batchPromises.push(promise);
        }
        
        await Promise.all(batchPromises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const totalTime = performance.now() - startTime;
      const endMemory = getMemoryUsage();
      
      results[batchSize] = {
        batchSize,
        totalCertificates: batchSize * 2,
        totalTime,
        certificatesPerMinute: ((batchSize * 2) / (totalTime / 1000)) * 60,
        provisioningTimes: calculateStats(provisioningTimes),
        errors: errors.length,
        errorRate: (errors.length / (batchSize * 2)) * 100,
        memoryUsage: {
          start: startMemory,
          end: endMemory,
          increase: endMemory.heapUsed - startMemory.heapUsed
        }
      };
      
      await log(`Completed: ${results[batchSize].certificatesPerMinute.toFixed(2)} certs/min`, 'SUCCESS', 2);
      await log(`Avg provisioning time: ${results[batchSize].provisioningTimes.avg.toFixed(2)}ms`, 'INFO', 2);
      await log(`Errors: ${errors.length} (${results[batchSize].errorRate.toFixed(2)}%)`, errors.length > 0 ? 'WARN' : 'INFO', 2);
      
      await client.close();
    } catch (error) {
      results[batchSize] = {
        batchSize,
        success: false,
        error: error.message
      };
      
      await log(`Failed: ${error.message}`, 'ERROR', 2);
    }
  }
  
  recordMetrics('Bulk Certificate Provisioning', results);
}

/**
 * Test 4: Memory Usage Under Load
 */
async function testMemoryUsage() {
  await log('\n💾 Test 4: Memory Usage Under Load', 'INFO');
  
  const results = {
    baseline: getMemoryUsage(),
    checkpoints: []
  };
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath]
    });

    const client = new McpClient({
      name: 'memory-test-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    
    // Run sustained operations while monitoring memory
    const duration = 60000; // 1 minute
    const checkInterval = 5000; // Check every 5 seconds
    const startTime = performance.now();
    
    await log('Running sustained load for memory profiling...', 'INFO', 1);
    
    const sustainedLoad = async () => {
      while (performance.now() - startTime < duration) {
        try {
          // Mix of operations
          await Promise.all([
            client.callTool('list_properties', { customer: TEST_CONFIG.testCustomer }),
            client.callTool('list_zones', { customer: TEST_CONFIG.testCustomer }),
            client.callTool('list_contracts', { customer: TEST_CONFIG.testCustomer })
          ]);
        } catch (error) {
          // Continue on error
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };
    
    // Start load
    const loadPromise = sustainedLoad();
    
    // Monitor memory
    const monitorInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const memory = getMemoryUsage();
      
      results.checkpoints.push({
        elapsed,
        memory,
        heapGrowth: memory.heapUsed - results.baseline.heapUsed
      });
      
      log(`Memory at ${(elapsed / 1000).toFixed(1)}s: Heap ${memory.heapUsed}MB (${memory.heapUsed - results.baseline.heapUsed > 0 ? '+' : ''}${memory.heapUsed - results.baseline.heapUsed}MB)`, 'INFO', 2);
    }, checkInterval);
    
    // Wait for load to complete
    await loadPromise;
    clearInterval(monitorInterval);
    
    // Final memory check
    results.final = getMemoryUsage();
    results.totalGrowth = results.final.heapUsed - results.baseline.heapUsed;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 1000));
      results.afterGC = getMemoryUsage();
      results.retained = results.afterGC.heapUsed - results.baseline.heapUsed;
    }
    
    await log(`Total memory growth: ${results.totalGrowth}MB`, 'INFO', 2);
    if (results.afterGC) {
      await log(`Memory after GC: ${results.afterGC.heapUsed}MB (retained: ${results.retained}MB)`, 'INFO', 2);
    }
    
    await client.close();
  } catch (error) {
    results.error = error.message;
    await log(`Memory test failed: ${error.message}`, 'ERROR', 2);
  }
  
  recordMetrics('Memory Usage', results);
}

/**
 * Test 5: API Rate Limit Compliance
 */
async function testRateLimitCompliance() {
  await log('\n⏱️ Test 5: API Rate Limit Compliance', 'INFO');
  
  const results = {
    endpoints: {}
  };
  
  // Test different endpoints with their rate limits
  const endpoints = [
    { name: 'list_properties', rateLimit: 10 }, // 10 req/sec
    { name: 'list_zones', rateLimit: 20 }, // 20 req/sec
    { name: 'create_property_version', rateLimit: 5 } // 5 req/sec
  ];
  
  for (const endpoint of endpoints) {
    await log(`Testing ${endpoint.name} (limit: ${endpoint.rateLimit} req/sec)...`, 'INFO', 1);
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });

      const client = new McpClient({
        name: 'rate-limit-client',
        version: '1.0.0'
      });

      await client.connect(transport);
      
      const testDuration = 10000; // 10 seconds
      const requestsToSend = endpoint.rateLimit * 15; // 1.5x the limit
      const interval = testDuration / requestsToSend;
      
      const startTime = performance.now();
      const responses = [];
      const rateLimitErrors = [];
      
      for (let i = 0; i < requestsToSend; i++) {
        const reqStart = performance.now();
        
        try {
          const params = endpoint.name === 'create_property_version' 
            ? { propertyId: 'prp_12345', customer: TEST_CONFIG.testCustomer }
            : { customer: TEST_CONFIG.testCustomer };
            
          await client.callTool(endpoint.name, params);
          
          responses.push({
            time: performance.now() - reqStart,
            timestamp: performance.now() - startTime
          });
        } catch (error) {
          if (error.message.includes('rate') || error.message.includes('429')) {
            rateLimitErrors.push({
              timestamp: performance.now() - startTime,
              requestNumber: i + 1
            });
          }
        }
        
        // Wait for next request
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      const actualDuration = performance.now() - startTime;
      const actualRate = responses.length / (actualDuration / 1000);
      
      results.endpoints[endpoint.name] = {
        targetRate: endpoint.rateLimit,
        attemptedRequests: requestsToSend,
        successfulRequests: responses.length,
        rateLimitErrors: rateLimitErrors.length,
        actualRate,
        compliance: actualRate <= endpoint.rateLimit,
        responseTimes: calculateStats(responses.map(r => r.time))
      };
      
      await log(`Actual rate: ${actualRate.toFixed(2)} req/sec (${results.endpoints[endpoint.name].compliance ? 'COMPLIANT' : 'EXCEEDED'})`, 
        results.endpoints[endpoint.name].compliance ? 'SUCCESS' : 'WARN', 2);
      await log(`Rate limit errors: ${rateLimitErrors.length}`, 
        rateLimitErrors.length > 0 ? 'INFO' : 'SUCCESS', 2);
      
      await client.close();
    } catch (error) {
      results.endpoints[endpoint.name] = {
        error: error.message
      };
      
      await log(`Failed: ${error.message}`, 'ERROR', 2);
    }
  }
  
  recordMetrics('Rate Limit Compliance', results);
}

/**
 * Test 6: Response Time Measurement
 */
async function testResponseTimes() {
  await log('\n⏰ Test 6: Response Time Measurement', 'INFO');
  
  const operations = [
    { name: 'list_properties', weight: 'light' },
    { name: 'get_property_rules', weight: 'medium', params: { propertyId: 'prp_12345' } },
    { name: 'validate_property_activation', weight: 'heavy', params: { propertyId: 'prp_12345', network: 'STAGING' } },
    { name: 'search_properties_advanced', weight: 'heavy', params: { criteria: { activationStatus: 'production' } } }
  ];
  
  const results = {};
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath]
    });

    const client = new McpClient({
      name: 'response-time-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    
    for (const operation of operations) {
      await log(`Measuring ${operation.name} (${operation.weight} operation)...`, 'INFO', 1);
      
      const measurements = [];
      const iterations = 20;
      
      // Warm-up
      for (let i = 0; i < 3; i++) {
        try {
          await client.callTool(operation.name, {
            customer: TEST_CONFIG.testCustomer,
            ...operation.params
          });
        } catch (error) {
          // Ignore warm-up errors
        }
      }
      
      // Actual measurements
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        try {
          await client.callTool(operation.name, {
            customer: TEST_CONFIG.testCustomer,
            ...operation.params
          });
          
          measurements.push(performance.now() - startTime);
        } catch (error) {
          // Skip failed measurements
        }
        
        // Small delay between measurements
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (measurements.length > 0) {
        results[operation.name] = {
          weight: operation.weight,
          measurements: measurements.length,
          stats: calculateStats(measurements),
          consistency: {
            cv: (Math.sqrt(measurements.reduce((acc, val) => {
              const diff = val - (measurements.reduce((a, b) => a + b, 0) / measurements.length);
              return acc + diff * diff;
            }, 0) / measurements.length) / (measurements.reduce((a, b) => a + b, 0) / measurements.length)) * 100 // Coefficient of variation
          }
        };
        
        await log(`Avg: ${results[operation.name].stats.avg.toFixed(2)}ms, P95: ${results[operation.name].stats.p95.toFixed(2)}ms, CV: ${results[operation.name].consistency.cv.toFixed(1)}%`, 'INFO', 2);
      } else {
        results[operation.name] = {
          error: 'No successful measurements'
        };
        
        await log('No successful measurements', 'ERROR', 2);
      }
    }
    
    await client.close();
  } catch (error) {
    await log(`Response time test failed: ${error.message}`, 'ERROR', 1);
  }
  
  recordMetrics('Response Times', results);
}

/**
 * Generate performance report
 */
async function generateReport() {
  await log('\n📊 Generating performance report...', 'INFO');
  
  // Calculate overall statistics
  const summary = {
    totalTests: performanceMetrics.tests.length,
    testDuration: new Date() - new Date(performanceMetrics.timestamp),
    systemInfo: performanceMetrics.system
  };
  
  // Analyze results
  const analysis = {
    concurrentOperations: {
      maxThroughput: 0,
      optimalConcurrency: null
    },
    dnsImport: {
      maxRecordsPerSecond: 0,
      memoryPerRecord: null
    },
    certificateProvisioning: {
      maxCertsPerMinute: 0,
      avgProvisioningTime: null
    },
    memoryUsage: {
      leakDetected: false,
      growthRate: null
    },
    rateLimiting: {
      compliantEndpoints: 0,
      totalEndpoints: 0
    },
    responseTimes: {
      fastestOperation: null,
      slowestOperation: null
    }
  };
  
  // Process test results for analysis
  performanceMetrics.tests.forEach(test => {
    if (test.name === 'Concurrent Operations') {
      Object.values(test).forEach(result => {
        if (result.throughput > analysis.concurrentOperations.maxThroughput) {
          analysis.concurrentOperations.maxThroughput = result.throughput;
          analysis.concurrentOperations.optimalConcurrency = result.concurrency;
        }
      });
    }
    
    if (test.name === 'DNS Bulk Import') {
      Object.values(test).forEach(result => {
        if (result.recordsPerSecond > analysis.dnsImport.maxRecordsPerSecond) {
          analysis.dnsImport.maxRecordsPerSecond = result.recordsPerSecond;
        }
      });
    }
    
    // ... continue analysis for other tests
  });
  
  const report = {
    summary,
    analysis,
    ...performanceMetrics
  };
  
  // Save detailed report
  await fs.writeFile(TEST_CONFIG.metricsFile, JSON.stringify(report, null, 2));
  
  // Save performance graphs data (for visualization)
  const graphData = {
    throughput: [],
    responseTimes: [],
    memoryUsage: []
  };
  
  // Extract data for graphs
  performanceMetrics.tests.forEach(test => {
    if (test.name === 'Concurrent Operations') {
      Object.entries(test).forEach(([level, data]) => {
        if (data.throughput) {
          graphData.throughput.push({
            concurrency: data.concurrency,
            throughput: data.throughput,
            p95: data.responseTimes?.p95
          });
        }
      });
    }
  });
  
  const graphFile = path.join(process.cwd(), 'tests', 'performance', 'graph-data.json');
  await fs.writeFile(graphFile, JSON.stringify(graphData, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests Run: ${summary.totalTests}`);
  console.log(`Test Duration: ${(summary.testDuration / 1000 / 60).toFixed(2)} minutes`);
  console.log('\nKey Findings:');
  console.log(`  📈 Max Throughput: ${analysis.concurrentOperations.maxThroughput.toFixed(2)} ops/sec`);
  console.log(`  🔄 Optimal Concurrency: ${analysis.concurrentOperations.optimalConcurrency}`);
  console.log(`  🌐 DNS Import Rate: ${analysis.dnsImport.maxRecordsPerSecond.toFixed(2)} records/sec`);
  console.log('='.repeat(60));
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  
  if (analysis.concurrentOperations.optimalConcurrency) {
    console.log(`  • Use ${analysis.concurrentOperations.optimalConcurrency} concurrent connections for optimal throughput`);
  }
  
  if (analysis.memoryUsage.growthRate > 10) {
    console.log('  • ⚠️  Monitor memory usage - significant growth detected');
  }
  
  console.log(`\nDetailed metrics saved to: ${TEST_CONFIG.metricsFile}`);
  console.log(`Graph data saved to: ${graphFile}`);
  console.log(`Log file: ${TEST_CONFIG.logFile}`);
  
  return true;
}

/**
 * Main test runner
 */
async function runPerformanceTests() {
  console.log('🚀 Starting Performance and Load Testing...\n');
  console.log(`System: ${os.cpus().length} CPUs, ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB RAM\n`);
  
  try {
    // Clear log file
    await fs.writeFile(TEST_CONFIG.logFile, '');
    
    // Run all performance tests
    await testConcurrentOperations();
    await testLargeDNSImport();
    await testBulkCertificateProvisioning();
    await testMemoryUsage();
    await testRateLimitCompliance();
    await testResponseTimes();
    
    // Generate report
    await generateReport();
    
    process.exit(0);
  } catch (error) {
    await log(`Fatal error: ${error.message}`, 'ERROR');
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Check if running with --expose-gc for memory tests
if (!global.gc) {
  console.log('⚠️  Note: Run with --expose-gc flag for detailed memory profiling');
  console.log('  Example: node --expose-gc tests/performance/load-testing.js\n');
}

// Run tests
runPerformanceTests();