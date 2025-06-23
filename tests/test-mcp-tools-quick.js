#!/usr/bin/env node

/**
 * Quick MCP Tools Verification Test
 * Tests only read operations (no modifications)
 */

// Setup module aliases first
require('module-alias/register');

const { getAllToolDefinitions } = require('./dist/tools/all-tools-registry');
const { AkamaiClient } = require('./dist/akamai-client');

// Read-only tools to test
const READ_ONLY_TOOLS = [
  'list-properties',
  'list-contracts', 
  'list-groups',
  'list-products',
  'list-zones',
  'list-certificate-enrollments',
  'list-edge-hostnames',
  'list-cpcodes',
  'list-includes',
  'get-property',
  'search-properties'
];

async function testReadOnlyTools() {
  console.log('🔌 Quick MCP Tools Verification (Read-Only)');
  console.log('==========================================\n');
  
  try {
    const client = new AkamaiClient();
    const allTools = getAllToolDefinitions();
    console.log(`📊 Found ${allTools.length} registered tools total\n`);
    
    let passed = 0;
    let failed = 0;
    
    for (const toolName of READ_ONLY_TOOLS) {
      const tool = allTools.find(t => t.name === toolName);
      
      if (!tool) {
        console.log(`❓ ${toolName.padEnd(30)} - NOT REGISTERED`);
        failed++;
        continue;
      }
      
      try {
        // Prepare test parameters
        let params = { customer: 'default' };
        
        // Add specific params for certain tools
        if (toolName === 'get-property') {
          params.propertyId = 'prp_1217964';
        } else if (['list-products', 'list-edge-hostnames', 'list-cpcodes', 'list-includes'].includes(toolName)) {
          params.contractId = 'ctr_1-5C13O2';
          params.groupId = 'grp_125952';
        } else if (toolName === 'search-properties') {
          params.searchTerm = 'test';
        }
        
        // Add limit for list operations
        if (toolName.startsWith('list-')) {
          params.limit = 3;
        }
        
        const result = await tool.handler(client, params);
        
        if (result && (result.content || result.data || result.success !== false)) {
          console.log(`✅ ${toolName.padEnd(30)} - WORKING`);
          passed++;
        } else {
          console.log(`❌ ${toolName.padEnd(30)} - NO DATA`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${toolName.padEnd(30)} - ERROR: ${error.message}`);
        failed++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total tested: ${passed + failed}/${READ_ONLY_TOOLS.length}`);
    console.log(`📦 Total registered: ${allTools.length} tools`);
    
    // List all registered tool names
    console.log('\n📝 All Registered Tools:');
    const toolsByCategory = {};
    
    allTools.forEach(tool => {
      const category = getToolCategory(tool.name);
      if (!toolsByCategory[category]) {
        toolsByCategory[category] = [];
      }
      toolsByCategory[category].push(tool.name);
    });
    
    Object.entries(toolsByCategory).forEach(([category, tools]) => {
      console.log(`\n${category}:`);
      tools.forEach(tool => console.log(`  - ${tool}`));
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

function getToolCategory(toolName) {
  if (toolName.includes('property') || ['list-contracts', 'list-groups', 'list-products'].includes(toolName)) {
    return '🏠 Property Management';
  } else if (toolName.includes('zone') || toolName.includes('record') || toolName.includes('dns')) {
    return '🌐 DNS Management';
  } else if (toolName.includes('certificate') || toolName.includes('dv-')) {
    return '🔒 Certificate Management';
  } else if (toolName.includes('edge-hostname')) {
    return '🔗 Edge Hostname Management';
  } else if (toolName.includes('cpcode')) {
    return '📦 CP Code Management';
  } else if (toolName.includes('include')) {
    return '📁 Include Management';
  } else if (toolName.includes('bulk')) {
    return '⚡ Bulk Operations';
  } else if (toolName.includes('search') || toolName.includes('onboard')) {
    return '🔍 Search & Onboarding';
  } else {
    return '🔧 Other Tools';
  }
}

// Run the test
testReadOnlyTools().catch(console.error);