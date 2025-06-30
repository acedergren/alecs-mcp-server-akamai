#!/usr/bin/env node

/**
 * Test onboarding through MCP server interface
 */

console.log('🚀 MCP Property Onboarding Test\n');

// First, let's check what groups are available
console.log('Step 1: List available groups to find the right one\n');
console.log('Example MCP command:');
console.log('property.groups.list\n');

console.log('Step 2: Check if property exists\n');
console.log('Example MCP command:');
console.log('property.search --hostname "code.solutionsedge.io"\n');

console.log('Step 3: Run onboarding workflow\n');
console.log('Example MCP command:');
console.log(`property.onboard \\
  --hostname "code.solutionsedge.io" \\
  --originHostname "origin-code.solutionsedge.io" \\
  --contractId "ctr_1-5C13O2" \\
  --groupId "grp_18543" \\
  --useCase "web-app" \\
  --notificationEmails '["test@solutionsedge.io"]' \\
  --dnsProvider "edge-dns"\n`);

console.log('📋 What the onboarding workflow will do:\n');
console.log('1. Validate configuration');
console.log('2. Check if property already exists');
console.log('3. Create CP Code: code-solutionsedge-io');
console.log('4. Create property with Ion Standard (web-app)');
console.log('5. Create edge hostname: code.solutionsedge.io.edgekey.net');
console.log('6. Configure Ion Standard template with:');
console.log('   - HTTP/3 and HTTP/2 enabled');
console.log('   - HTTPS redirect (301)');
console.log('   - Adaptive acceleration');
console.log('   - Performance optimizations');
console.log('7. Check DNS and create records if in Edge DNS');
console.log('8. Activate to STAGING only');
console.log('9. Provide production activation instructions\n');

console.log('⚠️  Note: The actual API calls may take 30-60 seconds to complete.\n');

// Let me try a simpler direct test
import { AkamaiClient } from './src/akamai-client';
import { CustomerConfigManager } from './src/services/customer-config-manager';

async function testBasicSetup() {
  try {
    console.log('Testing basic setup...');
    
    const configManager = new CustomerConfigManager();
    const config = await configManager.getCustomerConfig('default');
    
    console.log('✅ Configuration loaded successfully');
    console.log(`   Host: ${config.edgeGridConfig.host}`);
    console.log(`   Client Token: ${config.edgeGridConfig.client_token.substring(0, 10)}...`);
    
    const client = new AkamaiClient();
    console.log('✅ AkamaiClient created successfully\n');
    
    console.log('Ready to run onboarding! Use the MCP commands above.');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

testBasicSetup();