#!/usr/bin/env node

/**
 * Debug script to test the secure property onboarding
 */

const { AkamaiClient } = require('./dist/akamai-client.js');
const { debugSecurePropertyOnboarding } = require('./dist/tools/debug-secure-onboarding.js');

async function runDebugTest() {
  console.log('🔍 Starting debug test for secure property onboarding...\n');
  
  try {
    const client = new AkamaiClient();
    
    const result = await debugSecurePropertyOnboarding(client, {
      propertyName: 'mcp-solutionsedge-io',
      hostnames: ['mcp.solutionsedge.io'],
      originHostname: 'origin.solutionsedge.io',
      contractId: 'ctr_C-1FRYVV3',
      groupId: 'grp_125952',
      productId: 'prd_Site_Accel'
    });
    
    console.log('Debug Result:');
    console.log('=============');
    console.log(result.content[0].text);
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

runDebugTest();