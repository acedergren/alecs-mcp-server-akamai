#!/usr/bin/env node

/**
 * Test simple secure property creation
 */

const { AkamaiClient } = require('./dist/akamai-client.js');
const { testBasicPropertyCreation } = require('./dist/tools/debug-secure-onboarding.js');

async function testSimpleSecure() {
  console.log('🔍 Testing simple property creation...\n');
  
  try {
    const client = new AkamaiClient();
    
    const result = await testBasicPropertyCreation(client, {
      propertyName: 'mcp-test-simple',
      contractId: 'ctr_1-5C13O2',  // Using the correct contract
      groupId: 'grp_125952',
    });
    
    console.log('Simple Property Creation Result:');
    console.log('===============================');
    console.log(result.content[0].text);
    
  } catch (error) {
    console.error('❌ Simple test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSimpleSecure();