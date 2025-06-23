#!/usr/bin/env tsx

/**
 * Test script to demonstrate the consolidated tools in action
 */

import { 
  handlePropertyTool,
  handleDNSTool,
  handleCertificateTool,
  handleSearchTool,
  handleDeployTool,
} from './src/tools/consolidated/index';

async function demoConsolidatedTools() {
  console.log('🚀 ALECS Consolidated Tools Demo\n');
  console.log('Maya\'s Tool Consolidation: From 180+ tools to 5 powerful consolidated tools\n');

  // Demo 1: Property Tool
  console.log('=== 1. PROPERTY TOOL DEMO ===');
  try {
    const propertyResult = await handlePropertyTool({
      action: 'list',
      options: {
        view: 'simple',
        filter: {
          status: 'active',
        },
      },
    });
    console.log('✅ Property tool working:');
    console.log(JSON.stringify(propertyResult, null, 2));
  } catch (error) {
    console.log('❌ Property tool error:', error.message);
  }

  console.log('\n=== 2. DNS TOOL DEMO ===');
  try {
    const dnsResult = await handleDNSTool({
      action: 'list-zones',
      options: {
        showPlan: true,
      },
    });
    console.log('✅ DNS tool working:');
    console.log(JSON.stringify(dnsResult, null, 2));
  } catch (error) {
    console.log('❌ DNS tool error:', error.message);
  }

  console.log('\n=== 3. CERTIFICATE TOOL DEMO ===');
  try {
    const certResult = await handleCertificateTool({
      action: 'list',
      options: {
        includeExpiring: true,
        showRecommendations: true,
      },
    });
    console.log('✅ Certificate tool working:');
    console.log(JSON.stringify(certResult, null, 2));
  } catch (error) {
    console.log('❌ Certificate tool error:', error.message);
  }

  console.log('\n=== 4. SEARCH TOOL DEMO ===');
  try {
    const searchResult = await handleSearchTool({
      action: 'find',
      query: 'example.com',
      options: {
        types: ['property', 'hostname', 'certificate'],
        searchMode: 'fuzzy',
      },
    });
    console.log('✅ Search tool working:');
    console.log(JSON.stringify(searchResult, null, 2));
  } catch (error) {
    console.log('❌ Search tool error:', error.message);
  }

  console.log('\n=== 5. DEPLOY TOOL DEMO ===');
  try {
    const deployResult = await handleDeployTool({
      action: 'status',
      options: {
        format: 'summary',
      },
    });
    console.log('✅ Deploy tool working:');
    console.log(JSON.stringify(deployResult, null, 2));
  } catch (error) {
    console.log('❌ Deploy tool error:', error.message);
  }

  console.log('\n🎉 Consolidated tools demo complete!');
  console.log('\nKey Benefits Demonstrated:');
  console.log('- Business-focused actions instead of technical operations');
  console.log('- Consistent interface across all resource types');
  console.log('- Smart defaults and progressive disclosure');
  console.log('- Built-in safety checks and validation');
  console.log('- Bulk operations support');
  
  console.log('\nNext Steps:');
  console.log('1. Test workflow assistants using these consolidated tools');
  console.log('2. Try advanced scenarios with multiple resource coordination');
  console.log('3. Explore the intelligent suggestions and recommendations');
}

// Run the demo
demoConsolidatedTools().catch(console.error);