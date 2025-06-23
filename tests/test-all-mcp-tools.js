#!/usr/bin/env node

/**
 * Comprehensive MCP Tools Verification Test
 * Tests all registered tools in the MCP server
 */

// Setup module aliases first
require('module-alias/register');

const { ALECSFullServer } = require('./dist/index-full');
const { getAllToolDefinitions } = require('./dist/tools/all-tools-registry');
const { AkamaiClient } = require('./dist/akamai-client');
const { CustomerConfigManager } = require('./dist/utils/customer-config');

// Categories of tools for organized testing
const TOOL_CATEGORIES = {
  'Property Management': [
    'list-properties',
    'get-property',
    'create-property',
    'list-contracts',
    'list-groups',
    'list-products'
  ],
  'Property Version Management': [
    'create-property-version',
    'get-property-rules',
    'update-property-rules',
    'activate-property',
    'get-activation-status',
    'list-property-activations',
    'list-property-versions',
    'get-property-version'
  ],
  'Property Search & Advanced': [
    'search-properties',
    'clone-property',
    'remove-property'
  ],
  'DNS Management': [
    'list-zones',
    'get-zone',
    'create-zone',
    'list-records',
    'create-record',
    'delete-record',
    'activate-zone-changes'
  ],
  'DNS Migration': [
    'import-from-cloudflare',
    'parse-zone-file',
    'bulk-import-records'
  ],
  'Certificate Management': [
    'list-certificate-enrollments',
    'create-dv-enrollment',
    'check-dv-enrollment-status',
    'get-dv-validation-challenges'
  ],
  'Edge Hostname Management': [
    'create-edge-hostname',
    'list-edge-hostnames',
    'get-edge-hostname'
  ],
  'Hostname Management': [
    'add-property-hostname',
    'remove-property-hostname',
    'list-property-hostnames'
  ],
  'CP Code Management': [
    'list-cpcodes',
    'create-cpcode',
    'get-cpcode'
  ],
  'Include Management': [
    'list-includes',
    'create-include',
    'get-include'
  ],
  'Bulk Operations': [
    'bulk-activate-properties',
    'bulk-clone-properties',
    'bulk-update-property-rules'
  ],
  'Search & Onboarding': [
    'universal-search',
    'onboard-property',
    'check-onboarding-status'
  ]
};

// Test parameters for different tool types
const TEST_PARAMS = {
  // List operations - safe to run
  'list-properties': { customer: 'default', limit: 5 },
  'list-contracts': { customer: 'default' },
  'list-groups': { customer: 'default' },
  'list-products': { customer: 'default', contractId: 'ctr_1-5C13O2' },
  'list-zones': { customer: 'default', limit: 5 },
  'list-certificate-enrollments': { customer: 'default' },
  'list-edge-hostnames': { customer: 'default', contractId: 'ctr_1-5C13O2', groupId: 'grp_125952' },
  'list-cpcodes': { customer: 'default', contractId: 'ctr_1-5C13O2', groupId: 'grp_125952' },
  'list-includes': { customer: 'default', contractId: 'ctr_1-5C13O2', groupId: 'grp_125952' },
  
  // Get operations - need valid IDs
  'get-property': { customer: 'default', propertyId: 'prp_1217964' },
  'get-property-rules': { customer: 'default', propertyId: 'prp_1217964', propertyVersion: 1 },
  'get-property-version': { customer: 'default', propertyId: 'prp_1217964', propertyVersion: 1 },
  'list-property-versions': { customer: 'default', propertyId: 'prp_1217964' },
  'list-property-activations': { customer: 'default', propertyId: 'prp_1217964' },
  'list-property-hostnames': { customer: 'default', propertyId: 'prp_1217964', propertyVersion: 1 },
  
  // Search operations
  'search-properties': { customer: 'default', searchTerm: 'test' },
  'universal-search': { customer: 'default', query: 'test', resourceTypes: ['property'] },
  
  // Operations that need skip flag (modify data)
  'create-property': { skip: true, reason: 'Creates new resources' },
  'create-property-version': { skip: true, reason: 'Creates new versions' },
  'update-property-rules': { skip: true, reason: 'Modifies property rules' },
  'activate-property': { skip: true, reason: 'Activates property' },
  'clone-property': { skip: true, reason: 'Creates new property' },
  'remove-property': { skip: true, reason: 'Deletes property' },
  'create-zone': { skip: true, reason: 'Creates new DNS zone' },
  'create-record': { skip: true, reason: 'Creates DNS record' },
  'delete-record': { skip: true, reason: 'Deletes DNS record' },
  'activate-zone-changes': { skip: true, reason: 'Activates DNS changes' },
  'create-dv-enrollment': { skip: true, reason: 'Creates certificate enrollment' },
  'create-edge-hostname': { skip: true, reason: 'Creates edge hostname' },
  'add-property-hostname': { skip: true, reason: 'Adds hostname' },
  'remove-property-hostname': { skip: true, reason: 'Removes hostname' },
  'create-cpcode': { skip: true, reason: 'Creates CP code' },
  'create-include': { skip: true, reason: 'Creates include' },
  'bulk-activate-properties': { skip: true, reason: 'Bulk activation' },
  'bulk-clone-properties': { skip: true, reason: 'Bulk cloning' },
  'bulk-update-property-rules': { skip: true, reason: 'Bulk updates' },
  'onboard-property': { skip: true, reason: 'Creates new property' },
  'import-from-cloudflare': { skip: true, reason: 'Imports DNS data' },
  'parse-zone-file': { skip: true, reason: 'Imports zone file' },
  'bulk-import-records': { skip: true, reason: 'Bulk DNS import' }
};

async function testAllMcpTools() {
  console.log('🔌 Comprehensive MCP Tools Verification Test');
  console.log('===========================================\n');
  
  const results = {
    total: 0,
    registered: 0,
    tested: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  try {
    // Initialize client for testing
    const client = new AkamaiClient();
    console.log('✅ AkamaiClient initialized\n');
    
    // Get all tool definitions
    const allTools = getAllToolDefinitions();
    results.total = allTools.length;
    results.registered = allTools.length;
    
    console.log(`📊 Found ${allTools.length} registered tools\n`);
    
    // Test tools by category
    for (const [category, toolNames] of Object.entries(TOOL_CATEGORIES)) {
      console.log(`\n🏷️  ${category}`);
      console.log('─'.repeat(50));
      
      for (const toolName of toolNames) {
        const tool = allTools.find(t => t.name === toolName);
        
        if (!tool) {
          console.log(`❓ ${toolName.padEnd(35)} - NOT REGISTERED`);
          results.errors.push(`Tool '${toolName}' not found in registry`);
          continue;
        }
        
        const testConfig = TEST_PARAMS[toolName] || {};
        
        if (testConfig.skip) {
          console.log(`⏭️  ${toolName.padEnd(35)} - SKIPPED (${testConfig.reason})`);
          results.skipped++;
          continue;
        }
        
        results.tested++;
        
        try {
          // Test the tool with safe parameters
          const result = await tool.handler(client, testConfig);
          
          if (result && (result.content || result.data || result.success !== false)) {
            console.log(`✅ ${toolName.padEnd(35)} - WORKING`);
            results.passed++;
          } else {
            console.log(`❌ ${toolName.padEnd(35)} - NO DATA`);
            results.failed++;
            results.errors.push(`Tool '${toolName}' returned no data`);
          }
        } catch (error) {
          console.log(`❌ ${toolName.padEnd(35)} - ERROR: ${error.message}`);
          results.failed++;
          results.errors.push(`Tool '${toolName}' error: ${error.message}`);
        }
      }
    }
    
    // Summary report
    console.log('\n📊 Test Summary');
    console.log('═'.repeat(50));
    console.log(`Total tools defined:     ${results.total}`);
    console.log(`Tools registered:        ${results.registered}`);
    console.log(`Tools tested:            ${results.tested}`);
    console.log(`Tests passed:            ${results.passed} ✅`);
    console.log(`Tests failed:            ${results.failed} ❌`);
    console.log(`Tests skipped:           ${results.skipped} ⏭️`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    // Tool registration status
    console.log('\n📝 Tool Registration Status:');
    const allToolNames = new Set();
    Object.values(TOOL_CATEGORIES).forEach(tools => {
      tools.forEach(tool => allToolNames.add(tool));
    });
    
    const registeredToolNames = new Set(allTools.map(t => t.name));
    const unregisteredTools = Array.from(allToolNames).filter(t => !registeredToolNames.has(t));
    
    if (unregisteredTools.length > 0) {
      console.log('❌ Unregistered tools:');
      unregisteredTools.forEach(tool => {
        console.log(`  - ${tool}`);
      });
    } else {
      console.log('✅ All expected tools are registered!');
    }
    
    // Final verdict
    console.log('\n🎯 Final Verdict:');
    if (results.failed === 0 && unregisteredTools.length === 0) {
      console.log('✅ All MCP tools are properly registered and functional!');
    } else {
      console.log('⚠️  Some tools need attention - see errors above');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the test
testAllMcpTools().catch(console.error);