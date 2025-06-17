#!/usr/bin/env node

/**
 * Test with the correct contract ID
 */

const { AkamaiClient } = require('./dist/akamai-client.js');

async function testCorrectContract() {
  console.log('🔍 Testing with correct contract...\n');
  
  const client = new AkamaiClient();
  const correctContractId = 'ctr_1-5C13O2';  // The one that actually exists in the group
  const groupId = 'grp_125952';
  
  console.log(`Using contract: ${correctContractId}`);
  console.log(`Using group: ${groupId}`);
  
  try {
    const response = await client.request({
      path: `/papi/v1/properties?contractId=${correctContractId}&groupId=${groupId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        productId: 'prd_Site_Accel',
        propertyName: 'test-correct-contract'
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

testCorrectContract();