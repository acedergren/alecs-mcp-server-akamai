#!/usr/bin/env node

/**
 * Quick test script to list contracts using the MCP server
 */

// Setup module aliases first
require('module-alias/register');

const { AkamaiClient } = require('./dist/akamai-client');
const { listProperties } = require('./dist/tools/property-tools');
const { CustomerConfigManager } = require('./dist/utils/customer-config');

async function testContractListing() {
  console.log('🔌 Testing Contract/Property Listing via MCP Server');
  console.log('================================================');
  
  try {
    // Initialize the client
    const client = new AkamaiClient();
    console.log('✅ AkamaiClient initialized');
    
    // Check customer configuration
    const configManager = CustomerConfigManager.getInstance();
    const customers = configManager.listSections();
    console.log(`📋 Available customers: ${customers.join(', ')}`);
    
    // Test with default customer first
    console.log('\n🔍 Listing properties (contracts) for default customer...');
    const result = await listProperties(client, { customer: 'default' });
    
    console.log('✅ Contract listing successful!');
    console.log(`📊 Response type: ${Array.isArray(result) ? 'array' : 'object'}`);
    
    if (Array.isArray(result)) {
      console.log(`📊 Found ${result.length} properties/contracts`);
      
      // Show first few contracts if available
      if (result.length > 0) {
        console.log('\n📋 Sample contracts:');
        result.slice(0, 3).forEach((prop, index) => {
          console.log(`  ${index + 1}. ${prop.propertyName || prop.name || 'Unknown'} (ID: ${prop.propertyId || prop.id || 'N/A'})`);
        });
        
        if (result.length > 3) {
          console.log(`  ... and ${result.length - 3} more`);
        }
      }
    } else if (result && typeof result === 'object') {
      console.log('📋 Contract response structure:');
      console.log(`  - Keys: ${Object.keys(result).join(', ')}`);
      
      // Check for common property/contract fields
      if (result.properties) {
        console.log(`  - Properties count: ${result.properties.length || 'N/A'}`);
      }
      if (result.contracts) {
        console.log(`  - Contracts count: ${result.contracts.length || 'N/A'}`);
      }
    }
    
    console.log('\n🎉 Contract listing test completed successfully!');
    
  } catch (error) {
    console.error('❌ Contract listing failed:', error.message);
    
    // Provide helpful debugging info
    if (error.message.includes('401')) {
      console.log('🔧 Debug: Check your .edgerc credentials');
    } else if (error.message.includes('404')) {
      console.log('🔧 Debug: API endpoint might have changed or customer section not found');
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      console.log('🔧 Debug: Network connectivity issue');
    }
    
    process.exit(1);
  }
}

// Run the test
testContractListing().catch(console.error);