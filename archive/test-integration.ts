#!/usr/bin/env tsx
/**
 * Test script to verify the all-tools-registry integration
 */

import { getAllToolDefinitions, TOTAL_TOOLS_COUNT } from './src/tools/all-tools-registry';
import { createModularServer } from './src/utils/modular-server-factory';

async function testIntegration() {
  console.log('Testing all-tools-registry integration...\n');

  // Test 1: Check tool count
  const tools = getAllToolDefinitions();
  console.log(`✓ Total tools in registry: ${tools.length}`);
  console.log(`✓ Expected tool count: ${TOTAL_TOOLS_COUNT}`);
  console.log(`✓ Match: ${tools.length === TOTAL_TOOLS_COUNT ? 'YES' : 'NO'}\n`);

  // Test 2: List first 10 tools
  console.log('First 10 tools:');
  tools.slice(0, 10).forEach((tool, i) => {
    console.log(`  ${i + 1}. ${tool.name} - ${tool.description.substring(0, 50)}...`);
  });

  // Test 3: Test filtering
  console.log('\nTesting tool filtering:');
  const propertyTools = tools.filter(t => t.name.includes('property'));
  console.log(`✓ Property tools: ${propertyTools.length}`);
  
  const dnsTools = tools.filter(t => t.name.includes('dns') || t.name.includes('zone'));
  console.log(`✓ DNS tools: ${dnsTools.length}`);
  
  const securityTools = tools.filter(t => t.name.includes('security') || t.name.includes('waf') || t.name.includes('appsec'));
  console.log(`✓ Security tools: ${securityTools.length}`);

  // Test 4: Create modular server instance
  console.log('\nTesting modular server creation:');
  try {
    const server = await createModularServer({
      name: 'test-server',
      version: '1.0.0',
      toolFilter: (tool) => tool.name.includes('property')
    });
    console.log('✓ Modular server created successfully');
    console.log('✓ Server instance:', server.getServer().serverInfo);
  } catch (error) {
    console.error('✗ Failed to create server:', error);
  }

  console.log('\n✅ Integration test complete!');
}

// Run the test
testIntegration().catch(console.error);