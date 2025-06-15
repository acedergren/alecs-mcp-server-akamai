#!/usr/bin/env node

/**
 * Test the fixed request format
 */

const { AkamaiClient } = require('./dist/akamai-client.js');

async function testFixedRequest() {
  console.log('🔍 Testing fixed request format...\n');
  
  const client = new AkamaiClient();
  const correctContractId = 'ctr_1-5C13O2';
  const groupId = 'grp_125952';
  
  console.log(`Using contract: ${correctContractId}`);
  console.log(`Using group: ${groupId}`);
  
  try {
    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: {
        contractId: correctContractId,
        groupId: groupId,
      },
      body: {
        propertyName: 'test-fixed-request',
        productId: 'prd_Site_Accel',
        ruleFormat: 'latest'
      },
    });
    
    console.log('✅ Property creation succeeded!');
    console.log('Property link:', response.propertyLink);
    
    // Extract property ID
    const propertyId = response.propertyLink?.split('/').pop();
    console.log('Property ID:', propertyId);
    
  } catch (error) {
    console.log('❌ Property creation failed:', error.message);
    if (error.response?.data) {
      console.log('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFixedRequest();