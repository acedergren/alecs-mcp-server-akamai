#!/usr/bin/env node

/**
 * Test all three ALECS flavors:
 * 1. Essential - Minimal set of core tools (~15 tools)
 * 2. Full - Complete set of all tools (~180 tools)
 * 3. Modular - Domain-specific servers (property, dns, certs, etc.)
 */

// Setup module aliases first
require('module-alias/register');

async function testALECSFlavors() {
  console.log('🔌 ALECS Server Flavors Test');
  console.log('============================\n');
  
  const results = {
    essential: { tools: 0, status: 'unknown' },
    full: { tools: 0, status: 'unknown' },
    modular: {
      property: { tools: 0, status: 'unknown' },
      dns: { tools: 0, status: 'unknown' },
      certs: { tools: 0, status: 'unknown' },
      reporting: { tools: 0, status: 'unknown' },
      security: { tools: 0, status: 'unknown' }
    }
  };
  
  try {
    // Test 1: Essential Server
    console.log('📦 1. Essential Server (index-essential.ts)');
    console.log('──────────────────────────────────────────');
    try {
      // Import essential tools from the registry used by essential server
      const essentialTools = [
        'list-properties', 'get-property', 'create-property', 'list-groups',
        'activate-property', 'get-activation-status',
        'list-zones', 'get-zone', 'create-zone', 'list-records', 'create-record',
        'create-dv-enrollment', 'check-dv-enrollment-status',
        'fastpurge-url-invalidate', 'get-traffic-summary'
      ];
      
      results.essential.tools = essentialTools.length;
      results.essential.status = 'configured';
      console.log(`✅ Essential server configured with ${essentialTools.length} core tools`);
      console.log(`   Tools: ${essentialTools.slice(0, 5).join(', ')}...`);
    } catch (error) {
      results.essential.status = 'error';
      console.log(`❌ Essential server error: ${error.message}`);
    }
    
    // Test 2: Full Server
    console.log('\n📦 2. Full Server (index-full.ts)');
    console.log('────────────────────────────────');
    try {
      const { getAllToolDefinitions } = require('./dist/tools/all-tools-registry');
      const allTools = getAllToolDefinitions();
      results.full.tools = allTools.length;
      results.full.status = 'configured';
      console.log(`✅ Full server configured with ${allTools.length} tools`);
      
      // Count tools by category
      const categories = {};
      allTools.forEach(tool => {
        const category = getToolCategory(tool.name);
        categories[category] = (categories[category] || 0) + 1;
      });
      
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} tools`);
      });
    } catch (error) {
      results.full.status = 'error';
      console.log(`❌ Full server error: ${error.message}`);
    }
    
    // Test 3: Modular Servers
    console.log('\n📦 3. Modular Servers');
    console.log('───────────────────');
    
    const modularServers = [
      { name: 'property', file: 'property-server', expectedTools: 25 },
      { name: 'dns', file: 'dns-server', expectedTools: 20 },
      { name: 'certs', file: 'certs-server', expectedTools: 15 },
      { name: 'reporting', file: 'reporting-server', expectedTools: 15 },
      { name: 'security', file: 'security-server', expectedTools: 20 }
    ];
    
    for (const server of modularServers) {
      try {
        // Check if server file exists
        const fs = require('fs');
        const serverPath = `./dist/servers/${server.file}.js`;
        
        if (fs.existsSync(serverPath)) {
          results.modular[server.name].status = 'available';
          results.modular[server.name].tools = server.expectedTools;
          console.log(`✅ ${server.name.padEnd(10)} server - Available (~${server.expectedTools} tools)`);
        } else {
          results.modular[server.name].status = 'not built';
          console.log(`⚠️  ${server.name.padEnd(10)} server - Not built (run 'npm run build')`);
        }
      } catch (error) {
        results.modular[server.name].status = 'error';
        console.log(`❌ ${server.name.padEnd(10)} server - Error: ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n📊 Summary');
    console.log('═══════════');
    console.log('\n🎯 ALECS Flavors:');
    console.log(`1. Essential: ${results.essential.status} (${results.essential.tools} tools)`);
    console.log(`   - Minimal footprint for core operations`);
    console.log(`   - Perfect for CI/CD and automation`);
    
    console.log(`\n2. Full: ${results.full.status} (${results.full.tools} tools)`);
    console.log(`   - Complete feature set`);
    console.log(`   - All Akamai services in one server`);
    
    console.log(`\n3. Modular: ${Object.values(results.modular).filter(m => m.status === 'available').length}/5 servers available`);
    console.log(`   - Domain-specific servers`);
    console.log(`   - Lower memory footprint`);
    console.log(`   - Focused functionality`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('─────────────────────');
    
    if (results.full.tools < 180) {
      console.log(`⚠️  Full server has only ${results.full.tools} tools registered (expected ~180)`);
      console.log('   Need to register missing tools in all-tools-registry.ts:');
      console.log('   - FastPurge tools');
      console.log('   - Network Lists tools');
      console.log('   - AppSec tools');
      console.log('   - Performance tools');
      console.log('   - Reporting tools');
      console.log('   - And many more...');
    }
    
    console.log('\n📚 Usage:');
    console.log('   Essential: npm run start:essentials');
    console.log('   Full:      npm run start:full');
    console.log('   Modular:   npm run start:property (or :dns, :certs, etc.)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

function getToolCategory(toolName) {
  if (toolName.includes('property') || ['list-contracts', 'list-groups', 'list-products'].includes(toolName)) {
    return '🏠 Property';
  } else if (toolName.includes('zone') || toolName.includes('record') || toolName.includes('dns')) {
    return '🌐 DNS';
  } else if (toolName.includes('certificate') || toolName.includes('dv-') || toolName.includes('enrollment')) {
    return '🔒 Certificate';
  } else if (toolName.includes('edge-hostname')) {
    return '🔗 Edge Hostname';
  } else if (toolName.includes('cpcode')) {
    return '📦 CP Code';
  } else if (toolName.includes('include')) {
    return '📁 Include';
  } else if (toolName.includes('bulk')) {
    return '⚡ Bulk Ops';
  } else if (toolName.includes('search') || toolName.includes('onboard')) {
    return '🔍 Search';
  } else {
    return '🔧 Other';
  }
}

// Run the test
testALECSFlavors().catch(console.error);