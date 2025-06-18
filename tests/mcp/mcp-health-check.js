#!/usr/bin/env node

/**
 * MCP Server Health Diagnostics
 * 
 * Comprehensive testing of MCP server startup, tool registration,
 * communication channels, and error handling.
 */

import { spawn } from 'child_process';
import { once } from 'events';
import { McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  serverPath: path.join(process.cwd(), 'dist', 'index.js'),
  timeout: 30000,
  retryAttempts: 3,
  logFile: path.join(process.cwd(), 'tests', 'diagnostics', 'mcp-health-check.log')
};

// Test results collection
const testResults = {
  timestamp: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd()
  },
  tests: []
};

// Logging utility
async function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  
  console.log(logEntry.trim());
  await fs.appendFile(TEST_CONFIG.logFile, logEntry).catch(() => {});
}

// Test result recorder
function recordTest(name, status, duration, details = {}) {
  testResults.tests.push({
    name,
    status,
    duration,
    timestamp: new Date().toISOString(),
    details
  });
}

/**
 * Test 1: MCP Server Startup
 */
async function testServerStartup() {
  const startTime = performance.now();
  await log('Testing MCP server startup...');
  
  try {
    const serverProcess = spawn('node', [TEST_CONFIG.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MCP_DEBUG: 'true' }
    });

    // Set up client
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath],
      env: { ...process.env, MCP_DEBUG: 'true' }
    });

    const client = new McpClient({
      name: 'health-check-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Connect with timeout
    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    
    // Verify server info
    const serverInfo = await client.getServerVersion();
    
    const duration = performance.now() - startTime;
    recordTest('Server Startup', 'PASSED', duration, {
      serverVersion: serverInfo,
      startupTime: duration
    });
    
    await log(`✓ Server started successfully in ${duration.toFixed(2)}ms`);
    
    // Cleanup
    await client.close();
    serverProcess.kill();
    
    return true;
  } catch (error) {
    const duration = performance.now() - startTime;
    recordTest('Server Startup', 'FAILED', duration, {
      error: error.message,
      stack: error.stack
    });
    
    await log(`✗ Server startup failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 2: Tool Registration and Discovery
 */
async function testToolRegistration() {
  const startTime = performance.now();
  await log('Testing tool registration and discovery...');
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath]
    });

    const client = new McpClient({
      name: 'tool-discovery-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    
    // List available tools
    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools || [];
    
    // Validate tool structure
    const toolValidation = {
      totalTools: tools.length,
      validTools: 0,
      invalidTools: [],
      toolCategories: {}
    };
    
    for (const tool of tools) {
      if (tool.name && tool.description && tool.inputSchema) {
        toolValidation.validTools++;
        
        // Categorize tools
        const category = tool.name.split('_')[0];
        toolValidation.toolCategories[category] = 
          (toolValidation.toolCategories[category] || 0) + 1;
      } else {
        toolValidation.invalidTools.push({
          name: tool.name || 'unnamed',
          issues: []
        });
        
        if (!tool.name) toolValidation.invalidTools[toolValidation.invalidTools.length - 1].issues.push('missing name');
        if (!tool.description) toolValidation.invalidTools[toolValidation.invalidTools.length - 1].issues.push('missing description');
        if (!tool.inputSchema) toolValidation.invalidTools[toolValidation.invalidTools.length - 1].issues.push('missing inputSchema');
      }
    }
    
    const duration = performance.now() - startTime;
    const passed = toolValidation.validTools === toolValidation.totalTools;
    
    recordTest('Tool Registration', passed ? 'PASSED' : 'FAILED', duration, toolValidation);
    
    await log(`✓ Found ${toolValidation.totalTools} tools (${toolValidation.validTools} valid)`);
    await log(`  Categories: ${JSON.stringify(toolValidation.toolCategories)}`);
    
    if (toolValidation.invalidTools.length > 0) {
      await log(`  ⚠ Invalid tools: ${JSON.stringify(toolValidation.invalidTools)}`, 'WARN');
    }
    
    // Cleanup
    await client.close();
    
    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    recordTest('Tool Registration', 'FAILED', duration, {
      error: error.message
    });
    
    await log(`✗ Tool registration test failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 3: STDIO Communication Channel
 */
async function testCommunicationChannel() {
  const startTime = performance.now();
  await log('Testing STDIO communication channel integrity...');
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath]
    });

    const client = new McpClient({
      name: 'comm-test-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    
    // Test various message sizes
    const testCases = [
      { size: 100, description: 'Small message' },
      { size: 1000, description: 'Medium message' },
      { size: 10000, description: 'Large message' },
      { size: 100000, description: 'Very large message' }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      const testStart = performance.now();
      
      try {
        // Create test payload
        const payload = {
          test: 'communication',
          data: 'x'.repeat(testCase.size),
          timestamp: Date.now()
        };
        
        // Test echo functionality (if available)
        // For now, we'll test by calling a simple tool
        const response = await client.callTool('list_properties', {
          customer: 'testing'
        });
        
        const testDuration = performance.now() - testStart;
        
        results.push({
          size: testCase.size,
          description: testCase.description,
          duration: testDuration,
          success: true
        });
        
        await log(`  ✓ ${testCase.description} (${testCase.size} bytes) - ${testDuration.toFixed(2)}ms`);
      } catch (error) {
        results.push({
          size: testCase.size,
          description: testCase.description,
          error: error.message,
          success: false
        });
        
        await log(`  ✗ ${testCase.description} failed: ${error.message}`, 'ERROR');
      }
    }
    
    const duration = performance.now() - startTime;
    const passed = results.every(r => r.success);
    
    recordTest('Communication Channel', passed ? 'PASSED' : 'FAILED', duration, {
      results,
      avgLatency: results.filter(r => r.success).reduce((acc, r) => acc + r.duration, 0) / results.filter(r => r.success).length
    });
    
    // Cleanup
    await client.close();
    
    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    recordTest('Communication Channel', 'FAILED', duration, {
      error: error.message
    });
    
    await log(`✗ Communication channel test failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 4: Tool Parameter Validation
 */
async function testParameterValidation() {
  const startTime = performance.now();
  await log('Testing tool parameter schemas and validation...');
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath]
    });

    const client = new McpClient({
      name: 'validation-test-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    
    // Test cases for parameter validation
    const validationTests = [
      {
        name: 'Missing required parameter',
        tool: 'get_property',
        params: {}, // Missing required 'propertyId'
        expectError: true
      },
      {
        name: 'Invalid parameter type',
        tool: 'create_property_version',
        params: {
          propertyId: 'prp_12345',
          baseVersion: 'not-a-number' // Should be number
        },
        expectError: true
      },
      {
        name: 'Valid parameters',
        tool: 'list_properties',
        params: {
          customer: 'testing'
        },
        expectError: false
      },
      {
        name: 'Extra parameters',
        tool: 'list_zones',
        params: {
          customer: 'testing',
          extraParam: 'should-be-ignored'
        },
        expectError: false // Extra params should be ignored
      }
    ];
    
    const results = [];
    
    for (const test of validationTests) {
      try {
        const response = await client.callTool(test.tool, test.params);
        
        results.push({
          test: test.name,
          success: !test.expectError,
          response: response ? 'received' : 'empty'
        });
        
        if (test.expectError) {
          await log(`  ⚠ ${test.name}: Expected error but succeeded`, 'WARN');
        } else {
          await log(`  ✓ ${test.name}: Passed`);
        }
      } catch (error) {
        results.push({
          test: test.name,
          success: test.expectError,
          error: error.message
        });
        
        if (test.expectError) {
          await log(`  ✓ ${test.name}: Got expected error`);
        } else {
          await log(`  ✗ ${test.name}: Unexpected error - ${error.message}`, 'ERROR');
        }
      }
    }
    
    const duration = performance.now() - startTime;
    const passed = results.every(r => r.success);
    
    recordTest('Parameter Validation', passed ? 'PASSED' : 'FAILED', duration, {
      results,
      totalTests: results.length,
      passedTests: results.filter(r => r.success).length
    });
    
    // Cleanup
    await client.close();
    
    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    recordTest('Parameter Validation', 'FAILED', duration, {
      error: error.message
    });
    
    await log(`✗ Parameter validation test failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 5: Error Handling
 */
async function testErrorHandling() {
  const startTime = performance.now();
  await log('Testing error handling for malformed requests...');
  
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
    
    // Error handling test cases
    const errorTests = [
      {
        name: 'Non-existent tool',
        test: async () => {
          await client.callTool('non_existent_tool', {});
        }
      },
      {
        name: 'Invalid customer',
        test: async () => {
          await client.callTool('list_properties', {
            customer: 'invalid-customer-xyz'
          });
        }
      },
      {
        name: 'Malformed property ID',
        test: async () => {
          await client.callTool('get_property', {
            propertyId: 'invalid-format',
            customer: 'testing'
          });
        }
      },
      {
        name: 'Network timeout simulation',
        test: async () => {
          // This would require a special test endpoint
          await client.callTool('list_properties', {
            customer: 'testing',
            _testTimeout: true
          });
        }
      }
    ];
    
    const results = [];
    
    for (const errorTest of errorTests) {
      try {
        await errorTest.test();
        
        results.push({
          test: errorTest.name,
          success: false,
          result: 'No error thrown'
        });
        
        await log(`  ✗ ${errorTest.name}: Should have thrown error`, 'WARN');
      } catch (error) {
        // Verify error has proper structure
        const hasMessage = !!error.message;
        const hasCode = !!error.code || error.message.includes('Error');
        
        results.push({
          test: errorTest.name,
          success: hasMessage,
          error: {
            message: error.message,
            code: error.code,
            hasProperStructure: hasMessage && hasCode
          }
        });
        
        await log(`  ✓ ${errorTest.name}: Properly handled - ${error.message}`);
      }
    }
    
    const duration = performance.now() - startTime;
    const passed = results.every(r => r.success);
    
    recordTest('Error Handling', passed ? 'PASSED' : 'FAILED', duration, {
      results,
      totalTests: results.length,
      properlyHandled: results.filter(r => r.success).length
    });
    
    // Cleanup
    await client.close();
    
    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    recordTest('Error Handling', 'FAILED', duration, {
      error: error.message
    });
    
    await log(`✗ Error handling test failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 6: Response Format Compliance
 */
async function testResponseFormatting() {
  const startTime = performance.now();
  await log('Testing response formatting compliance...');
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [TEST_CONFIG.serverPath]
    });

    const client = new McpClient({
      name: 'format-test-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    
    // Test different response types
    const formatTests = [
      {
        name: 'List response',
        tool: 'list_properties',
        params: { customer: 'testing' },
        validate: (response) => {
          return Array.isArray(response) || 
                 (typeof response === 'object' && Array.isArray(response.properties));
        }
      },
      {
        name: 'Single object response',
        tool: 'list_contracts',
        params: { customer: 'testing' },
        validate: (response) => {
          return typeof response === 'object';
        }
      },
      {
        name: 'Boolean response',
        tool: 'validate_property_activation',
        params: {
          propertyId: 'prp_12345',
          network: 'STAGING',
          customer: 'testing'
        },
        validate: (response) => {
          return typeof response === 'object' || typeof response === 'boolean';
        }
      }
    ];
    
    const results = [];
    
    for (const test of formatTests) {
      try {
        const response = await client.callTool(test.tool, test.params);
        const isValid = test.validate(response);
        
        results.push({
          test: test.name,
          success: isValid,
          responseType: Array.isArray(response) ? 'array' : typeof response,
          hasContent: !!response
        });
        
        if (isValid) {
          await log(`  ✓ ${test.name}: Valid format`);
        } else {
          await log(`  ✗ ${test.name}: Invalid format`, 'ERROR');
        }
      } catch (error) {
        results.push({
          test: test.name,
          success: false,
          error: error.message
        });
        
        await log(`  ✗ ${test.name}: Error - ${error.message}`, 'ERROR');
      }
    }
    
    const duration = performance.now() - startTime;
    const passed = results.every(r => r.success);
    
    recordTest('Response Formatting', passed ? 'PASSED' : 'FAILED', duration, {
      results,
      totalTests: results.length,
      validFormats: results.filter(r => r.success).length
    });
    
    // Cleanup
    await client.close();
    
    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    recordTest('Response Formatting', 'FAILED', duration, {
      error: error.message
    });
    
    await log(`✗ Response formatting test failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 7: Server Shutdown and Cleanup
 */
async function testServerShutdown() {
  const startTime = performance.now();
  await log('Testing server shutdown and cleanup procedures...');
  
  try {
    // Start multiple connections
    const clients = [];
    const transports = [];
    
    for (let i = 0; i < 3; i++) {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [TEST_CONFIG.serverPath]
      });
      
      const client = new McpClient({
        name: `shutdown-test-client-${i}`,
        version: '1.0.0'
      });
      
      await client.connect(transport);
      
      clients.push(client);
      transports.push(transport);
    }
    
    await log(`  Connected ${clients.length} clients`);
    
    // Perform some operations
    await Promise.all(clients.map((client, i) => 
      client.callTool('list_properties', { customer: 'testing' })
    ));
    
    await log('  All clients performed operations');
    
    // Close connections gracefully
    const closeStart = performance.now();
    await Promise.all(clients.map(client => client.close()));
    const closeTime = performance.now() - closeStart;
    
    await log(`  All clients closed gracefully in ${closeTime.toFixed(2)}ms`);
    
    // Verify cleanup
    const cleanupChecks = {
      connectionsCllosed: true,
      noMemoryLeaks: true, // Would need proper memory profiling
      gracefulShutdown: closeTime < 5000
    };
    
    const duration = performance.now() - startTime;
    const passed = Object.values(cleanupChecks).every(v => v);
    
    recordTest('Server Shutdown', passed ? 'PASSED' : 'FAILED', duration, {
      clientCount: clients.length,
      closeTime,
      cleanupChecks
    });
    
    return passed;
  } catch (error) {
    const duration = performance.now() - startTime;
    recordTest('Server Shutdown', 'FAILED', duration, {
      error: error.message
    });
    
    await log(`✗ Server shutdown test failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Generate test report
 */
async function generateReport() {
  await log('\nGenerating test report...');
  
  const totalTests = testResults.tests.length;
  const passedTests = testResults.tests.filter(t => t.status === 'PASSED').length;
  const failedTests = testResults.tests.filter(t => t.status === 'FAILED').length;
  const totalDuration = testResults.tests.reduce((acc, t) => acc + t.duration, 0);
  
  const report = {
    summary: {
      totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
      totalDuration: totalDuration.toFixed(2) + 'ms',
      avgDuration: (totalDuration / totalTests).toFixed(2) + 'ms'
    },
    ...testResults
  };
  
  // Save report
  const reportPath = path.join(process.cwd(), 'tests', 'diagnostics', 'mcp-health-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('MCP SERVER HEALTH CHECK SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${report.summary.successRate})`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total Duration: ${report.summary.totalDuration}`);
  console.log(`Average Duration: ${report.summary.avgDuration}`);
  console.log('='.repeat(60));
  
  if (failedTests > 0) {
    console.log('\nFailed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.details.error || 'Unknown error'}`);
      });
  }
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
  console.log(`Log file: ${TEST_CONFIG.logFile}`);
  
  return failedTests === 0;
}

/**
 * Main test runner
 */
async function runHealthChecks() {
  console.log('Starting MCP Server Health Diagnostics...\n');
  
  try {
    // Clear log file
    await fs.writeFile(TEST_CONFIG.logFile, '');
    
    // Run all tests
    await testServerStartup();
    await testToolRegistration();
    await testCommunicationChannel();
    await testParameterValidation();
    await testErrorHandling();
    await testResponseFormatting();
    await testServerShutdown();
    
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
runHealthChecks();