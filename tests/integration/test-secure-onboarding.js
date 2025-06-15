#!/usr/bin/env node

/**
 * Test the complete secure property onboarding workflow
 */

const { AkamaiClient } = require('./dist/akamai-client.js');
const { debugSecurePropertyOnboarding } = require('./dist/tools/debug-secure-onboarding.js');

async function testSecureOnboarding() {
  console.log('🔍 Testing complete secure property onboarding...\n');
  
  try {
    const client = new AkamaiClient();
    
    const result = await debugSecurePropertyOnboarding(client, {
      propertyName: 'mcp-solutionsedge-io-test',
      hostnames: ['mcp.solutionsedge.io'],
      originHostname: 'origin.solutionsedge.io',
      contractId: 'ctr_1-5C13O2',  // Using the correct contract
      groupId: 'grp_125952',
      productId: 'prd_Site_Accel'
    });
    
    console.log('Secure Onboarding Result:');
    console.log('=========================');
    console.log(result.content[0].text);
    
  } catch (error) {
    console.error('❌ Secure onboarding test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSecureOnboarding();